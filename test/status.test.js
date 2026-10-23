import { test } from 'node:test';
import assert from 'node:assert/strict';
import { patchStatusMessages } from '../src/status.js';
import { configure, paint } from '../src/config.js';
test('reload status gets bars and consecutive statuses coalesce', () => {
  class Text {
    constructor(text) { this.text = text; }
    render() { return this.text.split('\n'); }
  }
  class Mode {
    chatContainer = { children: [], addChild(component) { this.children.push(component); } };
    ui = { requestRender() {} };
    showStatus() {}
    showError() {}
    showWarning() {}
  }
  const original = Mode.prototype.showStatus;
  const config = configure();
  const restore = patchStatusMessages(Mode, () => config, { Text, visibleWidth: text => text.length });
  const mode = new Mode();
  const message = 'Reloaded keybindings, extensions, skills, prompts, themes, and context files';
  mode.showStatus(message);
  assert.deepEqual(mode.chatContainer.children[0].render(100), [paint(config.marerColors.tool, config.marker) + ' ' + message, '', '']);
  mode.showStatus('Next status');
  assert.equal(mode.chatContainer.children.length, 1);
  assert.ok(mode.chatContainer.children[0].render(100)[0].endsWith('Next status'));
  mode.chatContainer.addChild({});
  mode.showStatus('After another message');
  assert.equal(mode.chatContainer.children.length, 3);
  mode.showError('failed');
  const errorRows = mode.chatContainer.children.at(-1).render(100);
  assert.ok(errorRows[0].startsWith(paint(config.marerColors.error, config.marker)));
  assert.ok(errorRows[0].includes('Error: failed'));
  mode.showWarning('If this looks like a pi bug, /bug sends a report to the developers.');
  const warningRows = mode.chatContainer.children.at(-1).render(100);
  assert.ok(warningRows[0].startsWith(paint(config.marerColors.tool, config.marker)));
  assert.ok(warningRows[0].includes('Warning: If this looks like a pi bug'));
  restore(); restore();
  assert.equal(Mode.prototype.showStatus, original);
});
