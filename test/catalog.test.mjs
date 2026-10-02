// catalog.json (scripts/lib/publish.mjs) against its wire format, catalog.schema.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { loadSubjects, modelUrls, BASE_URL, ROOT } from '../scripts/lib/models.mjs';
import { catalogEntry, CATALOG_LICENSE } from '../scripts/lib/publish.mjs';

const subjects = await loadSubjects();
const schema = JSON.parse(await readFile(join(ROOT, 'catalog.schema.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false }); addFormats(ajv);
const validate = ajv.compile(schema);
const models = subjects.flatMap((s) => s.models.map((m) => ({ s, m, entry: catalogEntry(s, m) })));

test('the catalog validates, with its licence', () => {
  const catalog = { formatVersion: 1, generatedAt: new Date().toISOString(), ...CATALOG_LICENSE, models: models.map((x) => x.entry) };
  assert.ok(validate(catalog), ajv.errorsText(validate.errors));
  assert.equal(catalog.license, 'CC0-1.0');
  assert.equal(catalog.licenseUrl, `${BASE_URL}/LICENSE-CONTENT`);
  for (const field of ['license', 'licenseUrl']) assert.ok(schema.properties[field], `${field} is in catalog.schema.json`);
  for (const field of ['pageUrlEn', 'exampleUrls', 'mappingUrls']) assert.ok(schema.properties.models.items.properties[field], `${field} is in catalog.schema.json`);
});

test('every model lists its Japanese and English pages and its example files', () => {
  for (const { s, m, entry } of models) {
    assert.equal(entry.pageUrl, `${BASE_URL}/models/${s.name}/${m.type}/`);
    assert.equal(entry.pageUrlEn, `${BASE_URL}/en/models/${s.name}/${m.type}/`);
    const base = modelUrls(s, m).examples;
    assert.deepEqual(entry.exampleUrls, Object.keys(m.examples).sort().map((f) => `${base}${f}`), m.type);
    assert.ok(entry.exampleUrls.includes(`${base}example.json`), `${m.type} example.json`);
    if (m.kind !== 'value') assert.ok(entry.exampleUrls.includes(`${base}example-normalized.jsonld`), `${m.type} normalized`);
  }
});

test('a model with mapping files lists them at /mapping/, one per file; one without lists none', () => {
  for (const { s, m, entry } of models) {
    const names = (m.mappings ?? []).map((x) => x.name);
    if (!names.length) { assert.equal(entry.mappingUrls, undefined, m.type); continue; }
    assert.deepEqual(entry.mappingUrls, names.map((n) => `${BASE_URL}/mapping/${s.name}/${m.type}/${n}.yaml`), m.type);
  }
  assert.ok(models.some((x) => x.entry.mappingUrls?.length), 'at least one model has a mapping');
});
