"""Version and dependency utilities for Mock Interview exchange service."""

import configparser
import logging
import re
from pathlib import Path
import subprocess
from typing import Optional

try:
    import tomllib
except Exception:
    tomllib = None

logger = logging.getLogger(__name__)

DISPLAY_NAMES = {
    "agntcy-app-sdk": "AGNTCY App SDK",
    "a2a-sdk": "A2A",
    "ioa-observe-sdk": "Observe SDK",
    "langgraph": "LangGraph",
}


def _extract_name_and_version(spec: str):
    base = spec.split(";", 1)[0].strip().split("[", 1)[0].strip()
    match = re.search(r"(==|>=)\s*([^;\s]+)", base)
    if match:
        op, ver = match.group(1), match.group(2)
        name = base.split(op)[0].strip()
        return name, op, ver
    return base, "", ""


def get_dependencies():
    dependencies = {}
    try:
        pyproject_path = Path(__file__).parent.parent / "pyproject.toml"
        if pyproject_path.exists() and tomllib is not None:
            with open(pyproject_path, "rb") as f:
                data = tomllib.load(f)
            for dep in data.get("project", {}).get("dependencies", []):
                name, op, ver = _extract_name_and_version(dep)
                display = DISPLAY_NAMES.get(name)
                if display:
                    dependencies[display] = f"v{ver}" if op == "==" else f">= v{ver}"
        compose_path = Path(__file__).parent.parent / "docker-compose.yaml"
        if compose_path.exists():
            with open(compose_path) as f:
                m = re.search(r"ghcr\.io/agntcy/slim:(\d+\.\d+\.\d+)", f.read())
                if m:
                    dependencies["SLIM"] = f"v{m.group(1)}"
    except Exception as e:
        logger.error(f"Error parsing dependencies: {e}")
    return dependencies


def _find_git_root(start: Path) -> Optional[Path]:
    try:
        for ancestor in [start.resolve(), *start.resolve().parents]:
            if (ancestor / ".git").exists():
                return ancestor
    except Exception:
        pass
    return None


def get_latest_tag_and_date(start: Optional[Path] = None) -> Optional[dict]:
    try:
        start = start or Path(__file__).parent
        git_root = _find_git_root(start)
        if not git_root:
            return None
        out = subprocess.check_output(
            ["git", "for-each-ref", "--sort=-creatordate",
             "--format=%(refname:short)\t%(creatordate:iso8601)\t%(creatordate:unix)",
             "refs/tags"], cwd=git_root, text=True, stderr=subprocess.DEVNULL
        ).strip()
        if not out:
            return None
        parts = out.splitlines()[0].split("\t")
        return {"tag": parts[0], "created_iso": parts[1], "created_unix": parts[2]} if len(parts) >= 3 else None
    except Exception as e:
        logger.debug(f"Git fallback failed: {e}")
        return None


def _format_build_date(build_date: str) -> str:
    if build_date == "unknown":
        return build_date
    for sep in (" ", "T"):
        if sep in build_date and re.match(r"^\d{4}-\d{2}-\d{2}$", build_date.split(sep)[0]):
            return build_date.split(sep)[0]
    return build_date if re.match(r"^\d{4}-\d{2}-\d{2}$", build_date) else build_date


def get_version_info(properties_file_path: Path, app_name: str = "mock-interview-exchange", service_name: str = "mock-interview-exchange") -> dict:
    try:
        if properties_file_path.exists():
            config = configparser.ConfigParser()
            with open(properties_file_path) as f:
                config.read_string("[DEFAULT]\n" + f.read())
            props = dict(config["DEFAULT"])
            version = props.get("build.version", "unknown")
            build_date = props.get("build.date", "unknown")
            build_ts = props.get("build.timestamp", "unknown")
            image_name = props.get("image.name", "unknown")
            image_tag = props.get("image.tag", "unknown")
            image = f"{image_name}:{image_tag}" if image_name != "unknown" and image_tag != "unknown" else image_name
            if version == "unknown" or build_date == "unknown":
                git_info = get_latest_tag_and_date(properties_file_path)
                if git_info:
                    if version == "unknown":
                        version = git_info.get("tag", version)
                    if build_date == "unknown":
                        build_date = git_info.get("created_iso", build_date)
            return {
                "app": props.get("app.name", app_name),
                "service": props.get("app.service", service_name),
                "version": version,
                "build_date": _format_build_date(build_date),
                "build_timestamp": build_ts,
                "image": image,
                "dependencies": get_dependencies(),
            }
        git_info = get_latest_tag_and_date(properties_file_path)
        if git_info:
            return {
                "app": app_name,
                "service": service_name,
                "version": git_info.get("tag", "unknown"),
                "build_date": _format_build_date(git_info.get("created_iso", "unknown")),
                "build_timestamp": git_info.get("created_unix", "unknown"),
                "image": "unknown",
                "dependencies": get_dependencies(),
            }
        return {
            "app": app_name,
            "service": service_name,
            "version": "unknown",
            "build_date": "unknown",
            "build_timestamp": "unknown",
            "image": "unknown",
            "dependencies": get_dependencies(),
        }
    except Exception as e:
        logger.error(f"Error getting version info: {e}")
        return {
            "app": app_name,
            "service": service_name,
            "version": "unknown",
            "build_date": "unknown",
            "build_timestamp": "unknown",
            "image": "unknown",
            "dependencies": {},
        }
