# Server Configuration

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | info |
| `LOG_FILE` | Path to log file | ./logs/server.log |
| `OAUTH_CLIENT_ID` | OAuth client ID | — |
| `OAUTH_CLIENT_SECRET` | OAuth client secret | — |

## Running

```bash
node server/src/unifiedBackend.js
```

## MCP Tools

The server exposes browser control tools via the MCP protocol:
- `navigate` — Navigate to a URL
- `screenshot` — Capture page screenshot
- `click` — Click an element
- `type` — Type into an element
- `evaluate` — Run JavaScript in the page
