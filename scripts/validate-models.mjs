// Validate every subject and model in models/. Runs in CI via `npm run check`.
//
//   1. key-values example validates against schema.json
//   2. normalized example follows the NGSI-LD representation rules and its
//      key-values projection validates against schema.json
//   3. the normalized example expands with a JSON-LD processor using the
//      subject context (served locally) plus the core context (fixture);
//      every attribute must expand to an IRI and round-trip through compaction
//   4. the context defines every attribute the schemas use (unless the core
//      context defines it), defines every type, and redefines no core term
//   5. type IRIs are unique across subjects; the type name matches the folder
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import jsonld from 'jsonld';
import { readFile } from 'node:fs/promises';
import { loadSubjects, attributesOf, toKeyValues, subjectUrls, modelUrls, resolveContextTerms, CORE_CONTEXT_URL, CORE_CONTEXT_FIXTURE } from './lib/models.mjs';
import { resolveContextDocument } from './lib/releases.mjs';
import { buildVocabulary } from './lib/vocab.mjs';

const failures = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const core = JSON.parse(await readFile(CORE_CONTEXT_FIXTURE, 'utf8'));
const coreTerms = new Set(Object.keys(core['@context']).filter((k) => !k.startsWith('@')));

const subjects = await loadSubjects();
const seenTypeIris = new Map();
// Every type that owns its IRI (not an alias), for alias and subclass targets.
const ownersByIri = new Map();
for (const subject of subjects) for (const model of subject.models) if (!model.schema['x-alias-of']) ownersByIri.set(modelUrls(subject, model).typeIri, { subject, model });

const stripType = (props = {}) => Object.fromEntries(Object.entries(props).filter(([k]) => k !== 'type'));
/** Structural equality: object key order does not matter, array order does (JSON Schema arrays such as enum and oneOf are ordered). */
function same(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => same(v, b[i]));
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  return same(ka, kb) && ka.every((k) => same(a[k], b[k]));
}
const sameSet = (a = [], b = []) => same([...a].sort(), [...b].sort());

// GeoJSON ring closure (RFC 7946 §3.1.6: a linear ring's first and last
// positions MUST be identical) cannot be expressed in JSON Schema — there is
// no keyword to compare two elements of a variable-length array to each
// other. So it is checked here instead, over every Polygon/MultiPolygon found
// anywhere in an example, however deep (schema.json still enforces the
// minItems/position shape around it).
const positionsEqual = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
const ringCloses = (ring) => !Array.isArray(ring) || ring.length === 0 || positionsEqual(ring[0], ring[ring.length - 1]);
function findUnclosedRings(value, path = '$') {
  const problems = [];
  const walk = (v, p) => {
    if (Array.isArray(v)) { v.forEach((e, i) => walk(e, `${p}[${i}]`)); return; }
    if (!v || typeof v !== 'object') return;
    if (v.type === 'Polygon' && Array.isArray(v.coordinates)) {
      v.coordinates.forEach((ring, i) => { if (!ringCloses(ring)) problems.push(`${p}.coordinates[${i}]`); });
    } else if (v.type === 'MultiPolygon' && Array.isArray(v.coordinates)) {
      v.coordinates.forEach((poly, pi) => (Array.isArray(poly) ? poly : []).forEach((ring, ri) => { if (!ringCloses(ring)) problems.push(`${p}.coordinates[${pi}][${ri}]`); }));
    }
    for (const [k, vv] of Object.entries(v)) walk(vv, `${p}.${k}`);
  };
  walk(value, path);
  return problems;
}

// Value schemas (x-kind: value) are referenced by $ref from entity schemas in
// other subjects; register them so ajv resolves the URL without fetching.
for (const subject of subjects) for (const model of subject.models) {
  if (model.kind === 'value') { try { ajv.addSchema(model.schema, model.schema.$id); } catch (e) { fail(`models/${subject.name}/${model.type}/schema.json`, `cannot register: ${e.message}`); } }
}

/** Every key at any depth of a plain object tree, as "a.b.c" paths. */
function keyPaths(obj, prefix = '') {
  const out = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
  for (const [k, v] of Object.entries(obj)) { if (k.startsWith('@')) continue; const path = prefix ? `${prefix}.${k}` : k; out.push(path); out.push(...keyPaths(v, path)); }
  return out;
}

