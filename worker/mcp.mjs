// The MCP server at https://datamodels.jp/mcp (#223): four read-only tools for
// AI agents, over MCP's Streamable HTTP transport. Stateless and without
// login: each request gets a fresh server from the factory, and nothing is
// kept between requests except the catalog files, which are public.
//
// The tools read only the built tree, through the assets binding: the lookup
// index (dist/mcp/index.json, scripts/lib/mcp-index.mjs) and the published
// schemas and examples. Nothing is fetched from another site.
//
//   search_models   words (English or Japanese) -> the models that match
//   get_model       one model: schema with its $refs, @context, example, attributes, files
//   find_attribute  a name or a meaning -> attributes to reuse, with the models that use them
//   validate        an entity (key-values or normalized) against a model -> its problems
//
// Protocol: @modelcontextprotocol/server (the MCP SDK). Its createMcpHandler
// serves the 2026-07-28 revision and answers 2025-era clients statelessly.
// JSON Schema validation: @cfworker/json-schema, because Ajv compiles schemas
// with new Function, which Workers do not allow. The SDK uses the same library
// in Workers. The conversion between the two forms of an entity is the
// toolkit's (@geolonia/datamodels/ngsi), as in CI and on the model pages.
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import * as z from 'zod';
import { Validator } from '@cfworker/json-schema';
import { NGSI_TYPES, toKeyValues, unwrapKeyValues, dateFormats, typedDate } from '@geolonia/datamodels/ngsi';
// The search words and the ranking are the duplicate check's (#224), so both find the same models.
import { similarModels, words } from '../scripts/lib/similar.mjs';

export const MCP_PATH = '/mcp';
const BASE = 'https://datamodels.jp';
const INDEX_URL = `${BASE}/mcp/index.json`;
const ABOUT_URL = `${BASE}/en/ai`;
/** The largest request body accepted: far more than any real entity, small enough for the CPU limit. */
export const MAX_BODY_BYTES = 64 * 1024;
/** At most this many problems are listed; the count says how many there were. */
export const MAX_PROBLEMS = 20;
const MAX_TEXT = 200;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id, Mcp-Method, Mcp-Name, Last-Event-ID',
  'access-control-expose-headers': 'Mcp-Session-Id, MCP-Protocol-Version',
  'access-control-max-age': '86400',
};

const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const json = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data) }] });
const fail = (message) => ({ isError: true, content: [{ type: 'text', text: message }] });

// ---------------------------------------------------------------------------
// The catalog, read from the assets once per isolate (per assets binding, so
// tests with another tree get their own). A failed read is not kept.

const stores = new WeakMap();
function store(env) {
  let s = stores.get(env.ASSETS);
  if (!s) stores.set(env.ASSETS, (s = { index: null, schemas: new Map(), validators: new Map() }));
  return s;
}

async function asset(env, url) {
  const res = await env.ASSETS.fetch(new Request(url));
  if (!res.ok) throw new Error(`${url} is not published (${res.status})`);
  return res.json();
}

/** The index with what the lookups need: models by id, type and IRI; search entries with Maps. */
function prepare(raw) {
  const byId = new Map(); const byType = new Map(); const byIri = new Map();
  for (const m of raw.models) {
    byId.set(m.id.toLowerCase(), m);
    byIri.set(m.typeIri, m);
    const t = m.type.toLowerCase();
    byType.set(t, [...(byType.get(t) ?? []), m]);
  }
  const nodeByKey = new Map(raw.nodeModels.map((m) => [m.key, m]));
  const search = raw.search.map((e) => {
    const m = byId.get(e.key.toLowerCase()) ?? nodeByKey.get(e.key);
    return { key: e.key, type: m.type, model: m, node: !byId.has(e.key.toLowerCase()), terms: new Map(Object.entries(e.terms)) };
  });
  const attributes = raw.attributes.map((a) => ({ ...a, terms: new Map(Object.entries(a.terms)) }));
  return { ...raw, byId, byType, byIri, search, attributes };
}

function catalog(env) {
  const s = store(env);
  s.index ??= asset(env, INDEX_URL).then(prepare).catch((e) => { s.index = null; throw e; });
  return s.index;
}

/** A published schema of the catalog, by its URL. */
function schema(env, url) {
  if (!url.startsWith(`${BASE}/schema/`)) return Promise.reject(new Error(`${url} is not a schema of the catalog`));
  const { schemas } = store(env);
  if (!schemas.has(url)) schemas.set(url, asset(env, url).catch((e) => { schemas.delete(url); throw e; }));
  return schemas.get(url);
}

