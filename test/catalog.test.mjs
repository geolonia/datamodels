// catalog.json (scripts/lib/publish.mjs) against its wire format, catalog.schema.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { loadSubjects, modelUrls, BASE_URL, ROOT } from '../scripts/lib/models.mjs';
import { catalogEntry, attributeEntries, CATALOG_LICENSE } from '../scripts/lib/publish.mjs';

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

test('every model lists its attributes with type, NGSI-LD type and required, as in its schema (#156)', () => {
  for (const { m, entry } of models) {
    const props = m.schema.properties ?? {};
    const names = Object.keys(props).filter((k) => !['id', 'type', '@context'].includes(k));
    assert.deepEqual(entry.attributes.map((a) => a.name), names, m.type);
    for (const a of entry.attributes) {
      const p = props[a.name];
      // A value type's fields are not NGSI-LD attributes.
      assert.equal(a.ngsiType, m.kind === 'value' ? undefined : p['x-ngsi']?.type ?? 'Property', `${m.type}.${a.name}`);
      assert.equal(a.required, (m.schema.required ?? []).includes(a.name), `${m.type}.${a.name}`);
      assert.equal(a.type, p.$ref || p.allOf ? 'object' : p.type, `${m.type}.${a.name}`);
      if (p['x-iri']) assert.equal(a.iri, p['x-iri']);
    }
  }
  const site = models.find((x) => x.m.type === 'EvacuationSite').entry;
  const address = site.attributes.find((a) => a.name === 'address');
  assert.equal(address.valueModel, 'https://datamodels.jp/ns/common/JapaneseAddress');
  // Every valueModel is a catalog value type; a point-restricted location still names Geometry.
  const valueTypes = new Set(models.filter((x) => x.m.kind === 'value').map((x) => x.entry.typeIri));
  for (const { entry } of models) for (const a of entry.attributes) if (a.valueModel) assert.ok(valueTypes.has(a.valueModel), `${entry.type}.${a.name}: ${a.valueModel}`);
  assert.equal(models.find((x) => x.m.type === 'Attachment').entry.attributes.find((a) => a.name === 'location').valueModel, 'https://datamodels.jp/ns/common/Geometry');
  assert.ok(site.attributes.find((a) => a.name === 'hazardTypes').items.enum.includes('flood'));
  assert.ok(models.find((x) => x.m.type === 'Task').entry.attributes.find((a) => a.name === 'assignee').multi);
  assert.ok(models.find((x) => x.m.type === 'JapaneseAddress').entry.attributes.every((a) => !('ngsiType' in a)), 'value type fields');
  const items = schema.properties.models.items.properties.attributes.items.properties.items.properties;
  assert.deepEqual(Object.keys(items), ['type', 'format', 'enum']);
  // The schema requires what every entry carries; ngsiType stays conditional (value-type fields have none).
  assert.deepEqual(schema.properties.models.items.properties.attributes.items.required, ['name', 'iri', 'type', 'required', 'description']);
});

test('mappings name the standard of each mapping file, for the same files as mappingUrls (#156)', () => {
  for (const { m, entry } of models) {
    if (!entry.mappingUrls) { assert.equal(entry.mappings, undefined, m.type); continue; }
    assert.deepEqual(entry.mappings.map((x) => x.url), entry.mappingUrls, m.type);
    for (const x of entry.mappings) assert.ok(x.standard.ja && x.standard.en, x.url);
  }
});

test('an attribute without x-iri or descriptions is named in the error, not only by catalog validation', () => {
  const model = { type: 'T', kind: 'entity', schema: { properties: { a: { type: 'string' } } }, catalog: { attributes: { a: { ja: 'あ', en: 'a' } } } };
  assert.throws(() => attributeEntries(model), /T\.a: no x-iri/);
  model.schema.properties.a['x-iri'] = 'https://example.com/a';
  model.catalog.attributes.a = { ja: 'あ' };
  assert.throws(() => attributeEntries(model), /T\.a: catalog\.yaml needs ja and en/);
});
