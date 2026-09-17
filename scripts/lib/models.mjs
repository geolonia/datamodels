// Load the model repository: models/<subject>/{subject.yaml, context.jsonld, <Type>/...}
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import YAML from 'yaml';

export const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
// GEONICDB_MODELS_DIR lets the test suite point the loader at a mutated copy.
export const MODELS_DIR = process.env.GEONICDB_MODELS_DIR ?? join(ROOT, 'models');
export const DIST = join(ROOT, 'dist');
export const BASE_URL = 'https://models.geonicdb.com';
export const CORE_CONTEXT_URL = 'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld';
export const CORE_CONTEXT_FIXTURE = join(ROOT, 'test', 'fixtures', 'ngsi-ld-core-context-v1.8.jsonld');

const SEMVER = /^\d+\.\d+\.\d+$/;

async function readJson(file) { return JSON.parse(await readFile(file, 'utf8')); }
async function readYaml(file) { return YAML.parse(await readFile(file, 'utf8')); }
async function isDir(p) { try { return (await stat(p)).isDirectory(); } catch { return false; } }
async function exists(p) { try { await stat(p); return true; } catch { return false; } }

export function subjectUrls(subject) {
  const major = subject.version.split('.')[0];
  return {
    contextExact: `${BASE_URL}/context/${subject.name}/v${subject.version}.jsonld`,
    contextAlias: `${BASE_URL}/context/${subject.name}/v${major}.jsonld`,
    namespace: `${BASE_URL}/ns/${subject.name}/`,
    page: `${BASE_URL}/models/${subject.name}/`,
  };
}

export function modelUrls(subject, model) {
  const major = subject.version.split('.')[0];
  return {
    schemaExact: `${BASE_URL}/schema/${subject.name}/${model.type}/v${subject.version}.json`,
    schemaAlias: `${BASE_URL}/schema/${subject.name}/${model.type}/v${major}.json`,
    typeIri: `${BASE_URL}/ns/${subject.name}/${model.type}`,
    page: `${BASE_URL}/models/${subject.name}/${model.type}/`,
    examples: `${BASE_URL}/examples/${subject.name}/${model.type}/`,
    geonicdb: `${BASE_URL}/geonicdb/${subject.name}/${model.type}.json`,
  };
}

export async function loadSubjects() {
  const subjects = [];
  for (const name of (await readdir(MODELS_DIR)).sort()) {
    const dir = join(MODELS_DIR, name);
    if (!(await isDir(dir))) continue;
    const meta = await readYaml(join(dir, 'subject.yaml'));
    if (meta.name !== name) throw new Error(`${name}/subject.yaml: name "${meta.name}" does not match folder`);
    if (!SEMVER.test(meta.version)) throw new Error(`${name}/subject.yaml: version must be X.Y.Z`);
    for (const field of ['title', 'description']) {
      for (const lang of ['ja', 'en']) {
        if (typeof meta[field]?.[lang] !== 'string' || !meta[field][lang].trim()) throw new Error(`${name}/subject.yaml: ${field}.${lang} is required (pages are rendered in both languages)`);
      }
    }
    if (!['minted', 'profile', 'global'].includes(meta.source)) throw new Error(`${name}/subject.yaml: source must be minted, profile or global`);
    const context = await readJson(join(dir, 'context.jsonld'));
    if (!context['@context'] || typeof context['@context'] !== 'object') throw new Error(`${name}/context.jsonld: missing @context object`);
    const models = [];
    for (const type of (await readdir(dir)).sort()) {
      const mdir = join(dir, type);
      if (!(await isDir(mdir))) continue;
      const schema = await readJson(join(mdir, 'schema.json'));
      const catalog = await readYaml(join(mdir, 'catalog.yaml'));
      const notes = (await exists(join(mdir, 'notes.yaml'))) ? await readYaml(join(mdir, 'notes.yaml')) : {};
      const examples = {};
      for (const f of ['example.json', 'example-normalized.jsonld']) {
        const p = join(mdir, 'examples', f);
        if (await exists(p)) examples[f] = await readJson(p);
      }
      models.push({ type, dir: mdir, schema, catalog, notes, examples });
    }
    subjects.push({ name, dir, ...meta, context, models });
  }
  return subjects;
}

/** Attributes of a model: every schema property except id and type. */
export function attributesOf(model) {
  return Object.entries(model.schema.properties ?? {}).filter(([k]) => k !== 'id' && k !== 'type');
}

/** Key-values projection of an NGSI-LD normalized entity. */
export function toKeyValues(normalized) {
  const out = {};
  for (const [k, v] of Object.entries(normalized)) {
    if (k === '@context') continue;
    if (k === 'id' || k === 'type') { out[k] = v; continue; }
    if (!v || typeof v !== 'object' || !('type' in v)) throw new Error(`attribute ${k}: not a normalized attribute object`);
    if (v.type === 'Relationship') { if (typeof v.object !== 'string') throw new Error(`attribute ${k}: Relationship needs a string object`); out[k] = v.object; }
    else if (v.type === 'GeoProperty') { if (!v.value || typeof v.value !== 'object' || typeof v.value.type !== 'string') throw new Error(`attribute ${k}: GeoProperty needs a GeoJSON value`); out[k] = v.value; }
    else if (v.type === 'Property') {
      if (!('value' in v)) throw new Error(`attribute ${k}: Property needs a value`);
      out[k] = (v.value && typeof v.value === 'object' && '@type' in v.value && '@value' in v.value) ? v.value['@value'] : v.value;
    } else throw new Error(`attribute ${k}: unknown attribute type "${v.type}"`);
  }
  return out;
}
