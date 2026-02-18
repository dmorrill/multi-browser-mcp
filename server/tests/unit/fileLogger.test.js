const assert = require('assert');
const { describe, it } = require('node:test');

describe('FileLogger', () => {
  it('module exports correctly', () => {
    const logger = require('../../src/fileLogger');
    assert.ok(logger, 'FileLogger module should export');
  });
});
