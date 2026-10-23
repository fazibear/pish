import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { defaults } from './config.js';

export async function createDefaultConfig(path) {
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(path, JSON.stringify(defaults, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return true;
  } catch (error) {
    if (error.code === 'EEXIST') return false;
    throw error;
  }
}
