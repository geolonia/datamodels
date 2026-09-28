// The extension builder's files (scripts/lib/extend.mjs): a context with only
// your terms, and a schema that accepts the catalog attributes plus yours.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { loadSubjects, subjectUrls, modelUrls, attributesOf, resolveContextTerms, CORE_CONTEXT_FIXTURE } from '../scripts/lib/models.mjs';
import { resolveContextDocument } from '../scripts/lib/releases.mjs';
import { buildExtension, proposalUrl } from '../scripts/lib/extend.mjs';

const subjects = await loadSubjects();
const core = new Set(Object.keys(JSON.parse(readFileSync(CORE_CONTEXT_FIXTURE, 'utf8'))['@context']).filter((k) => !k.startsWith('@')));
const contextTerms = new Map();
for (const s of subjects) contextTerms.set(s.name, Object.keys(await resolveContextTerms(s.context, subjects, resolveContextDocument)));
const common = subjects.find((s) => s.name === 'common');
const geometry = common.models.find((m) => m.type === 'Geometry');
const entities = subjects.flatMap((s) => s.models.filter((m) => m.kind === 'entity').map((m) => ({
  subject: s, raw: m,
  model: { type: m.type, schema: m.schema, schemaExact: modelUrls(s, m).schemaExact, contextAlias: subjectUrls(s).contextAlias, geometrySchema: modelUrls(common, geometry).schemaExact, attributes: attributesOf(m).map(([n]) => n), contextTerms: contextTerms.get(s.name) },
})));
const input = (attributes) => ({ prefix: 'acme', base: 'https://example.com/ns/acme/', attributes });
const attrs = [
  { name: 'patrolRoute', ngsiType: 'Property', valueType: 'string', format: '', required: true, description: 'Patrol route' },
  { name: 'checkedAt', ngsiType: 'Property', valueType: 'string', format: 'date-time', required: false, description: '' },
  { name: 'patrolCar', ngsiType: 'Relationship', required: false },
  { name: 'patrolArea', ngsiType: 'GeoProperty', required: false },
];

test('for every entity model: a context with only the new terms, and a schema that accepts the example plus them', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  for (const s of subjects) for (const m of s.models) if (m.kind === 'value') ajv.addSchema(m.schema, m.schema.$id);
  for (const { raw, model } of entities) {
    const out = buildExtension(model, input(attrs), core);
    assert.deepEqual(out.problems, [], model.type);
    assert.deepEqual(out.context, { '@context': [model.contextAlias, { acme: 'https://example.com/ns/acme/', patrolRoute: 'acme:patrolRoute', checkedAt: 'acme:checkedAt', patrolCar: 'acme:patrolCar', patrolArea: 'acme:patrolArea' }] });
    assert.equal(out.schema['x-extends'], model.schemaExact);
    assert.equal(out.schema.properties.patrolRoute['x-iri'], 'https://example.com/ns/acme/patrolRoute');
    assert.ok(out.schema.required.includes('patrolRoute'));
    assert.ok(!('x-version' in out.schema), 'the catalog version is not the extension\'s');
    const validate = ajv.compile(out.schema);
    const ok = { ...raw.examples['example.json'], patrolRoute: 'A-3', checkedAt: '2026-07-08T10:00:00+09:00', patrolCar: 'urn:ngsi-ld:Vehicle:7', patrolArea: { type: 'Point', coordinates: [139.75, 35.69] } };
    assert.ok(validate(ok), `${model.type}: ${ajv.errorsText(validate.errors)}`);
    const { patrolRoute, ...missing } = ok;
    assert.ok(!validate(missing), `${model.type}: a required added attribute is enforced`);
    assert.ok(!validate({ ...ok, checkedAt: 'yesterday' }), `${model.type}: the added format is enforced`);
    // The catalog schema itself stays as published: the builder works on a copy.
    assert.ok(!('patrolRoute' in raw.schema.properties));
  }
});

