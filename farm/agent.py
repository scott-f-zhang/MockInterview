# Copyright AGNTCY Contributors (https://github.com/agntcy)
# SPDX-License-Identifier: Apache-2.0

import json
import logging
from typing import Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

from ioa_observe.sdk.decorators import agent, graph

from common.llm import get_llm

logger = logging.getLogger("mock_interview.farm_agent.graph")

# Phases for interview flow (Context Agent will use resume+JD later)
PHASES = ["intro", "technical", "behavioral", "closing"]


class State(TypedDict):
    prompt: str
    parsed: dict[str, Any]
    conversation_history: list[dict[str, str]]
    phase: str
    last_feedback: str
    last_question: str
    error_type: str
    error_message: str
    response_text: str


def _parse_input(prompt: str) -> dict[str, Any] | None:
    """Parse JSON input: message_type ('start' | 'answer'), content, conversation_history."""
    try:
        data = json.loads(prompt)
        if not isinstance(data, dict):
            return None
        msg_type = data.get("message_type")
        if msg_type not in ("start", "answer"):
            return None
        history = data.get("conversation_history")
        if history is not None and not isinstance(history, list):
            return None
        return {
            "message_type": msg_type,
            "content": (data.get("content") or "").strip(),
            "conversation_history": history or [],
        }
    except json.JSONDecodeError:
        return None


@agent(name="farm_agent")
class FarmAgent:
    def __init__(self):
        self.PARSE_NODE = "ParseNode"
        self.INTERVIEWER_NODE = "InterviewerNode"
        self.EVALUATOR_NODE = "EvaluatorNode"
        self._agent = self.build_graph()

    @graph(name="farm_graph")
    def build_graph(self) -> StateGraph:
        graph_builder = StateGraph(State)
        graph_builder.add_node(self.PARSE_NODE, self.parse_node)
        graph_builder.add_node(self.INTERVIEWER_NODE, self.interviewer_node)
        graph_builder.add_node(self.EVALUATOR_NODE, self.evaluator_node)
        graph_builder.add_edge(START, self.PARSE_NODE)
        graph_builder.add_conditional_edges(
            self.PARSE_NODE,
            self._route_after_parse,
            {
                "interviewer": self.INTERVIEWER_NODE,
                "evaluator_then_interviewer": self.EVALUATOR_NODE,
            },
        )
        graph_builder.add_edge(self.INTERVIEWER_NODE, END)
        graph_builder.add_edge(self.EVALUATOR_NODE, self.INTERVIEWER_NODE)
        return graph_builder.compile()

    def _route_after_parse(self, state: State) -> str:
        parsed = state.get("parsed") or {}
        if parsed.get("message_type") == "start":
            return "interviewer"
        return "evaluator_then_interviewer"

    async def parse_node(self, state: State) -> dict:
        prompt = state.get("prompt", "")
        parsed = _parse_input(prompt)
        if not parsed:
            return {
                "error_type": "invalid_input",
                "error_message": "Invalid input. Send JSON with message_type ('start' or 'answer'), optional content, and optional conversation_history.",
            }
        return {
            "parsed": parsed,
            "conversation_history": parsed.get("conversation_history", []),
            "phase": "intro",
        }

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

        system_prompt = (
            "You are an Evaluator Agent in a mock interview. Your job is to analyze the candidate's answer and give brief, constructive feedback.\n"
            "Provide:\n"
            "1. What was strong about the answer (1–2 sentences).\n"
            "2. One concrete suggestion to improve (1 sentence).\n"
            "Keep feedback concise and professional. Do not ask the next question—that is the Interviewer's role."
        )
        user_text = f"Interview question:\n{last_question}\n\nCandidate's answer:\n{content}"
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_text),
        ]
        response = get_llm().invoke(messages)
        feedback = (response.content or "").strip()
        logger.debug("Evaluator feedback: %s", feedback[:200])
        return {"last_feedback": feedback}

    async def interviewer_node(self, state: State) -> dict:
        parsed = state.get("parsed") or {}
        msg_type = parsed.get("message_type", "start")
        history = state.get("conversation_history") or []
        last_feedback = state.get("last_feedback", "")
        phase = state.get("phase", "intro")

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
            user_text = "Start the mock interview. Output your first question (or brief intro + first question)."
        else:
            conv = "\n".join(
                f"{h.get('role', 'unknown')}: {h.get('content', '')}" for h in history[-6:]
            )
            user_text = f"Current phase: {phase}. Recent conversation:\n{conv}\n\n"
            if last_feedback:
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
            response_text = f"**Feedback:**\n{last_feedback}\n\n**Next question:**\n{question}"
        else:
            response_text = question

        return {"last_question": question, "response_text": response_text}

    async def ainvoke(self, user_input: str) -> dict:
        if not hasattr(self, "_agent"):
            self._agent = self.build_graph()
        return await self._agent.ainvoke({"prompt": user_input})
