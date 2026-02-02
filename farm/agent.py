# Copyright AGNTCY Contributors (https://github.com/agntcy)
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import re
from typing import Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

from ioa_observe.sdk.decorators import agent, graph

from common.llm import get_llm

logger = logging.getLogger("mock_interview.farm_agent.graph")

# Phases for interview flow (Context Agent will use resume+JD later)
PHASES = ["intro", "technical", "behavioral", "closing"]

# Five evaluation dimensions (group decision); keys used in state and API
EVALUATION_ASPECTS = ["relevance", "depth", "clarity", "structure", "professionalism"]
ASPECT_LABELS = {
    "relevance": "Relevance (did they answer the question)",
    "depth": "Depth (substance and detail)",
    "clarity": "Clarity (clear and understandable)",
    "structure": "Structure (organized and logical)",
    "professionalism": "Professionalism (tone and appropriateness)",
}


class State(TypedDict, total=False):
    prompt: str
    parsed: dict[str, Any]
    conversation_history: list[dict[str, str]]
    phase: str
    resume: str
    job_description: str
    last_feedback: str
    last_question: str
    error_type: str
    error_message: str
    response_text: str
    aspect_scores: dict[str, float]
    aspect_comments: dict[str, str]
    final_score: float
    report: str


def _parse_input(prompt: str) -> dict[str, Any] | None:
    """Parse JSON input: message_type, content, conversation_history, resume, job_description."""
    try:
        data = json.loads(prompt)
        if not isinstance(data, dict):
            return None
        msg_type = data.get("message_type")
        if msg_type not in ("start", "answer", "answer_simulation", "finish"):
            return None
        history = data.get("conversation_history")
        if history is not None and not isinstance(history, list):
            return None
        resume = data.get("resume")
        if resume is not None and not isinstance(resume, str):
            resume = ""
        job_description = data.get("job_description")
        if job_description is not None and not isinstance(job_description, str):
            job_description = ""
        return {
            "message_type": msg_type,
            "content": (data.get("content") or "").strip(),
            "conversation_history": history or [],
            "resume": (resume or "").strip(),
            "job_description": (job_description or "").strip(),
        }
    except json.JSONDecodeError:
        return None


