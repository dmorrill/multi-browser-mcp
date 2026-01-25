# Multi-Browser MCP

> Run multiple AI-powered browser sessions simultaneously — without losing your logins

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-blue.svg)](#installation)

## The Problem

If you use [Claude Code](https://claude.ai/claude-code) (or similar AI coding assistants) with browser automation, you've hit this wall: **you can only run one session at a time.**

Open a second Claude Code session that needs the browser? They fight over the same window. One navigates to Stripe, the other to Sentry, and both break.

**Multi-Browser MCP fixes this.** Each AI session gets its own browser tab while sharing your authenticated state — no re-logging into Gmail, Stripe, or GitHub.

---

## Quick Start

### Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org/)
- **Chrome** — Multi-session mode currently Chrome-only (Edge/Opera untested, Firefox not yet supported)
- **Claude Code** — [Install](https://claude.ai/claude-code) or use Claude Desktop

### Step 1: Clone and Build

```bash
# Clone the repository
git clone https://github.com/dmorrill/multi-browser-mcp.git
cd multi-browser-mcp

# Install server dependencies
cd server && npm install && cd ..

# Build Chrome extension
cd extensions/chrome && npm install && npm run build && cd ../..
```

### Step 2: Load the Chrome Extension

1. Open **chrome://extensions/** in Chrome
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extensions/chrome/dist` folder

### Step 3: Enable Multi-Session Mode

Open Chrome DevTools Console (`Cmd+Option+J` on Mac, `Ctrl+Shift+J` on Windows/Linux):

```javascript
chrome.storage.local.set({ multiSessionMode: true })
```

Then **reload the extension** (click the refresh icon on chrome://extensions/).

### Step 4: Configure Claude Code

```bash
# Add the MCP server to Claude Code
claude mcp add multi-browser -- node /path/to/multi-browser-mcp/server/cli.js

# Or with npx (once published)
# claude mcp add multi-browser -- npx @dmorrill/multi-browser-mcp
```

### Step 5: Test It!

Open multiple terminals and start Claude Code in each:

```bash
# Terminal 1
claude
> "Navigate to github.com and take a screenshot"

# Terminal 2
claude
> "Navigate to stripe.com and take a screenshot"

# Terminal 1
> "Focus my tab"  # Brings GitHub tab to front
> "List browser sessions"  # Shows both sessions
```

---

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| [Node.js](https://nodejs.org/) | 18+ | Runtime for MCP server |
| [Chrome](https://www.google.com/chrome/) / [Edge](https://www.microsoft.com/edge) / [Opera](https://www.opera.com/) | Latest | Browser with extension support |
| [Claude Code](https://claude.ai/claude-code) or [Claude Desktop](https://claude.ai/download) | Latest | MCP client |

### Server Dependencies (installed automatically)

- `ws` — WebSocket server
- `@anthropic-ai/sdk` — MCP protocol support

### Extension Dependencies (installed automatically)

- `vite` — Build tool
- Chrome Extension Manifest V3 APIs

---

## Features

### Multi-Session Support
Run multiple Claude Code sessions, each controlling its own browser tab:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Claude Code #1  │     │ Claude Code #2  │     │ Claude Code #3  │
│  Port 5555      │     │  Port 5556      │     │  Port 5557      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Chrome Extension      │
                    │  (Multi-Session Mgr)    │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────▼────────┐ ┌──────▼───────┐ ┌───────▼───────┐
     │ Tab: GitHub     │ │ Tab: Stripe  │ │ Tab: Gmail    │
     │ Badge: "a3" 🟢  │ │ Badge: "b7" 🟢│ │ Badge: "d1" 🟢│
     └─────────────────┘ └────────────────┘ └───────────────┘
```

### Shared Authentication
All sessions share your Chrome profile — logged into Gmail once, every session can use it.

### Session Indicators
Each tab shows a colored badge:
- **🟢 Green + Session ID** — Connected (e.g., "a3")
- **🔴 Red + ✕** — Disconnected (tab stays open)

### Focus Tab Command
Lost track of which tab belongs to which terminal?
```
You: "Focus my tab"
Claude: *brings your session's tab to the foreground*
```

### Session Management
```
You: "List browser sessions"
Claude: Shows all active sessions with ports and tabs

You: "Close all other sessions"
Claude: Closes tabs from other sessions, keeps yours
```

---

## Real-World Use Cases

### Parallel Frontend Testing (Git Worktrees)
```
Terminal 1: claude (worktree: feature/dashboard)
  → Browser Tab 1: localhost:3001

Terminal 2: claude (worktree: bugfix/login)
  → Browser Tab 2: localhost:3002

Terminal 3: claude (worktree: feature/settings)
  → Browser Tab 3: localhost:3003
```

### Daily Operations
```
Session 1: Health checks (Sentry, Stripe, Support inbox)
Session 2: Development (Testing, GitHub PRs)
Session 3: Research (Docs, competitor analysis)
```

### Multi-Account Email
```
Session 1: support@company.com
Session 2: me@gmail.com
Session 3: sales@company.com
```

---

## Available Tools

### Tab Management
- `browser_tabs` — List, create, attach, close, or **focus** tabs
- `browser_sessions` — List/close sessions (multi-session mode)

### Navigation
- `browser_navigate` — Go to URL, back, forward, reload
- `browser_snapshot` — Get page content (accessibility tree)
- `browser_take_screenshot` — Capture visual screenshot

### Interaction
- `browser_click` — Click elements
- `browser_type` — Type text
- `browser_fill_form` — Fill multiple form fields
- `browser_select_option` — Select dropdown options
- `browser_press_key` — Press keyboard keys

### Advanced
- `browser_evaluate` — Run JavaScript
- `browser_console_messages` — Get console logs
- `browser_network_requests` — Monitor network activity
- `browser_handle_dialog` — Handle alerts/confirms

[Full tool documentation →](docs/TOOLS.md)

---

## Why Not Use...

| Solution | Problem |
|----------|---------|
| **[BrowserMCP](https://browsermcp.io)** | Closed source extension, can't build from source, single-instance only |
| **[concurrent-browser-mcp](https://github.com/punkpeye/concurrent-browser-mcp)** | Uses Playwright — must re-login to every service in each instance |
| **Playwright/Puppeteer** | Headless, no auth persistence, detected as bot |

**Multi-Browser MCP:** Open source, uses your real browser profile, shares auth across sessions.

---

## Configuration

### Environment Variables

```bash
# Optional: Custom starting port (default: 5555)
MCP_PORT=5555

# Optional: Enable debug logging
DEBUG=true
```

### Command Line Options

```bash
node server/cli.js --debug              # Verbose logging
node server/cli.js --port 8080          # Custom port
```

### Port Range

Multi-session mode scans ports **5555-5654** for available servers. Each Claude Code session auto-selects the next available port.

---

## Troubleshooting

### Extension won't connect
1. Check the extension is loaded at `chrome://extensions/`
2. Click the extension icon — should show connection status
3. Verify MCP server is running: `lsof -i :5555`
4. Reload the extension

### "Port already in use"
Another MCP server is running. Either:
```bash
# Kill existing process
lsof -ti:5555 | xargs kill -9

# Or use a different port
node server/cli.js --port 5556
```

### Multi-session not working
1. Verify multi-session mode is enabled:
   ```javascript
   // In Chrome DevTools Console
   chrome.storage.local.get(['multiSessionMode'], console.log)
   // Should show: {multiSessionMode: true}
   ```
2. Reload the extension after enabling
3. Check extension service worker logs for `[MultiSession]` messages

### Badge not showing
The badge only appears on tabs that are attached to a session. Use `browser_tabs` to attach to a tab first.

---

## Development

### Project Structure
```
multi-browser-mcp/
├── server/                 # MCP Server (Node.js)
│   ├── cli.js              # Entry point
│   └── src/
│       ├── statefulBackend.js
│       ├── unifiedBackend.js
│       └── extensionServer.js
├── extensions/
│   ├── chrome/             # Chrome extension
│   │   └── src/
│   │       └── background-module.js
│   └── shared/             # Shared code
│       ├── connection/
│       │   └── multiSession.js
│       └── handlers/
│           ├── tabs.js
│           └── sessionTabs.js
└── docs/
    └── TEST_PLAN.md
```

### Running in Development

```bash
# Terminal 1: Start server with debug logging
cd server && node cli.js --debug

# Terminal 2: Watch extension changes
cd extensions/chrome && npm run dev
```

### Running Tests
```bash
cd server && npm test
```

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Priority areas:**
- Firefox extension support
- Improved session management UI
- Performance optimization for many concurrent sessions

---

## Credits

This is a fork of [Blueprint MCP](https://github.com/railsblueprint/blueprint-mcp) by Rails Blueprint. We've added multi-instance support while maintaining compatibility with the original feature set.

---

## License

[Apache License 2.0](LICENSE)

---

## Links

- **GitHub:** [github.com/dmorrill/multi-browser-mcp](https://github.com/dmorrill/multi-browser-mcp)
- **Issues:** [Report a bug](https://github.com/dmorrill/multi-browser-mcp/issues)
- **Upstream:** [Blueprint MCP](https://github.com/railsblueprint/blueprint-mcp)

---

**Built with 🤖 by [Elle Morrill](https://github.com/dmorrill)** — solving the "one browser session" problem for AI-powered development
