import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configure } from '../config.js';
import { rightPrompt, promptLayout, attachRightPrompt, workingIndicator } from '../right-prompt.js';
const utils = { visibleWidth: s => s.length, truncateToWidth: (s, n) => s.slice(0, n) };
test('working indicator supports text, animation, none and idle', () => {
  assert.equal(workingIndicator(configure(), false, 0), '');
  assert.equal(workingIndicator(configure({ workingIndicator: 'text', workingText: 'thinking' }), true), 'thinking');
  assert.equal(workingIndicator(configure({ workingIndicator: 'none' }), true), '');
  assert.notEqual(workingIndicator(configure(), true, 0), workingIndicator(configure(), true, 100));
  assert.equal(workingIndicator(configure(), true, 0), '▌');
  assert.equal(workingIndicator(configure(), true, 1400), '▌');
  assert.equal(workingIndicator(configure(), true, 400), '█');
  assert.equal(workingIndicator(configure(), true, 500), '▉');
  assert.equal(workingIndicator(configure(), true, 1100), '▏');
});
test('working indicator is not included in the right prompt', () => {
  const ctx = { model: { id: 'model' }, cwd: '/', getContextUsage: () => undefined, isIdle: () => false };
  const pi = { getThinkingLevel: () => 'off' };
  const config = configure({ rightPrompt: '{model}', workingIndicator: 'text' });
  assert.equal(rightPrompt(config, ctx, pi), 'model');
  assert.equal(rightPrompt({ ...config, rightPrompt: '{working}{model}' }, ctx, pi), 'model');
});
test('right prompt exposes model, context and path', () => {
  const ctx = { model: { id: 'model', contextWindow: 100000 }, cwd: '/tmp/project', getContextUsage: () => ({ tokens: 10000 }), isIdle: () => true };
  assert.equal(rightPrompt(configure({ rightPrompt: '{model} {context_used}/{context_limit} {context_percent_used} {context_percent_left} {context_left} {dir} {status}' }), ctx, { getThinkingLevel: () => 'high' }), 'model 10.0k/100.0k 10% 90% 90.0k project idle');
});
test('usage placeholder preserves the provider extension status styling', () => {
  const ctx = { model: { id: 'model' }, cwd: '/', getContextUsage: () => undefined, isIdle: () => true };
  const status = '\u001b[32m5h 80%\u001b[39m';
  assert.equal(rightPrompt(configure({ rightPrompt: '{model} {usage}' }), ctx, { getThinkingLevel: () => 'off' }, '', status), 'model ' + status);
});
test('layout reserves input space and hides on narrow terminals', () => {
  const layout = promptLayout(80, 2, 'model', utils);
  assert.equal(layout.editorWidth, 71);
  assert.equal(promptLayout(15, 2, 'model', utils).right, '');
  assert.equal(promptLayout(80, 2, '', utils).editorWidth, 78);
});
test('long input hides the right prompt and reclaims width', () => {
  const long = promptLayout(80, 2, 'model', utils, 'x'.repeat(70));
  assert.equal(long.right, '');
  assert.equal(long.editorWidth, 78);
  assert.equal(promptLayout(80, 2, 'model', utils, 'short').right, 'model');
  assert.equal(promptLayout(80, 2, 'model', utils, 'short\n' + 'x'.repeat(70)).right, '');
});
test('right prompt only attaches to first row and never overlaps', () => {
  const lines = attachRightPrompt(['left', 'second'], 'right', 20, '#808080', utils.visibleWidth);
  assert.ok(lines[0].startsWith('left' + ' '.repeat(11)));
  assert.equal(lines[1], 'second');
  assert.deepEqual(attachRightPrompt(['long input'], 'right', 10, '#808080', utils.visibleWidth), ['long input']);
});
