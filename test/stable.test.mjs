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

async function validateWith({ status, adopters, catalogExtra }) {
  const dir = await mkdtemp(join(tmpdir(), 'datamodels-stable-'));
  try {
    await cp(join(root, 'models'), dir, { recursive: true });
    const m = join(dir, 'task', 'Comment');
    if (status !== undefined) {
      const f = join(m, 'catalog.yaml');
      await writeFile(f, (await readFile(f, 'utf8')).replace(/^status: draft$/m, `status: ${status}`));
    }
    if (adopters !== undefined) await writeFile(join(m, 'ADOPTERS.yaml'), adopters);
    if (catalogExtra !== undefined) { const f = join(m, 'catalog.yaml'); await writeFile(f, (await readFile(f, 'utf8')) + catalogExtra); }
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

test('a url that is not a string does not count and fails', async () => {
  const r = await validateWith({ status: 'stable', adopters: `adopters:\n${entry('Org A', 'https://a.example')}  - name: Org B system\n    organization: Org B\n    url: [https://b.example]\n` });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /entry 2: url must be an http\(s\) URL with a host/);
  assert.match(r.stderr, /found 1/);
});

test('an explicit null status fails', async () => {
  const r = await validateWith({ status: 'null' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Comment\/catalog\.yaml: status must be draft, stable or deprecated, got null/);
});

test('a deprecated model may name its replacement', async () => {
  const r = await validateWith({ status: 'deprecated', catalogExtra: 'supersededBy: https://datamodels.jp/ns/task/Task\n' });
  assert.equal(r.status, 0, r.stderr);
});

test('supersededBy on a model that is not deprecated, or not a URL, fails', async () => {
  let r = await validateWith({ catalogExtra: 'supersededBy: https://datamodels.jp/ns/task/Task\n' });
  assert.match(r.stderr, /Comment\/catalog\.yaml: supersededBy is only for status deprecated, the status is draft/);
  r = await validateWith({ status: 'deprecated', catalogExtra: 'supersededBy: Task\n' });
  assert.match(r.stderr, /supersededBy must be an http\(s\) URL with a host/);
});

test('an unknown status fails', async () => {
  const r = await validateWith({ status: 'beta' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Comment\/catalog\.yaml: status must be draft, stable or deprecated, got "beta"/);
});

test('an outside supersededBy URL renders as a link to exactly that URL', async () => {
  const { createMarkdownRenderer } = await import('vitepress');
  const { externalLink } = await import('../scripts/lib/site.mjs');
  const md = await createMarkdownRenderer(join(root, 'site'));
  for (const url of ['https://example.org/models/Next', 'https://example.org/a b', 'https://example.org/x_(y', 'https://example.org/p)q]r*s_t_', 'https://example.org/q?a=<b>#f']) {
    const html = md.render(externalLink(url));
    const a = html.match(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/);
    assert.ok(a, `${url}: no link in ${html}`);
    // markdown-it percent-encodes some characters again (] -> %5D): the same URL.
    assert.equal(decodeURI(a[1].replaceAll('&amp;', '&')), decodeURI(new URL(url).href), `${url}: href`);
    assert.equal(a[2].replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'), url, `${url}: text`);
  }
});

test('the JSON-LD Playground link keeps parentheses inside the destination', async () => {
  const { playgroundUrl } = await import('../scripts/lib/site.mjs');
  const doc = { id: 'urn:x:1', type: 'X', note: { type: 'Property', value: 'a)b (c)' } };
  const url = playgroundUrl(doc);
  assert.doesNotMatch(url, /[()]/);
  assert.deepEqual(JSON.parse(decodeURIComponent(url.split('json-ld=')[1])), doc);
  const { createMarkdownRenderer } = await import('vitepress');
  const html = (await createMarkdownRenderer(join(root, 'site'))).render(`[open](${url})`);
  assert.equal(decodeURIComponent(html.match(/href="([^"]*)"/)[1].replaceAll('&amp;', '&').split('json-ld=')[1]), JSON.stringify(doc));
});
