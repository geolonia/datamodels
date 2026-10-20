// The GeonicDB export adapts a catalog model to a tenant without touching the
// catalog vocabulary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadSubjects, CORE_TERMS, CORE_CONTEXT_FIXTURE } from '../../../scripts/lib/models.mjs';
import { toCustomDataModel, expandVocabTerm, DATE_OR_DATE_TIME_PATTERN } from '../custom-data-model.mjs';

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
  const b = toCustomDataModel(transportation, roadRestriction, { typePrefix: 'Acme' });
  assert.equal(b.type, 'AcmeRoadRestriction');
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

test('a date or date-time attribute is a string with a pattern: GeonicDB\'s datetime rejects a plain date', () => {
  const task = subjects.find((s) => s.name === 'task');
  const body = (type) => toCustomDataModel(task, task.models.find((m) => m.type === type)).propertyDetails;
  for (const [type, name] of [['Task', 'start'], ['Task', 'due'], ['Milestone', 'start'], ['Milestone', 'due'], ['Project', 'start'], ['Project', 'end']]) {
    const d = body(type)[name];
    assert.equal(d.valueType, 'string', `${type}.${name}`);
    assert.equal(d.validation?.pattern, DATE_OR_DATE_TIME_PATTERN, `${type}.${name}`);
  }
  assert.equal(body('Milestone').due.example, '2026-07-11');
  assert.equal(body('Task').completedAt.valueType, 'datetime', 'a date-time only attribute keeps datetime');
  assert.ok(!body('Task').completedAt.validation);
  const re = new RegExp(DATE_OR_DATE_TIME_PATTERN);
  for (const v of ['2026-07-11', '2026-07-11T07:00:00+09:00', '2026-07-11T07:00:00.5Z']) assert.ok(re.test(v), v);
  // As strict as GeonicDB's datetime for a date-time: seconds and an offset are required.
  for (const v of ['2026-07-11T25:00', '2026-07-11T07:00', '2026-13-01', 'tomorrow']) assert.ok(!re.test(v), v);
  // GeonicDB's pattern limits (security-validators.ts): at most 200 characters and 10
  // alternatives, and no repeated group (a group followed by *, + or {n}).
  assert.ok(DATE_OR_DATE_TIME_PATTERN.length <= 200);
  assert.ok(DATE_OR_DATE_TIME_PATTERN.split('|').length - 1 <= 10);
  assert.ok(!/\)[*+{]/.test(DATE_OR_DATE_TIME_PATTERN));
});

// #280, #285: GeonicDB registers VocabProperty and JsonProperty as their own
// types, and checks a VocabProperty's term as its full IRI.
const decisionSubject = subjects.find((s) => s.name === 'decision');
const decision = decisionSubject.models.find((m) => m.type === 'Decision');
const decisionBody = (model = decision, options) => toCustomDataModel(decisionSubject, model, options).propertyDetails;
const withEnum = (...terms) => { const m = structuredClone(decision); m.schema.properties.humanInvolvement.enum = terms; return m; };

test('every attribute keeps its own NGSI-LD type, VocabProperty and JsonProperty included, with the schema\'s value type (#285)', () => {
  const d = decisionBody();
  for (const [name, ngsiType, valueType] of [['humanInvolvement', 'VocabProperty', 'string'], ['answers', 'JsonProperty', 'array'], ['facts', 'JsonProperty', 'array'], ['corrections', 'JsonProperty', 'array']]) {
    assert.equal(d[name].ngsiType, ngsiType, name);
    assert.equal(d[name].valueType, valueType, name);
  }
  assert.equal(d.refersTo.ngsiType, 'Relationship');
  assert.equal(d.reviewStatus.ngsiType, 'Property');
  assert.equal(toCustomDataModel(transportation, roadRestriction).propertyDetails.location.ngsiType, 'GeoProperty');
  const labelled = { type: 'Labelled', kind: 'entity', examples: {}, schema: { properties: { label: { type: 'object', 'x-ngsi': { type: 'LanguageProperty' } } } } };
  assert.equal(toCustomDataModel(transportation, labelled).propertyDetails.label.ngsiType, 'LanguageProperty');
});

test('a VocabProperty\'s allowed terms are full IRIs, expanded with the context and its imports (#280)', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const d = decisionBody();
  assert.equal(warn.mock.callCount(), 0, 'nothing is dropped from Decision');
  assert.deepEqual(d.humanInvolvement.validation, {
    enum: [
      'https://w3id.org/dpv#HumanInvolvementForVerification',
      'https://w3id.org/dpv#HumanInvolvementForOversight',
      'https://w3id.org/dpv#HumanInvolvementForDecision',
      'https://w3id.org/dpv#HumanNotInvolved',
    ],
  });
  assert.equal(decision.schema.properties.humanInvolvement.enum[0], 'dpv:HumanInvolvementForVerification', 'the catalog schema keeps the compact terms');
  // Other attributes keep their checks as the schema has them.
  assert.deepEqual(d.reviewStatus.validation, { enum: ['pending', 'resolved', 'superseded'] });
  assert.deepEqual(d.profileVersion.validation, { minimum: 1 });
  assert.deepEqual(d.policyRule.validation, { pattern: decision.schema.properties.policyRule.pattern });
  // A prefix and a term of the common context, which Decision's context imports, and terms of its own.
  assert.deepEqual(decisionBody(withEnum('schema:Thing', 'ContactPoint', 'Decision', 'urn:x', 'https://w3id.org/dpv#HumanNotInvolved')).humanInvolvement.validation.enum, [
    'https://schema.org/Thing', 'https://datamodels.jp/ns/common/ContactPoint', 'https://datamodels.jp/ns/decision/Decision', 'urn:x', 'https://w3id.org/dpv#HumanNotInvolved',
  ]);
});

