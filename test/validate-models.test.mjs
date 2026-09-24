// The validator must fail on the mistakes the URL contract exists to prevent.
// Each case copies models/ to a temp dir, mutates one file, runs the validator
// and expects a specific failure message.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
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
    const r = spawnSync(process.execPath, [join(root, 'scripts', 'validate-models.mjs')], { env: { ...process.env, DATAMODELS_MODELS_DIR: dir }, encoding: 'utf8' });
    assert.equal(r.status, 1, `validator should fail\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
    assert.match(r.stderr, expectMessage);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
// The inline term object of a context that may be an array (imports first).
const inlineTerms = (c) => (Array.isArray(c['@context']) ? c['@context'].find((p) => typeof p === 'object') : c['@context']);
async function editJson(file, fn) { const o = JSON.parse(await readFile(file, 'utf8')); fn(o); await writeFile(file, JSON.stringify(o, null, 2)); }

// The disaster subject dropped its last x-alias-of/x-subclass-of models
// (DisasterEvent, IncidentReport/IncidentHandoverNote/IncidentPhoto) on
// 2026-09-24. These two probes are throwaway models added to the temp copy
// only, so the alias and subclass validator rules below stay covered without
// resurrecting tenant-specific models in the real catalog.
//
// v1.0.0 is both disaster's current and its recorded version, so
// resolveContextDocument (releases.mjs) resolves the exact context/vocab URL
// to the frozen releases/v1.0.0/ snapshot, not to the live, probe-mutated
// source. Deleting that snapshot from the temp copy (harmless: this suite
// never runs check-immutability, only validate-models) makes it fall back to
// the live source, which is what these probes need to be seen at all.
async function dropFrozenSnapshot(d) { await rm(join(d, 'disaster', 'releases', 'v1.0.0'), { recursive: true, force: true }); }

async function addAliasProbe(d) {
  await dropFrozenSnapshot(d);
  const projectSchema = JSON.parse(await readFile(join(root, 'models', 'task', 'Project', 'schema.json'), 'utf8'));
  const probeSchema = { ...projectSchema, $id: 'https://datamodels.jp/schema/disaster/AliasProbe/v1.0.0.json', title: 'AliasProbe', 'x-alias-of': 'https://datamodels.jp/ns/task/Project', properties: { ...projectSchema.properties, type: { ...projectSchema.properties.type, const: 'AliasProbe' } } };
  const dir = join(d, 'disaster', 'AliasProbe');
  await mkdir(join(dir, 'examples'), { recursive: true });
  await writeFile(join(dir, 'schema.json'), JSON.stringify(probeSchema, null, 2));
  await cp(join(root, 'models', 'task', 'Project', 'catalog.yaml'), join(dir, 'catalog.yaml'));
  const kv = JSON.parse(await readFile(join(root, 'models', 'task', 'Project', 'examples', 'example.json'), 'utf8'));
  await writeFile(join(dir, 'examples', 'example.json'), JSON.stringify({ ...kv, id: 'urn:ngsi-ld:AliasProbe:1', type: 'AliasProbe' }, null, 2));
  const norm = JSON.parse(await readFile(join(root, 'models', 'task', 'Project', 'examples', 'example-normalized.jsonld'), 'utf8'));
  await writeFile(join(dir, 'examples', 'example-normalized.jsonld'), JSON.stringify({ ...norm, '@context': ['https://datamodels.jp/context/disaster/v1.0.0.jsonld', 'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld'], id: 'urn:ngsi-ld:AliasProbe:1', type: 'AliasProbe' }, null, 2));
  // AliasProbe reuses every attribute of task/Project verbatim, so its context
  // terms are resolved by importing task's context rather than duplicating them.
  await editJson(join(d, 'disaster', 'context.jsonld'), (c) => {
    if (!c['@context'].includes('https://datamodels.jp/context/task/v1.0.0.jsonld')) c['@context'].splice(1, 0, 'https://datamodels.jp/context/task/v1.0.0.jsonld');
    inlineTerms(c).AliasProbe = 'https://datamodels.jp/ns/task/Project';
  });
}

async function addSubclassProbe(d) {
  await dropFrozenSnapshot(d);
  const subclassSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://datamodels.jp/schema/disaster/SubclassProbe/v1.0.0.json',
    title: 'SubclassProbe',
    description: 'Probe subclass of Task, for validator tests only.',
    'x-version': '1.0.0',
    'x-subclass-of': 'https://datamodels.jp/ns/task/Task',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uri', description: 'Entity id (URN)' },
      type: { type: 'string', const: 'SubclassProbe', description: 'Entity type' },
      name: { type: 'string', description: 'Name', 'x-ngsi': { type: 'Property' }, 'x-iri': 'https://uri.etsi.org/ngsi-ld/name' },
      progress: { type: 'string', enum: ['needs-action', 'in-process', 'completed', 'failed', 'cancelled'], description: 'Progress', 'x-ngsi': { type: 'Property' }, 'x-iri': 'https://datamodels.jp/ns/task/progress' },
    },
    required: ['id', 'type', 'name', 'progress'],
    additionalProperties: false,
  };
  const dir = join(d, 'disaster', 'SubclassProbe');
  await mkdir(join(dir, 'examples'), { recursive: true });
  await writeFile(join(dir, 'schema.json'), JSON.stringify(subclassSchema, null, 2));
  await writeFile(join(dir, 'catalog.yaml'), 'title:\n  ja: "テスト"\n  en: "Probe"\ndescription:\n  ja: "テスト"\n  en: "Probe"\nstatus: draft\ntags: [probe]\nattributes:\n  name:\n    ja: "名前"\n    en: "Name"\n  progress:\n    ja: "状態"\n    en: "Progress"\n');
  await writeFile(join(dir, 'examples', 'example.json'), JSON.stringify({ id: 'urn:ngsi-ld:SubclassProbe:1', type: 'SubclassProbe', name: 'Probe', progress: 'in-process' }, null, 2));
  await writeFile(join(dir, 'examples', 'example-normalized.jsonld'), JSON.stringify({
    '@context': ['https://datamodels.jp/context/disaster/v1.0.0.jsonld', 'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld'],
    id: 'urn:ngsi-ld:SubclassProbe:1', type: 'SubclassProbe',
    name: { type: 'Property', value: 'Probe' },
    progress: { type: 'Property', value: 'in-process' },
  }, null, 2));
  await editJson(join(d, 'disaster', 'context.jsonld'), (c) => {
    const t = inlineTerms(c);
    t.SubclassProbe = 'disaster:SubclassProbe';
    t.name = 'https://uri.etsi.org/ngsi-ld/name';
    t.progress = 'tm:progress';
  });
}

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

test('an out-of-vocabulary regulationCategory fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'examples', 'example.json'), (e) => { e.regulationCategory = '全面通行止め'; }),
    /example\.json: .*(enum|allowed values)/));

test('a RoadClosure example missing location fails now that it is required', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'examples', 'example.json'), (e) => { delete e.location; }),
    /example\.json: .*required.*location/));

test('a RoadClosure location as a bare polygon (no line/point alternative) still needs coordinates', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'examples', 'example.json'), (e) => { e.location = { type: 'Polygon' }; }),
    /example\.json: .*location/));

test('a RoadClosure polygon whose ring does not close fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'examples', 'example.json'), (e) => {
    e.location = { type: 'Polygon', coordinates: [[[134.04, 34.34], [134.05, 34.34], [134.05, 34.35], [134.04, 34.36]]] };
  }), /example\.json: .*polygon ring does not close/));

test('a RoadClosure MultiLineString with no lines fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'examples', 'example.json'), (e) => {
    e.location = { type: 'MultiLineString', coordinates: [] };
  }), /example\.json: .*location/));

test('an Attachment location that is not a Point fails (narrowed shared Geometry)', () =>
  withMutatedModels((d) => editJson(join(d, 'task', 'Attachment', 'examples', 'example.json'), (e) => {
    e.location = { type: 'LineString', coordinates: [[134.04, 34.34], [134.05, 34.35]] };
  }), /Attachment\/examples\/example\.json: .*location/));

test('a Geometry value with an unknown geometry type fails', () =>
  withMutatedModels((d) => editJson(join(d, 'common', 'Geometry', 'examples', 'example.json'), (e) => { e.type = 'Circle'; }),
    /Geometry\/examples\/example\.json/));

test('a root x-iri on an entity type fails', () =>
  withMutatedModels((d) => editJson(join(d, 'task', 'Comment', 'schema.json'), (s) => { s['x-iri'] = 'https://schema.org/Comment'; }),
    /root x-iri is only for value types/));

test('a value type whose context term differs from its x-iri fails', () =>
  withMutatedModels((d) => editJson(join(d, 'common', 'context.jsonld'), (c) => { inlineTerms(c).Geometry = 'common:Geometry'; }),
    /type "Geometry" maps to https:\/\/datamodels\.jp\/ns\/common\/Geometry/));

test('a normalized attribute without value fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'examples', 'example-normalized.jsonld'), (e) => { e.description = { type: 'Property' }; }),
    /Property needs a value/));

test('an attribute whose context mapping is not an IRI fails', () =>
  withMutatedModels(async (d) => {
    // Declared everywhere, but the context maps it to a bare word, not an IRI.
    await editJson(join(d, 'disaster', 'RoadClosure', 'schema.json'), (s) => { s.properties.weird = { type: 'integer', 'x-ngsi': { type: 'Property' }, 'x-iri': 'weird' }; });
    await editJson(join(d, 'disaster', 'context.jsonld'), (c) => { inlineTerms(c).weird = 'weird'; });
    const cat = join(d, 'disaster', 'RoadClosure', 'catalog.yaml');
    await writeFile(cat, (await readFile(cat, 'utf8')) + '  weird:\n    ja: "x"\n    en: "x"\n');
    await editJson(join(d, 'disaster', 'RoadClosure', 'examples', 'example-normalized.jsonld'), (e) => { e.weird = { type: 'Property', value: 1 }; });
    await editJson(join(d, 'disaster', 'RoadClosure', 'examples', 'example.json'), (e) => { e.weird = 1; });
  }, /(did not expand|lost in expand\/compact round-trip|JSON-LD processing failed)/));

test('a type name not matching its folder fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'schema.json'), (s) => { s.properties.type.const = 'RoadClosur'; }),
    /properties\.type\.const must be "RoadClosure"/));

test('a schema version diverging from the subject version fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'schema.json'), (s) => { s['x-version'] = '9.9.9'; }),
    /x-version must be 1\.0\.0/));

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
    await editJson(join(d, 'common', 'JapaneseAddress', 'schema.json'), (s) => { s.properties.wardName = { type: 'string', 'x-iri': 'https://datamodels.jp/ns/common/wardName' }; });
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
  withMutatedModels((d) => editJson(join(d, 'disaster', 'context.jsonld'), (c) => { c['@context'][0] = 'https://datamodels.jp/context/common/v0.9.0.jsonld'; }),
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
  withMutatedModels(async (d) => { await addAliasProbe(d); await editJson(join(d, 'disaster', 'AliasProbe', 'schema.json'), (s) => { delete s.properties.keywords; }); },
    /alias of Project: properties differ \(keywords\)/));

test('an alias of a type the catalog does not define fails', () =>
  withMutatedModels(async (d) => { await addAliasProbe(d); await editJson(join(d, 'disaster', 'AliasProbe', 'schema.json'), (s) => { s['x-alias-of'] = 'https://datamodels.jp/ns/task/Programme'; }); },
    /x-alias-of .* is not a type of this catalog/));

test('a second type claiming an existing IRI without x-alias-of fails', () =>
  withMutatedModels(async (d) => { await addAliasProbe(d); await editJson(join(d, 'disaster', 'AliasProbe', 'schema.json'), (s) => { delete s['x-alias-of']; }); },
    /type expands to .*\/ns\/task\/Project, expected .*\/ns\/disaster\/AliasProbe/));

test('a subclass attribute under a different IRI than the parent fails', () =>
  withMutatedModels(async (d) => { await addSubclassProbe(d); await editJson(join(d, 'disaster', 'SubclassProbe', 'schema.json'), (s) => { s.properties.progress['x-iri'] = 'https://datamodels.jp/ns/disaster/progress'; }); },
    /progress: subclass of Task must use its IRI/));

test('a subclass that drops a parent-required attribute fails', () =>
  withMutatedModels(async (d) => { await addSubclassProbe(d); await editJson(join(d, 'disaster', 'SubclassProbe', 'schema.json'), (s) => { s.required = s.required.filter((r) => r !== 'progress'); }); },
    /subclass of Task: "progress" must stay required/));

test('an alias with a different unknown-attribute policy fails', () =>
  withMutatedModels(async (d) => { await addAliasProbe(d); await editJson(join(d, 'disaster', 'AliasProbe', 'schema.json'), (s) => { s.additionalProperties = true; }); },
    /alias of Project: additionalProperties differs/));

test('an alias survives a different key and required order', () =>
  withMutatedModels(async (d) => {
    await addAliasProbe(d);
    await editJson(join(d, 'disaster', 'AliasProbe', 'schema.json'), (s) => {
      s.required = [...s.required].reverse();
      s.properties = Object.fromEntries(Object.entries(s.properties).reverse());
      // and break something unrelated so the run still fails where expected
      s['x-version'] = '9.9.9';
    });
  }, /x-version must be 1\.0\.0(?![\s\S]*alias of Project)/));

test('a product-specific annotation in a schema fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'schema.json'), (s) => { s.properties.roadName['x-geonicdb'] = { indexed: true }; }),
    /roadName: product-specific key x-geonicdb; move it into an adapter/));
