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
async function editJson(file, fn) { const o = JSON.parse(await readFile(file, 'utf8')); fn(o); await writeFile(file, JSON.stringify(o, null, 2)); }

test('unmodified models validate', () => {
  const r = spawnSync(process.execPath, [join(root, 'scripts', 'validate-models.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /models ok/);
});

test('redefining a protected core term fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'context.jsonld'), (c) => { c['@context'].status = 'disaster:status'; }),
    /redefines core context term "status"/));

test('an attribute missing from the context fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'context.jsonld'), (c) => { delete c['@context'].roadName; }),
    /does not define attribute "roadName"/));

test('a key-values example violating the schema fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'examples', 'example.json'), (e) => { e.closureStatus = '不明'; }),
    /example\.json: .*(enum|allowed values)/));

test('a normalized attribute without value fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'Project', 'examples', 'example-normalized.jsonld'), (e) => { e.name = { type: 'Property' }; }),
    /Property needs a value/));

test('an attribute whose context mapping is not an IRI fails', () =>
  withMutatedModels(async (d) => {
    // Declared everywhere, but the context maps it to a bare word, not an IRI.
    await editJson(join(d, 'disaster', 'IncidentPhoto', 'schema.json'), (s) => { s.properties.weird = { type: 'integer', 'x-ngsi': { type: 'Property' }, 'x-iri': 'weird' }; });
    await editJson(join(d, 'disaster', 'context.jsonld'), (c) => { c['@context'].weird = 'weird'; });
    const cat = join(d, 'disaster', 'IncidentPhoto', 'catalog.yaml');
    await writeFile(cat, (await readFile(cat, 'utf8')) + '  weird:\n    ja: "x"\n    en: "x"\n');
    await editJson(join(d, 'disaster', 'IncidentPhoto', 'examples', 'example-normalized.jsonld'), (e) => { e.weird = { type: 'Property', value: 1 }; });
    await editJson(join(d, 'disaster', 'IncidentPhoto', 'examples', 'example.json'), (e) => { e.weird = 1; });
  }, /(did not expand|lost in expand\/compact round-trip|JSON-LD processing failed)/));

test('a type name not matching its folder fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'Project', 'schema.json'), (s) => { s.properties.type.const = 'Projekt'; }),
    /properties\.type\.const must be "Project"/));

test('a schema version diverging from the subject version fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'Project', 'schema.json'), (s) => { s['x-version'] = '9.9.9'; }),
    /x-version must be 1\.0\.0/));

test('a normalized attribute whose wrapper type contradicts x-ngsi.type fails', () =>
  withMutatedModels((d) => editJson(join(d, 'disaster', 'RoadClosure', 'examples', 'example-normalized.jsonld'), (e) => { e.project = { type: 'Property', value: e.project.object }; }),
    /"project" is a Property but schema.json declares Relationship/));

test('a subject without an English title fails at load time', () =>
  withMutatedModels(async (d) => {
    const f = join(d, 'disaster', 'subject.yaml');
    await writeFile(f, (await readFile(f, 'utf8')).replace(/^  en: Disaster response$/m, ''));
  }, /subject\.yaml: title\.en is required/));
