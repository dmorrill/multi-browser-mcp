/**
 * Session-aware Tab Handlers
 *
 * Provides the same interface as TabHandlers but operates on a per-session basis.
 * Each session gets its own attached tab, preventing conflicts between sessions.
 */

/**
 * Session tab handlers class
 * Compatible with the original TabHandlers interface but session-scoped
 */
export class SessionTabHandlers {
  constructor(session, browserAPI, logger, iconManager) {
    this.session = session; // The parent session
    this.browser = browserAPI;
    this.logger = logger;
    this.iconManager = iconManager;

    // Per-session tab state (stored in session, mirrored here for compatibility)
    this.attachedTabId = null;
    this.attachedTabInfo = null;
    this.stealthMode = false;
    this.tabStealthModes = {};
    this.techStackInfo = {};

    // Injection handlers
    this.consoleInjector = null;
    this.dialogInjector = null;
  }

  /**
   * Sync state from session
   */
  syncFromSession() {
    this.attachedTabId = this.session.attachedTabId;
    this.attachedTabInfo = this.session.attachedTabInfo;
    this.stealthMode = this.session.stealthMode;
  }

  /**
   * Sync state to session
   */
  syncToSession() {
    this.session.attachedTabId = this.attachedTabId;
    this.session.attachedTabInfo = this.attachedTabInfo;
    this.session.stealthMode = this.stealthMode;
  }

  setConsoleInjector(injector) {
    this.consoleInjector = injector;
  }

  setDialogInjector(injector) {
    this.dialogInjector = injector;
  }

  setTechStackInfo(tabId, techStack) {
    this.techStackInfo[tabId] = techStack;
    if (this.attachedTabId === tabId && this.attachedTabInfo) {
      this.attachedTabInfo.techStack = techStack;
    }
  }

  getAttachedTabInfo() {
    return this.attachedTabInfo;
  }

  getAttachedTabId() {
    return this.attachedTabId;
  }

  getStealthMode() {
    return this.stealthMode;
  }

  /**
   * Get all tabs (not session-specific)
   */
  async getTabs() {
    const windows = await this.browser.windows.getAll({ populate: true });
    const tabs = [];
    let tabIndex = 0;

    windows.forEach(window => {
      window.tabs.forEach(tab => {
        const isAutomatable = tab.url &&
          !['about:', 'moz-extension:', 'chrome:', 'chrome-extension:'].some(scheme =>
            tab.url.startsWith(scheme)
          );

        tabs.push({
          id: tab.id,
          windowId: window.id,
          title: tab.title,
          url: tab.url,
          active: tab.active,
          index: tabIndex,
          automatable: isAutomatable,
          // Add session indicator if this tab is attached to THIS session
          attachedToSession: tab.id === this.attachedTabId ? this.session.sessionId : null
        });

        tabIndex++;
      });
    });

    return { tabs };
  }

  /**
   * Create a new tab for this session
   */
  async createTab(params) {
    const url = params.url || 'about:blank';
    const activate = params.activate !== false;
    const stealth = params.stealth ?? false;

    // Create new tab
    const tab = await this.browser.tabs.create({
      url: url,
      active: activate
    });

    // Set session state
    this.stealthMode = stealth;
    this.tabStealthModes[tab.id] = stealth;
    this.attachedTabId = tab.id;

    // Get tab index
    const allTabs = await this.browser.tabs.query({});
    const tabIndex = allTabs.findIndex(t => t.id === tab.id);

    this.attachedTabInfo = {
      id: tab.id,
      title: tab.title,
      url: tab.url,
      index: tabIndex >= 0 ? tabIndex : undefined,
      techStack: this.techStackInfo[tab.id] || null
    };

    // Sync to session
    this.syncToSession();

    // Focus window if activating
    if (activate && tab.windowId) {
      await this.browser.windows.update(tab.windowId, { focused: true });
    }

    // Update badge to show which session owns this tab
    if (this.iconManager) {
      this.iconManager.setAttachedTab(tab.id);
      this.iconManager.setStealthMode(stealth);
      // Set badge to show session ID
      await this.browser.action.setBadgeText({
        tabId: tab.id,
        text: this.session.sessionId.substring(0, 2) // First 2 chars of session ID
      });
      await this.browser.action.setBadgeBackgroundColor({
        tabId: tab.id,
        color: '#4CAF50' // Green for connected
      });
    }

    // Inject handlers
    if (this.consoleInjector) {
      await this.consoleInjector(tab.id);
    }
    if (this.dialogInjector) {
      await this.dialogInjector(tab.id);
    }

    this.logger.log(`[Session ${this.session.sessionId}] Created tab ${tab.id}`);

    return {
      tab: {
        id: tab.id,
        title: tab.title,
        url: tab.url,
        techStack: this.techStackInfo[tab.id] || null,
        sessionId: this.session.sessionId
      }
    };
  }

