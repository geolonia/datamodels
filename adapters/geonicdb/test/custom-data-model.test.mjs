// The GeonicDB export adapts a catalog model to a tenant without touching the
// catalog vocabulary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadSubjects, CORE_TERMS, CORE_CONTEXT_FIXTURE } from '../../../scripts/lib/models.mjs';
import { toCustomDataModel } from '../custom-data-model.mjs';

const subjects = await loadSubjects();
const transportation = subjects.find((s) => s.name === 'transportation');
const roadRestriction = transportation.models.find((m) => m.type === 'RoadRestriction');

test('default body: exact context, additionalProperties from the schema, catalog IRIs per property', () => {
  const b = toCustomDataModel(transportation, roadRestriction);
  assert.equal(b.type, 'RoadRestriction');
  assert.equal(b.contextUrl, 'https://datamodels.jp/context/transportation/v1.jsonld', 'the alias, as data uses (#117)');
  assert.equal(b.additionalProperties, false);
  assert.equal(b.propertyDetails.restrictionStatus['@context'], 'https://datamodels.jp/ns/transportation/restrictionStatus');
  assert.equal(b.propertyDetails.address.valueType, 'object');
  // Core terms carry the core context's own IRIs, so a context GeonicDB generates is right outside the broker too.
  assert.equal(b.propertyDetails.location['@context'], 'https://uri.etsi.org/ngsi-ld/location');
  assert.equal(b.propertyDetails.description['@context'], 'http://purl.org/dc/terms/description');
  assert.ok(!('@context' in b.propertyDetails));
});

test('type prefix changes the type name only', () => {
  const b = toCustomDataModel(transportation, roadRestriction, { typePrefix: 'Saitai' });
  assert.equal(b.type, 'SaitaiRoadRestriction');
  assert.equal(b.propertyDetails.roadName['@context'], 'https://smartdatamodels.org/dataModel.Transportation/roadName');
});

test('allowAdditional opens the model to unknown attributes', () => {
  assert.equal(toCustomDataModel(transportation, roadRestriction, { allowAdditional: true }).additionalProperties, true);
});

test('extend merges tenant attributes and declares the tenant context', () => {
  const b = toCustomDataModel(transportation, roadRestriction, {
    extend: {
      contextUrl: 'https://example.com/context/acme-transportation.jsonld',
      propertyDetails: { patrolRoute: { ngsiType: 'Property', valueType: 'string', example: 'A-3', '@context': 'https://example.com/ns/acme/patrolRoute' } },
    },
  });
  assert.equal(b.contextUrl, 'https://example.com/context/acme-transportation.jsonld');
  assert.equal(b.propertyDetails.patrolRoute.example, 'A-3');
  assert.ok(b.propertyDetails.roadName, 'catalog attributes stay');
});

test('extend cannot redefine a catalog attribute', () => {
  assert.throws(() => toCustomDataModel(transportation, roadRestriction, { extend: { propertyDetails: { roadName: { ngsiType: 'Property', valueType: 'integer' } } } }), /redefines catalog attribute "roadName"/);
});

test('extend attributes need ngsiType and valueType', () => {
  assert.throws(() => toCustomDataModel(transportation, roadRestriction, { extend: { propertyDetails: { x: { example: 1 } } } }), /needs ngsiType and valueType/);
});

test('typeName and rename produce aliases that keep the catalog IRIs', () => {
  const b = toCustomDataModel(transportation, roadRestriction, { typeName: 'Saigai', contextUrl: 'https://example.com/context/city.jsonld' });
  assert.equal(b.type, 'Saigai');
  assert.equal(b.contextUrl, 'https://example.com/context/city.jsonld');
  const a = toCustomDataModel(transportation, roadRestriction, { rename: { statusLabel: 'localStatus' } });
  assert.ok(a.propertyDetails.localStatus && !a.propertyDetails.statusLabel);
  assert.equal(a.propertyDetails.localStatus['@context'], 'https://datamodels.jp/ns/task/statusLabel');
});

test('rename rejects unknown attributes, non-ASCII aliases and collisions', () => {
  assert.throws(() => toCustomDataModel(transportation, roadRestriction, { rename: { nope: 'x' } }), /not an attribute/);
  assert.throws(() => toCustomDataModel(transportation, roadRestriction, { rename: { statusLabel: '状態' } }), /must match/);
  assert.throws(() => toCustomDataModel(transportation, roadRestriction, { rename: { statusLabel: 'roadName' } }), /collides/);
  assert.throws(() => toCustomDataModel(transportation, roadRestriction, { rename: { statusLabel: 'x', roadName: 'x' } }), /same alias/);
});

test('every property has an example key, null when the catalog example has none (GeonicDB requires it)', () => {
  for (const s of subjects) for (const m of s.models) {
    if (m.kind === 'value') continue;
    const body = JSON.parse(JSON.stringify(toCustomDataModel(s, m)));
    for (const [name, d] of Object.entries(body.propertyDetails)) assert.ok('example' in d, `${m.type}.${name}`);
  }
  const b = JSON.parse(JSON.stringify(toCustomDataModel(transportation, roadRestriction)));
  assert.equal(b.propertyDetails.validTo.example, null);
  const e = toCustomDataModel(transportation, roadRestriction, { extend: { propertyDetails: { patrolRoute: { ngsiType: 'Property', valueType: 'string' } } } });
  assert.equal(e.propertyDetails.patrolRoute.example, null);
});

test('every core-context term a model uses carries the core IRI', async () => {
  const core = JSON.parse(await readFile(CORE_CONTEXT_FIXTURE, 'utf8'))['@context'];
  const vocab = core['ngsi-ld'];
  const coreIri = (term) => { const v = core[term]; const id = typeof v === 'string' ? v : v?.['@id']; return id?.startsWith('ngsi-ld:') ? vocab + id.slice(8) : id; };
  for (const s of subjects) for (const m of s.models) {
    if (m.kind === 'value') continue;
    for (const [name, d] of Object.entries(toCustomDataModel(s, m).propertyDetails)) {
      if (CORE_TERMS.has(name) && coreIri(name)) assert.equal(d['@context'], coreIri(name), `${m.type}.${name}`);
    }
  }
});
