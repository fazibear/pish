import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configure, paint, template } from '../src/config.js';

test('defaults and partial overrides', () => {
  const c = configure({ marker: '❯', marerColors: { user: '#112233' } });
  assert.equal(c.marker, '❯');
  assert.equal(c.marerColors.user, '#112233');
  assert.equal(c.marerColors.code, '#574080');
});
test('invalid config rejected', () => {
  for (const c of [null, { marker: '\n' }, { marerColors: { code: 'red' } }, { rightPrompt: 2 }])
    assert.throws(() => configure(c));
});
test('template values cannot inject terminal escapes', () => {
  assert.equal(template('{model} {unknown}', { model: '\x1bhello' }), 'hello ');
});
test('RGB color', () => assert.equal(paint('#112233', '|'), '\x1b[38;2;17;34;51m|\x1b[39m'));

test('configuration validation preserves field-specific errors', () => {
  for (const [value, message] of [
    [{ cursorShape: 'circle' }, 'cursorShape must be default, block, underline, or bar'],
    [{ cursorBlink: 1 }, 'cursorBlink must be boolean'],
    [{ fakeCursorEnabled: null }, 'fakeCursorEnabled must be boolean'],
    [{ fakeCursorAlways: 'yes' }, 'fakeCursorAlways must be boolean'],
    [{ textColors: [] }, 'textColors must be an object'],
    [{ textColors: { text: 'red' } }, 'textColors must use #rrggbb'],
    [{ marker: '123456789' }, 'marker must be 1–8 printable characters'],
    [{ rightPrompt: '\n' }, 'rightPrompt must be a single printable line'],
    [{ marerColors: { user: false } }, 'Colors must use #rrggbb'],
  ]) {
    assert.throws(() => configure(value), { message });
  }
});

test('empty prompt lines and mixed-case RGB colors remain valid', () => {
  const config = configure({ rightPrompt: '', textColors: { text: '#aAbBcC' } });
  assert.equal(config.rightPrompt, '');
  assert.equal(config.textColors.text, '#aAbBcC');
});
