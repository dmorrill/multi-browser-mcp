/**
 * Multi-Session Manager for Browser Extensions
 *
 * Manages connections to multiple MCP server instances running on different ports.
 * Each session gets its own tab context, allowing parallel Claude Code sessions.
 *
 * Port scanning discovers active MCP servers in range 5555-5654.
 */

import { WebSocketConnection } from './websocket.js';
import { SessionTabHandlers } from '../handlers/sessionTabs.js';

/**
 * Session state for a single MCP server connection
 * Each session has its own tab context - completely isolated from other sessions
 */
class Session {
  constructor(port, sessionId, browserAPI, logger, iconManager) {
    this.port = port;
    this.sessionId = sessionId;
    this.browser = browserAPI;
    this.logger = logger;
    this.iconManager = iconManager;
    this.wsConnection = null;

    // Per-session tab state (each session controls its own tab)
    this.attachedTabId = null;
    this.attachedTabInfo = null;
    this.stealthMode = false;
    this.tabStealthModes = {}; // tabId -> boolean

    // Create session-aware tab handlers
    this.tabHandlers = new SessionTabHandlers(this, browserAPI, logger, iconManager);

    // Session metadata
    this.lastActivity = Date.now();
    this.status = 'disconnected'; // 'connecting', 'connected', 'disconnected'
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }

  /**
   * Get attached tab ID for this session
   */
  getAttachedTabId() {
    return this.attachedTabId;
  }

  /**
   * Set attached tab for this session
   */
  async setAttachedTab(tabId, tabInfo) {
    this.attachedTabId = tabId;
    this.attachedTabInfo = tabInfo;
    this.logger.log(`[Session ${this.sessionId}] Attached to tab ${tabId}`);
  }

  /**
   * Clear attached tab for this session
   */
  clearAttachedTab() {
    this.attachedTabId = null;
    this.attachedTabInfo = null;
    this.logger.log(`[Session ${this.sessionId}] Cleared attached tab`);
  }

  /**
   * Create a new tab for this session
   */
  async createTab(url = 'about:blank', activate = true, stealth = false) {
    const tab = await this.browser.tabs.create({ url, active: activate });

    this.stealthMode = stealth;
    this.tabStealthModes[tab.id] = stealth;
    this.attachedTabId = tab.id;
    this.attachedTabInfo = {
      id: tab.id,
      title: tab.title,
      url: tab.url
    };

    this.logger.log(`[Session ${this.sessionId}] Created and attached to tab ${tab.id}`);
    return tab;
  }

  /**
   * Select an existing tab for this session
   */
  async selectTab(tabIndex, activate = false, stealth = false) {
    const allTabs = await this.browser.tabs.query({});
    if (tabIndex < 0 || tabIndex >= allTabs.length) {
      throw new Error(`Tab index ${tabIndex} out of range`);
    }

    const tab = allTabs[tabIndex];
    this.stealthMode = stealth;
    this.tabStealthModes[tab.id] = stealth;
    this.attachedTabId = tab.id;
    this.attachedTabInfo = {
      id: tab.id,
      title: tab.title,
      url: tab.url
    };

    if (activate) {
      await this.browser.tabs.update(tab.id, { active: true });
    }

    this.logger.log(`[Session ${this.sessionId}] Selected tab ${tab.id} at index ${tabIndex}`);
    return tab;
  }
}

/**
 * Multi-session manager class
 * Discovers and connects to multiple MCP servers
 */
export class MultiSessionManager {
  constructor(browserAPI, logger, iconManager, tabHandlersFactory) {
    this.browser = browserAPI;
    this.logger = logger;
    this.iconManager = iconManager;
    this.tabHandlersFactory = tabHandlersFactory; // Factory to create TabHandlers per session

    // Session management
    this.sessions = new Map(); // port -> Session
    this.activeSessionPort = null; // Currently focused session

    // Command handlers (registered before connecting, applied to each session)
    this.commandHandlers = new Map();

    // Port scanning config
    this.portRangeStart = 5555;
    this.portRangeEnd = 5654;
    this.scanInterval = 5000; // Scan every 5 seconds
    this.scanTimer = null;

    // Build timestamp (will be set by consumer)
    this.buildTimestamp = null;
  }

  /**
   * Set build timestamp for handshake
   */
  setBuildTimestamp(timestamp) {
    this.buildTimestamp = timestamp;
  }

