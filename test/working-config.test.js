import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configure } from '../src/config.js';

test('working indicator settings are validated', () => {
  assert.throws(() => configure({ workingIndicator: 'bad' }));
  assert.throws(() => configure({ workingText: '\n' }));
});
