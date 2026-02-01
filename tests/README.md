# Tests

## Integration tests

Requires Docker Compose (slim, nats) and optional farm agent process.

Run from project root:

```bash
cd /path/to/mock_interview
uv sync
uv run pytest tests/integration -v
```
