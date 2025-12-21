/**
 * Python Wrapper Template
 */

const template = `#!/usr/bin/env python3
"""
Blueprint MCP Wrapper for Python

Auto-generated wrapper for Blueprint MCP script mode.
Methods match tool names exactly for easy code generation.

Usage:
    from blueprint_mcp import BlueprintMCP

    bp = BlueprintMCP()
    bp.enable(client_id='my-script')
    tabs = bp.browser_tabs(action='list')
    bp.close()
"""

import subprocess
import json
import sys


class BlueprintMCP:
    """Blueprint MCP client for Python scripts."""

    def __init__(self, debug=False):
        """
        Initialize Blueprint MCP client.

        Args:
            debug: Enable debug output to stderr
        """
        self._debug = debug
        self._id = 0
        self._proc = subprocess.Popen(
            ['npx', '@railsblueprint/blueprint-mcp', '--script-mode'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=None if debug else subprocess.DEVNULL,
            text=True,
            bufsize=1
        )

    def _call(self, method, **params):
        """Send a JSON-RPC request and return the result."""
        self._id += 1
        request = {
            'jsonrpc': '2.0',
            'id': self._id,
            'method': method,
            'params': params
        }

        if self._debug:
            print(f'[BlueprintMCP] -> {json.dumps(request)}', file=sys.stderr)

        self._proc.stdin.write(json.dumps(request) + '\\n')
        self._proc.stdin.flush()

        response_line = self._proc.stdout.readline()
        if not response_line:
            raise RuntimeError('No response from server')

        if self._debug:
            print(f'[BlueprintMCP] <- {response_line.strip()}', file=sys.stderr)

        response = json.loads(response_line)

        if 'error' in response:
            raise RuntimeError(response['error'].get('message', 'Unknown error'))

        return response.get('result')

    # Auto-generated methods (match tool names exactly)
{{METHODS}}

    def close(self):
        """Close the connection and terminate the server."""
        if self._proc:
            try:
                self._proc.stdin.close()
                self._proc.terminate()
                self._proc.wait(timeout=5)
            except Exception:
                self._proc.kill()
            self._proc = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
        return False
`;

/**
 * Generate a Python method for a tool
 * @param {string} toolName - Tool name (e.g., 'browser_tabs')
 * @returns {string} Python method code
 */
function generateMethod(toolName) {
  return `    def ${toolName}(self, **params):
        return self._call('${toolName}', **params)
`;
}

module.exports = {
  template,
  generateMethod
};
