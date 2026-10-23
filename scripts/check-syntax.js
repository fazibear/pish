import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

let checked = 0;
for (const directory of ['src', 'test', 'scripts']) {
  for (const file of await readdir(directory, { recursive: true })) {
    if (!file.endsWith('.js')) continue;
    const path = join(directory, file);
    const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
    checked++;
  }
}
console.log(`Syntax checked ${checked} JavaScript files.`);
