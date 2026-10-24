import assert from 'node:assert/strict';
import test from 'node:test';
import { registerCommands } from '../src/commands.js';

test('indicator command selects a named sequence and rejects unknown names', async () => {
  let selected;
  const { run, calls } = setup({
    getConfig: () => ({ workingFrames: { pulse: 'ab', bounce: 'cd' } }),
    setAnimation: (name) => {
      selected = name;
    },
  });
  await run('pish-indicator', 'bounce');
  assert.equal(selected, 'bounce');
  assert.ok(calls.includes('render'));
  await run('pish-indicator', 'missing');
  assert.equal(selected, 'bounce');
  assert.equal(calls.at(-1)[1], 'error');
});

test('indicator picker handles selection and cancellation', async () => {
  let selected;
  let choice = 'pulse';
  const { run } = setup({
    pickAnimation: async (_ctx, sequences, current) => {
      assert.deepEqual(sequences, { pulse: 'ab', bounce: 'cd' });
      assert.equal(current, 'pulse');
      return choice;
    },
    getConfig: () => ({ workingFrames: { pulse: 'ab', bounce: 'cd' }, workingAnimation: 'pulse' }),
    setAnimation: (name) => {
      selected = name;
    },
  });
  await run('pish-indicator');
  assert.equal(selected, 'pulse');
  selected = undefined;
  choice = undefined;
  await run('pish-indicator');
  assert.equal(selected, undefined);
});

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
  return { calls, ctx, run: (name, args) => commands.get(name).handler(args, ctx) };
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
