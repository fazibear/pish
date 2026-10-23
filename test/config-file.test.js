import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDefaultConfig } from '../src/config-file.js';
import { defaults, configure } from '../src/config.js';

test('creates complete default config, including missing directories', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pish-config-'));
  try {
    const path = join(dir, 'nested', 'pish.json');
    assert.equal(await createDefaultConfig(path), true);
    const saved = JSON.parse(await readFile(path, 'utf8'));
    assert.deepEqual(saved, defaults);
    assert.deepEqual(configure(saved), configure());
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('never overwrites an existing config, even invalid JSON', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pish-config-'));
  try {
    const path = join(dir, 'pish.json');
    await writeFile(path, 'keep my content');
    assert.equal(await createDefaultConfig(path), false);
    assert.equal(await readFile(path, 'utf8'), 'keep my content');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
