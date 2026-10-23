import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configure, paint } from '../src/config.js';
import { attachRightPrompt, rightPrompt } from '../src/right-prompt.js';

const ctx = {
  model: { id: 'model' },
  cwd: '/tmp',
  getContextUsage: () => undefined,
  isIdle: () => true,
};
const pi = { getThinkingLevel: () => 'low' };
const ansi = (color) => paint(color, '').slice(0, -5);

test('inline color tags style placeholders and reset to the default right color', () => {
  const config = configure({ rightPrompt: '{#223344}{model}{#} · {thinking}' });
  assert.equal(
    rightPrompt(config, ctx, pi),
    `${ansi('#223344')}model${ansi(config.marerColors.right)} · low`,
  );
});

test('multiple colors and mixed-case hex values are supported', () => {
  const config = configure({ rightPrompt: '{#aAbBcC}{model}{#112233}{thinking}{#}' });
  assert.equal(
    rightPrompt(config, ctx, pi),
    `${ansi('#aAbBcC')}model${ansi('#112233')}low${ansi(config.marerColors.right)}`,
  );
});

test('placeholder values cannot introduce color tags or terminal escapes', () => {
  const config = configure({ rightPrompt: '{model}' });
  assert.equal(
    rightPrompt(config, { ...ctx, model: { id: '{#223344}\x1btest' } }, pi),
    '{#223344}test',
  );
});

test('invalid color tags remain literal text', () => {
  const config = configure({ rightPrompt: '{#xyz}{model}{#123}' });
  assert.equal(rightPrompt(config, ctx, pi), '{#xyz}model{#123}');
});

test('inline colors do not affect right alignment', () => {
  const config = configure({ rightPrompt: '{#223344}{model}{#}' });
  const text = rightPrompt(config, ctx, pi);
  const visibleWidth = (value) => value.replace(/\x1b\[[0-9;]*m/g, '').length;
  const lines = attachRightPrompt(['input'], text, 30, config.marerColors.right, visibleWidth);
  assert.equal(visibleWidth(lines[0]), 30);
  assert.ok(lines[0].includes(ansi('#223344')));
});
