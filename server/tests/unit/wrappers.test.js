const assert = require('assert');
const { describe, it } = require('node:test');
const fs = require('fs');
const path = require('path');

describe('Wrappers', () => {
  it('wrapper directory exists', () => {
    const wrappersDir = path.join(__dirname, '../../src/wrappers');
    assert.ok(fs.existsSync(wrappersDir), 'Wrappers directory should exist');
  });

  it('contains wrapper files', () => {
    const wrappersDir = path.join(__dirname, '../../src/wrappers');
    const files = fs.readdirSync(wrappersDir);
    assert.ok(files.length > 0, 'Should have wrapper files');
  });
});
