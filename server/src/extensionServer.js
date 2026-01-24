/**
 * Extension WebSocket Server
 *
 * Simple WebSocket server that extension connects to.
 * Replaces Playwright's CDPRelayServer with our own lightweight implementation.
 *
 * Multi-session support: Each MCP server instance gets a unique session ID
 * and auto-selects an available port from the range 5555-5654.
 */

const http = require('http');
const { WebSocketServer } = require('ws');
const { getLogger } = require('./fileLogger');
const crypto = require('crypto');
const net = require('net');

function debugLog(...args) {
  if (global.DEBUG_MODE) {
    const logger = getLogger();
    logger.log('[ExtensionServer]', ...args);
  }
}

/**
 * Check if a port is available
 */
async function isPortAvailable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, host);
  });
}

/**
 * Find an available port in range
 */
async function findAvailablePort(startPort = 5555, endPort = 5654, host = '127.0.0.1') {
  for (let port = startPort; port <= endPort; port++) {
    if (await isPortAvailable(port, host)) {
      return port;
    }
  }
  throw new Error(`No available ports in range ${startPort}-${endPort}`);
}

/**
 * Generate a short, readable session ID
 */
function generateSessionId() {
  // Generate 4-character alphanumeric ID (e.g., "a3f9")
  return crypto.randomBytes(2).toString('hex');
}

class ExtensionServer {
  constructor(port = 5555, host = '127.0.0.1', autoPort = true) {
    this._requestedPort = port;
    this._port = port; // Will be updated if auto-port is used
    this._host = host;
    this._autoPort = autoPort; // If true, find available port if requested port is in use
    this._httpServer = null;
    this._wss = null;
    this._extensionWs = null; // Current extension WebSocket connection
    this._pendingRequests = new Map(); // requestId -> {resolve, reject}
    this.onReconnect = null; // Callback when extension reconnects (replaces old connection)
    this.onTabInfoUpdate = null; // Callback when tab info changes (for status header updates)
    this._clientId = null; // MCP client_id to display in extension
    this._browserType = 'chrome'; // Browser type: 'chrome' or 'firefox'
    this._buildTimestamp = null; // Extension build timestamp
    this._pingInterval = null; // Ping interval to keep connection alive
    this._sessionId = generateSessionId(); // Unique session ID for this server instance
  }

  /**
   * Get the session ID for this server
   */
  getSessionId() {
    return this._sessionId;
  }

  /**
   * Get the actual port being used (may differ from requested if auto-port enabled)
   */
  getPort() {
    return this._port;
  }

  /**
   * Get browser type
   */
  getBrowserType() {
    return this._browserType;
  }

  /**
   * Get extension build timestamp
   */
  getBuildTimestamp() {
    return this._buildTimestamp;
  }

  /**
   * Start the server
   */
  async start() {
    // Auto-select available port if requested port is in use
    if (this._autoPort) {
      const isAvailable = await isPortAvailable(this._requestedPort, this._host);
      if (!isAvailable) {
        debugLog(`Port ${this._requestedPort} is in use, finding available port...`);
        this._port = await findAvailablePort(this._requestedPort, this._requestedPort + 99, this._host);
        debugLog(`Auto-selected port ${this._port}`);
      } else {
        this._port = this._requestedPort;
      }
    }

    return new Promise((resolve, reject) => {
      // Create HTTP server
      this._httpServer = http.createServer((req, res) => {
        // Return server info as JSON for discovery
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          type: 'multi-browser-mcp',
          sessionId: this._sessionId,
          port: this._port,
          status: this._extensionWs ? 'connected' : 'waiting'
        }));
      });

      // Create WebSocket server
      this._wss = new WebSocketServer({ server: this._httpServer });

      // Register WebSocket server error handler
      this._wss.on('error', (error) => {
        debugLog('WebSocketServer error:', error);
        reject(error);
      });

      this._wss.on('connection', (ws) => {
        debugLog(`Extension connection attempt (session: ${this._sessionId})`);

        // Multi-session: Accept new connections, replacing old ones
        // The extension may reconnect when switching between sessions
        if (this._extensionWs && this._extensionWs.readyState === 1) {
          debugLog('Replacing existing connection with new one');
          // Close the old connection gracefully
          this._extensionWs.close(1000, 'Replaced by new connection');
        }

        debugLog(`Extension connected (session: ${this._sessionId})`);

        // Close previous connection if any (only if it's dead/closing)
        const isReconnection = !!this._extensionWs;
        if (this._extensionWs) {
          debugLog('Closing previous extension connection - RECONNECTION DETECTED');
          this._extensionWs.close();
        }

        this._extensionWs = ws;

        // Clear old ping interval if any
        if (this._pingInterval) {
          clearInterval(this._pingInterval);
          this._pingInterval = null;
        }

        // Start ping interval to keep connection alive (every 10 seconds)
        // This prevents Chrome from suspending the service worker
        this._pingInterval = setInterval(() => {
          if (ws.readyState === 1) { // OPEN
            ws.ping();
            debugLog('Sent ping to extension');
          }
        }, 10000);

        // Notify about reconnection after setting the new connection
        if (isReconnection && this.onReconnect) {
          debugLog('Calling onReconnect callback');
          this.onReconnect();
        }

        ws.on('message', (data) => {
          this._handleMessage(data);
        });

        ws.on('pong', () => {
          debugLog('Received pong from extension');
        });

        ws.on('close', () => {
          debugLog('Extension disconnected');
          if (this._extensionWs === ws) {
            this._extensionWs = null;
          }
          // Clear ping interval when connection closes
          if (this._pingInterval) {
            clearInterval(this._pingInterval);
            this._pingInterval = null;
          }
        });

        ws.on('error', (error) => {
          debugLog('WebSocket error:', error);
        });
      });

