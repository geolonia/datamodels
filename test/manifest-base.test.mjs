// check-manifest-base: a PR must not rewrite or drop recorded entries; during
// the pre-release that is reported but allowed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { diffManifests } from '../scripts/check-manifest-base.mjs';

const root = join(fileURLToPath(import.meta.url), '..', '..');
// The committed manifest at HEAD is the base; the head manifest is a mutated copy.
const baseManifest = JSON.parse(execFileSync('git', ['show', 'HEAD:published-manifest.json'], { cwd: root, encoding: 'utf8' }));

async function runWith(mutate, args = ['--base', 'HEAD']) {
  const dir = await mkdtemp(join(tmpdir(), 'datamodels-manifest-'));
  try {
    const m = structuredClone(baseManifest);
    mutate(m);
    const file = join(dir, 'published-manifest.json');
    await writeFile(file, typeof m === 'string' ? m : JSON.stringify(m));
    const summary = join(dir, 'summary.md');
    const r = spawnSync(process.execPath, [join(root, 'scripts', 'check-manifest-base.mjs'), ...args], { cwd: root, env: { ...process.env, DATAMODELS_MANIFEST: file, GITHUB_STEP_SUMMARY: summary }, encoding: 'utf8' });
    return { ...r, summary: await readFile(summary, 'utf8').catch(() => '') };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
const first = Object.keys(baseManifest.files)[0];

test('diffManifests separates changed, removed and added entries', () => {
  const d = diffManifests({ files: { a: '1', b: '2', c: '3' } }, { files: { a: '1', b: 'x', d: '4' } });
  assert.deepEqual(d, { changed: ['b'], removed: ['c'], added: ['d'] });
});

test('new entries only pass', async () => {
  const r = await runWith((m) => { m.files['schema/x/Y/v1.0.0.json'] = 'abc'; });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /1 new entry, none changed or removed/);
});

test('a changed entry during the pre-release passes and is listed in the summary', async () => {
  const r = await runWith((m) => { m.prerelease = true; m.files[first] = 'changed'; });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /pre-release: 1 published file\(s\) corrected in place/);
  assert.match(r.summary, /Published files corrected in place \(pre-release\)/);
});

test('a changed or removed entry after the launch fails', async () => {
  const second = Object.keys(baseManifest.files)[1];
  const r = await runWith((m) => { m.prerelease = false; m.files[first] = 'changed'; delete m.files[second]; });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /2 published file\(s\) changed or removed/);
  assert.match(r.summary, new RegExp(`${second.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\`? \\| removed`));
});

test('a missing prerelease field counts as launched', async () => {
  const r = await runWith((m) => { delete m.prerelease; m.files[first] = 'changed'; });
  assert.equal(r.status, 1);
});

test('an unknown base ref fails with a hint instead of passing', async () => {
  const r = await runWith(() => {}, ['--base', 'origin/no-such-branch']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /cannot read published-manifest\.json at origin\/no-such-branch.*git fetch origin main/s);
});

test('a malformed manifest fails', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'datamodels-manifest-'));
  try {
    await writeFile(join(dir, 'm.json'), '{ not json');
    const r = spawnSync(process.execPath, [join(root, 'scripts', 'check-manifest-base.mjs'), '--base', 'HEAD'], { cwd: root, env: { ...process.env, DATAMODELS_MANIFEST: join(dir, 'm.json') }, encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /JSON/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('rerecord refuses to run once the catalog is launched', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'datamodels-manifest-'));
  try {
    const file = join(dir, 'published-manifest.json');
    await writeFile(file, JSON.stringify({ ...baseManifest, prerelease: false }));
    const r = spawnSync(process.execPath, [join(root, 'scripts', 'rerecord.mjs'), 'task'], { cwd: root, env: { ...process.env, DATAMODELS_MANIFEST: file }, encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /the catalog is launched/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