  /**
   * Start the multi-session manager
   * Begins port scanning and connection management
   */
  async start() {
    this.logger.log('[MultiSession] Starting multi-session manager...');

    // Initial scan
    await this.scanForServers();

    // Start periodic scanning
    this.scanTimer = setInterval(() => {
      this.scanForServers();
    }, this.scanInterval);

    this.logger.log('[MultiSession] Multi-session manager started');
  }

  /**
   * Stop the multi-session manager
   */
  stop() {
    this.logger.log('[MultiSession] Stopping multi-session manager...');

    // Stop scanning
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }

    // Disconnect all sessions
    for (const [port, session] of this.sessions) {
      if (session.wsConnection) {
        session.wsConnection.disconnect();
      }
    }
    this.sessions.clear();

    this.logger.log('[MultiSession] Multi-session manager stopped');
  }

  /**
   * Scan for active MCP servers and connect to new ones
   */
  async scanForServers() {
    const newPorts = [];
    const deadPorts = [];

    // Check which ports have active servers
    for (let port = this.portRangeStart; port <= this.portRangeEnd; port++) {
      const isActive = await this.checkServerActive(port);

      if (isActive && !this.sessions.has(port)) {
        newPorts.push(port);
      } else if (!isActive && this.sessions.has(port)) {
        deadPorts.push(port);
      }
    }

    // Connect to new servers
    for (const port of newPorts) {
      await this.connectToServer(port);
    }

    // Clean up dead connections
    for (const port of deadPorts) {
      await this.disconnectFromServer(port);
    }

    // Log session count if changed
    if (newPorts.length > 0 || deadPorts.length > 0) {
      this.logger.log(`[MultiSession] Active sessions: ${this.sessions.size}`);
    }
  }

  /**
   * Check if a server is active on a port
   */
  async checkServerActive(port) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000) // 1 second timeout
      });

      if (!response.ok) return false;

      const data = await response.json();
      return data.type === 'multi-browser-mcp';
    } catch {
      return false;
    }
  }

  /**
   * Register a session-aware command handler
   * Handler receives (params, session) instead of just (params)
   */
  registerCommandHandler(method, handler) {
    this.commandHandlers.set(method, handler);
  }

  /**
   * Connect to an MCP server on a specific port
   */
  async connectToServer(port) {
    this.logger.log(`[MultiSession] Connecting to server on port ${port}...`);

    try {
      // Get server info first
      const response = await fetch(`http://127.0.0.1:${port}/`);
      const serverInfo = await response.json();
      const sessionId = serverInfo.sessionId || `port-${port}`;

      // Create session with browser API for per-session tab operations
      const session = new Session(port, sessionId, this.browser, this.logger, this.iconManager);
      session.status = 'connecting';

      // Create WebSocket connection with custom port
      const wsConnection = new WebSocketConnection(
        this.browser,
        this.logger,
        this.iconManager,
        this.buildTimestamp
      );

      // Override the port for this connection
      const originalGetUrl = wsConnection.getConnectionUrl.bind(wsConnection);
      wsConnection.getConnectionUrl = async () => {
        // Check if user is in PRO mode first
        const userInfo = await originalGetUrl();
        if (wsConnection.isPro) {
          // PRO mode uses relay server, not local port
          return userInfo;
        }
        // Override port for local connection
        return `ws://127.0.0.1:${port}/extension`;
      };

      // Handle session_info notification from server
      wsConnection.registerNotificationHandler('session_info', (params) => {
        this.logger.log(`[MultiSession] Session info received for port ${port}:`, params);
        session.sessionId = params.sessionId || session.sessionId;
      });

      // Register command handlers that inject session context
      for (const [method, handler] of this.commandHandlers) {
        wsConnection.registerCommandHandler(method, async (params) => {
          session.updateActivity();
          return await handler(params, session);
        });
      }

      // Store session before connecting
      session.wsConnection = wsConnection;
      this.sessions.set(port, session);

      // Connect
      await wsConnection.connect();
      session.status = 'connected';

      // Set as active session if it's the only one
      if (this.sessions.size === 1) {
        this.activeSessionPort = port;
      }

      this.logger.log(`[MultiSession] Connected to session ${sessionId} on port ${port}`);
      return session;

    } catch (error) {
      this.logger.log(`[MultiSession] Failed to connect to port ${port}:`, error.message);
      this.sessions.delete(port);
      return null;
    }
  }

  /**
   * Disconnect from a server
   */
  async disconnectFromServer(port) {
    const session = this.sessions.get(port);
    if (!session) return;

    this.logger.log(`[MultiSession] Disconnecting from session ${session.sessionId} on port ${port}...`);

    // Update UI indicator on attached tab BEFORE cleanup
    // Tab stays open but shows disconnect indicator
    if (session.attachedTabId) {
      await this.markTabDisconnected(session.attachedTabId, session.sessionId);
    }

    session.status = 'disconnected';

    if (session.wsConnection) {
      session.wsConnection.disconnect();
    }

    this.sessions.delete(port);

    // If this was the active session, switch to another
    if (this.activeSessionPort === port) {
      const remainingPorts = Array.from(this.sessions.keys());
      this.activeSessionPort = remainingPorts.length > 0 ? remainingPorts[0] : null;
    }

    this.logger.log(`[MultiSession] Disconnected from port ${port}`);
  }

  /**
   * Mark a tab as disconnected with visual indicator
   * Tab stays open but badge shows session ended
   */
  async markTabDisconnected(tabId, sessionId) {
    try {
      // Check if tab still exists
      const tab = await this.browser.tabs.get(tabId);
      if (!tab) return;

      // Set badge to show disconnect (red background, "X" text)
      await this.browser.action.setBadgeText({
        tabId: tabId,
        text: '✕'  // X mark to indicate disconnected
      });
      await this.browser.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: '#F44336'  // Red for disconnected
      });

      this.logger.log(`[MultiSession] Marked tab ${tabId} as disconnected (session ${sessionId})`);
    } catch (error) {
      // Tab may have been closed already
      this.logger.log(`[MultiSession] Could not mark tab ${tabId} as disconnected:`, error.message);
    }
  }

  /**
   * Mark a tab as connected with visual indicator
   * Shows session ID and green badge
   */
  async markTabConnected(tabId, sessionId) {
    try {
      // Check if tab still exists
      const tab = await this.browser.tabs.get(tabId);
      if (!tab) return;

      // Set badge to show connected (green background, session ID prefix)
      await this.browser.action.setBadgeText({
        tabId: tabId,
        text: sessionId.substring(0, 2)  // First 2 chars of session ID
      });
      await this.browser.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: '#4CAF50'  // Green for connected
      });

      this.logger.log(`[MultiSession] Marked tab ${tabId} as connected (session ${sessionId})`);
    } catch (error) {
      this.logger.log(`[MultiSession] Could not mark tab ${tabId} as connected:`, error.message);
    }
  }

  /**
   * Get a session by port
   */
  getSession(port) {
    return this.sessions.get(port);
  }

  /**
   * Get the active session
   */
  getActiveSession() {
    return this.activeSessionPort ? this.sessions.get(this.activeSessionPort) : null;
  }

  /**
   * Set the active session
   */
  setActiveSession(port) {
    if (this.sessions.has(port)) {
      this.activeSessionPort = port;
      this.logger.log(`[MultiSession] Active session set to port ${port}`);
    }
  }

  /**
   * Get all sessions
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session count
   */
  getSessionCount() {
    return this.sessions.size;
  }

  /**
   * Route a command to the appropriate session
   * Commands include sessionId/port to identify the target
   */
  async routeCommand(command, params) {
    // Determine target session
    let targetPort = this.activeSessionPort;

    // If params specify a session, use that
    if (params && params._sessionPort) {
      targetPort = params._sessionPort;
      delete params._sessionPort; // Remove internal param
    }

    const session = this.sessions.get(targetPort);
    if (!session || !session.wsConnection) {
      throw new Error(`No active session on port ${targetPort}`);
    }

    session.updateActivity();
    return session;
  }

  /**
   * Get status summary for all sessions
   */
  getStatusSummary() {
    const sessions = [];
    for (const [port, session] of this.sessions) {
      sessions.push({
        port,
        sessionId: session.sessionId,
        status: session.status,
        attachedTabId: session.attachedTabId,
        lastActivity: session.lastActivity
      });
    }
    return {
      totalSessions: this.sessions.size,
      activePort: this.activeSessionPort,
      sessions
    };
  }
}
