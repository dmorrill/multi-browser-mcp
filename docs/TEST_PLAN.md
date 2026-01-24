# Multi-Browser MCP Test Plan

This test plan validates that Multi-Browser MCP delivers on its core promises:
1. Multiple Claude Code sessions can use the browser simultaneously
2. Sessions don't interfere with each other
3. All sessions share authenticated state (no re-login required)

## Prerequisites

Before testing:
- [x] Multi-instance support is implemented (completed Jan 2026)
- [ ] Extension is built and loadable
- [ ] Multi-session mode enabled in extension (see README)
- [ ] MCP server runs locally
- [ ] Chrome browser with logged-in sessions (Gmail, GitHub, etc.)

---

## Test Suite 1: Basic Multi-Session Functionality

### Test 1.1: Two Sessions, Independent Navigation

**Goal:** Verify two Claude Code sessions can navigate independently without conflicts.

**Setup:**
1. Open Terminal 1, start Claude Code session
2. Open Terminal 2, start Claude Code session
3. Both sessions should connect to Multi-Browser MCP

**Steps:**
```
Terminal 1: "Navigate to https://github.com"
Terminal 2: "Navigate to https://google.com"
Terminal 1: "Take a screenshot"
Terminal 2: "Take a screenshot"
```

**Expected:**
- [ ] Terminal 1 screenshot shows GitHub
- [ ] Terminal 2 screenshot shows Google
- [ ] Neither session interrupted the other

**Failure indicators:**
- Screenshot shows wrong site
- "WebSocket error" or connection issues
- One session's navigation affects the other

---

### Test 1.2: Three Sessions, Rapid Switching

**Goal:** Verify the system handles three concurrent sessions with rapid commands.

**Setup:**
1. Open three terminal sessions with Claude Code
2. All connected to Multi-Browser MCP

**Steps:**
```
Terminal 1: "Navigate to https://example.com"
Terminal 2: "Navigate to https://httpbin.org"
Terminal 3: "Navigate to https://jsonplaceholder.typicode.com"

# Rapid fire (send all within 5 seconds)
Terminal 1: "Click the 'More information' link"
Terminal 2: "Take a screenshot"
Terminal 3: "Get the page title"
Terminal 1: "Take a screenshot"
```

**Expected:**
- [ ] All commands execute in their respective windows
- [ ] No cross-contamination of state
- [ ] All responses return to correct session

---

### Test 1.3: Session Disconnect and Reconnect

**Goal:** Verify one session disconnecting doesn't affect others.

**Setup:**
1. Three active sessions, each on a different site

**Steps:**
```
Terminal 1: "Navigate to https://github.com"
Terminal 2: "Navigate to https://google.com"
Terminal 3: "Navigate to https://example.com"

# Close Terminal 2 (Ctrl+C or close window)

Terminal 1: "Take a screenshot"
Terminal 3: "Take a screenshot"

# Reopen Terminal 2 with new Claude Code session
Terminal 2: "Navigate to https://stripe.com"
Terminal 2: "Take a screenshot"
```

**Expected:**
- [ ] Terminal 1 and 3 continue working after Terminal 2 closes
- [ ] New Terminal 2 session gets fresh browser window
- [ ] No orphaned windows from old sessions

---

## Test Suite 2: Shared Authentication State

### Test 2.1: Gmail Access Across Sessions

**Goal:** Verify all sessions can access authenticated Gmail without re-login.

**Prerequisite:** Logged into Gmail in Chrome

**Steps:**
```
Terminal 1: "Navigate to https://mail.google.com and take a screenshot"
Terminal 2: "Navigate to https://mail.google.com and take a screenshot"
Terminal 3: "Navigate to https://mail.google.com and take a screenshot"
```

**Expected:**
- [ ] All three screenshots show logged-in Gmail inbox
- [ ] No login prompts in any session
- [ ] Each session shows the same account

---

### Test 2.2: GitHub Authenticated Actions

