const assert = require('assert');
const { describe, it } = require('node:test');

describe('OAuth Configuration', () => {
  it('module loads without errors', () => {
    const oauth = require('../../src/oauth');
    assert.ok(oauth, 'OAuth module should load');
  });
});
