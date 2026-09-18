// The validator must fail on the mistakes the URL contract exists to prevent.
// Each case copies models/ to a temp dir, mutates one file, runs the validator
// and expects a specific failure message.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');

async function withMutatedModels(mutate, expectMessage) {
  const dir = await mkdtemp(join(tmpdir(), 'geonicdb-models-'));
  try {
    await cp(join(root, 'models'), dir, { recursive: true });
    await mutate(dir);
    const r = spawnSync(process.execPath, [join(root, 'scripts', 'validate-models.mjs')], { env: { ...process.env, GEONICDB_MODELS_DIR: dir }, encoding: 'utf8' });
    assert.equal(r.status, 1, `validator should fail\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
    assert.match(r.stderr, expectMessage);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
// The inline term object of a context that may be an array (imports first).
const inlineTerms = (c) => (Array.isArray(c['@context']) ? c['@context'].find((p) => typeof p === 'object') : c['@context']);
async function editJson(file, fn) { const o = JSON.parse(await readFile(file, 'utf8')); fn(o); await writeFile(file, JSON.stringify(o, null, 2)); }

test('unmodified models validate', () => {
  const r = spawnSync(process.execPath, [join(root, 'scripts', 'validate-models.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /models ok/);
});

test('redefining a protected core term fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'context.jsonld'), (c) => { inlineTerms(c).status = 'disaster:status'; }),
    /redefines core context term "status"/));

test('an attribute missing from the context fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'context.jsonld'), (c) => { delete inlineTerms(c).roadName; }),
    /does not define attribute "roadName"/));

test('a key-values example violating the schema fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'examples', 'example.json'), (e) => { e.closureStatus = '不明'; }),
    /example\.json: .*(enum|allowed values)/));

test('a normalized attribute without value fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'DisasterEvent', 'examples', 'example-normalized.jsonld'), (e) => { e.name = { type: 'Property' }; }),
    /Property needs a value/));

test('an attribute whose context mapping is not an IRI fails', () =>
  withMutatedModels(async (d) => {
    // Declared everywhere, but the context maps it to a bare word, not an IRI.
    await editJson(join(d, 'disaster', 'IncidentPhoto', 'schema.json'), (s) => { s.properties.weird = { type: 'integer', 'x-ngsi': { type: 'Property' }, 'x-iri': 'weird' }; });
    await editJson(join(d, 'disaster', 'context.jsonld'), (c) => { inlineTerms(c).weird = 'weird'; });
    const cat = join(d, 'disaster', 'IncidentPhoto', 'catalog.yaml');
    await writeFile(cat, (await readFile(cat, 'utf8')) + '  weird:\n    ja: "x"\n    en: "x"\n');
    await editJson(join(d, 'disaster', 'IncidentPhoto', 'examples', 'example-normalized.jsonld'), (e) => { e.weird = { type: 'Property', value: 1 }; });
    await editJson(join(d, 'disaster', 'IncidentPhoto', 'examples', 'example.json'), (e) => { e.weird = 1; });
  }, /(did not expand|lost in expand\/compact round-trip|JSON-LD processing failed)/));

test('a type name not matching its folder fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'schema.json'), (s) => { s.properties.type.const = 'RoadClosur'; }),
    /properties\.type\.const must be "RoadClosure"/));

test('a schema version diverging from the subject version fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'schema.json'), (s) => { s['x-version'] = '9.9.9'; }),
    /x-version must be 2\.0\.0/));

test('a normalized attribute whose wrapper type contradicts x-ngsi.type fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'examples', 'example-normalized.jsonld'), (e) => { e.project = { type: 'Property', value: e.project.object }; }),
    /"project" is a Property but schema.json declares Relationship/));

test('a subject without an English title fails at load time', () =>
  withMutatedModels(async (d) => {
    const f = join(d, 'disaster', 'subject.yaml');
    await writeFile(f, (await readFile(f, 'utf8')).replace(/^  en: Disaster response$/m, ''));
  }, /subject\.yaml: title\.en is required/));

test('a nested address field the context does not define fails', () =>
  withMutatedModels(async (d) => {
    await editJson(join(d, 'common', 'JapaneseAddress', 'schema.json'), (s) => { s.properties.wardName = { type: 'string', 'x-iri': 'https://models.geonicdb.com/ns/common/wardName' }; });
    const cat = join(d, 'common', 'JapaneseAddress', 'catalog.yaml');
    await writeFile(cat, (await readFile(cat, 'utf8')) + '  wardName:\n    ja: "x"\n    en: "x"\n');
    await editJson(join(d, 'disaster', 'RoadClosure', 'examples', 'example-normalized.jsonld'), (e) => { e.address.value.wardName = '中区'; });
    await editJson(join(d, 'disaster', 'RoadClosure', 'examples', 'example.json'), (e) => { e.address.wardName = '中区'; });
  }, /(does not define attribute "wardName"|address\.value\.wardName" lost)/));

test('a value-type example violating a code pattern fails', () =>
  withMutatedModels((d) => editJson(join(d, 'common', 'JapaneseAddress', 'examples', 'example.json'), (e) => { e.jisMunicipalityCode = '3720'; }),
    /JapaneseAddress\/examples\/example\.json: .*pattern/));

test('an entity example whose address violates the referenced value schema fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'examples', 'example.json'), (e) => { e.address.postalCode = 'ABC'; }),
    /RoadClosure\/examples\/example\.json: .*pattern/));

test('a context importing a version that is neither published nor current fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'context.jsonld'), (c) => { c['@context'][0] = 'https://models.geonicdb.com/context/common/v0.9.0.jsonld'; }),
    /version 0\.9\.0 of subject "common" is neither published/));

test('a multi-valued attribute the schema does not declare as multi fails', () =>
  withMutatedModels((d) => editJson(join(d, 'task', 'Task', 'schema.json'), (s) => { delete s.properties.assignee['x-ngsi'].multi; }),
    /"assignee" is multi-valued in the example but schema.json does not declare x-ngsi.multi/));

test('a notes.yaml entry that parses as an object fails', () =>
  withMutatedModels((d) => writeFile(join(d, 'task', 'Task', 'notes.yaml'), 'notes:\n  - Upstream considered: none\nlicense: CC BY 4.0\n'),
    /notes must be a list of strings/));

test('two instances of a multi-valued attribute without datasetId fail', () =>
  withMutatedModels((d) => editJson(join(d, 'task', 'Task', 'examples', 'example-normalized.jsonld'), (e) => { e.assignee = [{ type: 'Relationship', object: 'urn:ngsi-ld:Team:a' }, { type: 'Relationship', object: 'urn:ngsi-ld:Team:b' }]; }),
    /only one instance of a multi-valued attribute may omit datasetId/));

test('two instances of a multi-valued attribute with the same datasetId fail', () =>
  withMutatedModels((d) => editJson(join(d, 'task', 'Task', 'examples', 'example-normalized.jsonld'), (e) => { e.assignee = [{ type: 'Relationship', object: 'urn:ngsi-ld:Team:a', datasetId: 'urn:ngsi-ld:dataset:x' }, { type: 'Relationship', object: 'urn:ngsi-ld:Team:b', datasetId: 'urn:ngsi-ld:dataset:x' }]; }),
    /duplicate datasetId urn:ngsi-ld:dataset:x/));

test('a single instance of a multi-valued attribute projects to a one-element array', () =>
  withMutatedModels(async (d) => {
    await editJson(join(d, 'task', 'Task', 'examples', 'example-normalized.jsonld'), (e) => { e.assignee = { type: 'Relationship', object: 'urn:ngsi-ld:Team:a' }; });
    // The key-values example must then hold a one-element array; a bare string is the mistake.
    await editJson(join(d, 'task', 'Task', 'examples', 'example.json'), (e) => { e.assignee = 'urn:ngsi-ld:Team:a'; });
  }, /assignee must be array/));

test('an Attachment owned by both a task and a project fails', () =>
  withMutatedModels((d) => editJson(join(d, 'task', 'Attachment', 'examples', 'example.json'), (e) => { e.project = 'urn:ngsi-ld:Project:redmine:takamatsu:kasen'; }),
    /must match exactly one schema in oneOf/));

test('a geometry without coordinates fails', () =>
  withMutatedModels((d) => editJson(join(d, 'task', 'Project', 'examples', 'example.json'), (e) => { e.location = { type: 'Polygon' }; }),
    /location/));

test('a notes.yaml whose root is a list fails', () =>
  withMutatedModels((d) => writeFile(join(d, 'task', 'Task', 'notes.yaml'), '- a note\n- another\n'),
    /root value must be a mapping/));

test('an alias whose attributes differ from the aliased type fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'DisasterEvent', 'schema.json'), (s) => { delete s.properties.keywords; }),
    /alias of Project: properties differ \(keywords\)/));

test('an alias of a type the catalog does not define fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'DisasterEvent', 'schema.json'), (s) => { s['x-alias-of'] = 'https://models.geonicdb.com/ns/task/Programme'; }),
    /x-alias-of .* is not a type of this catalog/));

test('a second type claiming an existing IRI without x-alias-of fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'DisasterEvent', 'schema.json'), (s) => { delete s['x-alias-of']; }),
    /type expands to .*\/ns\/task\/Project, expected .*\/ns\/disaster\/DisasterEvent/));

test('a subclass attribute under a different IRI than the parent fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'IncidentReport', 'schema.json'), (s) => { s.properties.progress['x-iri'] = 'https://models.geonicdb.com/ns/disaster/progress'; }),
    /progress: subclass of Task must use its IRI/));

test('a subclass that drops a parent-required attribute fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'IncidentReport', 'schema.json'), (s) => { s.required = s.required.filter((r) => r !== 'progress'); }),
    /subclass of Task: "progress" must stay required/));
