import test from 'node:test';
import assert from 'node:assert/strict';
import { patchUserMessageSpacing } from '../src/spacing.js';

test('submitted messages stay at the prompt row, including subsequent turns', () => {
  class Spacer {}
  class Mode {
    chatContainer = { children: [] };
    addMessageToChat(message) {
      if (message.role === 'user' && this.chatContainer.children.length) {
        this.chatContainer.children.push(new Spacer());
      }
      this.chatContainer.children.push(message);
    }
  }
  const original = Mode.prototype.addMessageToChat;
  const restore = patchUserMessageSpacing(Mode, Spacer);
  try {
    const mode = new Mode();
    const first = { role: 'user' };
    const reply = { role: 'assistant' };
    const second = { role: 'user' };
    mode.addMessageToChat(first);
    mode.addMessageToChat(reply);
    mode.addMessageToChat(second);
    assert.deepEqual(mode.chatContainer.children, [first, reply, second]);
  } finally { restore(); }
  restore();
  assert.equal(Mode.prototype.addMessageToChat, original);
});
