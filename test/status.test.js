import { test } from 'node:test';
import assert from 'node:assert/strict';
import { patchStatusMessages } from '../status.js';
import { configure, paint } from '../config.js';
test('reload status gets bars and consecutive statuses coalesce', () => {
  class Text {
    constructor(text) { this.text = text; }
    render() { return this.text.split('\n'); }
  }
  class Mode {
    chatContainer = { children: [], addChild(component) { this.children.push(component); } };
    ui = { requestRender() {} };
    showStatus() {}
  }
  const original = Mode.prototype.showStatus;
  const config = configure();
  const restore = patchStatusMessages(Mode, () => config, { Text, visibleWidth: text => text.length });
  const mode = new Mode();
  const message = 'Reloaded keybindings, extensions, skills, prompts, themes, and context files';
  mode.showStatus(message);
  assert.deepEqual(mode.chatContainer.children[0].render(100), [paint(config.colors.tool, config.marker) + ' ' + message, '', '']);
  mode.showStatus('Next status');
  assert.equal(mode.chatContainer.children.length, 1);
  assert.ok(mode.chatContainer.children[0].render(100)[0].endsWith('Next status'));
  mode.chatContainer.addChild({});
  mode.showStatus('After another message');
  assert.equal(mode.chatContainer.children.length, 3);
  restore(); restore();
  assert.equal(Mode.prototype.showStatus, original);
});
