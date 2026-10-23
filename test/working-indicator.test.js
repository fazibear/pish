import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configure } from '../src/config.js';
import { workingIndicator } from '../src/working-indicator.js';

test('custom sequences play in order and loop without splitting Unicode glyphs', () => {
  const config = configure({ workingFrames: '▏🭰🭱▕🭱🭰' });
  const expected = ['▏', '🭰', '🭱', '▕', '🭱', '🭰', '▏'];
  assert.deepEqual(
    expected.map((_, index) => workingIndicator(config, true, index * 100)),
    expected,
  );
});

test('invalid animation sequences are rejected', () => {
  for (const workingFrames of ['', null, [], 1, 'a\nb', '\x1b']) {
    assert.throws(
      () => configure({ workingFrames }),
      /workingFrames must be a non-empty printable string/,
    );
  }
});

test('single-frame animations and literal spaces are supported', () => {
  assert.equal(workingIndicator(configure({ workingFrames: '*' }), true, 1000), '*');
  assert.equal(workingIndicator(configure({ workingFrames: ' *' }), true, 0), ' ');
});