/** The model a name stands for: "Task", "task/Task" or the type IRI. { model } or { error }. */
function findModel(cat, name) {
  const q = String(name).trim();
  const m = cat.byIri.get(q) ?? cat.byId.get(q.toLowerCase());
  if (m) return { model: m };
  const byType = cat.byType.get(q.toLowerCase()) ?? [];
  if (byType.length === 1) return { model: byType[0] };
  if (byType.length > 1) return { error: `"${q}" names several models: ${byType.map((x) => x.id).join(', ')}. Use "<subject>/<Type>".` };
  const close = similarModels(q, cat.search.filter((e) => !e.node), { limit: 3, min: 1 }).map((r) => r.entry.key);
  return { error: `No model "${q}" in the catalog.${close.length ? ` Did you mean ${close.join(', ')}?` : ''} Use search_models to find one.` };
}

/**
 * The model's schema as one self-contained JSON Schema 2020-12 document: the
 * catalog schemas it refers to are embedded under $defs with their own $id
 * (bundling, JSON Schema 2020-12 section 9.3), so the $refs resolve as they are.
 */
async function bundled(env, m) {
  const [root, ...refs] = await Promise.all([schema(env, m.schemaUrl), ...m.refs.map((u) => schema(env, u))]);
  if (!refs.length) return { root, refs, bundle: root };
  const defs = { ...(root.$defs ?? {}) };
  for (const r of refs) defs[new URL(r.$id).pathname.replace(/^\/schema\//, '').replace(/\.json$/, '').replaceAll('/', '.')] = r;
  return { root, refs, bundle: { ...root, $defs: defs } };
}

// ---------------------------------------------------------------------------
// The tools.

const summary = (m) => ({ model: m.id, type: m.type, subject: m.subject, kind: m.kind, status: m.status, version: m.version, title: m.title, description: m.description, pageUrl: m.pageUrlEn, pageUrlJa: m.pageUrl });
const nodeSummary = (m) => ({
  source: 'node', site: m.site, siteUrl: m.siteUrl, type: m.type, title: m.title, status: m.status, pageUrl: m.pageUrl, typeIri: m.typeIri,
  ...(m.aliasOf ? { aliasOf: m.aliasOf } : {}), ...(m.subClassOf ? { subClassOf: m.subClassOf } : {}), ...(m.extends ? { extends: m.extends } : {}),
});

export async function searchModels(env, { query, limit = 10, include_nodes = true }) {
  const cat = await catalog(env);
  if (query.trim() === '*') return { results: cat.models.map((m) => ({ model: m.id, kind: m.kind, status: m.status, title: m.title })) };
  const entries = include_nodes ? cat.search : cat.search.filter((e) => !e.node);
  const found = similarModels(query, entries, { limit, min: 1 });
  const results = found.map((r) => ({ ...(r.entry.node ? nodeSummary(r.entry.model) : summary(r.entry.model)), matched: r.matched }));
  return results.length ? { results } : { results, note: 'No model matched. Try other words (English or Japanese), or "*" to list every model.' };
}

export async function getModel(env, { model, example = 'key-values', include_schema = true }) {
  const cat = await catalog(env);
  const found = findModel(cat, model);
  if (found.error) return { error: found.error };
  const m = found.model;
  const out = {
    ...summary(m), typeIri: m.typeIri,
    ...(m.aliasOf ? { aliasOf: m.aliasOf } : {}), ...(m.subClassOf ? { subClassOf: m.subClassOf } : {}),
    contextUrl: m.contextUrl, contextExactUrl: m.contextExactUrl, schemaUrl: m.schemaUrl, vocabularyUrl: m.vocabularyUrl,
    attributes: m.attributes, exampleUrls: m.exampleUrls, mappings: m.mappings, adapters: m.adapters,
  };
  if (example !== 'none') {
    const file = example === 'normalized' ? 'example-normalized.jsonld' : 'example.json';
    const url = m.exampleUrls.find((u) => u.endsWith(`/${file}`));
    if (url) out.example = { form: example, url, data: await asset(env, url) };
    else out.example = { form: example, note: `${m.id} has no ${example} example${m.kind === 'value' ? ' (a value type has only the key-values form)' : ''}` };
  }
  if (include_schema) out.schema = (await bundled(env, m)).bundle;
  return out;
}

export async function findAttribute(env, { query, limit = 10 }) {
  const cat = await catalog(env);
  const q = query.trim();
  const lower = q.toLowerCase();
  const asked = [...words(q)];
  const df = new Map();
  for (const a of cat.attributes) for (const w of a.terms.keys()) df.set(w, (df.get(w) ?? 0) + 1);
  const n = cat.attributes.length || 1;
  const scored = cat.attributes.map((a) => {
    const name = a.name.toLowerCase();
    let score = name === lower || a.iri === q ? 100 : name.length > 2 && lower.length > 2 && (name.includes(lower) || lower.includes(name)) ? 10 : 0;
    const matched = [];
    for (const w of asked) {
      const weight = a.terms.get(w);
      if (!weight) continue;
      score += weight * (1 + Math.log(n / df.get(w)));
      matched.push(w);
    }
    return { a, score, matched };
  }).filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score || y.a.models.length - x.a.models.length || x.a.name.localeCompare(y.a.name))
    .slice(0, limit);
  const results = scored.map(({ a, matched }) => ({
    name: a.name, ...(a.iri ? { iri: a.iri } : {}), ...(a.ngsiType ? { ngsiType: a.ngsiType } : {}), ...(a.type ? { type: a.type } : {}),
    description: a.description, models: a.models, ...(a.nodeModels ? { nodeModels: a.nodeModels } : {}), ...(matched.length ? { matched } : {}),
  }));
  return results.length ? { results } : { results, note: 'No attribute matched. Try another name, or the meaning in English or Japanese.' };
}

/** The polygon rings that do not close (RFC 7946); JSON Schema cannot check it. As in the toolkit's check. */
function unclosedRings(value, path = '') {
  const out = [];
  const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
  const closes = (ring) => !Array.isArray(ring) || ring.length === 0 || same(ring[0], ring.at(-1));
  const walk = (v, p) => {
    if (Array.isArray(v)) { v.forEach((e, i) => walk(e, `${p}/${i}`)); return; }
    if (!isObject(v)) return;
    if (v.type === 'Polygon' && Array.isArray(v.coordinates)) v.coordinates.forEach((ring, i) => { if (!closes(ring)) out.push(`${p}/coordinates/${i}`); });
    else if (v.type === 'MultiPolygon' && Array.isArray(v.coordinates)) v.coordinates.forEach((poly, i) => (Array.isArray(poly) ? poly : []).forEach((ring, j) => { if (!closes(ring)) out.push(`${p}/coordinates/${i}/${j}`); }));
    for (const [k, vv] of Object.entries(v)) walk(vv, `${p}/${k}`);
  };
  walk(value, path);
  return out;
}

/** True when an entity is in the normalized form: an attribute is an NGSI-LD attribute object. */
function looksNormalized(entity) {
  return Object.entries(entity).some(([k, v]) => k !== 'id' && k !== 'type' && k !== '@context'
    && [v].flat().some((i) => isObject(i) && NGSI_TYPES.includes(i.type) && ['value', 'object', 'json', 'vocab'].some((p) => Object.hasOwn(i, p))));
}

// Errors that only say a part below had errors; the part below says what.
const WRAPPERS = new Set(['properties', '$ref', 'items', 'prefixItems', 'allOf', 'additionalItems', 'unevaluatedItems', 'contains']);
const EXTRA = /^Property "(.+)" does not match additional properties schema\.$/;

/**
 * The validator's errors as problems a reader can act on: { path, message }.
 * Only the errors that say what is wrong are kept, not those that say a part
 * below had errors. @cfworker/json-schema also reports a declared attribute
 * with a wrong value as an additional property ("additionalProperties": false
 * sees it as not evaluated); that report is dropped when the attribute has
 * errors of its own, and a real extra attribute is named as one.
 */
function readableErrors(errors) {
  const all = errors.map((e) => ({ path: e.instanceLocation.replace(/^#/, '') || '/', message: e.error, keyword: e.keyword }));
  const out = [];
  for (const e of all) {
    if (e.keyword === 'false') continue;
    const extra = e.keyword === 'additionalProperties' && EXTRA.exec(e.message);
    if (extra) {
      const path = `${e.path === '/' ? '' : e.path}/${extra[1]}`;
      const below = all.filter((x) => x.path === path && x.keyword !== 'false');
      if (!below.length) out.push({ path, message: `"${extra[1]}" is not an attribute here: the schema allows no other properties` });
      continue;
    }
    if (!WRAPPERS.has(e.keyword) && !/^A subschema had errors\.$/.test(e.message)) out.push(e);
  }
  return out.length ? out : all;
}

export async function validate(env, { model, entity, form }) {
  const cat = await catalog(env);
  const found = findModel(cat, model);
  if (found.error) return { error: found.error };
  const m = found.model;
  let data = entity;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { return { error: `entity is not valid JSON: ${e.message}` }; }
  }
  if (!isObject(data)) return { error: `entity must be one JSON object ({ ... }), got ${data === null ? 'null' : Array.isArray(data) ? 'an array' : typeof data}` };
  const usedForm = form ?? (looksNormalized(data) ? 'normalized' : 'key-values');
  if (usedForm === 'normalized' && m.kind === 'value') return { error: `${m.id} is a value type: it has only the key-values form` };
  const { root, refs } = await bundled(env, m);
  const problems = [];
  const answer = () => ({ model: m.id, version: m.version, form: usedForm, valid: problems.length === 0, problemCount: problems.length, problems: problems.slice(0, MAX_PROBLEMS) });

  let kv = data;
  if (usedForm === 'normalized') {
    // The same rules as CI (the toolkit's example check): the declared attribute types, x-ngsi.multi, typed dates.
    for (const [name, prop] of Object.entries(root.properties ?? {})) {
      if (name === 'id' || name === 'type' || name === '@context' || !Object.hasOwn(data, name)) continue;
      const ngsi = prop?.['x-ngsi'] ?? {};
      const declared = ngsi.type ?? 'Property';
      const instances = [data[name]].flat();
      if (Array.isArray(data[name]) && !ngsi.multi) problems.push({ path: `/${name}`, message: `has several instances, but the model does not declare it multi-valued` });
      for (const inst of instances) if (isObject(inst) && Object.hasOwn(inst, 'type') && inst.type !== declared) problems.push({ path: `/${name}`, message: `is a ${inst.type}, but the model makes it a ${declared}` });
      const formats = declared === 'Property' ? dateFormats(prop) : [];
      for (const inst of formats.length ? instances : []) {
        const v = inst?.value;
        const value = isObject(v) && Object.hasOwn(v, '@value') ? v['@value'] : v;
        const want = typedDate(value, formats);
        if (typeof value === 'string' && v?.['@type'] !== want['@type']) problems.push({ path: `/${name}`, message: `the value must be { "@type": "${want['@type']}", "@value": ${JSON.stringify(value)} }` });
      }
    }
    const multi = new Set(Object.entries(root.properties ?? {}).filter(([, p]) => p?.['x-ngsi']?.multi).map(([n]) => n));
    try { kv = toKeyValues(data, { multi }); } catch (e) { problems.push({ path: '/', message: e.message }); return answer(); }
  }
  let plain;
  try { plain = unwrapKeyValues(kv, root); } catch (e) { problems.push({ path: '/', message: e.message }); return answer(); }
  const { validators } = store(env);
  let validator = validators.get(m.id);
  if (!validator) {
    validator = new Validator(root, '2020-12', false);
    for (const r of refs) validator.addSchema(r);
    validators.set(m.id, validator);
  }
  const result = validator.validate(plain);
  if (!result.valid) {
    const seen = new Set();
    for (const { path, message } of readableErrors(result.errors)) {
      const key = `${path} ${message}`;
      if (!seen.has(key)) { seen.add(key); problems.push({ path, message }); }
    }
  }
  for (const p of unclosedRings(kv)) problems.push({ path: p, message: 'the polygon ring does not close: its first and last positions must be the same (RFC 7946)' });
  return answer();
}

// ---------------------------------------------------------------------------
// The server and the HTTP endpoint.

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const modelArg = z.string().min(1).max(MAX_TEXT).describe('The model: its type name ("Task"), "<subject>/<Type>" ("task/Task") or its type IRI.');

/** The tools of one server instance; `env` gives the assets. */
export function createServer(env) {
  const server = new McpServer(
    { name: 'datamodels.jp', title: 'datamodels.jp data models', version: '1.0.0', websiteUrl: ABOUT_URL },
    { instructions: 'Data models that work in Japan (JSON Schema, JSON-LD @context, NGSI-LD). Find a model with search_models, read it with get_model, reuse attribute names with find_attribute, and check data with validate. Every answer is JSON; URLs are on https://datamodels.jp.' },
  );
  const tool = (fn) => async (args) => {
    const out = await fn(env, args);
    return out?.error ? fail(out.error) : json(out);
  };
  server.registerTool('search_models', {
    title: 'Search the data models',
    description: 'Find data models by words in English or Japanese (a type name, a title, attribute names, a description). Returns the best matches with their titles, descriptions, status and page URLs, and models of other sites that build on the catalog ("source": "node"). Use "*" to list every model of the catalog.',
    inputSchema: z.object({
      query: z.string().min(1).max(MAX_TEXT).describe('Words to look for, for example "evacuation shelter", "避難所" or "Task"; "*" lists every model.'),
      limit: z.number().int().min(1).max(50).optional().describe('How many models at most (default 10).'),
      include_nodes: z.boolean().optional().describe('Also list models of other sites that build on the catalog (default true).'),
    }),
    annotations: READ_ONLY,
  }, tool(searchModels));
  server.registerTool('get_model', {
    title: 'Get one data model',
    description: 'One model of the catalog: its JSON Schema with the schemas it refers to included (one self-contained document), the @context URL to put in data, an example entity, every attribute with its IRI, type and description, and the URLs of its mapping files (field-by-field tables to other standards) and adapter files (CSV template, AI schema, PostgreSQL table, GeonicDB).',
    inputSchema: z.object({
      model: modelArg,
      example: z.enum(['key-values', 'normalized', 'none']).optional().describe('Which example to include: the plain JSON (key-values, default), the NGSI-LD normalized form, or none.'),
      include_schema: z.boolean().optional().describe('Include the JSON Schema (default true).'),
    }),
    annotations: READ_ONLY,
  }, tool(getModel));
  server.registerTool('find_attribute', {
    title: 'Find an attribute to reuse',
    description: 'Find existing attributes by name or by meaning (English or Japanese), to reuse a name and its IRI instead of making a new one. Returns the name, IRI, NGSI-LD type, JSON type, description and the models that use it.',
    inputSchema: z.object({
      query: z.string().min(1).max(MAX_TEXT).describe('An attribute name ("capacity") or what it means ("opening hours", "住所").'),
      limit: z.number().int().min(1).max(50).optional().describe('How many attributes at most (default 10).'),
    }),
    annotations: READ_ONLY,
  }, tool(findAttribute));
  server.registerTool('validate', {
    title: 'Validate an entity',
    description: `Check one entity against a model's JSON Schema, as the catalog's CI does. The entity may be plain JSON (key-values) or NGSI-LD normalized; the form is detected unless given. Returns valid true or false and the problems, each with its JSON path (at most ${MAX_PROBLEMS} listed). The request may be at most ${MAX_BODY_BYTES / 1024} KiB.`,
    inputSchema: z.object({
      model: modelArg,
      entity: z.union([z.looseObject({}).meta({ additionalProperties: true }), z.string()]).describe('The entity: a JSON object, or a string with the JSON text.'),
      form: z.enum(['key-values', 'normalized']).optional().describe('The form of the entity; detected when left out.'),
    }),
    annotations: READ_ONLY,
  }, tool(validate));
  return server;
}

const handlers = new WeakMap();
const jsonRpcError = (status, code, message, headers = {}) => Response.json({ jsonrpc: '2.0', error: { code, message }, id: null }, { status, headers: { ...CORS, ...headers } });

/** The body, or null when it is larger than `max` bytes (read as a stream, so a large body is never held). */
async function readBody(request, max) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel().catch(() => {}); return null; }
    chunks.push(value);
  }
  const out = new Uint8Array(size); let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.byteLength; }
  return out;
}

/** Answer one request to /mcp. */
export async function handleMcp(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') {
    return jsonRpcError(405, -32000, `Method not allowed. This is an MCP server (Streamable HTTP, stateless): send JSON-RPC messages with POST. About it: ${ABOUT_URL}`, { allow: 'POST, OPTIONS' });
  }
  const tooLarge = () => jsonRpcError(413, -32600, `The request is larger than ${MAX_BODY_BYTES} bytes.`);
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return tooLarge();
  try {
    const body = await readBody(request, MAX_BODY_BYTES);
    if (body === null) return tooLarge();
    let handler = handlers.get(env.ASSETS);
    if (!handler) handlers.set(env.ASSETS, (handler = createMcpHandler(() => createServer(env))));
    const res = await handler.fetch(new Request(request.url, { method: 'POST', headers: request.headers, body }));
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
    return out;
  } catch (e) {
    console.error('mcp:', e);
    return jsonRpcError(500, -32603, 'Internal error.');
  }
}
