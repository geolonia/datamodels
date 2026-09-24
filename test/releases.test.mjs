// The snapshot of the current version must match the sources; CI runs this
// check through check-immutability without --record.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const probe = `
const { loadSubjects } = await import(${JSON.stringify(pathToFileURL(join(root, 'scripts/lib/models.mjs')).href)});
const { verifyRelease } = await import(${JSON.stringify(pathToFileURL(join(root, 'scripts/lib/releases.mjs')).href)});
const problems = [];
for (const s of await loadSubjects()) problems.push(...(await verifyRelease(s, { recorded: process.env.RECORDED === '1' })));
console.log(JSON.stringify(problems));`;

async function problemsAfter(mutate, { recorded = false } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'datamodels-releases-'));
  try {
    await cp(join(root, 'models'), dir, { recursive: true });
    await mutate(dir);
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', probe], { env: { ...process.env, GEONICDB_MODELS_DIR: dir, RECORDED: recorded ? '1' : '0' }, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(r.stdout);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('unmodified snapshots match the sources', async () => {
  assert.deepEqual(await problemsAfter(async () => {}), []);
});

test('a snapshot edited by hand is reported', async () => {
  const problems = await problemsAfter(async (d) => {
    const f = join(d, 'common', 'releases', 'v1.0.0', 'context.jsonld');
    await writeFile(f, (await readFile(f, 'utf8')).replace('"common"', '"commons"'));
  });
  assert.ok(problems.some((p) => /common v1\.0\.0 context: snapshot differs from the sources/.test(p)), JSON.stringify(problems));
});

test('a source change without a version bump is reported', async () => {
  const problems = await problemsAfter(async (d) => {
    const f = join(d, 'common', 'JapaneseAddress', 'schema.json');
    const s = JSON.parse(await readFile(f, 'utf8')); s.description += ' (edited)'; await writeFile(f, JSON.stringify(s, null, 2));
  });
  assert.ok(problems.some((p) => /JapaneseAddress schema: snapshot differs/.test(p)), JSON.stringify(problems));
});

test('an extra file at the snapshot root is reported', async () => {
  const problems = await problemsAfter((d) => writeFile(join(d, 'common', 'releases', 'v1.0.0', 'notes.txt'), 'x'));
  assert.ok(problems.some((p) => /snapshot has notes\.txt, which is not part of the snapshot/.test(p)), JSON.stringify(problems));
});

test('a missing snapshot is fine before recording and reported after', async () => {
  const drop = (d) => rm(join(d, 'common', 'releases'), { recursive: true, force: true });
  assert.deepEqual(await problemsAfter(drop), []);
  const problems = await problemsAfter(drop, { recorded: true });
  assert.ok(problems.some((p) => /common v1\.0\.0: recorded in published-manifest\.json but its snapshot .* is missing/.test(p)), JSON.stringify(problems));
});
