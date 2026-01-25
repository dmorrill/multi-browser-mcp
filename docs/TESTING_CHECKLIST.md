# Multi-Browser MCP Testing Checklist

**Date:** January 25, 2026
**Tester:**
**Browser:** Google Chrome version ______ (Chrome only — other browsers not supported)
**OS:** macOS / Windows / Linux

---

## Pre-Testing Setup

### Build & Install

- [ ] **Clone repo:** `git clone https://github.com/dmorrill/multi-browser-mcp.git`
- [ ] **Install server deps:** `cd server && npm install`
- [ ] **Build Chrome extension:** `cd extensions/chrome && npm install && npm run build`
- [ ] **Extension loads:** Load `extensions/chrome/dist` at `chrome://extensions/`
- [ ] **Extension icon visible:** Multi-Browser MCP icon appears in Chrome toolbar

### Configuration

- [ ] **Claude Code configured:** `claude mcp add multi-browser -- node /path/to/server/cli.js`
- [ ] **Server starts:** Running `node server/cli.js` shows output without errors
- [ ] **Extension connects:** Clicking extension icon shows "Connected" status

---

## Part 1: Single-Session Mode (Backward Compatibility)

> Test that the original Blueprint MCP functionality still works

### 1.1 Basic Navigation

- [ ] **Create tab:** `browser_tabs action="new" url="https://example.com"`
- [ ] **Tab created:** New tab opens with example.com
- [ ] **Screenshot works:** `browser_take_screenshot` returns an image
- [ ] **Snapshot works:** `browser_snapshot` returns accessibility tree
- [ ] **Navigate:** `browser_navigate action="url" url="https://github.com"`
- [ ] **Page changed:** Tab now shows GitHub

### 1.2 Interaction

- [ ] **Click element:** `browser_click selector="a"` (any link)
- [ ] **Type text:** Navigate to a search page, `browser_type selector="input" text="test"`
- [ ] **Press key:** `browser_press_key key="Enter"`
- [ ] **Actions executed:** Search results appear

### 1.3 Tab Management

- [ ] **List tabs:** `browser_tabs action="list"` shows all open tabs
- [ ] **Attach to tab:** `browser_tabs action="attach" index=0`
- [ ] **Close tab:** `browser_tabs action="close"`
- [ ] **Tab closed:** Tab is removed

### 1.4 Focus Tab (New Feature)

- [ ] **Create and navigate away:** Create a tab, manually switch to another Chrome tab
- [ ] **Focus command:** `browser_tabs action="focus"`
- [ ] **Tab focused:** Multi-Browser MCP tab comes to foreground

---

## Part 2: Multi-Session Mode

> Enable multi-session mode and test parallel sessions

### 2.0 Enable Multi-Session

- [ ] **Enable in console:** `chrome.storage.local.set({ multiSessionMode: true })`
- [ ] **Reload extension:** Click refresh on chrome://extensions/
- [ ] **Verify enabled:** `chrome.storage.local.get(['multiSessionMode'], console.log)` shows `true`
- [ ] **Check logs:** Extension service worker shows `[MultiSession]` messages

### 2.1 Two Sessions - Basic

**Setup:**
- [ ] **Terminal 1:** Start Claude Code session
- [ ] **Terminal 2:** Start Claude Code session
- [ ] **Both connect:** Each shows MCP server connected

**Port allocation:**
- [ ] **Terminal 1 port:** Note port (should be 5555 or next available) ______
- [ ] **Terminal 2 port:** Note port (should be 5556 or next available) ______
- [ ] **Ports different:** Each session got a unique port

**Independent navigation:**
- [ ] **T1 navigate:** `browser_tabs action="new" url="https://github.com"`
- [ ] **T2 navigate:** `browser_tabs action="new" url="https://stripe.com"`
- [ ] **T1 screenshot:** Shows GitHub
- [ ] **T2 screenshot:** Shows Stripe
- [ ] **No interference:** Neither navigation affected the other

### 2.2 Session Indicators (Badges)

- [ ] **T1 badge visible:** Tab shows green badge with 2-char session ID
- [ ] **T2 badge visible:** Different tab shows different session ID
- [ ] **Badge color:** Both are green (connected)
- [ ] **Badge text:** First 2 chars of session ID (e.g., "a3", "b7")

### 2.3 Focus Tab Across Sessions

- [ ] **T1 focus:** From Terminal 1, `browser_tabs action="focus"`
- [ ] **GitHub focused:** GitHub tab comes to front
- [ ] **T2 focus:** From Terminal 2, `browser_tabs action="focus"`
- [ ] **Stripe focused:** Stripe tab comes to front
- [ ] **Correct routing:** Each terminal focuses its own tab

### 2.4 Session Listing

- [ ] **List sessions:** From any terminal, `browser_sessions action="list"`
- [ ] **Shows both:** Output lists both sessions with ports and tabs
- [ ] **Current marked:** Current session is indicated
- [ ] **Tab info shown:** Each session shows its attached tab title/URL

### 2.5 Three Sessions

