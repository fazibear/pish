import { test } from 'node:test';
import assert from 'node:assert/strict';
import { styleFakeCursor } from '../src/fake-cursor.js';
import { configure } from '../src/config.js';

const marker = '\x1b_pi:c\x07';
const start = '\x1b_pi:fc\x07';
const end = '\x1b_pi:/fc\x07';
const config = configure();
const underlined = glyph => `\x1b[4m${glyph}\x1b[24m`;

test('cursor preserves and underlines the current letter', () => {
  assert.equal(styleFakeCursor(`a${marker}${start}X${end}b`, config), `a${marker}${underlined('X')}b`);
});
test('cursor displays an underlined space at end of input', () => {
  assert.equal(config.fakeCursorChar, ' ');
  assert.equal(styleFakeCursor(`hello${marker}${start} ${end}`, config), `hello${marker}${underlined(' ')}`);
});
test('cursor preserves multi-codepoint graphemes and following text', () => {
  assert.equal(styleFakeCursor(`${marker}${start}👩‍💻${end}next`, config), `${marker}${underlined('👩‍💻')}next`);
});
test('inverse-video fallback preserves the current letter', () => {
  assert.equal(styleFakeCursor('a\x1b[7mX\x1b[27mb', config), `a${underlined('X')}b`);
});
test('inverse-video fallback underlines a space', () => {
  assert.equal(styleFakeCursor('a\x1b[7m \x1b[27m', config), `a${underlined(' ')}`);
});
test('cursor keeps the surrounding text color unchanged', () => {
  const line = `\x1b[38;2;1;2;3m${marker}${start}X${end}next`;
  assert.equal(styleFakeCursor(line, config), `\x1b[38;2;1;2;3m${marker}${underlined('X')}next`);
});
test('hardware cursor mode leaves markers intact to avoid double cursors', () => {
  const line = `a${marker}${start}X${end}b`;
  assert.equal(styleFakeCursor(line, config, true), line);
  assert.equal(styleFakeCursor(line, config, false), `a${marker}${underlined('X')}b`);
});
test('fake cursor styling can be disabled', () => {
  const line = `a${marker}${start}X${end}b`;
  assert.equal(styleFakeCursor(line, configure({ fakeCursorEnabled: false })), line);
});
