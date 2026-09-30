// Adapter discovery (scripts/lib/adapters.mjs): the build and npm run site:dev
// see the same adapters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverAdapters } from '../scripts/lib/adapters.mjs';

test('every adapters/<name>/index.mjs is found, in name order', async () => {
  const names = (await discoverAdapters()).map((a) => a.name);
  assert.ok(names.includes('geonicdb'));
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
});

test('a folder without index.mjs, and a plain file, are not adapters', async () => {
  const root = await mkdtemp(join(tmpdir(), 'adapters-'));
  try {
    for (const n of ['b', 'a', 'no-entry']) await mkdir(join(root, 'adapters', n), { recursive: true });
    for (const n of ['b', 'a']) await writeFile(join(root, 'adapters', n, 'index.mjs'), `export default { name: '${n}' };\n`);
    await writeFile(join(root, 'adapters', 'README.md'), '# Adapters\n');
    assert.deepEqual((await discoverAdapters(root)).map((a) => a.name), ['a', 'b']);
  } finally { await rm(root, { recursive: true, force: true }); }
});
