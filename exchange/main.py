# Copyright AGNTCY Contributors (https://github.com/agntcy)
# SPDX-License-Identifier: Apache-2.0

import json
import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from agntcy_app_sdk.factory import AgntcyFactory
from ioa_observe.sdk.tracing import session_start
from common.version import get_version_info

from config.logging_config import setup_logging
from exchange.agent import ExchangeAgent

setup_logging()
logger = logging.getLogger("mock_interview.exchange.main")
load_dotenv()

factory = AgntcyFactory("mock_interview.exchange", enable_tracing=True)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

exchange_agent = ExchangeAgent(factory=factory)


class PromptRequest(BaseModel):
    prompt: str
    conversation_history: list[dict[str, str]] | None = None


def _build_farm_payload(prompt: str, conversation_history: list[dict[str, str]] | None) -> str:
    """Build JSON payload for farm: start or answer with history."""
    history = conversation_history or []
    prompt_stripped = (prompt or "").strip().lower()
    if prompt_stripped in ("start", "begin", "let's start", "lets start", "") and not history:
        return json.dumps({"message_type": "start"})
    # Already valid JSON with message_type?
    try:
        data = json.loads(prompt)
        if isinstance(data, dict) and data.get("message_type") in ("start", "answer"):
            return prompt
    except (json.JSONDecodeError, TypeError):
        pass
    return json.dumps({
        "message_type": "answer",
        "content": prompt,
        "conversation_history": [{"role": h.get("role", ""), "content": h.get("content", "")} for h in history],
    })


@app.post("/agent/prompt")
async def handle_prompt(request: PromptRequest):
    try:
        with session_start() as session_id:
            payload = _build_farm_payload(request.prompt, request.conversation_history)
            result = await exchange_agent.a2a_client_send_message(payload)
            logger.info("Final result from exchange agent (length=%s)", len(result))
            return {"response": result, "session_id": session_id["executionID"]}
    except ValueError as ve:
        logger.exception("ValueError occurred: %s", ve)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("An error occurred: %s", e)
        raise HTTPException(status_code=500, detail=f"Operation failed: {str(e)}")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/about")
async def version_info():
    props_path = Path(__file__).parent.parent / "about.properties"
    return get_version_info(props_path)


@app.get("/suggested-prompts")
async def get_prompts():
    prompts_path = Path(__file__).parent / "suggested_prompts.json"
    try:
        raw = prompts_path.read_text(encoding="utf-8")
        return json.loads(raw)
    except FileNotFoundError as fnf:
        logger.exception("suggested_prompts.json not found at %s", prompts_path)
        raise HTTPException(status_code=404, detail="suggested_prompts.json not found") from fnf
    except json.JSONDecodeError as jde:
        logger.exception("Invalid JSON in suggested_prompts.json")
        raise HTTPException(status_code=500, detail="Invalid JSON in suggested_prompts.json") from jde


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
