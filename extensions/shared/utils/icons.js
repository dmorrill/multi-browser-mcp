/**
 * Icon and badge management for browser extensions
 * Handles icon states, badges, and tab-based icon updates
 */

/**
 * Icon manager class
 * Manages extension icon states and badges based on connection and tab states
 */
export class IconManager {
  constructor(browserAPI, logger) {
    this.browser = browserAPI;
    this.logger = logger;
    this.attachedTabId = null;
    this.stealthMode = false;
    this.isConnected = false;

    // Bind event handlers
    this._handleTabActivated = this._handleTabActivated.bind(this);
    this._handleTabRemoved = this._handleTabRemoved.bind(this);
  }

  /**
   * Initialize icon manager and set up event listeners
   */
  init() {
    // Listen for tab activation to update icon
    this.browser.tabs.onActivated.addListener(this._handleTabActivated);

    // Listen for tab close to reset icon if attached tab is closed
    this.browser.tabs.onRemoved.addListener(this._handleTabRemoved);
  }

  /**
   * Set the attached tab ID
   */
  setAttachedTab(tabId) {
    this.attachedTabId = tabId;
  }

  /**
   * Set stealth mode
   */
  setStealthMode(enabled) {
    this.stealthMode = enabled;
  }

  /**
   * Set connection state
   */
  setConnected(connected) {
    this.isConnected = connected;
  }

  /**
   * Update badge for attached tab based on stealth mode
   */
  async updateBadgeForTab() {
    const state = this.stealthMode ? 'attached-stealth' : 'attached';
    const title = this.stealthMode ? 'Tab automated (Stealth Mode)' : 'Tab automated';
    await this.setGlobalIcon(state, title);
  }

  /**
   * Update badge text, color, and title for a specific tab
   * @param {number} tabId - Tab ID
   * @param {object} options - Badge options (text, color, title)
   */
  async updateBadge(tabId, { text, color, title }) {
    try {
      this.logger.logAlways('[IconManager] Setting badge - tabId:', tabId, 'text:', text, 'color:', color, 'title:', title);

      // Firefox manifest v2 may not support per-tab badges reliably
      // Try setting globally first, then per-tab
      try {
        // Set globally (no tabId)
        await this._setBadgeText({ text });
        this.logger.logAlways('[IconManager] setBadgeText (global) succeeded');
      } catch (e) {
        this.logger.logAlways('[IconManager] setBadgeText (global) failed:', e.message);
      }

      // Try per-tab as well
      try {
        await this._setBadgeText({ tabId, text });
        this.logger.logAlways('[IconManager] setBadgeText (per-tab) succeeded');
      } catch (e) {
        this.logger.logAlways('[IconManager] setBadgeText (per-tab) failed:', e.message);
      }

      // Try setting title globally
      try {
        await this._setTitle({ title: title || '' });
        this.logger.logAlways('[IconManager] setTitle (global) succeeded');
      } catch (e) {
        this.logger.logAlways('[IconManager] setTitle (global) failed:', e.message);
      }

      // Try setting background color globally
      if (color) {
        try {
          await this._setBadgeBackgroundColor({ color });
          this.logger.logAlways('[IconManager] setBadgeBackgroundColor (global) succeeded');
        } catch (e) {
          this.logger.logAlways('[IconManager] setBadgeBackgroundColor (global) failed:', e.message);
        }
      }

      this.logger.logAlways('[IconManager] Badge update complete');
    } catch (error) {
      this.logger.logAlways('[IconManager] Badge update error:', error.message, error.stack);
    }
  }

  /**
   * Clear badge for a specific tab
   */
  async clearBadge(tabId) {
    await this.updateBadge(tabId, { text: '' });
  }

