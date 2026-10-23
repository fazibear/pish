import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configure } from '../config.js';
test('working indicator settings are validated', () => {
  assert.throws(() => configure({ workingIndicator: 'bad' }));
  assert.throws(() => configure({ workingText: '\n' }));
});
