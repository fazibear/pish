import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configure, paint } from '../src/config.js';
import { renderBlock } from '../src/rendering.js';
import { patchTranscript } from '../src/transcript.js';

class Text {
  render() {
    return ['unchanged text'];
  }
}

test('each extra transcript block uses its own configurable marker color', () => {
  for (const role of ['bash', 'bashError', 'skill', 'summary', 'compaction', 'custom', 'entry']) {
    class Component {
      children = [new Text()];
      contentContainer = new Text();
      customComponent = new Text();
      status = role === 'bashError' ? 'error' : 'complete';
      render() {}
    }
    let config = configure({ marerColors: { [role]: '#123456' } });
    const restore = patchTranscript(
      [[Component, role === 'bashError' ? 'bash' : role]],
      () => config,
      { visibleWidth: (text) => text.length },
    );
    try {
      const instance = new Component();
      assert.equal(
        instance.render(80)[0],
        `${paint('#123456', config.marker)} unchanged text`,
        role,
      );
      config = configure({ marerColors: { [role]: '#abcdef' } });
      assert.equal(
        instance.render(80)[0],
        `${paint('#abcdef', config.marker)} unchanged text`,
        role,
      );
    } finally {
      restore();
    }
  }
});

test('notice and widget blocks independently color markers without coloring text', () => {
  for (const role of [
    'status',
    'warning',
    'bugReport',
    'cacheWarming',
    'compactionCost',
    'thinkingDrop',
    'cacheMiss',
    'projectTrust',
    'pending',
    'update',
  ]) {
    const config = configure({ marerColors: { [role]: '#123456' } });
    assert.deepEqual(
      renderBlock(
        80,
        config,
        role,
        (text) => text.length,
        () => ['unchanged text'],
      ),
      [`${paint('#123456', config.marker)} unchanged text`, '', ''],
    );
  }
});