  /**
   * Update global badge (for connecting/connected states)
   */
  async updateGlobalBadge({ text, color, title }) {
    try {
      // Set badge text globally
      await this._setBadgeText({ text });

      // Set badge color if provided
      if (color) {
        await this._setBadgeBackgroundColor({ color });
      }

      // Set title if provided
      if (title) {
        await this._setTitle({ title });
      }

      this.logger.logAlways('[IconManager] Global badge updated:', text, color, title);
    } catch (error) {
      this.logger.logAlways('[IconManager] Failed to update global badge:', error.message);
    }
  }

  /**
   * Show connecting icon (yellow dot)
   */
  async updateConnectingBadge() {
    await this.setGlobalIcon('connecting', 'Connecting to MCP server...');
  }

  /**
   * Set global icon based on state
   * @param {string} state - Icon state (connecting|connected|attached|attached-stealth)
   * @param {string} title - Tooltip title
   */
  async setGlobalIcon(state, title) {
    try {
      const iconPath = state === 'connecting'
        ? 'icons/icon-48-connecting.png'
        : state === 'connected'
        ? 'icons/icon-48-connected.png'
        : state === 'attached'
        ? 'icons/icon-48-attached.png'
        : state === 'attached-stealth'
        ? 'icons/icon-48-attached-stealth.png'
        : 'icons/icon-48.png';

      await this._setIcon({ path: iconPath });
      await this._setTitle({ title: title || 'Blueprint MCP' });
      this.logger.logAlways('[IconManager] Icon updated:', state, iconPath);
    } catch (error) {
      this.logger.logAlways('[IconManager] Failed to update icon:', error.message);
    }
  }

  /**
   * Handle tab activation event
   */
  async _handleTabActivated(activeInfo) {
    this.logger.log('[IconManager] Tab activated:', activeInfo.tabId);

    // Check if the activated tab is the attached tab
    if (activeInfo.tabId === this.attachedTabId) {
      // Show attached icon
      await this.updateBadgeForTab();
      this.logger.log('[IconManager] Icon updated for attached tab');
    } else if (this.isConnected) {
      // Show connected icon (no tab attached)
      await this.setGlobalIcon('connected', 'Connected to MCP server');
      this.logger.log('[IconManager] Icon updated for non-attached tab');
    }
  }

  /**
   * Handle tab removal event
   */
  async _handleTabRemoved(tabId) {
    if (tabId === this.attachedTabId) {
      this.logger.log('[IconManager] Attached tab closed, resetting icon');
      this.attachedTabId = null;

      // Show connected icon (no tab attached)
      if (this.isConnected) {
        await this.setGlobalIcon('connected', 'Connected to MCP server');
      }
    }
  }

  /**
   * Browser API wrappers - allow for cross-browser compatibility
   */
  async _setBadgeText(options) {
    // Check if we're using Chrome or Firefox API
    if (this.browser.action) {
      // Chrome manifest v3
      return this.browser.action.setBadgeText(options);
    } else if (this.browser.browserAction) {
      // Firefox manifest v2
      return this.browser.browserAction.setBadgeText(options);
    }
    throw new Error('No badge API available');
  }

  async _setBadgeBackgroundColor(options) {
    if (this.browser.action) {
      return this.browser.action.setBadgeBackgroundColor(options);
    } else if (this.browser.browserAction) {
      return this.browser.browserAction.setBadgeBackgroundColor(options);
    }
    throw new Error('No badge API available');
  }

  async _setTitle(options) {
    if (this.browser.action) {
      return this.browser.action.setTitle(options);
    } else if (this.browser.browserAction) {
      return this.browser.browserAction.setTitle(options);
    }
    throw new Error('No title API available');
  }

  async _setIcon(options) {
    if (this.browser.action) {
      return this.browser.action.setIcon(options);
    } else if (this.browser.browserAction) {
      return this.browser.browserAction.setIcon(options);
    }
    throw new Error('No icon API available');
  }

  /**
   * Clean up event listeners
   */
  destroy() {
    this.browser.tabs.onActivated.removeListener(this._handleTabActivated);
    this.browser.tabs.onRemoved.removeListener(this._handleTabRemoved);
  }
}
