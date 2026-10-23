import assert from 'node:assert/strict';
import test from 'node:test';
import { patchMethod } from '../src/patch.js';

test('method patches preserve descriptors, receiver, arguments, and return values', () => {
  const target = {};
  Object.defineProperty(target, 'run', {
    configurable: true,
    writable: true,
    enumerable: false,
    value(value) {
      return this.base + value;
    },
  });
  const descriptor = Object.getOwnPropertyDescriptor(target, 'run');
  const restore = patchMethod(
    target,
    'run',
    (original) =>
      function (value) {
        return original.call(this, value) * 2;
      },
  );
  assert.equal(target.run.call({ base: 3 }, 4), 14);
  assert.equal(Object.getOwnPropertyDescriptor(target, 'run').enumerable, false);
  restore();
  assert.deepEqual(Object.getOwnPropertyDescriptor(target, 'run'), descriptor);
  restore();
  assert.deepEqual(Object.getOwnPropertyDescriptor(target, 'run'), descriptor);
});

test('unsupported methods fail without modifying the target', () => {
  const target = { run: 42 };
  assert.throws(() => patchMethod(target, 'run', () => () => {}), /Unsupported pi method: run/);
  assert.equal(target.run, 42);
});

test('a failing wrapper leaves the original method intact', () => {
  const target = { run() {} };
  const original = target.run;
  assert.throws(
    () =>
      patchMethod(target, 'run', () => {
        throw new Error('failed');
      }),
    /failed/,
  );
  assert.equal(target.run, original);
});
