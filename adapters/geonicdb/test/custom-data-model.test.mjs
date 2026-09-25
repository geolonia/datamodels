// The GeonicDB export adapts a catalog model to a tenant without touching the
// catalog vocabulary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects } from '../../../scripts/lib/models.mjs';
import { toCustomDataModel } from '../custom-data-model.mjs';

const subjects = await loadSubjects();
const transportation = subjects.find((s) => s.name === 'transportation');
const roadRestriction = transportation.models.find((m) => m.type === 'RoadRestriction');

test('default body: exact context, additionalProperties from the schema, catalog IRIs per property', () => {
  const b = toCustomDataModel(transportation, roadRestriction);
  assert.equal(b.type, 'RoadRestriction');
  assert.equal(b.contextUrl, 'https://datamodels.jp/context/transportation/v1.0.0.jsonld');
  assert.equal(b.additionalProperties, false);
  assert.equal(b.propertyDetails.restrictionStatus['@context'], 'https://datamodels.jp/ns/transportation/restrictionStatus');
  assert.equal(b.propertyDetails.address.valueType, 'object');
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
  const a = toCustomDataModel(transportation, roadRestriction, { rename: { project: 'incidentRef' } });
  assert.ok(a.propertyDetails.incidentRef && !a.propertyDetails.project);
  assert.equal(a.propertyDetails.incidentRef['@context'], 'https://datamodels.jp/ns/task/project');
});

test('rename rejects unknown attributes, non-ASCII aliases and collisions', () => {
  assert.throws(() => toCustomDataModel(transportation, roadRestriction, { rename: { nope: 'x' } }), /not an attribute/);
  assert.throws(() => toCustomDataModel(transportation, roadRestriction, { rename: { project: '担当班' } }), /must match/);
  assert.throws(() => toCustomDataModel(transportation, roadRestriction, { rename: { project: 'roadName' } }), /collides/);
  assert.throws(() => toCustomDataModel(transportation, roadRestriction, { rename: { project: 'x', roadName: 'x' } }), /same alias/);
});
