import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configure, paint } from '../src/config.js';
import { patchStatusMessages } from '../src/status.js';

test('bug report hint gets a bar, appears once per mode, and restores on teardown', () => {
  class Text {
    constructor(text) {
      this.text = text;
    }
    render() {
      return [this.text];
    }
  }
  class Mode {
    chatContainer = {
      children: [],
      addChild(child) {
        this.children.push(child);
      },
    };
    ui = { requestRender() {} };
    showStatus() {}
    suggestBugReport() {
      throw new Error('original');
    }
  }
  let config = configure();
  const original = Mode.prototype.suggestBugReport;
  const restore = patchStatusMessages(Mode, () => config, {
    Text,
    visibleWidth: (text) => text.length,
  });
  try {
    const mode = new Mode();
    mode.suggestBugReport();
    mode.suggestBugReport();
    assert.equal(mode.chatContainer.children.length, 1);
    const hint = mode.chatContainer.children[0];
    const rows = hint.render(100);
    assert.ok(rows[0].startsWith(paint(config.marerColors.tool, config.marker) + ' '));
    assert.ok(
      rows[0].includes('If this looks like a pi bug, /bug sends a report to the developers.'),
    );
    assert.deepEqual(rows.slice(-2), ['', '']);
    config = configure({ textColors: { muted: '#123456' } });
    assert.ok(
      hint
        .render(100)[0]
        .includes(
          paint('#123456', 'If this looks like a pi bug, /bug sends a report to the developers.'),
        ),
    );
    const other = new Mode();
    other.suggestBugReport();
    assert.equal(other.chatContainer.children.length, 1);
  } finally {
    restore();
  }
  assert.equal(Mode.prototype.suggestBugReport, original);
});