**Goal:** Verify authenticated GitHub actions work across sessions.

**Prerequisite:** Logged into GitHub in Chrome

**Steps:**
```
Terminal 1: "Navigate to https://github.com/notifications"
Terminal 2: "Navigate to https://github.com/settings/profile"
Terminal 1: "Take a screenshot"
Terminal 2: "Take a screenshot"
```

**Expected:**
- [ ] Terminal 1 shows notifications (not login page)
- [ ] Terminal 2 shows profile settings (not login page)
- [ ] Both show same authenticated user

---

### Test 2.3: Stripe Dashboard Access

**Goal:** Verify Stripe authentication is shared.

**Prerequisite:** Logged into Stripe in Chrome

**Steps:**
```
Terminal 1: "Navigate to https://dashboard.stripe.com/payments"
Terminal 2: "Navigate to https://dashboard.stripe.com/customers"
```

**Expected:**
- [ ] Both sessions access Stripe without login
- [ ] Each session shows different Stripe pages
- [ ] No authentication errors

---

## Test Suite 3: Real Workflow Scenarios

### Test 3.1: Parallel Frontend Testing (Git Worktrees)

**Goal:** Simulate the git worktrees use case from README.

**Setup:**
1. Run three local dev servers on different ports (or use three different sites)
2. Open three Claude Code sessions

**Steps:**
```
Terminal 1: "Navigate to http://localhost:3001 and describe what you see"
Terminal 2: "Navigate to http://localhost:3002 and describe what you see"
Terminal 3: "Navigate to http://localhost:3003 and describe what you see"

Terminal 1: "Click the main navigation menu"
Terminal 2: "Fill in the login form with test@example.com"
Terminal 3: "Take a screenshot of the current page"
```

**Expected:**
- [ ] Each session controls its own localhost port
- [ ] Actions in one don't affect others
- [ ] All interactions complete successfully

---

### Test 3.2: Multi-Project Operations

**Goal:** Simulate the daily operations workflow.

**Steps:**
```
# Session 1: Health checks
Terminal 1: "Navigate to https://sentry.io and take a screenshot"

# Session 2: Development
Terminal 2: "Navigate to https://github.com/[your-repo]/pulls and take a screenshot"

# Session 3: Research
Terminal 3: "Navigate to https://docs.anthropic.com and take a screenshot"

# Continue working in parallel
Terminal 1: "Click on the first error in the list"
Terminal 2: "Click on the first open PR"
Terminal 3: "Search for 'MCP protocol'"
```

**Expected:**
- [ ] All three workflows proceed independently
- [ ] No session blocks another
- [ ] State is preserved in each window

---

### Test 3.3: Email Triage Across Accounts

**Goal:** Verify multiple email accounts can be accessed (if signed into multiple in Chrome).

**Note:** This requires Chrome profiles or being signed into multiple Google accounts.

**Steps:**
```
Terminal 1: "Navigate to https://mail.google.com/mail/u/0/ and take a screenshot"
Terminal 2: "Navigate to https://mail.google.com/mail/u/1/ and take a screenshot"
```

**Expected:**
- [ ] Each session shows different account (if available)
- [ ] Or same account in separate windows
- [ ] No login prompts

---

## Test Suite 4: Edge Cases and Error Handling

### Test 4.1: Maximum Sessions

**Goal:** Verify behavior at session limits.

**Steps:**
1. Open 5+ Claude Code sessions
2. All attempt to use browser

**Expected:**
- [ ] Clear error message if limit exceeded
- [ ] Or graceful handling of many sessions
- [ ] No crashes or hangs

---

### Test 4.2: Browser Window Closed Externally

**Goal:** Verify handling when user closes a browser window manually.

**Steps:**
```
Terminal 1: "Navigate to https://example.com"
# Manually close the browser window
Terminal 1: "Take a screenshot"
```

