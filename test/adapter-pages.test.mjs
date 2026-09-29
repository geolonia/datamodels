// /adapters/ and /adapters/<name>/ (scripts/lib/adapter-pages.mjs): every adapter
// once, every file it publishes, neutral wording.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects, modelUrls, BASE_URL } from '../scripts/lib/models.mjs';
import { adapterFiles, adaptersIndexPage, adapterPage } from '../scripts/lib/adapter-pages.mjs';
import geonicdb from '../adapters/geonicdb/index.mjs';

const subjects = await loadSubjects();
const adapters = [geonicdb];
const rel = (url) => url.slice(BASE_URL.length);

test('the index lists every adapter with what it is, its files and its guide, in both languages', () => {
  for (const [lang, prefix] of [['ja', ''], ['en', '/en']]) {
    const page = adaptersIndexPage(lang, prefix, adapters);
    for (const a of adapters) {
      assert.ok(page.includes(`| ${a.label[lang]} | ${a.note[lang]} |`), `${lang} ${a.name}: label and note`);
      assert.ok(page.includes(`](${prefix}/adapters/${a.name}/)`), `${lang} ${a.name}: files page`);
      assert.ok(page.includes(`](${prefix}${a.guide})`), `${lang} ${a.name}: guide`);
    }
  }
});

test('an adapter page links the file of every model the adapter serves, and the model page', () => {
  const files = adapterFiles(geonicdb, subjects);
  // The same source as catalog.json: urlFor gives a file for every entity model and none for value types.
  const entities = subjects.flatMap((s) => s.models.filter((m) => m.kind === 'entity'));
  assert.equal(files.length, entities.length);
  for (const [lang, prefix] of [['ja', ''], ['en', '/en']]) {
    const page = adapterPage(lang, prefix, geonicdb, subjects);
    for (const { subject, model, url } of files) {
      assert.ok(page.includes(`[\`${rel(url)}\`](${rel(url)})`), `${lang} ${model.type}: file`);
      assert.ok(page.includes(`[${model.type}](${prefix}${rel(modelUrls(subject, model).page)})`), `${lang} ${model.type}: model page`);
    }
    assert.doesNotMatch(page, /Geometry|JapaneseAddress/, `${lang}: value types have no adapter file`);
  }
});

test('where GeonicDB is named, the text says whose broker it is', () => {
  assert.match(geonicdb.note.ja, /Geolonia の NGSI-LD ブローカー/);
  assert.match(geonicdb.note.en, /Geolonia's NGSI-LD broker/);
});

test('a model page\'s "Adapters" row links its entry on /adapters/ without naming a product; value types have no row', async () => {
  const { adapterRow } = await import('../scripts/lib/site.mjs');
  for (const [lang, prefix, label] of [['ja', '', 'アダプター'], ['en', '/en', 'Adapters']]) {
    const index = adaptersIndexPage(lang, prefix, adapters, subjects);
    for (const s of subjects) for (const m of s.models) {
      const row = adapterRow(lang, prefix, s, m, adapters);
      if (m.kind === 'value') { assert.equal(row, '', `${m.type}: no row`); continue; }
      const anchor = `${s.name}-${m.type}`;
      assert.match(row, new RegExp(`^\\| ${label} \\| \\[[^\\]]+\\]\\(${prefix}/adapters/#${anchor}\\) \\|\\n$`), `${lang} ${m.type}`);
      assert.doesNotMatch(row, /GeonicDB|geonicdb/, `${lang} ${m.type}: no product in the row`);
      assert.ok(index.includes(`<span id="${anchor}"></span>`), `${lang} ${m.type}: the anchor exists on /adapters/`);
    }
    assert.equal(adapterRow(lang, prefix, subjects[0], subjects[0].models[0], []), '', 'no adapters, no row');
  }
});
