// `npm run new-model` scaffolds a model that the validator rejects until the
// TODO markers are filled in, and names the unrecorded context change.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const run = (script, args, dir) => spawnSync(process.execPath, [join(root, 'scripts', script), ...args], { env: { ...process.env, DATAMODELS_MODELS_DIR: dir }, encoding: 'utf8' });

test('new-model scaffolds a model the validator lists as unfinished', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'datamodels-new-model-'));
  try {
    await cp(join(root, 'models'), dir, { recursive: true });
    const r = run('new-model.mjs', ['transportation', 'TrafficFlow'], dir);
    assert.equal(r.status, 0, r.stderr);
    for (const f of ['schema.json', 'catalog.yaml', 'notes.yaml', 'ADOPTERS.yaml', 'README.md', 'LICENSE.md', 'examples/example.json', 'examples/example-normalized.jsonld']) await access(join(dir, 'transportation', 'TrafficFlow', f));
    const context = JSON.parse(await readFile(join(dir, 'transportation', 'context.jsonld'), 'utf8'));
    assert.equal(context['@context'][1].TrafficFlow, 'transportation:TrafficFlow');
    const v = run('validate-models.mjs', [], dir);
    assert.equal(v.status, 1);
    assert.match(v.stderr, /TrafficFlow\/catalog\.yaml: fill in the TODO markers/);
    assert.match(v.stderr, /transportation\/context\.jsonld: differs from the recorded 1\.0\.0 snapshot/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('new-model refuses bad names, unknown subjects and existing types', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'datamodels-new-model-'));
  try {
    await cp(join(root, 'models'), dir, { recursive: true });
    assert.match(run('new-model.mjs', ['transportation', 'trafficFlow'], dir).stderr, /must be UpperCamelCase/);
    assert.match(run('new-model.mjs', ['nosuch', 'Foo'], dir).stderr, /no subject "nosuch"/);
    assert.match(run('new-model.mjs', ['task', 'Task'], dir).stderr, /already exists in subject "task"/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
