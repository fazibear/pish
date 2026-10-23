import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configure, template, paint } from '../config.js';
test('defaults and partial overrides', () => {
  const c = configure({ marker: '❯', marerColors: { user: '#112233' } });
  assert.equal(c.marker, '❯');
  assert.equal(c.marerColors.user, '#112233');
  assert.equal(c.marerColors.code, '#574080');
});
test('invalid config rejected', () => {
  for (const c of [null, { marker: '\n' }, { marerColors: { code: 'red' } }, { rightPrompt: 2 }]) assert.throws(() => configure(c));
});
test('template values cannot inject terminal escapes', () => {
  assert.equal(template('{model} {unknown}', { model: '\x1bhello' }), 'hello ');
});
test('RGB color', () => assert.equal(paint('#112233', '|'), '\x1b[38;2;17;34;51m|\x1b[39m'));
