// The two NGSI-LD forms (scripts/lib/ngsi.mjs): the example playground switches
// between them in the browser with the same code, so each direction must give
// back the catalog's own examples.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects, attributesOf, toKeyValues, toNormalized } from '../scripts/lib/models.mjs';

const entities = (await loadSubjects()).flatMap((s) => s.models.filter((m) => m.examples['example-normalized.jsonld']).map((m) => m));

test('key-values -> normalized gives back every published normalized example', () => {
  for (const m of entities) {
    const norm = m.examples['example-normalized.jsonld'];
    assert.deepEqual(toNormalized(m.examples['example.json'], m.schema, norm['@context']), norm, m.type);
  }
});

test('normalized -> key-values gives back every published key-values example', () => {
  for (const m of entities) {
    const multi = new Set(attributesOf(m).filter(([, p]) => p['x-ngsi']?.multi).map(([n]) => n));
    assert.deepEqual(toKeyValues(m.examples['example-normalized.jsonld'], { multi }), m.examples['example.json'], m.type);
  }
});

test('toNormalized: declared types, DateTime values, datasetIds, unknown attributes as Property', () => {
  const schema = { properties: {
    owner: { 'x-ngsi': { type: 'Relationship' } },
    where: { 'x-ngsi': { type: 'GeoProperty' } },
    at: { format: 'date-time', 'x-ngsi': { type: 'Property' } },
    tags: { 'x-ngsi': { type: 'Relationship', multi: true } },
  } };
  const out = toNormalized({ id: 'urn:x:1', type: 'X', owner: 'urn:y:1', where: { type: 'Point', coordinates: [139.7, 35.7] }, at: '2026-07-08T10:00:00+09:00', tags: ['urn:t:1', 'urn:t:2'], extra: 3 }, schema);
  assert.deepEqual(out, {
    id: 'urn:x:1', type: 'X',
    owner: { type: 'Relationship', object: 'urn:y:1' },
    where: { type: 'GeoProperty', value: { type: 'Point', coordinates: [139.7, 35.7] } },
    at: { type: 'Property', value: { '@type': 'DateTime', '@value': '2026-07-08T10:00:00+09:00' } },
    tags: [
      { type: 'Relationship', object: 'urn:t:1', datasetId: 'urn:ngsi-ld:dataset:tags:1' },
      { type: 'Relationship', object: 'urn:t:2', datasetId: 'urn:ngsi-ld:dataset:tags:2' },
    ],
    extra: { type: 'Property', value: 3 },
  });
  assert.ok(!('@context' in out), 'no @context unless one is given');
});

test('JsonProperty and VocabProperty keep their json / vocab member in key-values form', async () => {
  const { unwrapKeyValues } = await import('../scripts/lib/models.mjs');
  const schema = { properties: {
    answers: { type: 'array', 'x-ngsi': { type: 'JsonProperty' } },
    involvement: { type: 'string', 'x-ngsi': { type: 'VocabProperty' } },
  } };
  const answers = [{ name: 'danger', value: false, probability: 0.58 }];
  const kv = { id: 'urn:x:1', type: 'X', answers: { json: answers }, involvement: { vocab: 'dpv:HumanNotInvolved' } };
  const norm = { id: 'urn:x:1', type: 'X', answers: { type: 'JsonProperty', json: answers }, involvement: { type: 'VocabProperty', vocab: 'dpv:HumanNotInvolved' } };
  assert.deepEqual(toNormalized(kv, schema), norm);
  assert.deepEqual(toKeyValues(norm), kv);
  // The schema describes the value, so validation sees it without the wrapper.
  assert.deepEqual(unwrapKeyValues(kv, schema), { id: 'urn:x:1', type: 'X', answers, involvement: 'dpv:HumanNotInvolved' });
  assert.throws(() => unwrapKeyValues({ ...kv, answers }, schema), /answers: a JsonProperty is \{"json": \.\.\.\} in key-values form/);
  assert.throws(() => unwrapKeyValues({ ...kv, involvement: { vocab: 'a', extra: 1 } }, schema), /involvement: a VocabProperty/);
  assert.throws(() => toKeyValues({ ...norm, answers: { type: 'JsonProperty', value: answers } }), /JsonProperty needs a json member/);
  // toNormalized is as strict about the wrapper as the validator.
  assert.throws(() => toNormalized({ ...kv, answers }, schema), /answers: a JsonProperty is \{"json": \.\.\.\}/);
  assert.throws(() => toNormalized({ ...kv, involvement: { vocab: 'a', extra: 1 } }, schema), /involvement: a VocabProperty/);
});
