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
    if (!context['@context'] || typeof context['@context'] !== 'object') throw new Error(`${name}/context.jsonld: missing @context (object or array)`);
    // A context may be an array that imports other catalog contexts by URL
    // (for example the common subject) followed by inline term definitions.
    const parts = Array.isArray(context['@context']) ? context['@context'] : [context['@context']];
    const imports = parts.filter((p) => typeof p === 'string');
    const inlineTerms = Object.assign({}, ...parts.filter((p) => p && typeof p === 'object'));
    for (const url of imports) if (!url.startsWith(`${BASE_URL}/context/`)) throw new Error(`${name}/context.jsonld: only catalog contexts may be imported by URL, got ${url}`);
    const models = [];
    for (const type of (await readdir(dir)).sort()) {
      const mdir = join(dir, type);
      if (!(await isDir(mdir)) || type === 'releases') continue;
      if (!(await exists(join(mdir, 'schema.json')))) throw new Error(`${name}/${type}: a model folder needs schema.json`);
      const schema = await readJson(join(mdir, 'schema.json'));
      const catalog = await readYaml(join(mdir, 'catalog.yaml'));
      const notes = (await exists(join(mdir, 'notes.yaml'))) ? await readYaml(join(mdir, 'notes.yaml')) : {};
      // Correspondence tables to external standards (mapping/<name>.yaml).
      const mappings = [];
      const mdirMapping = join(mdir, 'mapping');
      if (await isDir(mdirMapping)) for (const f of (await readdir(mdirMapping)).sort()) if (f.endsWith('.yaml')) mappings.push({ name: f.replace(/\.yaml$/, ''), ...(await readYaml(join(mdirMapping, f))) });
      const examples = {};
      for (const f of ['example.json', 'example-normalized.jsonld']) {
        const p = join(mdir, 'examples', f);
        if (await exists(p)) examples[f] = await readJson(p);
      }
      // kind: 'entity' (an NGSI-LD entity type) or 'value' (a reusable value
      // structure such as an address, referenced from entity schemas).
      const kind = schema['x-kind'] ?? 'entity';
      if (!['entity', 'value'].includes(kind)) throw new Error(`${name}/${type}/schema.json: x-kind must be entity or value`);
      models.push({ type, kind, dir: mdir, schema, catalog, notes, examples, mappings });
    }
    subjects.push({ name, dir, ...meta, context, imports, inlineTerms, models });
  }
  return subjects;
}

/** Attributes of a model: every schema property except id and type. */
export function attributesOf(model) {
  return Object.entries(model.schema.properties ?? {}).filter(([k]) => k !== 'id' && k !== 'type');
}

/**
 * Key-values projection of an NGSI-LD normalized entity.
 *
 * `multi` names the attributes the schema declares `x-ngsi.multi`: their
 * key-values form is always an array, one element per instance, even when the
 * normalized entity carries a single instance. Instances are distinguished by
 * datasetId; at most one (the default instance) may omit it.
 */
export function toKeyValues(normalized, { multi = new Set() } = {}) {
  const out = {};
  for (const [k, v] of Object.entries(normalized)) {
    if (k === '@context') continue;
    if (k === 'id' || k === 'type') { out[k] = v; continue; }
    if (Array.isArray(v) || multi.has(k)) {
      const instances = Array.isArray(v) ? v : [v];
      if (instances.length === 0) throw new Error(`attribute ${k}: empty multi-valued attribute`);
      const seen = new Set();
      let defaults = 0;
      out[k] = instances.map((inst) => {
        const single = toKeyValues({ [k]: inst });
        if (inst.datasetId === undefined) defaults += 1;
        else if (seen.has(inst.datasetId)) throw new Error(`attribute ${k}: duplicate datasetId ${inst.datasetId}`);
        else seen.add(inst.datasetId);
        return single[k];
      });
      if (defaults > 1) throw new Error(`attribute ${k}: only one instance of a multi-valued attribute may omit datasetId`);
      continue;
    }
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

/** Imports (URLs) and merged inline terms of a context document. */
export function splitContext(doc) {
  const parts = Array.isArray(doc['@context']) ? doc['@context'] : [doc['@context']];
  return { imports: parts.filter((p) => typeof p === 'string'), inlineTerms: Object.assign({}, ...parts.filter((p) => p && typeof p === 'object')) };
}

/**
 * All term definitions a context document provides: imported catalog contexts
 * first (resolved by version, see releases.mjs), inline definitions last.
 */
export async function resolveContextTerms(doc, subjects, resolveDocument) {
  const { imports, inlineTerms } = splitContext(doc);
  const terms = {};
  for (const url of imports) {
    const imported = await resolveDocument(url, subjects);
    if (!imported) throw new Error(`context imports ${url}, which is not a catalog context URL`);
    Object.assign(terms, await resolveContextTerms(imported, subjects, resolveDocument));
  }
  return Object.assign(terms, inlineTerms);
}