**Expected:**
- [ ] Clear error message about lost window
- [ ] Session can recover (open new window or reconnect)
- [ ] Other sessions unaffected

---

### Test 4.3: Extension Disabled Mid-Session

**Goal:** Verify behavior when extension is disabled.

**Steps:**
1. Start session, navigate to a page
2. Disable extension in Chrome
3. Try to take screenshot

**Expected:**
- [ ] Clear error message
- [ ] Instructions for re-enabling
- [ ] No hung processes

---

### Test 4.4: Network Interruption

**Goal:** Verify WebSocket reconnection.

**Steps:**
1. Start session, navigate to page
2. Disable network briefly (airplane mode)
3. Re-enable network
4. Try to navigate

**Expected:**
- [ ] Connection recovers or clear error
- [ ] No zombie sessions
- [ ] Can continue working after reconnect

---

## Test Suite 5: Performance

### Test 5.1: Response Time Under Load

**Goal:** Verify acceptable performance with multiple sessions.

**Steps:**
1. Open 3 sessions
2. Time how long `browser_screenshot` takes in each
3. Compare to single-session baseline

**Expected:**
- [ ] Screenshot time < 3 seconds per session
- [ ] No significant degradation vs single session
- [ ] Memory usage stays reasonable

---

### Test 5.2: Long-Running Sessions

**Goal:** Verify stability over extended use.

**Steps:**
1. Open 2 sessions
2. Run periodic commands every 5 minutes for 1 hour
3. Monitor for memory leaks or connection issues

**Expected:**
- [ ] Sessions remain responsive after 1 hour
- [ ] No memory leaks (check Chrome task manager)
- [ ] No orphaned processes

---

## Acceptance Criteria Summary

For Multi-Browser MCP to be considered working:

**Must Pass:**
- [ ] Test 1.1: Two sessions navigate independently
- [ ] Test 1.3: Session disconnect doesn't affect others
- [ ] Test 2.1: Gmail auth shared across sessions
- [ ] Test 3.2: Multi-project operations work in parallel

**Should Pass:**
- [ ] Test 1.2: Three sessions with rapid commands
- [ ] Test 2.2: GitHub authenticated actions
- [ ] Test 3.1: Parallel frontend testing
- [ ] Test 4.2: Browser window closed externally handled gracefully

**Nice to Have:**
- [ ] Test 4.4: Network interruption recovery
- [ ] Test 5.2: Long-running session stability

---

## Running the Tests

```bash
# 1. Build and install locally
cd multi-browser-mcp
cd server && npm install && cd ..
cd extensions/chrome && npm install && npm run build && cd ../..

# 2. Load extension in Chrome
# Chrome > Extensions > Developer mode > Load unpacked > select extensions/chrome/dist

# 3. Enable multi-session mode in the extension
# Open Chrome DevTools Console (Cmd+Option+J) and run:
#   chrome.storage.local.set({ multiSessionMode: true })
# Then reload the extension

# 4. Configure Claude Code
claude mcp add multi-browser -- node /path/to/multi-browser-mcp/server/cli.js

# 5. Open multiple terminals and run tests
# Terminal 1: claude  # Gets port 5555
# Terminal 2: claude  # Gets port 5556
# Terminal 3: claude  # Gets port 5557

# 6. Each session will auto-discover available MCP servers
# Check extension badge - should show session ID (e.g., "a3", "b7")
```

## Verifying Multi-Session is Working

1. **Check console output** when starting MCP server:
   ```
   [Multi-Browser MCP] Session abc1 ready on port 5555
   ```

2. **Check extension badge** on attached tabs:
   - Green badge with 2-char session ID = connected
   - Red badge with ✕ = session disconnected

3. **Check extension logs** in DevTools (Service Worker):
   ```
   [MultiSession] Active sessions: 2
   [MultiSession] Connected to session abc1 on port 5555
   ```

---

*Test plan created: January 24, 2026*
*Last updated: January 24, 2026*
