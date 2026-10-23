import { test } from 'node:test';
import assert from 'node:assert/strict';
import { disableBackgrounds } from '../src/background.js';
test('background API is transparent across instances and restored on shutdown', () => {
  class Theme {
    bg(_color, text) { return `background:${text}`; }
    getBgAnsi() { return 'background'; }
    fg(_color, text) { return `foreground:${text}`; }
  }
  const theme = new Theme();
  const restore = disableBackgrounds(Theme);
  assert.equal(theme.bg('selectedBg', 'hello'), 'hello');
  assert.equal(new Theme().getBgAnsi('toolPendingBg'), '');
  assert.equal(theme.fg('text', 'hello'), 'foreground:hello');
  restore(); restore();
  assert.equal(theme.bg('selectedBg', 'hello'), 'background:hello');
  assert.equal(theme.getBgAnsi(), 'background');
});