test('problems: bad names, clashes with the model and the core, taken namespaces', () => {
  const { model } = entities.find((e) => e.model.type === 'Task');
  const codes = (inp) => buildExtension(model, inp, core).problems.map((p) => `${p.code}${p.name ? `:${p.name}` : ''}`);
  assert.deepEqual(codes(input([{ name: 'Patrol', ngsiType: 'Property', valueType: 'string' }])), ['name:Patrol']);
  assert.deepEqual(codes(input([{ name: 'progress', ngsiType: 'Property', valueType: 'string' }])), ['inModel:progress']);
  assert.deepEqual(codes(input([{ name: 'observedAt', ngsiType: 'Property', valueType: 'string' }])), ['reserved:observedAt']);
  assert.deepEqual(codes(input([{ name: 'a', ngsiType: 'Property', valueType: 'string' }, { name: 'a', ngsiType: 'Property', valueType: 'string' }])), ['duplicate:a']);
  assert.deepEqual(codes(input([])), ['none']);
  assert.deepEqual(codes({ ...input(attrs), base: 'https://datamodels.jp/ns/task/' }), ['baseTaken']);
  assert.deepEqual(codes({ ...input(attrs), base: 'HTTPS://DataModels.JP/ns/task/' }), ['baseTaken'], 'hosts compare case-insensitively');
  assert.deepEqual(codes({ ...input(attrs), base: 'https://www.datamodels.jp/ns/x/' }), ['baseTaken']);
  assert.deepEqual(codes({ ...input(attrs), base: 'https://ns.datamodels.jp/x/' }), ['baseTaken'], 'subdomains too');
  assert.deepEqual(codes({ ...input(attrs), base: 'https://URI.etsi.org/ngsi-ld/x/' }), ['baseTaken']);
  assert.deepEqual(codes({ ...input(attrs), base: 'https://notdatamodels.jp/ns/x/' }), [], 'a different domain that merely ends the same way is fine');
  assert.deepEqual(codes({ ...input(attrs), base: 'https://example.com/ns/acme' }), ['base']);
  assert.deepEqual(codes({ ...input(attrs), prefix: 'Acme' }), ['prefix']);
  // Terms of the subject context from other models (Comment's text in the task
  // context) and imported ones (task's statusLabel in the transportation context).
  assert.deepEqual(codes(input([{ name: 'text', ngsiType: 'Property', valueType: 'string' }])), ['inContext:text']);
  assert.deepEqual(codes({ ...input(attrs), prefix: 'text' }), ['prefixInContext:text']);
  const road = entities.find((e) => e.model.type === 'RoadRestriction').model;
  assert.ok(road.contextTerms.includes('statusLabel'), 'transportation imports the task terms');
  // An empty row is ignored, not an error.
  assert.deepEqual(codes(input([...attrs, { name: '  ', ngsiType: 'Property', valueType: 'string' }])), []);
});

test('the proposal link opens the form with the attributes filled in', () => {
  const { model } = entities.find((e) => e.model.type === 'RoadRestriction');
  const url = new URL(proposalUrl(model, attrs));
  assert.equal(url.searchParams.get('template'), 'model-proposal.yml');
  assert.equal(url.searchParams.get('title'), 'RoadRestriction: patrolRoute, checkedAt, patrolCar, patrolArea');
  assert.match(url.searchParams.get('what'), /- `patrolRoute`: Property \(string\), required — Patrol route/);
  // A format left over from an earlier choice (the form hides it) is not proposed.
  const stale = new URL(proposalUrl(model, [{ name: 'count', ngsiType: 'Property', valueType: 'integer', format: 'date-time' }]));
  assert.match(stale.searchParams.get('what'), /- `count`: Property \(integer\)$/m);
  const rel = new URL(proposalUrl(model, [{ name: 'car', ngsiType: 'Relationship', valueType: 'string', format: 'date-time' }]));
  assert.match(rel.searchParams.get('what'), /- `car`: Relationship$/m);
});
