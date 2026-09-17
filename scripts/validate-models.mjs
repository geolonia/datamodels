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
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import jsonld from 'jsonld';
import { readFile } from 'node:fs/promises';
import { loadSubjects, attributesOf, toKeyValues, subjectUrls, modelUrls, CORE_CONTEXT_URL, CORE_CONTEXT_FIXTURE } from './lib/models.mjs';

const failures = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const core = JSON.parse(await readFile(CORE_CONTEXT_FIXTURE, 'utf8'));
const coreTerms = new Set(Object.keys(core['@context']).filter((k) => !k.startsWith('@')));

const subjects = await loadSubjects();
const seenTypeIris = new Map();

for (const subject of subjects) {
  const where = `models/${subject.name}`;
  const urls = subjectUrls(subject);
  const ctxTerms = subject.context['@context'];

  // Local document loader: our own context URLs resolve to the source file,
  // the core context to the fixture. Anything else is a real fetch.
  const loader = async (url) => {
    if (url === urls.contextExact || url === urls.contextAlias) return { documentUrl: url, document: subject.context };
    if (url === CORE_CONTEXT_URL) return { documentUrl: url, document: core };
    return jsonld.documentLoaders.node()(url);
  };

  for (const term of Object.keys(ctxTerms)) {
    if (coreTerms.has(term)) fail(`${where}/context.jsonld`, `redefines core context term "${term}" (protected)`);
  }

  for (const model of subject.models) {
    const mwhere = `${where}/${model.type}`;
    const murls = modelUrls(subject, model);
    const { schema } = model;

    if (schema.properties?.type?.const !== model.type) fail(`${mwhere}/schema.json`, `properties.type.const must be "${model.type}"`);
    if (schema.$id !== murls.schemaExact) fail(`${mwhere}/schema.json`, `$id must be ${murls.schemaExact}`);
    if (schema['x-version'] !== subject.version) fail(`${mwhere}/schema.json`, `x-version must be ${subject.version} (subject version)`);
    if (!ctxTerms[model.type]) fail(`${where}/context.jsonld`, `does not define type "${model.type}"`);
    const prev = seenTypeIris.get(murls.typeIri); if (prev) fail(mwhere, `type IRI ${murls.typeIri} also used by ${prev}`); seenTypeIris.set(murls.typeIri, mwhere);

    for (const [name, prop] of attributesOf(model)) {
      if (!prop['x-ngsi']?.type) fail(`${mwhere}/schema.json`, `${name}: missing x-ngsi.type`);
      if (!ctxTerms[name] && !coreTerms.has(name)) fail(`${where}/context.jsonld`, `does not define attribute "${name}" used by ${model.type}`);
      if (!model.catalog?.attributes?.[name]?.ja || !model.catalog?.attributes?.[name]?.en) fail(`${mwhere}/catalog.yaml`, `${name}: needs ja and en descriptions`);
    }
    for (const name of Object.keys(model.catalog?.attributes ?? {})) {
      if (!schema.properties?.[name]) fail(`${mwhere}/catalog.yaml`, `${name}: not in schema.json`);
    }

    let validate;
    try { validate = ajv.compile(schema); } catch (e) { fail(`${mwhere}/schema.json`, `does not compile: ${e.message}`); continue; }

    const kv = model.examples['example.json'];
    if (!kv) fail(mwhere, 'examples/example.json is required');
    else if (!validate(kv)) fail(`${mwhere}/examples/example.json`, ajv.errorsText(validate.errors));

    const norm = model.examples['example-normalized.jsonld'];
    if (!norm) { fail(mwhere, 'examples/example-normalized.jsonld is required'); continue; }
    let projected;
    try { projected = toKeyValues(norm); } catch (e) { fail(`${mwhere}/examples/example-normalized.jsonld`, e.message); continue; }
    if (!validate(projected)) fail(`${mwhere}/examples/example-normalized.jsonld`, `key-values projection: ${ajv.errorsText(validate.errors)}`);
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
      for (const k of Object.keys(norm)) if (k !== '@context' && !(k in compacted)) fail(`${mwhere}/examples/example-normalized.jsonld`, `"${k}" lost in expand/compact round-trip`);
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
