import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configureCursor } from '../cursor.js';
import { configure } from '../config.js';

function fixture() {
  let hardware = false;
  const writes = [];
  return {
    writes, get hardware() { return hardware; },
    tui: {
      getShowHardwareCursor: () => hardware,
      setShowHardwareCursor: value => { hardware = value; },
      terminal: { write: text => writes.push(text) },
    },
  };
}

test('bar cursor enables hardware cursor and restores on shutdown', () => {
  const f = fixture();
  const cursor = configureCursor(f.tui, configure());
  assert.equal(f.hardware, true);
  assert.equal(f.writes[0], '\x1b[6 q');
  cursor.restore(); cursor.restore();
  assert.equal(f.hardware, false);
  assert.deepEqual(f.writes, ['\x1b[6 q', '\x1b[0 q']);
});

test('busy mode hides hardware cursor to avoid flicker while streaming', () => {
  const f = fixture();
  const cursor = configureCursor(f.tui, configure());
  cursor.setBusy(true);
  assert.equal(f.hardware, false);
  cursor.setBusy(false);
  assert.equal(f.hardware, true);
  cursor.restore();
});

test('all cursor shapes support blinking and steady modes', () => {
  for (const [cursorShape, blinking, steady] of [['block', 1, 2], ['underline', 3, 4], ['bar', 5, 6]]) {
    for (const cursorBlink of [true, false]) {
      const f = fixture();
      const cursor = configureCursor(f.tui, configure({ cursorShape, cursorBlink }));
      assert.equal(f.writes[0], `\x1b[${cursorBlink ? blinking : steady} q`);
      cursor.restore();
    }
  }
});

test('default leaves pi cursor behavior unchanged', () => {
  const f = fixture();
  const cursor = configureCursor(f.tui, configure({ cursorShape: 'default' }));
  assert.equal(f.hardware, false);
  assert.deepEqual(f.writes, []);
  cursor.restore();
});

test('fake cursor always keeps hardware cursor hidden', () => {
  const f = fixture();
  const cursor = configureCursor(f.tui, configure({ fakeCursorAlways: true }));
  assert.equal(f.hardware, false);
  cursor.setBusy(true);
  assert.equal(f.hardware, false);
  cursor.setBusy(false);
  assert.equal(f.hardware, false);
  cursor.restore();
});

test('invalid cursor configuration rejected', () => {
  assert.throws(() => configure({ cursorShape: 'triangle' }));
  assert.throws(() => configure({ cursorBlink: 'yes' }));
  assert.throws(() => configure({ fakeCursorAlways: 'yes' }));
});
