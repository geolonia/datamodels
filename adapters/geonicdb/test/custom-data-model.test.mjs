// The GeonicDB export adapts a catalog model to a tenant without touching the
// catalog vocabulary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects } from '../../../scripts/lib/models.mjs';
import { toCustomDataModel } from '../custom-data-model.mjs';

const subjects = await loadSubjects();
const disaster = subjects.find((s) => s.name === 'disaster');
const roadClosure = disaster.models.find((m) => m.type === 'RoadClosure');

test('default body: exact context, additionalProperties from the schema, catalog IRIs per property', () => {
  const b = toCustomDataModel(disaster, roadClosure);
  assert.equal(b.type, 'RoadClosure');
  assert.equal(b.contextUrl, 'https://datamodels.jp/context/disaster/v1.0.0.jsonld');
  assert.equal(b.additionalProperties, false);
  assert.equal(b.propertyDetails.closureStatus['@context'], 'https://datamodels.jp/ns/disaster/closureStatus');
  assert.equal(b.propertyDetails.address.valueType, 'object');
});

test('type prefix changes the type name only', () => {
  const b = toCustomDataModel(disaster, roadClosure, { typePrefix: 'Saitai' });
  assert.equal(b.type, 'SaitaiRoadClosure');
  assert.equal(b.propertyDetails.roadName['@context'], 'https://smartdatamodels.org/dataModel.Transportation/roadName');
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

const event = disaster.models.find((m) => m.type === 'DisasterEvent');
const action = disaster.models.find((m) => m.type === 'IncidentResponseAction');

test('typeName and rename produce aliases that keep the catalog IRIs', () => {
  const b = toCustomDataModel(disaster, event, { typeName: 'Saigai', contextUrl: 'https://example.com/context/city.jsonld' });
  assert.equal(b.type, 'Saigai');
  assert.equal(b.contextUrl, 'https://example.com/context/city.jsonld');
  const a = toCustomDataModel(disaster, action, { rename: { assignee: 'responsibleTeam' } });
  assert.ok(a.propertyDetails.responsibleTeam && !a.propertyDetails.assignee);
  assert.equal(a.propertyDetails.responsibleTeam['@context'], 'https://datamodels.jp/ns/task/assignee');
});

test('rename rejects unknown attributes, non-ASCII aliases and collisions', () => {
  assert.throws(() => toCustomDataModel(disaster, action, { rename: { nope: 'x' } }), /not an attribute/);
  assert.throws(() => toCustomDataModel(disaster, action, { rename: { assignee: '担当班' } }), /must match/);
  assert.throws(() => toCustomDataModel(disaster, action, { rename: { assignee: 'name' } }), /collides/);
  assert.throws(() => toCustomDataModel(disaster, action, { rename: { assignee: 'x', name: 'x' } }), /same alias/);
});
