# Contributing to Multi-Browser MCP

## Development Setup

```bash
git clone git@github.com:dmorrill/multi-browser-mcp.git
cd multi-browser-mcp
npm install
```

## Running Tests

```bash
npm test
```

## Project Structure

- `server/` — MCP server implementation
  - `src/` — Source modules
  - `tests/` — Unit, integration, and smoke tests
- `extensions/` — Browser extension (Chrome)
  - `chrome/` — Chrome extension source
  - `shared/` — Shared code between extensions
  - `build-chrome.js` — Extension build script

## Pull Requests

1. Create a feature branch
2. Write tests for new functionality
3. Ensure all tests pass
4. Submit a PR with a clear description
