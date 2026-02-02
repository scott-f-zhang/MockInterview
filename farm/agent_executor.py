# Copyright AGNTCY Contributors (https://github.com/agntcy)
# SPDX-License-Identifier: Apache-2.0

import json
import logging

from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.types import (
    ContentTypeNotSupportedError,
    InternalError,
    JSONRPCResponse,
    Task,
    UnsupportedOperationError,
)
from a2a.utils import new_agent_text_message, new_task
from a2a.utils.errors import ServerError

from farm.agent import FarmAgent

logger = logging.getLogger("mock_interview.farm_agent.a2a_executor")


class FarmAgentExecutor(AgentExecutor):
    def __init__(self):
        self.agent = FarmAgent()

    def _validate_request(self, context: RequestContext) -> JSONRPCResponse | None:
        if not context or not context.message or not context.message.parts:
            logger.error("Invalid request parameters: %s", context)
            return JSONRPCResponse(error=ContentTypeNotSupportedError())
        return None

    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        logger.info("Received message request: %s", context.message)

        validation_error = self._validate_request(context)
        if validation_error:
            await event_queue.enqueue_event(validation_error)
            return

        prompt = context.get_user_input()
        if not prompt:
            logger.warning("Empty or missing prompt in user input.")
            await event_queue.enqueue_event(
                new_agent_text_message("No valid input provided. Send JSON with message_type ('start' or 'answer') and optional content and conversation_history.")
            )
            return
        task = context.current_task
        if not task:
            task = new_task(context.message)
            await event_queue.enqueue_event(task)

        try:
            output = await self.agent.ainvoke(prompt)
            if output.get("error_message"):
                logger.error("Error in agent response: %s", output.get("error_message"))
                await event_queue.enqueue_event(
                    new_agent_text_message(
                        output.get("error_message", "Interview step failed."),
                    )
                )
                return

            if "report" in output and output["report"]:
                payload = json.dumps({"report": output["report"]})
                logger.info("Finish report sent (length=%s)", len(payload))
                await event_queue.enqueue_event(new_agent_text_message(payload))
                return

            response_text = output.get("response_text", "")
            if not response_text:
                response_text = output.get("last_question", "No response generated.")
            aspect_scores = output.get("aspect_scores")
            if aspect_scores is not None and isinstance(aspect_scores, dict):
                evaluation = {
                    "aspect_scores": aspect_scores,
                    "aspect_comments": output.get("aspect_comments") or {},
                    "final_score": output.get("final_score", 0.0),
                    "feedback": output.get("last_feedback", ""),
                }
                payload = json.dumps({"response_text": response_text, "evaluation": evaluation})
                logger.info("Mock interview response sent with evaluation (length=%s)", len(payload))
                await event_queue.enqueue_event(new_agent_text_message(payload))
            else:
                logger.info("Mock interview response sent (length=%s)", len(response_text))
                await event_queue.enqueue_event(new_agent_text_message(response_text))
        except Exception as e:
            logger.error("Error in mock interview response: %s", e)
            raise ServerError(error=InternalError()) from e

    async def cancel(
        self, request: RequestContext, event_queue: EventQueue
    ) -> Task | None:
        raise ServerError(error=UnsupportedOperationError())
