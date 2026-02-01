# Copyright AGNTCY Contributors (https://github.com/agntcy)
# SPDX-License-Identifier: Apache-2.0

import json
import logging
from pathlib import Path

import pytest

logger = logging.getLogger(__name__)

TRANSPORT_MATRIX = [
    pytest.param(
        {
            "DEFAULT_MESSAGE_TRANSPORT": "SLIM",
            "TRANSPORT_SERVER_ENDPOINT": "http://127.0.0.1:46357",
        },
        id="SLIM",
    ),
]


def load_prompt_cases():
    data_file = Path(__file__).parent / "prompt_cases.json"
    with data_file.open() as f:
        raw = json.load(f)
    return raw.get("cases", [])


PROMPT_CASES = load_prompt_cases()


@pytest.mark.parametrize("transport_config", TRANSPORT_MATRIX, indirect=True)
@pytest.mark.parametrize("prompt_case", PROMPT_CASES, ids=[c["id"] for c in PROMPT_CASES])
class TestMockInterviewAgent:
    @pytest.mark.usefixtures("agents_up")
    def test_mock_interview_flow(self, exchange_client, transport_config, prompt_case):
        payload = {"prompt": prompt_case["prompt"]}
        if "conversation_history" in prompt_case:
            payload["conversation_history"] = prompt_case["conversation_history"]
        if "resume" in prompt_case:
            payload["resume"] = prompt_case["resume"]
        if "job_description" in prompt_case:
            payload["job_description"] = prompt_case["job_description"]
        resp = exchange_client.post("/agent/prompt", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "response" in data
        assert len(data["response"]) > 0
