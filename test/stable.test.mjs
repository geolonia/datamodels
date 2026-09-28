// Status and ADOPTERS.yaml (decided in #38): stable needs two implementations
// from different organisations, each with a url.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');

async function validateWith({ status, adopters }) {
  const dir = await mkdtemp(join(tmpdir(), 'datamodels-stable-'));
  try {
    await cp(join(root, 'models'), dir, { recursive: true });
    const m = join(dir, 'task', 'Comment');
    if (status !== undefined) {
      const f = join(m, 'catalog.yaml');
      await writeFile(f, (await readFile(f, 'utf8')).replace(/^status: draft$/m, `status: ${status}`));
    }
    if (adopters !== undefined) await writeFile(join(m, 'ADOPTERS.yaml'), adopters);
    return spawnSync(process.execPath, [join(root, 'scripts', 'validate-models.mjs')], { env: { ...process.env, DATAMODELS_MODELS_DIR: dir }, encoding: 'utf8' });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
const entry = (org, url) => `  - name: ${org} system\n    organization: ${org}\n    since: 2026\n${url ? `    url: ${url}\n` : ''}`;

test('stable with two organisations, each with a url, validates', async () => {
  const r = await validateWith({ status: 'stable', adopters: `adopters:\n${entry('Org A', 'https://a.example')}${entry('Org B', 'https://b.example')}` });
  assert.equal(r.status, 0, r.stderr);
});

test('stable with one organisation fails', async () => {
  const r = await validateWith({ status: 'stable', adopters: `adopters:\n${entry('Org A', 'https://a.example')}` });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Comment\/ADOPTERS\.yaml: status stable needs two implementations from different organisations, each with a url; found 1/);
});

test('stable counts one organisation once, whatever its spelling', async () => {
  const r = await validateWith({ status: 'stable', adopters: `adopters:\n${entry('Org A', 'https://a.example')}${entry('org  a', 'https://a2.example')}` });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /found 1/);
});

test('stable ignores entries without a url', async () => {
  const r = await validateWith({ status: 'stable', adopters: `adopters:\n${entry('Org A', 'https://a.example')}${entry('Org B')}` });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /found 1/);
});

test('an ADOPTERS entry without organization, a bad url or a wrong shape fails', async () => {
  let r = await validateWith({ adopters: 'adopters:\n  - name: Something\n' });
  assert.match(r.stderr, /Comment\/ADOPTERS\.yaml: entry 1: needs name and organization/);
  r = await validateWith({ adopters: `adopters:\n${entry('Org A', 'ftp://a.example')}` });
  assert.match(r.stderr, /entry 1: url must be an http\(s\) URL with a host/);
  r = await validateWith({ adopters: '- name: x\n' });
  assert.match(r.stderr, /Comment\/ADOPTERS\.yaml: root value must be a mapping with an adopters list/);
});

test('a url without a host does not count and fails', async () => {
  const r = await validateWith({ status: 'stable', adopters: `adopters:\n${entry('Org A', 'https://a.example')}${entry('Org B', 'https://')}` });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /entry 2: url must be an http\(s\) URL with a host, got "https:\/\/"/);
  assert.match(r.stderr, /found 1/);
});

test('an explicit null status fails', async () => {
  const r = await validateWith({ status: 'null' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Comment\/catalog\.yaml: status must be draft, stable or deprecated, got null/);
});

test('an unknown status fails', async () => {
  const r = await validateWith({ status: 'beta' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Comment\/catalog\.yaml: status must be draft, stable or deprecated, got "beta"/);
});
