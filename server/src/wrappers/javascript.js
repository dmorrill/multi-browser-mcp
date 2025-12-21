/**
 * JavaScript Wrapper Template
 */

const template = `/**
 * Blueprint MCP Wrapper for JavaScript
 *
 * Auto-generated wrapper for Blueprint MCP script mode.
 * Methods match tool names exactly for easy code generation.
 *
 * Usage:
 *   import { BlueprintMCP } from './blueprint_mcp.mjs';
 *
 *   const bp = new BlueprintMCP();
 *   await bp.enable({ client_id: 'my-script' });
 *   const tabs = await bp.browser_tabs({ action: 'list' });
 *   bp.close();
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

export class BlueprintMCP {
  #proc = null;
  #rl = null;
  #id = 0;
  #debug = false;
  #pending = new Map();

  /**
   * Initialize Blueprint MCP client.
   * @param {Object} options
   * @param {boolean} options.debug - Enable debug output
   */
  constructor(options = {}) {
    this.#debug = options.debug || false;

    this.#proc = spawn('npx', ['@railsblueprint/blueprint-mcp', '--script-mode'], {
      stdio: ['pipe', 'pipe', this.#debug ? 'inherit' : 'ignore']
    });

    this.#rl = createInterface({
      input: this.#proc.stdout,
      terminal: false
    });

    this.#rl.on('line', (line) => {
      if (this.#debug) console.error('[BlueprintMCP] <-', line);

      try {
        const response = JSON.parse(line);
        if (response.id && this.#pending.has(response.id)) {
          const { resolve, reject } = this.#pending.get(response.id);
          this.#pending.delete(response.id);

          if (response.error) {
            reject(new Error(response.error.message || 'Unknown error'));
          } else {
            resolve(response.result);
          }
        }
      } catch (e) {
        console.error('[BlueprintMCP] Parse error:', e);
      }
    });
  }

  async _call(method, params = {}) {
    const id = ++this.#id;
    const request = { jsonrpc: '2.0', id, method, params };

    if (this.#debug) console.error('[BlueprintMCP] ->', JSON.stringify(request));

    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#proc.stdin.write(JSON.stringify(request) + '\\n');
    });
  }

  // Auto-generated methods (match tool names exactly)
{{METHODS}}

  close() {
    if (this.#proc) {
      try {
        this.#proc.stdin.end();
        this.#proc.kill();
      } catch (e) {
        // Ignore
      }
      this.#proc = null;
    }
  }
}
`;

/**
 * Generate a JavaScript method for a tool
 * @param {string} toolName - Tool name (e.g., 'browser_tabs')
 * @returns {string} JavaScript method code
 */
function generateMethod(toolName) {
  return `  async ${toolName}(params = {}) {
    return this._call('${toolName}', params);
  }
`;
}

module.exports = {
  template,
  generateMethod
};
