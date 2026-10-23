import assert from 'node:assert/strict';
import test from 'node:test';
import { registerCommands } from '../src/commands.js';

function setup(overrides = {}) {
  const commands = new Map();
  const calls = [];
  const ctx = { mode: 'tui', ui: { notify: (...args) => calls.push(args) } };
  registerCommands(
    { registerCommand: (name, command) => commands.set(name, command) },
    {
      load: async () => {
        calls.push('load');
      },
      applyCursor: () => calls.push('cursor'),
      redraw: () => calls.push('render'),
      refreshUsage: () => calls.push('usage'),
      ...overrides,
    },
  );
  return { calls, ctx, run: (name) => commands.get(name).handler(undefined, ctx) };
}

test('reload updates config, cursor, usage, and rendering in order', async () => {
  const { run, calls } = setup();
  await run('pish-reload');
  assert.deepEqual(calls, [
    'load',
    'cursor',
    'usage',
    'render',
    ['pish configuration reloaded', 'info'],
  ]);
});

test('failed config loads report errors without applying partial updates', async () => {
  const { run, calls } = setup({
    load: async () => {
      throw new Error('invalid config');
    },
  });
  await run('pish-reload');
  assert.deepEqual(calls, [['pish: Error: invalid config', 'error']]);
});

test('usage command does nothing outside the terminal UI', async () => {
  const { run, ctx, calls } = setup();
  ctx.mode = 'print';
  await run('pish-usage');
  assert.deepEqual(calls, []);
});