  /**
   * Select an existing tab for this session
   */
  async selectTab(params) {
    const tabIndex = params.tabIndex;
    const activate = params.activate ?? false;
    const stealth = params.stealth ?? false;

    const allTabs = await this.browser.tabs.query({});

    if (tabIndex < 0 || tabIndex >= allTabs.length) {
      throw new Error(`Tab index ${tabIndex} out of range (0-${allTabs.length - 1})`);
    }

    const selectedTab = allTabs[tabIndex];

    // Check if automatable
    const isAutomatable = selectedTab.url &&
      !['about:', 'moz-extension:', 'chrome:', 'chrome-extension:'].some(scheme =>
        selectedTab.url.startsWith(scheme)
      );

    if (!isAutomatable) {
      throw new Error(
        `Cannot automate tab ${tabIndex}: "${selectedTab.title}" - System pages cannot be automated`
      );
    }

    // Optional: activate tab
    if (activate) {
      await this.browser.tabs.update(selectedTab.id, { active: true });
      await this.browser.windows.update(selectedTab.windowId, { focused: true });
    }

    // Update session state
    this.stealthMode = stealth;
    this.tabStealthModes[selectedTab.id] = stealth;
    this.attachedTabId = selectedTab.id;
    this.attachedTabInfo = {
      id: selectedTab.id,
      title: selectedTab.title,
      url: selectedTab.url,
      index: tabIndex,
      techStack: this.techStackInfo[selectedTab.id] || null
    };

    // Sync to session
    this.syncToSession();

    // Update badge
    if (this.iconManager) {
      this.iconManager.setAttachedTab(selectedTab.id);
      this.iconManager.setStealthMode(stealth);
      await this.browser.action.setBadgeText({
        tabId: selectedTab.id,
        text: this.session.sessionId.substring(0, 2)
      });
      await this.browser.action.setBadgeBackgroundColor({
        tabId: selectedTab.id,
        color: '#4CAF50'
      });
    }

    // Inject handlers
    if (this.consoleInjector) {
      await this.consoleInjector(selectedTab.id);
    }
    if (this.dialogInjector) {
      await this.dialogInjector(selectedTab.id);
    }

    this.logger.log(`[Session ${this.session.sessionId}] Selected tab ${selectedTab.id}`);

    return {
      tab: {
        id: selectedTab.id,
        title: selectedTab.title,
        url: selectedTab.url,
        techStack: this.techStackInfo[selectedTab.id] || null,
        sessionId: this.session.sessionId
      }
    };
  }

  /**
   * Close a tab
   */
  async closeTab(index) {
    let tabIdToClose;
    let wasAttached = false;

    if (index !== undefined) {
      const windows = await this.browser.windows.getAll({ populate: true });
      const allTabs = [];
      windows.forEach(window => {
        window.tabs.forEach(tab => {
          allTabs.push(tab);
        });
      });

      if (index < 0 || index >= allTabs.length) {
        throw new Error(`Tab index ${index} out of range`);
      }

      tabIdToClose = allTabs[index].id;
      wasAttached = (tabIdToClose === this.attachedTabId);
    } else {
      if (!this.attachedTabId) {
        throw new Error('No tab attached to this session');
      }
      tabIdToClose = this.attachedTabId;
      wasAttached = true;
    }

    await this.browser.tabs.remove(tabIdToClose);

    if (wasAttached) {
      this.attachedTabId = null;
      this.attachedTabInfo = null;
      this.syncToSession();

      if (this.iconManager) {
        this.iconManager.setAttachedTab(null);
      }
    }

    delete this.tabStealthModes[tabIdToClose];

    this.logger.log(`[Session ${this.session.sessionId}] Closed tab ${tabIdToClose}`);

    return { success: true, closedAttachedTab: wasAttached };
  }

  /**
   * Handle external tab close
   */
  async handleTabClosed(tabId) {
    if (tabId === this.attachedTabId) {
      this.logger.log(`[Session ${this.session.sessionId}] Attached tab closed externally`);
      this.attachedTabId = null;
      this.attachedTabInfo = null;
      this.syncToSession();

      if (this.iconManager) {
        this.iconManager.setAttachedTab(null);
      }
    }

    delete this.techStackInfo[tabId];
    delete this.tabStealthModes[tabId];
  }
}
