import assert from 'node:assert/strict';
import test from 'node:test';
import { configure } from '../src/config.js';
import { patchTranscript } from '../src/transcript.js';

class Text {
  constructor(text) {
    this.text = text;
  }
  render() {
    return [this.text];
  }
}
const deps = { visibleWidth: (text) => text.length, Text };

test('assistant errors preserve stop-reason handling with tool calls', () => {
  class Assistant {
    render() {}
  }
  const restore = patchTranscript([[Assistant, 'assistant']], configure, deps);
  try {
    for (const [stopReason, content, expected] of [
      ['length', [], 'Response was truncated before completion.'],
      ['aborted', [], 'Operation aborted'],
      ['error', [], 'Unknown error'],
      ['error', [{ type: 'toolCall' }], undefined],
      ['length', [{ type: 'toolCall' }], 'Response was truncated before completion.'],
    ]) {
      const instance = new Assistant();
      instance.lastMessage = { stopReason, content };
      const rows = instance.render(80);
      if (expected) assert.ok(rows[0].includes(expected));
      else assert.deepEqual(rows, []);
    }
  } finally {
    restore();
  }
});

test('failed transcript setup restores inherited render methods', () => {
  class Base {
    render() {}
  }
  class User extends Base {}
  class Unsupported {}
  assert.throws(
    () =>
      patchTranscript(
        [
          [User, 'user'],
          [Unsupported, 'tool'],
        ],
        configure,
        deps,
      ),
    /Unsupported tool renderer/,
  );
  assert.equal(Object.hasOwn(User.prototype, 'render'), false);
  assert.equal(User.prototype.render, Base.prototype.render);
});
