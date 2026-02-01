# Copyright AGNTCY Contributors (https://github.com/agntcy)
# SPDX-License-Identifier: Apache-2.0

import logging
from uuid import uuid4

from ioa_observe.sdk.decorators import agent
from agntcy_app_sdk.factory import AgntcyFactory
from agntcy_app_sdk.semantic.a2a.protocol import A2AProtocol
from config.config import DEFAULT_MESSAGE_TRANSPORT, TRANSPORT_SERVER_ENDPOINT
from langchain_core.messages import HumanMessage, SystemMessage
from common.llm import get_llm
from a2a.types import (
    SendMessageRequest,
    MessageSendParams,
    Message,
    Part,
    TextPart,
    Role,
)

from farm.card import AGENT_CARD as farm_agent_card

logger = logging.getLogger("mock_interview.exchange.agent")

tools = [
    {
        "type": "function",
        "function": {
            "name": "a2a_client_send_message",
            "description": "Sends the user's message (JSON payload for mock interview) to the farm agent and returns the interview response.",
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "JSON string with message_type ('start' or 'answer'), optional content, and optional conversation_history.",
                    }
                },
                "required": ["prompt"]
            }
        }
    }
]

system_prompt = (
    "You are an assistant for a mock interview platform. The user will send a JSON payload or a plain message.\n"
    "If the message is valid JSON with message_type 'start' or 'answer', call a2a_client_send_message with that exact string.\n"
    "If the user says they want to start an interview (e.g. 'start', 'begin', 'let\'s start'), call a2a_client_send_message with the string: {\"message_type\": \"start\"}.\n"
    "If the user sends an answer or any other text, call a2a_client_send_message with a JSON string containing message_type 'answer', 'content' (the user's text), and 'conversation_history' (array of {role, content}); use empty array if no history.\n"
    "Always call the tool with the appropriate prompt; do not respond without calling the tool."
)


@agent(name="exchange_agent")
class ExchangeAgent:
    def __init__(self, factory: AgntcyFactory):
        self.factory = factory

    async def execute_agent_with_llm(self, user_prompt: str):
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        response = get_llm().invoke(messages, tools=tools)
        if hasattr(response, 'tool_calls') and response.tool_calls:
            logger.info("Tool was called")
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                if tool_name == "a2a_client_send_message":
                    result = await self.a2a_client_send_message(tool_args["prompt"])
                    logger.info("Tool result received")
                    return result
        logger.info("No tool called - LLM responded directly")
        return response.content

    async def a2a_client_send_message(self, prompt: str) -> str:
        try:
            factory = self.factory
            a2a_topic = A2AProtocol.create_agent_topic(farm_agent_card)
            transport = factory.create_transport(
                DEFAULT_MESSAGE_TRANSPORT,
                endpoint=TRANSPORT_SERVER_ENDPOINT,
                name="default/default/exchange"
            )
            client = await factory.create_client(
                "A2A",
                agent_topic=a2a_topic,
                transport=transport)

            request = SendMessageRequest(
                id=str(uuid4()),
                params=MessageSendParams(
                    message=Message(
                        message_id=str(uuid4()),
                        role=Role.user,
                        parts=[Part(TextPart(text=prompt))],
                    )
                )
            )

            response = await client.send_message(request)
            logger.info("Response received from A2A agent")
            if response.root.result:
                if not response.root.result.parts:
                    raise ValueError("No response parts found in the message.")
                part = response.root.result.parts[0].root
                if hasattr(part, "text"):
                    return part.text
            elif response.root.error:
                raise Exception(f"A2A error: {response.error.message}")

        except Exception as e:
            logger.error("Error in a2a_client_send_message: %s", e)
            raise Exception(str(e)) from e
        return ""
