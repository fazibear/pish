import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configure, paint } from '../src/config.js';
import { patchTextColors } from '../src/text-colors.js';
test('text tokens override independently of bars and reload live', () => {
  class Theme {
    fg(token, text) { return `${token}:${text}`; }
    getFgAnsi() { return 'original'; }
  }
  let config = configure({ textColors: { thinkingText: '#112233' } });
  const restore = patchTextColors(Theme, () => config);
  const theme = new Theme();
  assert.equal(theme.fg('thinkingText', 'thought'), paint('#112233', 'thought'));
  assert.equal(theme.fg('text', 'hello'), 'text:hello');
  assert.equal(theme.getFgAnsi('thinkingText'), '\x1b[38;2;17;34;51m');
  config = configure({ textColors: { text: '#ffffff' } });
  assert.equal(theme.fg('text', 'hello'), paint('#ffffff', 'hello'));
  restore(); restore();
  assert.equal(theme.getFgAnsi(), 'original');
});
test('invalid textColors rejected', () => {
  assert.throws(() => configure({ textColors: { text: 'red' } }));
  assert.throws(() => configure({ textColors: [] }));
});
