import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configure, paint } from '../src/config.js';
import { patchUpdates } from '../src/updates.js';

class Text {
  constructor(text) {
    this.text = text;
  }
  render() {
    return this.text.split('\n');
  }
}
test('update notices use markers, spacing, live config and restore builders', () => {
  class Mode {
    blocks = [];
    chatContainer = { addChild: (component) => this.blocks.push(component) };
    ui = { requestRender() {} };
    showNewVersionNotification() {
      return 'original';
    }
    showPackageUpdateNotification() {
      return 'original';
    }
  }
  const original = Mode.prototype.showNewVersionNotification;
  let config = configure();
  const restore = patchUpdates(Mode, () => config, {
    Text,
    Markdown: Text,
    visibleWidth: (s) => s.length,
    getMarkdownTheme: () => ({}),
  });
  const mode = new Mode();
  mode.showNewVersionNotification({ version: '1.2.3', note: 'Release notes' });
  mode.showPackageUpdateNotification(['example']);
  const rows = mode.blocks[0].render(80);
  assert.equal(rows[0], `${paint(config.marerColors.tool, '▌')} Update Available`);
  assert.ok(rows.some((row) => row.includes('pi update')));
  assert.ok(rows.some((row) => row.includes('Release notes')));
  assert.equal(rows.at(-1), '');
  assert.deepEqual(rows.slice(-2), ['', '']);
  assert.ok(mode.blocks[1].render(80).some((row) => row.includes('- example')));
  config = configure({ marker: '>' });
  assert.ok(mode.blocks[0].render(80)[0].startsWith(paint(config.marerColors.tool, '>')));
  restore();
  restore();
  assert.equal(Mode.prototype.showNewVersionNotification, original);
});