@agent(name="farm_agent")
class FarmAgent:
    def __init__(self):
        self.PARSE_NODE = "ParseNode"
        self.INTERVIEWER_NODE = "InterviewerNode"
        self.EVALUATOR_NODE = "EvaluatorNode"
        self.FINISH_NODE = "FinishNode"
        self._agent = self.build_graph()

    @graph(name="farm_graph")
    def build_graph(self) -> StateGraph:
        graph_builder = StateGraph(State)
        graph_builder.add_node(self.PARSE_NODE, self.parse_node)
        graph_builder.add_node(self.INTERVIEWER_NODE, self.interviewer_node)
        graph_builder.add_node(self.EVALUATOR_NODE, self.evaluator_node)
        graph_builder.add_node(self.FINISH_NODE, self.finish_node)
        graph_builder.add_edge(START, self.PARSE_NODE)
        graph_builder.add_conditional_edges(
            self.PARSE_NODE,
            self._route_after_parse,
            {
                "interviewer": self.INTERVIEWER_NODE,
                "evaluator_then_interviewer": self.EVALUATOR_NODE,
                "finish": self.FINISH_NODE,
            },
        )
        graph_builder.add_edge(self.INTERVIEWER_NODE, END)
        graph_builder.add_edge(self.EVALUATOR_NODE, self.INTERVIEWER_NODE)
        graph_builder.add_edge(self.FINISH_NODE, END)
        return graph_builder.compile()

    def _route_after_parse(self, state: State) -> str:
        parsed = state.get("parsed") or {}
        if parsed.get("message_type") == "finish":
            return "finish"
        if parsed.get("message_type") in ("start", "answer_simulation"):
            return "interviewer"
        return "evaluator_then_interviewer"

    async def parse_node(self, state: State) -> dict:
        prompt = state.get("prompt", "")
        parsed = _parse_input(prompt)
        if not parsed:
            return {
                "error_type": "invalid_input",
                "error_message": "Invalid input. Send JSON with message_type ('start', 'answer', or 'finish'), optional content, and optional conversation_history.",
            }
        return {
            "parsed": parsed,
            "conversation_history": parsed.get("conversation_history", []),
            "phase": "intro",
            "resume": parsed.get("resume", "") or "",
            "job_description": parsed.get("job_description", "") or "",
        }

    def _parse_aspect_response(self, raw: str, _aspect: str) -> tuple[float, str]:
        """Parse LLM response for one aspect: expect score 0-5 and optional comment. Returns (score, comment)."""
        score = 2.5
        comment = ""
        raw = (raw or "").strip()
        got_score_from_json = False
        # Try JSON first
        try:
            match = re.search(r"\{[^{}]*\}", raw)
            if match:
                obj = json.loads(match.group())
                s = obj.get("score")
                if s is not None:
                    score = float(s) if isinstance(s, (int, float)) else 2.5
                    got_score_from_json = True
                comment = (obj.get("comment") or "").strip() or ""
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
        # Fallback only when we did not get a score from JSON
        if not got_score_from_json and raw:
            for line in raw.splitlines():
                if re.match(r"^\s*score\s*:\s*(\d+(?:\.\d+)?)", line, re.I):
                    m = re.search(r"(\d+(?:\.\d+)?)", line)
                    if m:
                        score = float(m.group(1))
                if re.match(r"^\s*comment\s*:", line, re.I):
                    comment = line.split(":", 1)[-1].strip()
        score = max(0.0, min(5.0, score))
        return (round(score, 1), comment[:200] if comment else "")

    async def evaluator_node(self, state: State) -> dict:
        parsed = state.get("parsed") or {}
        content = parsed.get("content", "")
        history = state.get("conversation_history") or []

        if not content:
            return {
                "error_type": "invalid_input",
                "error_message": "No answer content provided for evaluation.",
            }

        # Build context: last question + user answer
        last_question = ""
        for entry in reversed(history):
            if entry.get("role") == "assistant":
                last_question = entry.get("content", "")
                break

        resume = (state.get("resume") or "").strip()
        job_description = (state.get("job_description") or "").strip()
        context_block = ""
        if resume or job_description:
            if resume:
                context_block += f"Candidate resume:\n{resume}\n\n"
            if job_description:
                context_block += f"Job description:\n{job_description}\n\n"

        base_user = ""
        if context_block:
            base_user = context_block
        base_user += f"Interview question:\n{last_question}\n\nCandidate's answer:\n{content}"

        aspect_scores: dict[str, float] = {}
        aspect_comments: dict[str, str] = {}

        # 1. Five aspect evaluations (0-5 + optional comment each)
        for aspect in EVALUATION_ASPECTS:
            label = ASPECT_LABELS.get(aspect, aspect)
            system_prompt = (
                "You are an evaluator for a single dimension of a mock interview answer. "
                f"Evaluate ONLY this dimension: {label}. "
                "Output valid JSON only, no other text: {\"score\": <number 0-5>, \"comment\": \"<one short sentence>\"}. "
                "Score must be between 0 and 5 (integer or one decimal)."
            )
            user_text = f"Dimension: {label}\n\n{base_user}"
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_text),
            ]
            response = get_llm().invoke(messages)
            raw = (response.content or "").strip()
            score, comment = self._parse_aspect_response(raw, aspect)
            aspect_scores[aspect] = score
            if comment:
                aspect_comments[aspect] = comment
            logger.debug("Aspect %s score: %s", aspect, score)

        # 2. Final score (average) and final evaluator for feedback text
        final_score = round(sum(aspect_scores.values()) / len(EVALUATION_ASPECTS), 1)
        scores_summary = "\n".join(
            f"- {ASPECT_LABELS.get(a, a)}: {aspect_scores[a]}/5"
            + (f" — {aspect_comments[a]}" if aspect_comments.get(a) else "")
            for a in EVALUATION_ASPECTS
        )
        system_prompt = (
            "You are the final Evaluator in a mock interview. You receive scores from five dimension evaluators. "
            "Your job is to write brief, constructive feedback for the candidate.\n"
            "Provide:\n"
            "1. What was strong about the answer (1–2 sentences).\n"
            "2. One concrete suggestion to improve (1 sentence).\n"
            "Keep feedback concise and professional. Do not ask the next question—that is the Interviewer's role. "
            "Do not repeat the numeric scores in your feedback."
        )
        user_text = (
            f"Dimension scores (0-5) and comments:\n{scores_summary}\n\n"
            f"Overall average: {final_score}/5. Write your feedback below."
        )
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_text),
        ]
        response = get_llm().invoke(messages)
        feedback = (response.content or "").strip()
        logger.debug("Final evaluator feedback: %s", feedback[:200])
        return {
            "aspect_scores": aspect_scores,
            "aspect_comments": aspect_comments,
            "final_score": final_score,
            "last_feedback": feedback,
        }

    async def interviewer_node(self, state: State) -> dict:
        parsed = state.get("parsed") or {}
        msg_type = parsed.get("message_type", "start")
        history = state.get("conversation_history") or []
        last_feedback = state.get("last_feedback", "")
        phase = state.get("phase", "intro")
        resume = (state.get("resume") or "").strip()
        job_description = (state.get("job_description") or "").strip()

        context_block = ""
        if resume or job_description:
            context_block = "Use the following context to tailor your questions and closing.\n\n"
            if resume:
                context_block += f"Candidate resume:\n{resume}\n\n"
            if job_description:
                context_block += f"Job description:\n{job_description}\n\n"

        system_prompt = (
            "You are an Interviewer Agent for a mock interview. You decide the next question and manage the interview phase.\n"
            "Phases: intro → technical → behavioral → closing.\n"
            "Rules:\n"
            "1. If this is the start of the interview, greet the candidate briefly and ask the first question (intro: e.g. tell me about yourself, or why this role).\n"
            "2. If you were given evaluator feedback, do not repeat it; just ask the next question appropriate for the current phase.\n"
            "3. After a few exchanges you may move to the next phase (e.g. technical, then behavioral, then closing).\n"
            "4. In closing, you may thank the candidate and say the interview is complete.\n"
            "Respond with only the next question or closing statement (no meta-commentary). Keep questions clear and professional."
        )

        if msg_type == "start":
            user_text = ""
            if context_block:
                user_text = context_block
            user_text += "Start the mock interview. Output your first question (or brief intro + first question)."
        else:
            conv = "\n".join(
                f"{h.get('role', 'unknown')}: {h.get('content', '')}" for h in history[-6:]
            )
            # Include the current user answer so the interviewer sees the latest turn
            current_content = (parsed.get("content") or "").strip()
            if current_content:
                conv = f"{conv}\nuser: {current_content}" if conv else f"user: {current_content}"
            user_text = ""
            if context_block:
                user_text = context_block
            user_text += f"Current phase: {phase}. Recent conversation:\n{conv}\n\n"
            if last_feedback:
                final_score = state.get("final_score")
                if final_score is not None:
                    user_text += f"Overall score (0-5) for last answer: {final_score}. "
                user_text += f"Evaluator feedback (for context only; do not repeat): {last_feedback}\n\n"
            user_text += "Ask the next interview question (or close the interview if appropriate)."

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_text),
        ]
        response = get_llm().invoke(messages)
        question = (response.content or "").strip()
        logger.debug("Interviewer question: %s", question[:200])

        if not question:
            return {
                "error_type": "invalid_output",
                "error_message": "Interviewer did not produce a question.",
            }

        if msg_type == "answer" and last_feedback:
            # Single newlines only; score is already shown in the evaluation card
            feedback_compact = re.sub(r"\n{2,}", "\n", last_feedback).strip()
            response_text = f"**Feedback:**\n{feedback_compact}\n**Next question:**\n{question}"
        else:
            response_text = question

        return {"last_question": question, "response_text": response_text}

    async def finish_node(self, state: State) -> dict:
        """Generate a summary report from full conversation + resume + JD."""
        history = state.get("conversation_history") or []
        resume = (state.get("resume") or "").strip()
        job_description = (state.get("job_description") or "").strip()

        conv_text = "\n".join(
            f"{h.get('role', 'unknown')}: {h.get('content', '')}" for h in history
        )
        context_parts = []
        if resume:
            context_parts.append(f"Candidate resume:\n{resume}")
        if job_description:
            context_parts.append(f"Job description:\n{job_description}")
        context_block = "\n\n".join(context_parts) if context_parts else ""

        system_prompt = (
            "You are an expert interviewer writing a final summary report for a mock interview. "
            "Given the full conversation and optional candidate resume and job description, write a concise report that includes:\n"
            "1. Overall performance (2–3 sentences).\n"
            "2. Strengths and areas to improve (by dimension if relevant: relevance, depth, clarity, structure, professionalism).\n"
            "3. One or two concrete suggestions for the candidate.\n"
            "Keep the report professional, constructive, and readable. Use clear paragraphs."
        )
        user_text = "Full interview conversation:\n\n" + (conv_text or "(No messages)")
        if context_block:
            user_text = context_block + "\n\n" + user_text
        user_text += "\n\nWrite the summary report above."

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_text),
        ]
        response = get_llm().invoke(messages)
        report = (response.content or "").strip()
        logger.debug("Finish report length: %s", len(report))
        return {"report": report}

    async def ainvoke(self, user_input: str) -> dict:
        if not hasattr(self, "_agent"):
            self._agent = self.build_graph()
        return await self._agent.ainvoke({"prompt": user_input})
