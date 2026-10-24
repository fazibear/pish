import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configure } from '../src/config.js';
import { formatElapsed, rightPrompt } from '../src/right-prompt.js';

test('runtime uses whole seconds with minutes and hours as needed', () => {
  for (const [milliseconds, expected] of [
    [0, '0s'],
    [999, '0s'],
    [42000, '42s'],
    [135000, '2m 15s'],
    [3661000, '1h 1m 1s'],
    [-1, '0s'],
  ]) {
    assert.equal(formatElapsed(milliseconds), expected);
  }
});

test('runtime placeholder is visible only while the current task is running', () => {
  let idle = false;
  const ctx = { cwd: '/tmp', getContextUsage: () => undefined, isIdle: () => idle };
  const pi = { getThinkingLevel: () => 'low' };
  const config = configure({ rightPrompt: '{elapsed}' });
  assert.equal(rightPrompt(config, ctx, pi, '', '', {}, 135000), '2m 15s');
  idle = true;
  assert.equal(rightPrompt(config, ctx, pi, '', '', {}, 135000), '');
  idle = false;
  assert.equal(rightPrompt(config, ctx, pi, '', '', {}, 0), '0s');
});
