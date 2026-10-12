// The toolkit's adapters in this catalog (adapters/toolkit.mjs): files at
// /adapters/<name>/<subject>/<Type>.<ext> for entity models, made from
// models/ alone, and linked from model pages under "Download".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects, BASE_URL } from '../scripts/lib/models.mjs';
import { context } from './toolkit.mjs';
import csv from './csv/index.mjs';
import tableSchema from './table-schema/index.mjs';
import ai from './ai/index.mjs';
import postgis from './postgis/index.mjs';
import geonicdb from './geonicdb/index.mjs';
import { downloadLine } from '../scripts/lib/site.mjs';

const subjects = await loadSubjects();
const generic = [csv, tableSchema, ai, postgis];
const ext = { csv: 'csv', 'table-schema': 'tableschema.json', ai: 'ai.json', postgis: 'sql' };

test('every $ref of the models is a schema of this catalog, read from models/', () => {
  const urls = Object.keys(context.refs);
  assert.ok(urls.length > 0);
  for (const url of urls) assert.ok(url.startsWith(`${BASE_URL}/schema/`), url);
});

test('each adapter has a file for every entity model, at its URL on datamodels.jp, and none for value types', () => {
  for (const a of generic) {
    assert.equal(a.download, true, `${a.name}: generic`);
    assert.equal(a.guide, '/toolkit/export');
    assert.ok(a.use.ja && a.use.en, `${a.name}: how to use it, for /adapters/`);
    assert.equal(a.command, `datamodels export <subject>/<Type> --to ${a.name}`);
    for (const s of subjects) for (const m of s.models) {
      const url = a.urlFor(s, m);
      if (m.kind === 'value') { assert.equal(url, null, `${a.name} ${m.type}`); continue; }
      // Only the AI schema may be missing: a model without a strict form (Decision) has none.
      if (url === null) { assert.equal(a.name, 'ai', `${a.name} ${s.name}/${m.type}`); continue; }
      assert.equal(url, `${BASE_URL}/adapters/${a.name}/${s.name}/${m.type}.${ext[a.name]}`);
      assert.ok(a.content(s, m).length > 0, `${a.name} ${m.type}: content`);
    }
  }
  const decision = subjects.find((s) => s.name === 'decision').models.find((m) => m.type === 'Decision');
  assert.equal(ai.urlFor(subjects.find((s) => s.name === 'decision'), decision), null);
});

test('a model whose $ref is not a schema in models/ fails the build: no other site is read', () => {
  const s = subjects.find((x) => x.name === 'disaster');
  const model = { type: 'Elsewhere', kind: 'entity', schema: { properties: { address: { $ref: 'https://example.org/schema/Address.json' } } }, catalog: {} };
  for (const a of generic) assert.throws(() => a.urlFor(s, model), /disaster\/Elsewhere: a schema it refers to with \$ref is not in models\//, a.name);
});

test('the files use the catalog\'s URLs and both languages', () => {
  const s = subjects.find((x) => x.name === 'disaster');
  const m = s.models.find((x) => x.type === 'EvacuationSite');
  assert.equal(csv.content(s, m).split('\n')[0].split(',')[0], 'id');
  const schema = JSON.parse(tableSchema.content(s, m));
  assert.equal(schema['x-context'], `${BASE_URL}/context/disaster/v1.jsonld`);
  assert.ok(schema.fields.some((f) => f['x-translations']?.en), 'English texts under x-translations');
  assert.match(postgis.content(s, m), /CREATE TABLE evacuation_site/);
  assert.equal(JSON.parse(ai.content(s, m)).name, 'EvacuationSite');
});

test('a model page\'s Download row has a button per generic file and links /adapters/, never a product; value types have none', () => {
  const adapters = [...generic, geonicdb];
  for (const [lang, prefix, about] of [['ja', '', 'これらのファイルについて'], ['en', '/en', 'About these files']]) {
    for (const s of subjects) for (const m of s.models) {
      const line = downloadLine(lang, prefix, s, m, adapters);
      if (m.kind === 'value') { assert.equal(line, '', `${m.type}`); continue; }
      let last = -1;
      for (const a of generic) {
        const url = a.urlFor(s, m);
        if (!url) continue;
        const at = line.indexOf(`<a class="download-button" href="${url.slice(BASE_URL.length)}" download title="${url.split('/').pop()}">`);
        assert.ok(at > last, `${lang} ${m.type} ${a.name}: a button, in the order CSV, Table Schema, AI, PostGIS`);
        assert.ok(line.includes(`</svg>${a.label[lang]}</a>`), `${lang} ${m.type} ${a.name}: label`);
        last = at;
      }
      assert.ok(line.includes(`[${about}](${prefix}/adapters/#downloads)`), `${lang} ${m.type}: about`);
      assert.doesNotMatch(line, /GeonicDB|geonicdb/, `${lang} ${m.type}: no product`);
    }
    assert.equal(downloadLine(lang, prefix, subjects[1], subjects[1].models[0], [geonicdb]), '', 'only a product adapter: no Download row');
  }
});
