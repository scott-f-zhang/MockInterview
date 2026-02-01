# Copyright AGNTCY Contributors (https://github.com/agntcy)
# SPDX-License-Identifier: Apache-2.0

import time
import json
import subprocess
from pathlib import Path
from typing import List, Optional, Tuple

PROJECT_DIR = Path(__file__).resolve().parents[2]


def _compose_cmd(files: List[str]) -> List[str]:
    cmd = ["docker", "compose"]
    for f in files:
        if f.strip():
            compose_file = (PROJECT_DIR / f.strip()).resolve()
            cmd += ["-f", str(compose_file)]
    return cmd


def _run(cmd: List[str]):
    print(">", " ".join(cmd))
    result = subprocess.run(cmd, check=True, cwd=PROJECT_DIR, capture_output=True, text=True)
    return result


def up(files: List[str], services: List[str]):
    _run(_compose_cmd(files) + ["config", "--images"])
    cmd = _compose_cmd(files) + ["up", "-d", "--build"] + services
    _run(cmd)
    time.sleep(0.5)
    for svc in services:
        wait_for_service(files, svc)


def down(files: List[str]):
    cmd = _compose_cmd(files) + ["down", "-v"]
    _run(cmd)


def _container_id(files: List[str], service: str) -> str:
    cmd = _compose_cmd(files) + ["ps", "-a", "-q", service]
    res = subprocess.run(cmd, capture_output=True, text=True, cwd=PROJECT_DIR)
    cid = res.stdout.strip()
    if res.returncode == 0 and cid:
        return cid
    raise RuntimeError(f"No container id found for service '{service}'.")


def _inspect_state_health(container_id: str) -> Tuple[str, Optional[str]]:
    res = subprocess.run(["docker", "inspect", container_id], capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"docker inspect failed: {res.stderr.strip()}")
    data = json.loads(res.stdout)[0]
    state = data.get("State", {})
    status = state.get("Status")
    health = state.get("Health", {}).get("Status") if "Health" in state else None
    return status, health


def wait_for_service(files: List[str], service: str, timeout: float = 30.0, poll: float = 0.5):
    deadline = time.time() + timeout
    cid = _container_id(files, service)
    while time.time() < deadline:
        state, health = _inspect_state_health(cid)
        if state in {"exited", "dead"}:
            raise RuntimeError(f"Service '{service}' exited (state={state}).")
        if health == "healthy" or (not health and state == "running"):
            return
        time.sleep(poll)
    raise RuntimeError(f"Timed out waiting for service '{service}'.")