test('expandVocabTerm: definitions, cycles and absolute IRIs (#280)', () => {
  const terms = { dpv: 'https://w3id.org/dpv#', 'dpv:X': 'dpv:X', a: 'b', b: 'a', https: 'https://wrong.example/', urn: 'https://wrong.example/' };
  assert.equal(expandVocabTerm(terms, 'dpv:X'), 'https://w3id.org/dpv#X', 'a term defined as itself expands as a compact IRI');
  assert.equal(expandVocabTerm(terms, 'a'), undefined, 'a cycle ends without an answer');
  assert.equal(expandVocabTerm(terms, 'https://w3id.org/dpv#X'), 'https://w3id.org/dpv#X', 'an absolute IRI is not read as the prefix "https"');
  assert.equal(expandVocabTerm({}, 'urn:x'), 'urn:x');
  assert.equal(expandVocabTerm({}, 'nope'), undefined);
  assert.throws(() => decisionBody(withEnum('a'), { contextTerms: terms }), /Decision\.humanInvolvement: the VocabProperty term "a" cannot be expanded/);
});

test('a VocabProperty term the context cannot expand fails the build clearly (#280)', () => {
  for (const term of ['nope:HumanNotInvolved', 'HumanNotInvolved']) {
    assert.throws(() => decisionBody(withEnum('dpv:HumanNotInvolved', term)), (e) => e.message.includes(`Decision.humanInvolvement: the VocabProperty term "${term}" cannot be expanded`) && e.message.includes('models/decision/context.jsonld (or a context it imports)'), term);
  }
  const unloaded = { ...decisionSubject }; // a copy without the non-enumerable contextTerms
  assert.throws(() => toCustomDataModel(unloaded, decision), /context's terms are not loaded; load the subject with loadSubjects\(\)/);
  Object.defineProperty(unloaded, 'contextTermsError', { value: 'context imports https://example.com/x.jsonld, which is not a catalog context URL' });
  assert.throws(() => toCustomDataModel(unloaded, decision), /context's terms are not loaded: context imports https:\/\/example\.com\/x\.jsonld, which is not a catalog context URL/);
});

test('the contextTerms option expands the terms instead of the subject\'s (#280)', () => {
  assert.deepEqual(decisionBody(withEnum('x'), { contextTerms: { x: 'https://e.example/x' } }).humanInvolvement.validation.enum, ['https://e.example/x']);
});

test('a VocabProperty gets no pattern or length check, and the build says so; a JsonProperty keeps its checks (#280)', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const model = structuredClone(decision);
  Object.assign(model.schema.properties.humanInvolvement, { pattern: '^dpv:', minLength: 1, maxLength: 80 });
  Object.assign(model.schema.properties.answers, { minimum: 0, enum: [[]] });
  const d = decisionBody(model);
  assert.deepEqual(Object.keys(d.humanInvolvement.validation), ['enum'], 'written for the compact term, not the IRI');
  assert.equal(warn.mock.callCount(), 1);
  assert.match(warn.mock.calls[0].arguments[0], /^Decision\.humanInvolvement: GeonicDB adapter: pattern, minLength, maxLength of a VocabProperty not sent/);
  // GeonicDB applies a JsonProperty's checks to the JSON itself, as the schema describes it.
  assert.deepEqual(d.answers.validation, { minimum: 0, enum: [[]] });
});

test('extension attributes follow the same GeonicDB rules (#280, #285)', (t) => {
  t.mock.method(console, 'warn', () => {});
  const level = { ngsiType: 'VocabProperty', valueType: 'string', validation: { enum: ['dpv:HumanNotInvolved', 'https://example.com/ns/acme/Low'], pattern: '^x' } };
  const extend = { propertyDetails: { level, raw: { ngsiType: 'JsonProperty', valueType: 'object' }, note: { ngsiType: 'LanguageProperty', valueType: 'object' } } };
  const d = decisionBody(decision, { extend });
  assert.equal(d.level.ngsiType, 'VocabProperty');
  assert.deepEqual(d.level.validation, { enum: ['https://w3id.org/dpv#HumanNotInvolved', 'https://example.com/ns/acme/Low'] });
  assert.equal(d.raw.ngsiType, 'JsonProperty');
  assert.equal(d.note.ngsiType, 'LanguageProperty');
  assert.equal(level.validation.pattern, '^x', 'the caller\'s definition is not changed');
  const bad = { propertyDetails: { level: { ...level, validation: { enum: ['acme:Low'] } } } };
  assert.throws(() => decisionBody(decision, { extend: bad }), /extension attribute "level": the VocabProperty term "acme:Low" cannot be expanded to a full IRI; write it as a full IRI/);
  // Every ngsiType reaches GeonicDB as written: a typo too, which GeonicDB refuses.
  assert.equal(decisionBody(decision, { extend: { propertyDetails: { link: { ngsiType: 'Relationshp', valueType: 'uri' } } } }).link.ngsiType, 'Relationshp');
  // A VocabProperty whose only checks were a pattern or a length gets no empty validation.
  const lengthOnly = decisionBody(decision, { extend: { propertyDetails: { level: { ...level, validation: { maxLength: 10 } } } } });
  assert.ok(!('validation' in lengthOnly.level));
  const notAList = { propertyDetails: { level: { ...level, validation: { enum: 'dpv:HumanNotInvolved' } } } };
  assert.throws(() => decisionBody(decision, { extend: notAList }), /extension attribute "level": the enum of a VocabProperty must be a list of terms, not "dpv:HumanNotInvolved"/);
});
