import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { configure, defaults } from '../src/config.js';
import { createDefaultConfig, loadConfig } from '../src/config-file.js';

test('creates complete default config, including missing directories', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pish-config-'));
  try {
    const path = join(dir, 'nested', 'pish.json');
    assert.equal(await createDefaultConfig(path), true);
    const saved = JSON.parse(await readFile(path, 'utf8'));
    assert.deepEqual(saved, defaults);
    assert.deepEqual(configure(saved), configure());
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('loads defaults only for a missing file and validates existing config', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pish-config-'));
  const path = join(dir, 'pish.json');
  try {
    assert.deepEqual(await loadConfig(path), configure());
    await writeFile(path, JSON.stringify({ marker: '>' }));
    assert.equal((await loadConfig(path)).marker, '>');
    await writeFile(path, '{');
    await assert.rejects(loadConfig(path), SyntaxError);
    await writeFile(path, JSON.stringify({ cursorBlink: 'yes' }));
    await assert.rejects(loadConfig(path), /cursorBlink must be boolean/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('never overwrites an existing config, even invalid JSON', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pish-config-'));
  try {
    const path = join(dir, 'pish.json');
    await writeFile(path, 'keep my content');
    assert.equal(await createDefaultConfig(path), false);
    assert.equal(await readFile(path, 'utf8'), 'keep my content');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
