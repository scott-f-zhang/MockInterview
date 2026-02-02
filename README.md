# Mock Interview Platform

![](https://share.cleanshot.com/Grhv90NB+)
![](https://share.cleanshot.com/gPyTnBnM+)

Mock interview agent project: combines resume + JD (optional), video/audio/text inputs (later), and feedback. Based on [CoffeeAGNTCY Corto](https://github.com/agntcy/coffeeAgntcy) template.

## Structure

- **exchange/** – Client (FastAPI) that builds interview payloads and calls the farm via A2A
- **farm/** – A2A agent with Interviewer + Evaluator (text-only flow); graph: Parse → Evaluator → Interviewer or Interviewer only
- **common/** – LLM setup, version helpers
- **config/** – Config and Docker (SLIM, OTEL)
- **docker/** – Dockerfiles for farm, exchange, UI
- **exchange/frontend/** – React/Vite UI (suggested prompts, conversation with history)

## Prerequisites

- Docker and Docker Compose
- Node.js ≥ 16 (for local frontend dev)
- [uv](https://github.com/astral-sh/uv) (Python): `brew install uv`

## Setup

1. Clone or copy this repo, then from the project root:

   ```bash
   cd /path/to/mock_interview
   cp .env.example .env
   ```

2. Edit `.env`: set `LLM_MODEL` and `OPENAI_API_KEY` (or your provider). For MCE/observability, set `OPENAI_ENDPOINT` and `OPENAI_MODEL_NAME` if you use the full stack.

3. Generate lockfile (optional but recommended):

   ```bash
   uv lock
   ```

## Run with Docker Compose

From the project root:

```bash
docker compose up --build
```

- **UI:** http://localhost:3000  
- **Exchange API:** http://localhost:8000  
- **Grafana:** http://localhost:3001 (admin/admin)

## Run locally (no Docker)

1. Start transport and optional observability:

   ```bash
   docker compose up -d slim nats
   # optional: clickhouse-server otel-collector grafana
   ```

2. From project root:

   ```bash
   export PYTHONPATH=.
   uv sync
   uv run python farm/farm_server.py &
   uv run python exchange/main.py
   ```

3. For the UI, from `exchange/frontend/`: `npm install && npm run dev`

## Implementation status

- **Done**: Interviewer + Evaluator (text-only); exchange builds payload with `message_type` ("start" | "answer") and `conversation_history`; frontend sends history.
- **Done**: Context (resume + JD): optional `resume` and `job_description` in API and farm; Interviewer and Evaluator use them for context-aware questions and feedback; Sidebar has collapsible "Context (resume + JD)" with text areas.
- **Next**: Video/audio pipeline or Multimodal Agent. See `Plan.md`.

## References

- [AGNTCY app-sdk](https://github.com/agntcy/app-sdk)
- [CoffeeAGNTCY](https://github.com/agntcy/coffeeAgntcy) (Corto / Lungo)
