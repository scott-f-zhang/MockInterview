# Copyright AGNTCY Contributors (https://github.com/agntcy)
# SPDX-License-Identifier: Apache-2.0

import os
import re
import sys
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from tests.integration.docker_helpers import up, down
from tests.integration.process_helper import ProcessRunner

AGENTS = {
    "farm": {
        "cmd": ["python", "-m", "farm.farm_server", "--no-reload"],
        "ready_pattern": r"Transport initialized with tracing enabled",
    }
}

_ACTIVE_RUNNERS = []
PROJECT_DIR = Path(__file__).resolve().parents[2]

files = ["docker-compose.yaml"]


def _base_env():
    return {
        **os.environ,
        "PYTHONPATH": str(PROJECT_DIR),
        "ENABLE_HTTP": "true",
    }


def _purge_modules(prefixes):
    to_delete = [m for m in list(sys.modules)
                 if any(m == p or m.startswith(p + ".") for p in prefixes)]
    for m in to_delete:
        sys.modules.pop(m, None)


@pytest.fixture(scope="session", autouse=True)
def orchestrate_session_services():
    print("\n--- Setting up session level service integrations ---")
    up(files, ["slim"])
    up(files, ["nats"])
    print("--- Session level service setup complete ---")
    yield
    down(files)


@pytest.fixture(scope="function")
def transport_config(request):
    return dict(getattr(request, "param", {}) or {})


@pytest.fixture(scope="function")
def agents_up(request, transport_config):
    agent_names = ["farm"]
    runners = []
    for name in agent_names:
        spec = AGENTS.get(name)
        if not spec:
            continue
        env = _base_env()
        env.update(transport_config or {})
        runner = ProcessRunner(
            name=name,
            cmd=spec["cmd"],
            cwd=str(PROJECT_DIR),
            env=env,
            ready_pattern=spec.get("ready_pattern", r"Transport initialized with tracing enabled"),
            timeout_s=30.0,
            log_dir=PROJECT_DIR / ".pytest-logs",
        ).start()
        _ACTIVE_RUNNERS.append(runner)
        runner.wait_ready()
        runners.append(runner)
    try:
        yield
    finally:
        for r in runners:
            r.stop()


@pytest.fixture
def exchange_client(transport_config, monkeypatch):
    for k, v in _base_env().items():
        monkeypatch.setenv(k, str(v))
    for k, v in transport_config.items():
        monkeypatch.setenv(k, v)
    _purge_modules(["exchange", "config.config"])
    import exchange.main as exchange_main
    import importlib
    importlib.reload(exchange_main)
    app = exchange_main.app
    with TestClient(app) as client:
        yield client