for (const subject of subjects) {
  const where = `models/${subject.name}`;
  const urls = subjectUrls(subject);
  let ctxTerms;
  try { ctxTerms = await resolveContextTerms(subject.context, subjects, resolveContextDocument); } catch (e) { fail(`${where}/context.jsonld`, e.message); continue; }
  const inlineTerms = subject.inlineTerms;

  // Local document loader: our own context URLs resolve to the source file,
  // the core context to the fixture. Anything else is a real fetch.
  const loader = async (url) => {
    const doc = await resolveContextDocument(url, subjects);
    if (doc) return { documentUrl: url, document: doc };
    if (url === CORE_CONTEXT_URL) return { documentUrl: url, document: core };
    return jsonld.documentLoaders.node()(url);
  };

  for (const term of Object.keys(inlineTerms)) {
    if (coreTerms.has(term)) fail(`${where}/context.jsonld`, `redefines core context term "${term}" (protected)`);
  }

  // The vocabulary must be valid JSON-LD and state every subclass relation, so
  // tools other than this validator see them.
  try {
    const vocab = buildVocabulary(subject);
    const expanded = await jsonld.expand(vocab, { documentLoader: loader });
    const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
    for (const model of subject.models) {
      const parent = model.schema['x-subclass-of'];
      if (!parent) continue;
      const cls = expanded.find((n) => n['@id'] === modelUrls(subject, model).typeIri);
      if (!cls?.[`${RDFS}subClassOf`]?.some((o) => o['@id'] === parent)) fail(`${where}/vocab`, `${model.type}: vocabulary lacks rdfs:subClassOf ${parent}`);
    }
  } catch (e) { fail(`${where}/vocab`, `vocabulary does not expand: ${e.message}`); }

  for (const model of subject.models) {
    const mwhere = `${where}/${model.type}`;
    const murls = modelUrls(subject, model);
    const { schema } = model;

    if (model.kind === 'entity' && schema.properties?.type?.const !== model.type) fail(`${mwhere}/schema.json`, `properties.type.const must be "${model.type}"`);
    if (schema.$id !== murls.schemaExact) fail(`${mwhere}/schema.json`, `$id must be ${murls.schemaExact}`);
    if (schema['x-version'] !== subject.version) fail(`${mwhere}/schema.json`, `x-version must be ${subject.version} (subject version)`);
    if (!ctxTerms[model.type]) fail(`${where}/context.jsonld`, `does not define type "${model.type}"`);
    const aliasOf = schema['x-alias-of'];
    const subclassOf = schema['x-subclass-of'];
    if (aliasOf) {
      // An alias is the same type under another name: same IRI, same attributes, same requirements.
      const target = ownersByIri.get(aliasOf);
      if (!target) fail(`${mwhere}/schema.json`, `x-alias-of ${aliasOf} is not a type of this catalog`);
      else {
        const differing = [...new Set([...Object.keys(stripType(schema.properties)), ...Object.keys(stripType(target.model.schema.properties))])].filter((k) => !same(schema.properties[k], target.model.schema.properties[k]));
        if (differing.length) fail(`${mwhere}/schema.json`, `alias of ${target.model.type}: properties differ (${differing.join(', ')}); an alias has the same attributes, a subclass declares x-subclass-of`);
        if (!sameSet(schema.required, target.model.schema.required)) fail(`${mwhere}/schema.json`, `alias of ${target.model.type}: required differs`);
        if (model.kind !== target.model.kind) fail(`${mwhere}/schema.json`, `alias of ${target.model.type}: kind differs (${model.kind} vs ${target.model.kind})`);
        if ((schema.additionalProperties ?? true) !== (target.model.schema.additionalProperties ?? true)) fail(`${mwhere}/schema.json`, `alias of ${target.model.type}: additionalProperties differs`);
      }
      if (subclassOf) fail(`${mwhere}/schema.json`, 'x-alias-of and x-subclass-of are exclusive');
    } else {
      const prev = seenTypeIris.get(murls.typeIri); if (prev) fail(mwhere, `type IRI ${murls.typeIri} also used by ${prev}`); seenTypeIris.set(murls.typeIri, mwhere);
    }
    if (subclassOf) {
      // A subclass keeps its own type IRI but shares the parent's attribute IRIs and cannot loosen its requirements.
      const target = ownersByIri.get(subclassOf);
      if (!target) fail(`${mwhere}/schema.json`, `x-subclass-of ${subclassOf} is not a type of this catalog`);
      else {
        for (const [name, prop] of attributesOf(model)) {
          const pp = target.model.schema.properties?.[name];
          if (!pp) continue;
          if (pp['x-iri'] !== prop['x-iri']) fail(`${mwhere}/schema.json`, `${name}: subclass of ${target.model.type} must use its IRI ${pp['x-iri']}, not ${prop['x-iri']}`);
          if (pp['x-ngsi']?.type !== prop['x-ngsi']?.type) fail(`${mwhere}/schema.json`, `${name}: subclass of ${target.model.type} must keep the NGSI type ${pp['x-ngsi']?.type}`);
        }
        for (const r of target.model.schema.required ?? []) if (!(schema.required ?? []).includes(r)) fail(`${mwhere}/schema.json`, `subclass of ${target.model.type}: "${r}" must stay required`);
      }
    }

    for (const [name, prop] of attributesOf(model)) {
      if (model.kind === 'entity' && !prop['x-ngsi']?.type) fail(`${mwhere}/schema.json`, `${name}: missing x-ngsi.type`);
      if ('x-personal-data' in prop && prop['x-personal-data'] !== true) fail(`${mwhere}/schema.json`, `${name}: x-personal-data must be true or absent`);
      // Schemas are product-neutral: broker-specific hints belong in adapters/.
      for (const k of Object.keys(prop)) if (/^x-(geonicdb|orion|scorpio|stellio)/i.test(k)) fail(`${mwhere}/schema.json`, `${name}: product-specific key ${k}; move it into an adapter`);
      if (!ctxTerms[name] && !coreTerms.has(name)) fail(`${where}/context.jsonld`, `does not define attribute "${name}" used by ${model.type}`);
      if (!model.catalog?.attributes?.[name]?.ja || !model.catalog?.attributes?.[name]?.en) fail(`${mwhere}/catalog.yaml`, `${name}: needs ja and en descriptions`);
    }
    // Title and description render every page heading and the catalog entry.
    for (const field of ['title', 'description']) for (const l of ['ja', 'en']) {
      const v = model.catalog?.[field]?.[l];
      if (typeof v !== 'string' || !v.trim()) fail(`${mwhere}/catalog.yaml`, `${field}.${l} must be a non-empty string`);
    }
    for (const name of Object.keys(model.catalog?.attributes ?? {})) {
      if (!schema.properties?.[name]) fail(`${mwhere}/catalog.yaml`, `${name}: not in schema.json`);
    }

    let validate;
    try { validate = ajv.compile(schema); } catch (e) { fail(`${mwhere}/schema.json`, `does not compile: ${e.message}`); continue; }

    const kv = model.examples['example.json'];
    if (!kv) fail(mwhere, 'examples/example.json is required');
    else if (!validate(kv)) fail(`${mwhere}/examples/example.json`, ajv.errorsText(validate.errors));
    if (kv) for (const p of findUnclosedRings(kv)) fail(`${mwhere}/examples/example.json`, `${p}: polygon ring does not close (first and last position must be identical, RFC 7946 §3.1.6)`);

    // notes.yaml renders as a bullet list; an entry with an unquoted ": " parses as an object.
    if (model.notes != null && (typeof model.notes !== 'object' || Array.isArray(model.notes))) fail(`${mwhere}/notes.yaml`, 'root value must be a mapping with notes and license');
    const notes = (model.notes && typeof model.notes === 'object' && !Array.isArray(model.notes)) ? model.notes : {};
    if (notes.notes !== undefined && (!Array.isArray(notes.notes) || notes.notes.some((n) => typeof n !== 'string'))) fail(`${mwhere}/notes.yaml`, 'notes must be a list of strings (quote an entry that contains ": ")');
    if (notes.license !== undefined && typeof notes.license !== 'string') fail(`${mwhere}/notes.yaml`, 'license must be a string');

    if (model.kind === 'value') {
      // A value type has no normalized form of its own; check its fields expand
      // through this subject's context by wrapping the example in an entity,
      // as a GeoProperty (location) when the schema says its values are geometries.
      const geo = schema['x-ngsi']?.type === 'GeoProperty';
      const probe = { '@context': [urls.contextExact, CORE_CONTEXT_URL], id: 'urn:ngsi-ld:Probe:1', type: 'Probe', [geo ? 'location' : 'address']: { type: geo ? 'GeoProperty' : 'Property', value: kv } };
      try {
        const expanded = await jsonld.expand(probe, { documentLoader: loader });
        const compacted = await jsonld.compact(expanded, { '@context': probe['@context'] }, { documentLoader: loader });
        const lost = keyPaths(probe).filter((k) => !keyPaths(compacted).includes(k) && k !== 'type');
        for (const k of lost) fail(`${mwhere}/examples/example.json`, `field "${k}" is not defined by the context and was lost in expansion`);
      } catch (e) { fail(`${mwhere}/examples/example.json`, `JSON-LD processing failed: ${e.message}`); }
      continue;
    }
    const norm = model.examples['example-normalized.jsonld'];
    if (!norm) { fail(mwhere, 'examples/example-normalized.jsonld is required'); continue; }
    for (const [name, prop] of attributesOf(model)) {
      if (!(name in norm)) continue;
      const instances = Array.isArray(norm[name]) ? norm[name] : [norm[name]];
      if (Array.isArray(norm[name]) && !prop['x-ngsi']?.multi) fail(`${mwhere}/examples/example-normalized.jsonld`, `attribute "${name}" is multi-valued in the example but schema.json does not declare x-ngsi.multi`);
      for (const inst of instances) {
        const got = inst?.type;
        if (got !== prop['x-ngsi']?.type) fail(`${mwhere}/examples/example-normalized.jsonld`, `attribute "${name}" is a ${got} but schema.json declares ${prop['x-ngsi']?.type}`);
      }
    }
    const multi = new Set(attributesOf(model).filter(([, p]) => p['x-ngsi']?.multi).map(([n]) => n));
    let projected;
    try { projected = toKeyValues(norm, { multi }); } catch (e) { fail(`${mwhere}/examples/example-normalized.jsonld`, e.message); continue; }
    if (!validate(projected)) fail(`${mwhere}/examples/example-normalized.jsonld`, `key-values projection: ${ajv.errorsText(validate.errors)}`);
    for (const p of findUnclosedRings(projected)) fail(`${mwhere}/examples/example-normalized.jsonld`, `${p}: polygon ring does not close (first and last position must be identical, RFC 7946 §3.1.6)`);
    if (!Array.isArray(norm['@context']) || !norm['@context'].includes(urls.contextExact)) fail(`${mwhere}/examples/example-normalized.jsonld`, `@context must include ${urls.contextExact}`);

    try {
      const expanded = await jsonld.expand(norm, { documentLoader: loader });
      const node = expanded[0] ?? {};
      const expandedKeys = new Set(Object.keys(node).filter((k) => !k.startsWith('@')));
      for (const [name] of attributesOf(model)) {
        if (!(name in norm)) continue;
        const def = ctxTerms[name] ?? core['@context'][name];
        const iri = typeof def === 'string' ? def : def?.['@id'];
        const full = iri && iri.includes(':') && !iri.startsWith('http') ? iri.replace(/^([^:]+):/, (_, p) => ctxTerms[p] ?? core['@context'][p] ?? `${p}:`) : iri;
        if (!full || !expandedKeys.has(full)) fail(`${mwhere}/examples/example-normalized.jsonld`, `attribute "${name}" did not expand to ${full ?? '(no IRI)'}`);
      }
      const typeIri = node['@type']?.[0];
      if (typeIri !== murls.typeIri) fail(`${mwhere}/examples/example-normalized.jsonld`, `type expands to ${typeIri}, expected ${murls.typeIri}`);
      const compacted = await jsonld.compact(expanded, { '@context': norm['@context'] }, { documentLoader: loader });
      // Every key at every depth must survive: a nested field the context does
      // not define is silently dropped by expansion, so compare key paths.
      const after = new Set(keyPaths(compacted));
      for (const k of keyPaths(norm)) if (!after.has(k) && !/(^|\.)(type|value|object|datasetId)$/.test(k)) fail(`${mwhere}/examples/example-normalized.jsonld`, `"${k}" lost in expand/compact round-trip (not defined by the context?)`);
    } catch (e) {
      fail(`${mwhere}/examples/example-normalized.jsonld`, `JSON-LD processing failed: ${e.message}`);
    }
  }
}

if (failures.length) {
  console.error(`Model validation failed (${failures.length}):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
const n = subjects.reduce((a, s) => a + s.models.length, 0);
console.log(`models ok: ${subjects.length} subject(s), ${n} model(s) validated`);
