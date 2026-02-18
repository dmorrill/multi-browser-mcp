const assert = require('assert');
const { describe, it } = require('node:test');

describe('MCP Connection', () => {
  it('module exports correctly', () => {
    const mcp = require('../../src/mcpConnection');
    assert.ok(mcp, 'MCP Connection module should export');
  });
});
