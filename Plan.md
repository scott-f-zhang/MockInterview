---
name: Mock Interview Platform — Implementation Plan
overview: Implement the Mock Interview Platform in this repo (text-only Interviewer + Evaluator first; Context Agent and video/audio later).
todos: []
isProject: true
---

# Mock Interview Platform — Plan

## Objective

Implement the Mock Interview Platform in this repository:

1. **Phase 1 (done)**: Interviewer + Evaluator with text-only flow; backend builds farm payload and passes conversation history.
2. **Phase 2**: Context Agent (resume + JD) so questions and feedback are context-aware.
3. **Phase 3**: Video/audio — pipeline service or Multimodal Agent (or Evaluator tools), then wire into the flow.
4. **Phase 4 (optional)**: Orchestrator agent if multiple entry points or complex routing are needed.

## Agent Design (3–4 agents)

| Agent | Role |
|-------|------|
| **Context Agent** | Holds resume + JD; provides unified candidate/role context for other agents. |
| **Interviewer Agent** | Decides next question, manages phase (intro / technical / behavioral / closing). |
| **Evaluator Agent** | Analyzes each answer (text), gives immediate feedback and suggestions; optional end-of-session summary. |
| **Orchestrator (optional)** | Coordinates Context / Interviewer / Evaluator; add if entry points or flows grow. |

Minimum: 3 agents (Context, Interviewer, Evaluator) with backend service doing simple orchestration.

## Current Implementation (Phase 1)

- **Farm (A2A)**: Single farm agent with a graph: Parse → (Evaluator → Interviewer for "answer", or Interviewer only for "start"). State includes `conversation_history`, `last_feedback`, `last_question`, `response_text`.
- **Exchange**: Builds JSON payload (`message_type`: "start" | "answer", `content`, `conversation_history`) and calls farm via A2A. API accepts `prompt` and optional `conversation_history`.
- **Frontend**: Sends `conversation_history` with each request; suggested prompts are interview starters.

## Document Location

- **Path**: `Plan.md` at repo root.
- **Root**: This repository (`mock_interview`).

## References

- [AGNTCY app-sdk](https://github.com/agntcy/app-sdk)
- [CoffeeAGNTCY](https://github.com/agntcy/coffeeAgntcy) (Corto / Lungo) — template reference.