      // Register HTTP server error handler BEFORE calling listen() to catch port-in-use errors
      this._httpServer.on('error', (error) => {
        debugLog('HTTP Server error:', error);
        reject(error);
      });

      // Start listening
      this._httpServer.listen(this._port, this._host, () => {
        debugLog(`Server listening on ${this._host}:${this._port} (session: ${this._sessionId})`);
        // Log to stderr for user visibility even in non-debug mode
        if (this._port !== this._requestedPort) {
          console.error(`[Multi-Browser MCP] Port ${this._requestedPort} was in use, using port ${this._port} instead`);
        }
        console.error(`[Multi-Browser MCP] Session ${this._sessionId} ready on port ${this._port}`);
        resolve();
      });
    });
  }

  /**
   * Handle incoming message from extension
   */
  _handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      debugLog('Received from extension:', message.method || 'response');

      // Check if it's a response (has id but no method)
      if (message.id !== undefined && !message.method) {
        const pending = this._pendingRequests.get(message.id);
        if (pending) {
          this._pendingRequests.delete(message.id);

          // Extract current tab info from result (not from message itself - that would be non-standard JSON-RPC)
          // Use 'in' operator to detect null values (tab detached) vs missing property
          const result = message.result || {};
          if ('currentTab' in result && this.onTabInfoUpdate) {
            debugLog('Tab info update:', result.currentTab);
            this.onTabInfoUpdate(result.currentTab);
          }

          if (message.error) {
            pending.reject(new Error(message.error.message || JSON.stringify(message.error)));
          } else {
            pending.resolve(message.result);
          }
        }
        return;
      }

      // Handle handshake from extension
      if (message.type === 'handshake') {
        debugLog('Handshake received:', message);
        this._browserType = message.browser || 'chrome';
        this._buildTimestamp = message.buildTimestamp || null;
        debugLog(`Browser type detected: ${this._browserType}, Build timestamp: ${this._buildTimestamp}`);
        debugLog(`Session ID: ${this._sessionId}`);

        // Send session info back to extension
        if (this._extensionWs && this._extensionWs.readyState === 1) {
          const sessionInfo = {
            jsonrpc: '2.0',
            method: 'session_info',
            params: {
              sessionId: this._sessionId,
              port: this._port
            }
          };
          this._extensionWs.send(JSON.stringify(sessionInfo));
          debugLog('Sent session_info to extension');
        }
        return;
      }

      // Handle notifications (has method but no id)
      if (message.method && message.id === undefined) {
        debugLog('Received notification:', message.method);

        // Handle tab_info_update notification from Firefox extension
        if (message.method === 'notifications/tab_info_update' && message.params?.currentTab && this.onTabInfoUpdate) {
          debugLog('Tab info update notification:', message.params.currentTab);
          this.onTabInfoUpdate(message.params.currentTab);
        }

        return;
      }
    } catch (error) {
      debugLog('Error handling message:', error);
    }
  }

  /**
   * Send a command to the extension and wait for response
   */
  async sendCommand(method, params = {}, timeout = 30000) {
    if (!this._extensionWs || this._extensionWs.readyState !== 1) {
      throw new Error('Extension not connected. Please click the extension icon and click "Connect".');
    }

    const id = Math.random().toString(36).substring(7);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this._pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, timeout);

      this._pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      const message = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      debugLog('Sending to extension:', method);
      this._extensionWs.send(JSON.stringify(message));
    });
  }

  /**
   * Set client_id and notify extension
   */
  setClientId(clientId) {
    this._clientId = clientId;
    debugLog('Client ID set to:', clientId);

    // Send notification to extension if connected
    if (this.isConnected()) {
      const notification = {
        jsonrpc: '2.0',
        method: 'authenticated',
        params: {
          client_id: clientId
        }
      };
      debugLog('Sending client_id notification to extension');
      this._extensionWs.send(JSON.stringify(notification));
    }
  }

  /**
   * Check if extension is connected
   */
  isConnected() {
    return this._extensionWs && this._extensionWs.readyState === 1;
  }

  /**
   * Stop the server
   */
  async stop() {
    debugLog('Stopping server');

    if (this._extensionWs) {
      this._extensionWs.close();
      this._extensionWs = null;
    }

    if (this._wss) {
      this._wss.close();
      this._wss = null;
    }

    if (this._httpServer) {
      return new Promise((resolve) => {
        this._httpServer.close(() => {
          debugLog('Server stopped');
          resolve();
        });
      });
    }
  }
}

module.exports = { ExtensionServer };
