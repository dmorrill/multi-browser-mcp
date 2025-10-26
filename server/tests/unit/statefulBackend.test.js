/**
 * Unit tests for StatefulBackend
 */

const { StatefulBackend } = require('../../src/statefulBackend');

describe('StatefulBackend', () => {
  test('initializes in passive state', () => {
    const backend = new StatefulBackend({ debug: false });
    expect(backend._state).toBe('passive');
  });

  test('has required methods', () => {
    const backend = new StatefulBackend({ debug: false });
    expect(typeof backend.initialize).toBe('function');
    expect(typeof backend.listTools).toBe('function');
    expect(typeof backend.callTool).toBe('function');
    expect(typeof backend.serverClosed).toBe('function');
  });

  test('listTools returns connection management tools', async () => {
    const backend = new StatefulBackend({ debug: false });
    await backend.initialize(null, {});

    const tools = await backend.listTools();

    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);

    // Check for connection management tools
    const toolNames = tools.map(t => t.name);
    expect(toolNames).toContain('enable');
    expect(toolNames).toContain('disable');
    expect(toolNames).toContain('status');
    expect(toolNames).toContain('auth');
  });
});
