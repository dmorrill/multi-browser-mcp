/**
 * Console message capture for browser extensions
 * Injects console override to capture log/warn/error/info/debug messages
 */

/**
 * Console handler class
 * Manages console message capture and storage
 */
export class ConsoleHandler {
  constructor(browserAdapter, logger) {
    this.browserAdapter = browserAdapter;
    this.browser = browserAdapter.getRawAPI();
    this.logger = logger;

    // Console messages storage (per tab)
    this.messages = [];
    this.maxMessages = 1000; // Keep only last 1000 messages
  }

  /**
   * Get all captured console messages
   */
  getMessages() {
    return this.messages.slice(); // Return copy
  }

  /**
   * Add a console message
   */
  addMessage(message) {
    this.messages.push(message);

    // Keep only last maxMessages
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }
  }

  /**
   * Clear all captured messages
   */
  clearMessages() {
    this.messages = [];
    this.logger.log('[ConsoleHandler] Messages cleared');
  }

  /**
   * Get messages count
   */
  getMessagesCount() {
    return this.messages.length;
  }

  /**
   * Inject console capture script into a tab
   * @param {number} tabId - Tab ID to inject console capture into
   */
  async injectConsoleCapture(tabId) {
    try {
      await this.browserAdapter.executeScript(tabId, {
        code: this._generateConsoleCaptureScript()
      });

      this.logger.log('[ConsoleHandler] Console capture injected into tab:', tabId);
    } catch (error) {
      this.logger.logAlways('[ConsoleHandler] Failed to inject console capture:', error);
    }
  }

  /**
   * Generate the console capture script
   * @private
   */
  _generateConsoleCaptureScript() {
    return `
      // Only inject once
      if (!window.__blueprintConsoleInjected) {
        window.__blueprintConsoleInjected = true;

        // Store original console methods
        const originalConsole = {
          log: console.log,
          warn: console.warn,
          error: console.error,
          info: console.info,
          debug: console.debug
        };

        // Override console methods to capture messages
        ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
          console[method] = function(...args) {
            // Call original
            originalConsole[method].apply(console, args);

            // Send to extension
            const message = {
              type: 'console',
              level: method,
              text: args.map(arg => {
                try {
                  return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
                } catch (e) {
                  return String(arg);
                }
              }).join(' '),
              timestamp: Date.now()
            };

            // Try to send via postMessage (extension will listen)
            window.postMessage({ __blueprintConsole: message }, '*');
          };
        });

        console.log('[Blueprint MCP] Console capture installed');
      }
    `;
  }

  /**
   * Set up message listener to receive console messages from content script
   * This should be called once during initialization
   */
  setupMessageListener() {
    // Note: This would typically be set up in the content script
    // The background script receives messages via runtime.onMessage
    this.browser.runtime.onMessage.addListener((message, sender) => {
      if (message.type === 'console' && sender.tab) {
        // Add console message with tab info
        this.addMessage({
          tabId: sender.tab.id,
          level: message.level,
          text: message.text,
          timestamp: message.timestamp,
          url: sender.url
        });
      }
    });

    this.logger.log('[ConsoleHandler] Message listener set up');
  }
}
