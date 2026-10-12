// /adapters/ and /adapters/<name>/ (scripts/lib/adapter-pages.mjs): /adapters/
// explains every adapter once (what, how to use, where to get it) and does not
// list files by model; a product adapter keeps its list by model; neutral wording.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadSubjects, modelUrls, BASE_URL, ROOT } from '../scripts/lib/models.mjs';
import { adapterFiles, adaptersIndexPage, adapterPage, DOWNLOADS_ANCHOR, PRODUCTS_ANCHOR } from '../scripts/lib/adapter-pages.mjs';
import geonicdb from '../adapters/geonicdb/index.mjs';
import csv from '../adapters/csv/index.mjs';
import tableSchema from '../adapters/table-schema/index.mjs';
import ai from '../adapters/ai/index.mjs';
import postgis from '../adapters/postgis/index.mjs';

const subjects = await loadSubjects();
const generic = [csv, tableSchema, ai, postgis];
const adapters = [...generic, geonicdb];
const rel = (url) => url.slice(BASE_URL.length);
const langs = [['ja', ''], ['en', '/en']];

test('the index has a section per adapter: what it is, how to use it, where to get it, in both languages', () => {
  for (const [lang, prefix] of langs) {
    const page = adaptersIndexPage(lang, prefix, adapters, subjects);
    assert.ok(page.includes(`{#${DOWNLOADS_ANCHOR}}`) && page.includes(`{#${PRODUCTS_ANCHOR}}`), `${lang}: the two groups`);
    for (const a of adapters) {
      assert.ok(page.includes(`### ${a.label[lang]} {#${a.name}}`), `${lang} ${a.name}: section`);
      assert.ok(page.includes(a.note[lang]), `${lang} ${a.name}: what it is`);
      assert.ok(a.use?.[lang] && page.includes(a.use[lang]), `${lang} ${a.name}: how to use it`);
      assert.ok(page.includes(`\`adapters.${a.name}\``), `${lang} ${a.name}: catalog.json`);
      assert.ok(page.includes(`\`${a.command}\``), `${lang} ${a.name}: command`);
      assert.ok(page.includes(`](${prefix}${a.guide})`), `${lang} ${a.name}: guide`);
    }
    // The generic files' sections come before the products', and only a product links a list by model.
    assert.ok(page.indexOf(`{#${DOWNLOADS_ANCHOR}}`) < page.indexOf(`{#${PRODUCTS_ANCHOR}}`));
    assert.ok(page.includes(`](${prefix}/adapters/geonicdb/)`), `${lang}: GeonicDB list by model`);
    for (const a of generic) assert.ok(!page.includes(`](${prefix}/adapters/${a.name}/)`), `${lang} ${a.name}: no list by model`);
  }
});

test('the index does not grow with the catalog: no file of a model beyond one example per adapter', () => {
  // Twice as many models give the same page.
  const twice = [...subjects, ...subjects.map((s) => ({ ...s, name: `${s.name}-copy` }))];
  for (const [lang, prefix] of langs) {
    const page = adaptersIndexPage(lang, prefix, adapters, subjects);
    assert.equal(adaptersIndexPage(lang, prefix, adapters, twice), page);
    for (const a of adapters) {
      const files = adapterFiles(a, subjects);
      const linked = files.filter(({ url }) => page.includes(`](${rel(url)})`));
      assert.equal(linked.length, 1, `${lang} ${a.name}: one example file`);
    }
    assert.doesNotMatch(page, /<span id=/, `${lang}: no row anchors per model`);
  }
});

test('an adapter page links the file of every model the adapter serves, and the model page', () => {
  const files = adapterFiles(geonicdb, subjects);
  // The same source as catalog.json: urlFor gives a file for every entity model and none for value types.
  const entities = subjects.flatMap((s) => s.models.filter((m) => m.kind === 'entity'));
  assert.equal(files.length, entities.length);
  for (const [lang, prefix] of langs) {
    const page = adapterPage(lang, prefix, geonicdb, subjects);
    for (const { subject, model, url } of files) {
      assert.ok(page.includes(`[\`${rel(url)}\`](${rel(url)})`), `${lang} ${model.type}: file`);
      assert.ok(page.includes(`[${model.type}](${prefix}${rel(modelUrls(subject, model).page)})`), `${lang} ${model.type}: model page`);
    }
    assert.doesNotMatch(page, /Geometry|JapaneseAddress/, `${lang}: value types have no adapter file`);
    assert.ok(page.includes(`](${prefix}/adapters/#geonicdb)`), `${lang}: back to its section`);
  }
});

test('where GeonicDB is named, the text says whose broker it is', () => {
  assert.match(geonicdb.note.ja, /Geolonia の NGSI-LD ブローカー/);
  assert.match(geonicdb.note.en, /Geolonia's NGSI-LD broker/);
});

test('a model page\'s adapters sentence links the products\' section of /adapters/ without naming a product; value types have none', async () => {
  const { adapterLine } = await import('../scripts/lib/site.mjs');
  for (const [lang, prefix, label] of [['ja', '', 'アダプター'], ['en', '/en', 'Adapters']]) {
    const index = adaptersIndexPage(lang, prefix, adapters, subjects);
    for (const s of subjects) for (const m of s.models) {
      const line = adapterLine(lang, prefix, s, m, adapters);
      if (m.kind === 'value') { assert.equal(line, '', `${m.type}: no sentence`); continue; }
      assert.ok(line.includes(`[${label}](${prefix}/adapters/#${PRODUCTS_ANCHOR})`), `${lang} ${m.type}`);
      assert.doesNotMatch(line, /GeonicDB|geonicdb/, `${lang} ${m.type}: no product in the sentence`);
    }
    // The section it links holds GeonicDB's entry.
    const products = index.slice(index.indexOf(`{#${PRODUCTS_ANCHOR}}`));
    assert.ok(products.includes(`{#geonicdb}`), `${lang}: GeonicDB under #${PRODUCTS_ANCHOR}`);
    assert.equal(adapterLine(lang, prefix, subjects[0], subjects[0].models[0], []), '', 'no adapters, no sentence');
    assert.equal(adapterLine(lang, prefix, subjects[0], subjects[0].models.find((m) => m.kind === 'entity'), generic), '', 'generic files only: the Download row, no sentence');
  }
});

test('the removed lists by model redirect to their section of /adapters/, in both languages; GeonicDB\'s stays', async () => {
  const redirects = (await readFile(join(ROOT, 'public', '_redirects'), 'utf8')).split('\n').map((l) => l.trim().split(/\s+/));
  const target = (from) => redirects.find(([f]) => f === from);
  for (const prefix of ['', '/en']) {
    for (const a of generic) for (const from of [`${prefix}/adapters/${a.name}/`, `${prefix}/adapters/${a.name}`]) {
      assert.deepEqual(target(from)?.slice(1), [`${prefix}/adapters/#${a.name}`, '301'], from);
    }
    assert.equal(target(`${prefix}/adapters/geonicdb/`), undefined, `${prefix}/adapters/geonicdb/ stays a page`);
  }
});
