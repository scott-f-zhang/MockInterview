# Copyright AGNTCY Contributors (https://github.com/agntcy)
# SPDX-License-Identifier: Apache-2.0

from a2a.types import (
    AgentCapabilities,
    AgentCard,
    AgentSkill,
)

from config.config import FARM_AGENT_HOST, FARM_AGENT_PORT

AGENT_SKILL = AgentSkill(
    id="mock_interview",
    name="Mock Interview",
    description="Runs a simulated job interview: asks questions (intro, technical, behavioral, closing) and evaluates answers with feedback and suggestions.",
    tags=["interview", "mock", "feedback", "evaluation"],
    examples=[
        "Start a mock interview",
        "Here is my answer: I led the migration of our API to GraphQL...",
        "Continue the interview with my answer: ...",
    ],
)

AGENT_CARD = AgentCard(
    name="Mock Interview Farm Agent",
    id="mock-interview-farm-agent",
    description="An AI agent that conducts mock interviews: Interviewer decides questions and phase, Evaluator analyzes answers and gives feedback.",
    url=f"http://{FARM_AGENT_HOST}:{FARM_AGENT_PORT}/",
    version="1.0.0",
    defaultInputModes=["text"],
    defaultOutputModes=["text"],
    capabilities=AgentCapabilities(streaming=True),
    skills=[AGENT_SKILL],
    supportsAuthenticatedExtendedCard=False,
)
