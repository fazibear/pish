import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configure, paint } from '../src/config.js';
import { patchPendingMessages } from '../src/pending.js';

test('steering, follow-up and hint get markers; empty queue disappears', () => {
  class Text {
    constructor(text) {
      this.text = text;
    }
    render() {
      return this.text.split('\n');
    }
  }
  class Mode {
    blocks = [];
    queue = { steering: ['hello\nagain'], followUp: ['later'] };
    pendingMessagesContainer = {
      clear: () => {
        this.blocks = [];
      },
      addChild: (block) => this.blocks.push(block),
    };
    getAllQueuedMessages() {
      return this.queue;
    }
    getAppKeyDisplay() {
      return 'alt+up';
    }
    updatePendingMessagesDisplay() {}
  }
  const original = Mode.prototype.updatePendingMessagesDisplay;
  const config = configure();
  const restore = patchPendingMessages(Mode, () => config, { Text, visibleWidth: (s) => s.length });
  const mode = new Mode();
  mode.updatePendingMessagesDisplay();
  const rows = mode.blocks[0].render(80);
  assert.equal(rows[0], `${paint(config.marerColors.user, '▌')} Steering: hello`);
  assert.ok(rows.slice(0, -2).every((row) => row.startsWith(paint(config.marerColors.user, '▌'))));
  assert.ok(rows.some((row) => row.includes('Follow-up: later')));
  mode.queue = { steering: [], followUp: [] };
  mode.updatePendingMessagesDisplay();
  assert.deepEqual(mode.blocks, []);
  restore();
  restore();
  assert.equal(Mode.prototype.updatePendingMessagesDisplay, original);
});
