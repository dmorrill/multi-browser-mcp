const assert = require('assert');
const { describe, it } = require('node:test');

describe('ScriptMode', () => {
  it('module exports correctly', () => {
    const scriptMode = require('../../src/scriptMode');
    assert.ok(scriptMode, 'ScriptMode module should export');
  });
});
