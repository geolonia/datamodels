// Extension of a catalog model with attributes of your own: the files the
// extension builder (site/.vitepress/theme/ExtensionBuilder.vue) shows. Pure
// functions without Node imports, so the browser and the tests run the same code.
//
// The output follows the profile pattern of /guide/extend, one level down: a
// context that imports the catalog context and defines only your terms, and a
// JSON Schema with the catalog attributes plus yours. The catalog schemas are
// closed (additionalProperties: false), so a schema that only references them
// (allOf + $ref) would reject every added attribute; the builder therefore
// starts from the exact published version and says which one (x-extends).

import { NGSI_TYPES } from './ngsi.mjs';

const TERM = /^[a-z][A-Za-z0-9]*$/;
const PREFIX = /^[a-z][a-z0-9-]*$/;
const VALUE_TYPES = ['string', 'number', 'integer', 'boolean', 'object', 'array'];
const FORMATS = ['', 'date-time', 'date', 'uri'];
/** A JsonProperty holds a JSON object or a list of them (NGSI-LD 1.8). */
const JSON_TYPES = ['object', 'array'];

/**
 * @param {object} model   { type, schema, schemaExact, contextAlias, geometrySchema, attributes: string[],
 *                           contextTerms: string[] (every term the subject context defines, imports included) }
 * @param {object} input   { prefix, base, attributes: [{ name, ngsiType, valueType, format, required, description }] }
 * @param {Set<string>} coreTerms  terms of the NGSI-LD core context (protected)
 * @returns {{ problems: {code: string, name?: string}[], context: object|null, schema: object|null }}
 */
export function buildExtension(model, input, coreTerms) {
  const problems = [];
  const prefix = (input.prefix ?? '').trim();
  const base = (input.base ?? '').trim();
  if (!PREFIX.test(prefix)) problems.push({ code: 'prefix' });
  else if (coreTerms.has(prefix) || prefix === 'ngsi-ld') problems.push({ code: 'prefixReserved', name: prefix });
  // The inline context sits after the catalog context, so any term it defines
  // wins: a prefix or attribute named like a catalog term would redefine it.
  else if ((model.contextTerms ?? []).includes(prefix)) problems.push({ code: 'prefixInContext', name: prefix });
  let baseOk = false;
  let host = '';
  try {
    const u = new URL(base);
    host = u.hostname; // the URL parser lower-cases it: DataModels.JP is datamodels.jp
    baseOk = (u.protocol === 'https:' || u.protocol === 'http:') && host !== '' && /[/#]$/.test(base);
  } catch { /* reported below */ }
  // datamodels.jp and its subdomains belong to the catalog, uri.etsi.org to NGSI-LD.
  const taken = (h) => h === 'datamodels.jp' || h.endsWith('.datamodels.jp') || h === 'uri.etsi.org';
  if (!baseOk) problems.push({ code: 'base' });
  else if (taken(host)) problems.push({ code: 'baseTaken' });

  const own = new Set(model.attributes);
  const contextTerms = new Set(model.contextTerms ?? []);
  const seen = new Set();
  const attrs = (input.attributes ?? []).map((a) => ({ ...a, name: (a.name ?? '').trim() })).filter((a) => a.name !== '');
  if (!attrs.length) problems.push({ code: 'none' });
  for (const a of attrs) {
    if (!TERM.test(a.name)) problems.push({ code: 'name', name: a.name });
    else if (own.has(a.name)) problems.push({ code: 'inModel', name: a.name });
    else if (coreTerms.has(a.name) || a.name === prefix) problems.push({ code: 'reserved', name: a.name });
    else if (contextTerms.has(a.name)) problems.push({ code: 'inContext', name: a.name });
    else if (seen.has(a.name)) problems.push({ code: 'duplicate', name: a.name });
    seen.add(a.name);
    if (a.ngsiType === 'Property' && !VALUE_TYPES.includes(a.valueType)) problems.push({ code: 'valueType', name: a.name });
    if (a.ngsiType === 'Property' && a.valueType === 'string' && !FORMATS.includes(a.format ?? '')) problems.push({ code: 'format', name: a.name });
    if (a.ngsiType === 'JsonProperty' && !JSON_TYPES.includes(a.valueType)) problems.push({ code: 'valueType', name: a.name });
    if (!NGSI_TYPES.includes(a.ngsiType)) problems.push({ code: 'ngsiType', name: a.name });
  }
  if (problems.length) return { problems, context: null, schema: null };

  const context = { '@context': [model.contextAlias, { [prefix]: base, ...Object.fromEntries(attrs.map((a) => [a.name, `${prefix}:${a.name}`])) }] };

  const schema = structuredClone(model.schema);
  const origin = new URL(base).origin;
  schema.$id = `${origin}/schema/${prefix}/${model.type}.json`;
  schema.title = `${model.type} (${prefix})`;
  schema['x-extends'] = model.schemaExact;
  delete schema['x-version'];
  schema.properties = { ...schema.properties };
  for (const a of attrs) {
    const ngsi = { type: a.ngsiType };
    const p = a.ngsiType === 'Relationship' ? { type: 'string', format: 'uri' }
      : a.ngsiType === 'GeoProperty' ? { $ref: model.geometrySchema }
        : a.ngsiType === 'VocabProperty' ? { type: 'string' }
        : a.ngsiType === 'JsonProperty' ? (a.valueType === 'array' ? { type: 'array', items: { type: 'object' } } : { type: 'object' })
        : { type: a.valueType, ...(a.valueType === 'string' && a.format ? { format: a.format } : {}) };
    if (a.description?.trim()) p.description = a.description.trim();
    schema.properties[a.name] = { ...p, 'x-ngsi': ngsi, 'x-iri': `${base}${a.name}` };
  }
  const required = attrs.filter((a) => a.required).map((a) => a.name);
  if (required.length) schema.required = [...(schema.required ?? []), ...required];
  return { problems, context, schema };
}

/** The model proposal form, pre-filled with the attributes (for attributes that may belong in the catalog). */
export function proposalUrl(model, attributes) {
  // Only what the schema uses: a format left over from an earlier value type is not part of it.
  const shape = (a) => (a.ngsiType === 'Property' ? ` (${a.valueType}${a.valueType === 'string' && a.format ? `, ${a.format}` : ''})`
    : a.ngsiType === 'JsonProperty' ? ` (${a.valueType})` : '');
  const list = attributes.filter((a) => a.name?.trim()).map((a) => `- \`${a.name.trim()}\`: ${a.ngsiType}${shape(a)}${a.required ? ', required' : ''}${a.description?.trim() ? ` — ${a.description.trim()}` : ''}`).join('\n');
  const q = new URLSearchParams({ template: 'model-proposal.yml', title: `${model.type}: ${attributes.filter((a) => a.name?.trim()).map((a) => a.name.trim()).join(', ')}`, what: `Attributes for ${model.type}:\n\n${list}` });
  return `https://github.com/geolonia/datamodels/issues/new?${q}`;
}
