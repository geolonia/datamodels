// The GeonicDB export adapts a catalog model to a tenant without touching the
// catalog vocabulary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects } from '../scripts/lib/models.mjs';
import { toCustomDataModel } from '../scripts/lib/geonicdb.mjs';

const subjects = await loadSubjects();
const disaster = subjects.find((s) => s.name === 'disaster');
const roadClosure = disaster.models.find((m) => m.type === 'RoadClosure');

test('default body: exact context, additionalProperties from the schema, catalog IRIs per property', () => {
  const b = toCustomDataModel(disaster, roadClosure);
  assert.equal(b.type, 'RoadClosure');
  assert.equal(b.contextUrl, 'https://models.geonicdb.com/context/disaster/v1.1.0.jsonld');
  assert.equal(b.additionalProperties, false);
  assert.equal(b.propertyDetails.closureStatus['@context'], 'https://models.geonicdb.com/ns/disaster/closureStatus');
  assert.equal(b.propertyDetails.address.valueType, 'object');
});

test('type prefix changes the type name only', () => {
  const b = toCustomDataModel(disaster, roadClosure, { typePrefix: 'Saitai' });
  assert.equal(b.type, 'SaitaiRoadClosure');
  assert.equal(b.propertyDetails.roadName['@context'], 'https://models.geonicdb.com/ns/disaster/roadName');
});

test('allowAdditional opens the model to unknown attributes', () => {
  assert.equal(toCustomDataModel(disaster, roadClosure, { allowAdditional: true }).additionalProperties, true);
});

test('extend merges tenant attributes and declares the tenant context', () => {
  const b = toCustomDataModel(disaster, roadClosure, {
    extend: {
      contextUrl: 'https://example.com/context/acme-disaster.jsonld',
      propertyDetails: { patrolRoute: { ngsiType: 'Property', valueType: 'string', example: 'A-3', '@context': 'https://example.com/ns/acme/patrolRoute' } },
    },
  });
  assert.equal(b.contextUrl, 'https://example.com/context/acme-disaster.jsonld');
  assert.equal(b.propertyDetails.patrolRoute.example, 'A-3');
  assert.ok(b.propertyDetails.roadName, 'catalog attributes stay');
});

test('extend cannot redefine a catalog attribute', () => {
  assert.throws(() => toCustomDataModel(disaster, roadClosure, { extend: { propertyDetails: { roadName: { ngsiType: 'Property', valueType: 'integer' } } } }), /redefines catalog attribute "roadName"/);
});

test('extend attributes need ngsiType and valueType', () => {
  assert.throws(() => toCustomDataModel(disaster, roadClosure, { extend: { propertyDetails: { x: { example: 1 } } } }), /needs ngsiType and valueType/);
});
