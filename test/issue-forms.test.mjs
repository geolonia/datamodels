// The issue forms (.github/ISSUE_TEMPLATE): GitHub silently drops a form it
// cannot parse, so a stray ": " in a description would hide the form.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import { ROOT } from '../scripts/lib/models.mjs';

const dir = join(ROOT, '.github', 'ISSUE_TEMPLATE');
const forms = await Promise.all((await readdir(dir)).filter((f) => f.endsWith('.yml')).map(async (f) => [f, YAML.parse(await readFile(join(dir, f), 'utf8'))]));

test('every issue form parses, with a name, a description and fields with unique ids', () => {
  assert.ok(forms.length >= 3);
  for (const [f, form] of forms) {
    assert.ok(form.name && form.description, f);
    assert.ok(Array.isArray(form.body) && form.body.length, f);
    const ids = form.body.filter((b) => b.type !== 'markdown').map((b) => b.id);
    assert.ok(ids.every(Boolean), `${f}: every field has an id`);
    assert.equal(new Set(ids).size, ids.length, `${f}: ids are unique`);
    for (const b of form.body.filter((x) => x.type !== 'markdown')) assert.ok(b.attributes?.label, `${f}: ${b.id} has a label`);
  }
});

test('the model page fills in the extension form\'s model field, and the catalog form exists', () => {
  const ext = Object.fromEntries(forms)['extension-report.yml'];
  assert.ok(ext.body.some((b) => b.id === 'model'), 'model pages link ?model=<subject>/<Type>');
  assert.ok(Object.fromEntries(forms)['catalog-report.yml']);
});

test('every issue form has its own section on Contributing, in both languages, and the merged pages redirect to theirs', async () => {
  const pages = await Promise.all(['site/guide/contribute.md', 'site/en/guide/contribute.md'].map((p) => readFile(join(ROOT, p), 'utf8')));
  // Each section has an explicit {#id} and links its form.
  const sections = { 'model-proposal.yml': 'model-proposal', 'extension-report.yml': 'extension', 'site-listing.yml': 'site-listing', 'catalog-report.yml': 'catalog' };
  for (const [f] of forms) {
    const id = sections[f];
    assert.ok(id, `${f}: give the form a section on Contributing (and an entry here)`);
    for (const page of pages) {
      const section = page.split(new RegExp(`^## .*\\{#${id}\\}$`, 'm'))[1]?.split(/^## /m)[0];
      assert.ok(section, `${f}: no section {#${id}}`);
      assert.ok(section.includes(`(https://github.com/geolonia/datamodels/issues/new?template=${f})`), `${f}: the section {#${id}} links its form`);
    }
  }
  const redirects = (await readFile(join(ROOT, 'public', '_redirects'), 'utf8')).split('\n').map((l) => l.trim().split(/\s+/));
  const target = (from) => redirects.find(([x]) => x === from)?.slice(1).join(' ');
  for (const [old, id] of [['list-extension', 'extension'], ['report-catalog', 'catalog']]) {
    assert.equal(target(`/guide/${old}`), `/guide/contribute#${id} 301`);
    assert.equal(target(`/en/guide/${old}`), `/en/guide/contribute#${id} 301`);
  }
});