- [ ] **Terminal 3:** Start third Claude Code session
- [ ] **Port 5557:** Gets the next available port
- [ ] **T3 navigate:** `browser_tabs action="new" url="https://mail.google.com"`
- [ ] **All independent:** Three tabs, three sessions, no conflicts
- [ ] **List shows 3:** `browser_sessions action="list"` shows all three

### 2.6 Session Disconnect

**Test graceful disconnect:**
- [ ] **Close Terminal 2:** Ctrl+C or close the terminal window
- [ ] **T2 badge changes:** Stripe tab badge turns red with ✕
- [ ] **T2 tab stays open:** Tab is not closed
- [ ] **T1 still works:** `browser_take_screenshot` from Terminal 1 still works
- [ ] **T3 still works:** `browser_take_screenshot` from Terminal 3 still works

**Test reconnect:**
- [ ] **New Terminal 2:** Start new Claude Code session
- [ ] **Gets new port:** May reuse 5556 or get new port
- [ ] **Creates new tab:** Previous Stripe tab still has red badge (orphaned)
- [ ] **New session works:** Can navigate and screenshot normally

### 2.7 Session Cleanup

- [ ] **Close specific:** `browser_sessions action="close" port=5556`
- [ ] **Tab closed:** That session's tab is removed
- [ ] **Close all others:** `browser_sessions action="close_all"`
- [ ] **Only current remains:** All other sessions' tabs closed, yours stays

---

## Part 3: Shared Authentication

> Verify sessions share Chrome's authenticated state

### 3.1 Gmail (requires being logged into Gmail)

- [ ] **T1 Gmail:** `browser_navigate action="url" url="https://mail.google.com"`
- [ ] **T1 logged in:** Shows inbox, not login page
- [ ] **T2 Gmail:** From Terminal 2, navigate to Gmail
- [ ] **T2 logged in:** Also shows inbox without login prompt
- [ ] **Same account:** Both sessions see same Gmail account

### 3.2 GitHub (requires being logged into GitHub)

- [ ] **T1 notifications:** Navigate to `https://github.com/notifications`
- [ ] **T1 authenticated:** Shows notifications, not login
- [ ] **T2 profile:** Navigate to `https://github.com/settings/profile`
- [ ] **T2 authenticated:** Shows profile settings, not login

### 3.3 Stripe (if logged in)

- [ ] **Session 1:** Navigate to Stripe dashboard
- [ ] **Session 2:** Navigate to Stripe customers
- [ ] **Both authenticated:** Neither requires login

---

## Part 4: Edge Cases & Error Handling

### 4.1 Manual Tab Close

- [ ] **Create tab:** From Terminal 1, create a tab
- [ ] **Close manually:** Click X on the Chrome tab
- [ ] **Session handles it:** Next command shows "no tab attached" or similar
- [ ] **Can recover:** `browser_tabs action="new"` creates new tab

### 4.2 Extension Disable

- [ ] **Disable extension:** Toggle off at chrome://extensions/
- [ ] **Command fails:** Next browser command shows connection error
- [ ] **Clear error message:** Error explains extension is disconnected
- [ ] **Re-enable:** Toggle extension back on
- [ ] **Reconnects:** Commands work again (may need to restart Claude session)

### 4.3 Server Crash

- [ ] **Kill server:** `pkill -f "node.*cli.js"` or Ctrl+C
- [ ] **Extension handles it:** Badge should change or show disconnected
- [ ] **Restart server:** Start a new Claude Code session
- [ ] **Reconnects:** Can use browser tools again

### 4.4 Port Exhaustion (if testing thoroughly)

- [ ] **Start many sessions:** Open 5+ Claude Code terminals
- [ ] **All get ports:** Each gets a unique port in 5555-5654 range
- [ ] **Close some:** Close a few terminals
- [ ] **Ports reused:** New sessions can reuse freed ports

---

## Part 5: Performance

### 5.1 Response Time

- [ ] **Single session screenshot:** Time: ______ seconds
- [ ] **With 3 sessions screenshot:** Time: ______ seconds
- [ ] **Acceptable:** < 3 seconds for screenshot

### 5.2 Memory Usage

- [ ] **Check Chrome memory:** Open Chrome Task Manager (Shift+Esc)
- [ ] **Extension memory:** Note Multi-Browser MCP memory usage: ______ MB
- [ ] **After 10 minutes:** Memory stable, no significant growth

---

## Test Results Summary

| Category | Passed | Failed | Notes |
|----------|--------|--------|-------|
| Single-Session Mode | /9 | | |
| Multi-Session Basic | /15 | | |
| Shared Auth | /8 | | |
| Edge Cases | /8 | | |
| Performance | /3 | | |
| **TOTAL** | /43 | | |

**Note:** Chrome only. Firefox, Edge, Safari, and other browsers are not supported.

---

## Issues Found

| # | Description | Severity | Steps to Reproduce |
|---|-------------|----------|-------------------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## Notes

```
(Add any observations, unexpected behaviors, or suggestions here)


```

---

**Testing completed:** [ ] Yes / [ ] No
**Ready for contribution to upstream:** [ ] Yes / [ ] No
**Blockers:**
