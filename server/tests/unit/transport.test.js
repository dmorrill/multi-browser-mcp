const assert = require('assert');
const { describe, it } = require('node:test');

describe('Transport', () => {
  it('module exports correctly', () => {
    const transport = require('../../src/transport');
    assert.ok(transport, 'Transport module should export');
  });
});
