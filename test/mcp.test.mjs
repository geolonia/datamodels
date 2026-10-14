// The MCP server at /mcp (worker/mcp.mjs, #223), on the machine files the build
// publishes: catalog.json, schemas, examples and the lookup index, written into
// a temporary folder with the build's own functions (no pages, no VitePress).
// The failure paths come first.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import worker from '../worker/index.mjs';
import { MAX_BODY_BYTES, MAX_PROBLEMS, MAX_KEYS, MAX_DEPTH, RATE_LIMIT } from '../worker/mcp.mjs';
import { readableErrors } from '../worker/validate.mjs';
import { loadSubjects, BASE_URL } from '../scripts/lib/models.mjs';
import { publishModels } from '../scripts/lib/publish.mjs';
import { readNodeList, readSnapshot } from '../scripts/lib/nodes.mjs';
import { discoverAdapters } from '../scripts/lib/adapters.mjs';
import { writeMcpIndex, schemaRefs } from '../scripts/lib/mcp-index.mjs';

let dir; let catalog; let index; let assetCalls = [];

/** The assets binding over the temporary tree: a file by its URL path, else 404. */
const assets = (root) => ({
  async fetch(input) {
    const { pathname } = new URL(typeof input === 'string' ? input : input.url);
    assetCalls.push(pathname);
    try { return new Response(await readFile(join(root, pathname)), { headers: { 'content-type': 'application/json' } }); } catch { return new Response('not found', { status: 404 }); }
  },
});
let env;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'datamodels-mcp-'));
  const subjects = await loadSubjects();
  ({ catalog } = await publishModels(subjects, await discoverAdapters(), { nodes: await readNodeList(), outDir: dir }));
  index = await writeMcpIndex(dir, catalog, await readSnapshot(), BASE_URL);
  env = { ASSETS: assets(dir) };
});
after(() => rm(dir, { recursive: true, force: true }));

const HEADERS = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
const send = (body, { method = 'POST', headers = HEADERS, path = '/mcp', e = env } = {}) => worker.fetch(new Request(`https://datamodels.jp${path}`, { method, headers, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) }), e);
/** The JSON-RPC message of a response, as JSON or as the one SSE event of a stateless answer. */
async function message(res) {
  const text = await res.text();
  if (!(res.headers.get('content-type') ?? '').includes('text/event-stream')) return JSON.parse(text);
  const data = text.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim());
  assert.equal(data.length, 1, text);
  return JSON.parse(data[0]);
}
let id = 0;
const rpc = async (method, params, e) => message(await send({ jsonrpc: '2.0', id: ++id, method, ...(params ? { params } : {}) }, { e }));
/** A tool call: { error } for a tool error, else the parsed JSON answer. */
async function call(name, args, e) {
  const m = await rpc('tools/call', { name, arguments: args }, e);
  if (m.error) return { rpcError: m.error };
  const text = m.result.content[0].text;
  return m.result.isError ? { error: text } : JSON.parse(text);
}

// --- HTTP: methods, sizes, bodies -----------------------------------------

test('GET, HEAD, PUT and DELETE get 405 with Allow; OPTIONS answers CORS', async () => {
  for (const method of ['GET', 'HEAD', 'PUT', 'DELETE']) {
    const r = await send(undefined, { method, headers: { accept: 'text/event-stream' } });
    assert.equal(r.status, 405, method);
    assert.equal(r.headers.get('allow'), 'POST, OPTIONS', method);
    assert.equal(r.headers.get('access-control-allow-origin'), '*', method);
    if (method !== 'HEAD') assert.match((await r.json()).error.message, /POST.*https:\/\/datamodels\.jp\/en\/ai/, method);
  }
  const r = await send(undefined, { method: 'OPTIONS', headers: { origin: 'https://example.org', 'access-control-request-method': 'POST' } });
  assert.equal(r.status, 204);
  assert.match(r.headers.get('access-control-allow-headers'), /MCP-Protocol-Version/);
});

test('a body that is not JSON is a parse error; another content type is refused; both carry CORS', async () => {
  let r = await send('{"jsonrpc": "2.0", "id": 1, "method": ');
  assert.equal(r.status, 400);
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
  assert.equal((await r.json()).error.code, -32700);
  r = await send('hello', { headers: { ...HEADERS, 'content-type': 'text/plain' } });
  assert.equal(r.status, 415);
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
});

test('a JSON-RPC batch is refused with 400 (MCP dropped batches in 2025-06-18)', async () => {
  const one = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_model', arguments: { model: 'Task' } } };
  for (const body of [JSON.stringify([one, { ...one, id: 2 }]), ` \n\t[${JSON.stringify(one)}]`]) {
    const r = await send(body);
    assert.equal(r.status, 400);
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    const m = await r.json();
    assert.equal(m.error.code, -32600);
    assert.match(m.error.message, /batches are not supported/);
  }
});

test('a client whose Accept lacks text/event-stream still gets its answer, not 406', async () => {
  for (const accept of ['*/*', 'application/json', 'text/event-stream', null]) {
    const headers = { 'content-type': 'application/json', ...(accept ? { accept } : {}) };
    const r = await send({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { headers });
    assert.equal(r.status, 200, String(accept));
    assert.equal((await message(r)).result.tools.length, 4, String(accept));
  }
});

test('the rate limit: 429 with Retry-After and CORS when the binding says no; no binding, no limit', async () => {
  const keys = [];
  const limiter = (success) => ({ async limit({ key }) { keys.push(key); return { success }; } });
  const list = (e, headers = HEADERS) => send({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { e, headers });
  let r = await list({ ...env, MCP_LIMITER: limiter(true) }, { ...HEADERS, 'cf-connecting-ip': '203.0.113.7' });
  assert.equal(r.status, 200);
  assert.deepEqual(keys, ['203.0.113.7'], 'keyed on the client address');
  r = await list({ ...env, MCP_LIMITER: limiter(false) });
  assert.equal(r.status, 429);
  assert.equal(r.headers.get('retry-after'), '60');
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
  const m = await r.json();
  assert.equal(m.jsonrpc, '2.0');
  assert.match(m.error.message, new RegExp(`at most ${RATE_LIMIT} a minute`));
  // Preflight and other paths are never counted.
  keys.length = 0;
  assert.equal((await send(undefined, { method: 'OPTIONS', e: { ...env, MCP_LIMITER: limiter(false) } })).status, 204);
  assert.equal((await send(undefined, { method: 'GET', path: '/mcp/index.json', e: { ...env, MCP_LIMITER: limiter(false) } })).status, 200);
  assert.deepEqual(keys, []);
  // A limiter that fails lets the request through; without the binding there is no limit.
  assert.equal((await list({ ...env, MCP_LIMITER: { limit: async () => { throw new Error('down'); } } })).status, 200);
  assert.equal((await list(env)).status, 200);
});

test(`a request over ${MAX_BODY_BYTES} bytes gets 413, with or without Content-Length`, async () => {
  const big = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'validate', arguments: { model: 'Task', entity: { id: 'urn:x', type: 'Task', name: 'x'.repeat(MAX_BODY_BYTES) } } } });
  let r = await send(big);
  assert.equal(r.status, 413);
  assert.equal((await r.json()).error.code, -32600);
  // Streamed, so no Content-Length: the limit holds while reading.
  const bytes = new TextEncoder().encode(big);
  const stream = new ReadableStream({ start(c) { for (let i = 0; i < bytes.length; i += 8192) c.enqueue(bytes.slice(i, i + 8192)); c.close(); } });
  r = await worker.fetch(new Request('https://datamodels.jp/mcp', { method: 'POST', headers: HEADERS, body: stream, duplex: 'half' }), env);
  assert.equal(r.status, 413);
  // A Content-Length over the limit is refused before the body is read.
  r = await send('{}', { headers: { ...HEADERS, 'content-length': String(MAX_BODY_BYTES + 1) } });
  assert.equal(r.status, 413);
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
  // Just under the limit is served.
  const ok = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'validate', arguments: { model: 'Task', entity: { id: 'urn:x', type: 'Task', name: 'x'.repeat(MAX_BODY_BYTES - 300) } } } });
  assert.ok(ok.length <= MAX_BODY_BYTES);
  const res = await send(ok);
  assert.equal(res.status, 200);
  assert.equal(JSON.parse((await message(res)).result.content[0].text).model, 'task/Task');
});

test('only /mcp itself runs the server: /mcp/, /mcpx and the index are plain assets (/ns/*: worker.test.mjs)', async () => {
  assetCalls = [];
  assert.equal((await send(undefined, { method: 'GET', path: '/mcp/' })).status, 404);
  assert.equal((await send(undefined, { method: 'GET', path: '/mcpx' })).status, 404);
  assert.deepEqual(assetCalls, ['/mcp/', '/mcpx']);
  // The published index is a plain file.
  assert.equal((await send(undefined, { method: 'GET', path: '/mcp/index.json' })).status, 200);
});

test('the index refuses a $ref to a schema the build did not publish', () => {
  const schema = { $id: `${BASE_URL}/schema/x/X/v1.0.0.json`, properties: { a: { $ref: `${BASE_URL}/schema/common/Nope/v1.0.0.json` } } };
  assert.throws(() => schemaRefs(schema, () => undefined, BASE_URL), /Nope.*not a schema of the catalog/);
  // Its own internal refs and other sites' are not followed.
  assert.deepEqual(schemaRefs({ $id: schema.$id, $defs: { p: {} }, properties: { a: { $ref: '#/$defs/p' }, b: { $ref: 'https://example.org/s.json' } } }, () => undefined, BASE_URL), []);
});

// --- Protocol errors and tool errors -------------------------------------

test('an unknown method, an unknown tool and bad arguments are errors, not crashes', async () => {
  assert.equal((await rpc('nope/nothing')).error.code, -32601);
  const unknown = await call('drop_table', {});
  assert.ok(unknown.rpcError || unknown.error, 'unknown tool');
  for (const [name, args] of [['search_models', {}], ['search_models', { query: 'x'.repeat(201) }], ['get_model', { model: 42 }], ['validate', { model: 'Task' }], ['search_models', { query: 'a', limit: 500 }]]) {
    const r = await call(name, args);
    assert.ok(r.rpcError || r.error, `${name} ${JSON.stringify(args)}`);
  }
});

test('an unknown model is a tool error that suggests close models', async () => {
  const r = await call('get_model', { model: 'Shelter' });
  assert.match(r.error, /No model "Shelter"/);
  assert.match(r.error, /disaster\/(DesignatedShelter|EvacuationShelter)/);
  assert.match((await call('validate', { model: 'Nope', entity: {} })).error, /No model "Nope"/);
});

test('validate: bad JSON, an array, or the normalized form of a value type are tool errors', async () => {
  assert.match((await call('validate', { model: 'Task', entity: '{"id": ' })).error, /not valid JSON/);
  assert.match((await call('validate', { model: 'Task', entity: '[1, 2]' })).error, /one JSON object.*an array/);
  assert.match((await call('validate', { model: 'common/Geometry', entity: { type: 'Point', coordinates: [139, 35] }, form: 'normalized' })).error, /value type/);
});

test('validate: an entity that does not fit gets valid false and its problems, each with a path', async () => {
  const kv = JSON.parse(await readFile(join(dir, 'examples/task/Task/example.json'), 'utf8'));
  let r = await call('validate', { model: 'Task', entity: { ...kv, progress: 'done-ish', colour: 'red' } });
  assert.equal(r.valid, false);
  assert.equal(r.form, 'key-values');
  assert.ok(r.problems.some((p) => p.path === '/progress'), JSON.stringify(r.problems));
  assert.ok(r.problems.some((p) => p.path === '/colour' && /not an attribute here/.test(p.message)), 'an extra attribute is named');
  assert.ok(!r.problems.some((p) => p.path === '/' || /False boolean schema/.test(p.message)), `a wrong value is not also reported as an extra attribute: ${JSON.stringify(r.problems)}`);
  assert.equal(r.problemCount, 2);
  assert.ok(!r.problems.some((p) => /A subschema had errors/.test(p.message)), 'only the problems that say what is wrong');
  // A polygon ring that does not close (JSON Schema cannot see it).
  r = await call('validate', { model: 'Task', entity: { ...kv, location: { type: 'Polygon', coordinates: [[[139, 35], [139.1, 35], [139.1, 35.1], [139, 35.05]]] } } });
  assert.ok(r.problems.some((p) => p.path === '/location/coordinates/0' && /does not close/.test(p.message)), JSON.stringify(r.problems));
  // Many problems: the count is complete, the list is capped.
  const broken = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`extra${i}`, i]));
  r = await call('validate', { model: 'Task', entity: { ...kv, ...broken } });
  assert.equal(r.problems.length, MAX_PROBLEMS);
  assert.ok(r.problemCount >= 40);
});

test('validate: a normalized entity is checked with the NGSI-LD rules too', async () => {
  const norm = JSON.parse(await readFile(join(dir, 'examples/task/Task/example-normalized.jsonld'), 'utf8'));
  const r = await call('validate', { model: 'Task', entity: { ...norm, name: { type: 'Relationship', object: 'urn:x' } } });
  assert.equal(r.form, 'normalized');
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => p.path === '/name' && /Relationship.*Property/.test(p.message)), JSON.stringify(r.problems));
  const notAttr = await call('validate', { model: 'Task', entity: { ...norm, name: 'plain' }, form: 'normalized' });
  assert.match(notAttr.problems[0].message, /not a normalized attribute object/);
});

test('when the index cannot be read, the tool says so, and the next call reads it again', async () => {
  let up = false;
  const flaky = { ASSETS: { fetch: (req) => (up ? assets(dir).fetch(req) : new Response('down', { status: 503 })) } };
  const down = await call('search_models', { query: 'task' }, flaky);
  assert.match(down.error ?? down.rpcError?.message, /index\.json is not published \(503\)/, JSON.stringify(down));
  up = true;
  assert.equal((await call('search_models', { query: 'task' }, flaky)).results[0].model, 'task/Task');
});

// --- The handshake and the tools -------------------------------------------

test('initialize names the server and offers tools; tools/list has the four read-only tools', async () => {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  assert.equal(init.result.serverInfo.name, 'datamodels.jp');
  assert.equal(init.result.capabilities.tools.listChanged, false, 'the tool list never changes');
  assert.equal(init.result.protocolVersion, '2025-06-18');
  assert.ok(init.result.capabilities.tools);
  assert.match(init.result.instructions, /search_models/);
  const { tools } = (await rpc('tools/list')).result;
  assert.deepEqual(tools.map((t) => t.name).sort(), ['find_attribute', 'get_model', 'search_models', 'validate']);
  for (const t of tools) {
    assert.equal(t.annotations.readOnlyHint, true, t.name);
    assert.equal(t.annotations.openWorldHint, false, t.name);
    assert.equal(t.inputSchema.type, 'object', t.name);
  }
});

test('search_models finds models by type name, English and Japanese words, and models of known nodes', async () => {
  let r = await call('search_models', { query: 'Task' });
  assert.equal(r.results[0].model, 'task/Task');
  assert.equal(r.results[0].pageUrl, 'https://datamodels.jp/en/models/task/Task/');
  r = await call('search_models', { query: '避難所', include_nodes: false });
  assert.ok(r.results.slice(0, 3).some((x) => x.model === 'disaster/DesignatedShelter'), JSON.stringify(r.results.map((x) => x.model)));
  r = await call('search_models', { query: 'public toilet' });
  assert.equal(r.results[0].model, 'facility/PublicToilet');
  r = await call('search_models', { query: 'address' });
  assert.ok(r.results.some((x) => x.model === 'common/JapaneseAddress'), 'value types are found too');
  const node = index.nodeModels[0];
  r = await call('search_models', { query: node.type, limit: 50 });
  assert.ok(r.results.some((x) => x.source === 'node' && x.pageUrl === node.pageUrl), 'a node model is found');
  r = await call('search_models', { query: node.type, limit: 50, include_nodes: false });
  assert.ok(!r.results.some((x) => x.source === 'node'));
  assert.equal((await call('search_models', { query: '*' })).results.length, catalog.models.length);
  r = await call('search_models', { query: 'zzzqqq' });
  assert.deepEqual(r.results, []);
  assert.match(r.note, /No model matched/);
  assert.equal((await call('search_models', { query: 'task', limit: 1 })).results.length, 1);
});

test('get_model: one self-contained schema that validates the example, the context, attributes and files', async () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false }); addFormats(ajv);
  for (const m of catalog.models) {
    const r = await call('get_model', { model: `${m.subject}/${m.type}` });
    assert.equal(r.model, `${m.subject}/${m.type}`);
    assert.equal(r.contextUrl, m.contextAliasUrl);
    assert.equal(r.schemaUrl, m.schemaUrl);
    assert.deepEqual(r.attributes.map((a) => a.name), m.attributes.map((a) => a.name));
    assert.ok(r.attributes.every((a) => a.description?.en), `${m.type}: every attribute has a description`);
    assert.deepEqual(r.mappings, m.mappings ?? []);
    assert.deepEqual(r.adapters, m.adapters ?? {});
    assert.equal(r.example.form, 'key-values');
    assert.deepEqual(r.example.data, JSON.parse(await readFile(join(dir, new URL(r.example.url).pathname), 'utf8')));
    // Bundled: Ajv resolves every $ref from the document alone, with no other schema added.
    const refs = schemaRefs(r.schema, () => ({}), BASE_URL);
    assert.equal(Object.values(r.schema.$defs ?? {}).filter((d) => d.$id).length, refs.length, `${m.type}: each referenced schema embedded once`);
    const validate = new Ajv2020({ allErrors: true, strict: false });
    addFormats(validate);
    const check = validate.compile(r.schema);
    const plain = Object.fromEntries(Object.entries(r.example.data).map(([k, v]) => [k, v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && ('json' in v || 'vocab' in v) ? Object.values(v)[0] : v]));
    assert.ok(check(plain), `${m.type}: ${validate.errorsText(check.errors)}`);
  }
  // By type name or IRI, without the schema, with the normalized example.
  const task = catalog.models.find((m) => m.type === 'Task');
  let r = await call('get_model', { model: task.typeIri, example: 'normalized', include_schema: false });
  assert.equal(r.model, 'task/Task');
  assert.equal(r.schema, undefined);
  assert.equal(r.example.form, 'normalized');
  assert.equal(r.example.data.name.type, 'Property');
  r = await call('get_model', { model: 'geometry', example: 'normalized' });
  assert.equal(r.model, 'common/Geometry');
  assert.match(r.example.note, /value type/);
  assert.equal((await call('get_model', { model: 'Task', example: 'none' })).example, undefined);
});

test('find_attribute finds a name exactly, an attribute by its meaning, and attributes that nodes add', async () => {
  let r = await call('find_attribute', { query: 'MAXCAPACITY' });
  assert.equal(r.results[0].name, 'maxCapacity', 'the exact name first, in any case');
  assert.ok(r.results[0].iri && r.results[0].ngsiType && r.results[0].models.length);
  r = await call('find_attribute', { query: 'capacity' });
  assert.equal(r.results[0].name, 'maxCapacity', 'a part of a name');
  r = await call('find_attribute', { query: 'https://uri.etsi.org/ngsi-ld/location' });
  assert.equal(r.results[0].name, 'location', 'by IRI');
  r = await call('find_attribute', { query: 'opening hours' });
  assert.ok(r.results.slice(0, 3).some((a) => /opening/i.test(a.name)), JSON.stringify(r.results.map((a) => a.name)));
  r = await call('find_attribute', { query: '所在地' });
  assert.equal(r.results[0].name, 'address', JSON.stringify(r.results.map((a) => a.name)));
  assert.ok(r.results[0].models.length > 1, 'with every model that uses it');
  r = await call('find_attribute', { query: '住所' });
  assert.equal(r.results[0].name, 'addressText', JSON.stringify(r.results.map((a) => a.name)));
  const added = index.attributes.find((a) => a.nodeModels);
  if (added) {
    r = await call('find_attribute', { query: added.name, limit: 50 });
    assert.ok(r.results.some((a) => a.iri === added.iri && a.nodeModels?.length), 'a node attribute is found');
  }
  r = await call('find_attribute', { query: 'zzzqqq' });
  assert.deepEqual(r.results, []);
});

test('validate: every published example is valid, in both forms, as CI says', async () => {
  for (const m of catalog.models) {
    for (const url of m.exampleUrls) {
      const entity = JSON.parse(await readFile(join(dir, new URL(url).pathname), 'utf8'));
      const r = await call('validate', { model: `${m.subject}/${m.type}`, entity });
      assert.equal(r.valid, true, `${url}: ${JSON.stringify(r.problems)}`);
      assert.equal(r.form, url.endsWith('normalized.jsonld') ? 'normalized' : 'key-values', url);
      assert.equal(r.version, m.version);
    }
  }
  // The entity may be sent as JSON text.
  const kv = await readFile(join(dir, 'examples/task/Task/example.json'), 'utf8');
  assert.equal((await call('validate', { model: 'Task', entity: kv })).valid, true);
});

test('validate agrees with Ajv, the validator CI uses, on broken copies of every example', async () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false }); addFormats(ajv);
  for (const m of catalog.models) {
    const schema = JSON.parse(await readFile(join(dir, new URL(m.schemaUrl).pathname), 'utf8'));
    for (const url of index.models.find((x) => x.id === `${m.subject}/${m.type}`).refs) if (!ajv.getSchema(url)) ajv.addSchema(JSON.parse(await readFile(join(dir, new URL(url).pathname), 'utf8')));
    const check = ajv.compile(schema);
    const kv = JSON.parse(await readFile(join(dir, new URL(m.exampleUrls.find((u) => u.endsWith('example.json'))).pathname), 'utf8'));
    const copies = [{ ...kv, notAnAttribute: 1 }, ...Object.keys(kv).filter((k) => k !== 'id' && k !== 'type').map((k) => ({ ...kv, [k]: k === 'location' ? { type: 'Point' } : 12345 }))];
    for (const entity of copies) {
      const r = await call('validate', { model: `${m.subject}/${m.type}`, entity, form: 'key-values' });
      if (r.error) continue; // a JsonProperty/VocabProperty without its wrapper: refused before the schema
      const plain = Object.fromEntries(Object.entries(entity).map(([k, v]) => [k, v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && ('json' in v || 'vocab' in v) ? Object.values(v)[0] : v]));
      const ringProblem = r.problems.some((p) => /does not close/.test(p.message));
      if (!ringProblem && !r.problems.some((p) => /\{"(json|vocab)"/.test(p.message))) assert.equal(r.valid, check(plain), `${m.type}: ${JSON.stringify(entity).slice(0, 200)}`);
    }
  }
});

// --- Review fixes: sizes, shapes, the 2026-07-28 revision, short queries ----

const MODERN_META = { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientInfo': { name: 'test', version: '1' }, 'io.modelcontextprotocol/clientCapabilities': {} };
const modern = (method, params = {}) => send({ jsonrpc: '2.0', id: ++id, method, params: { ...params, _meta: MODERN_META } }, { headers: { ...HEADERS, 'mcp-protocol-version': '2026-07-28', 'mcp-method': method } });

test('2026-07-28: discover says the tool list never changes, and subscriptions/listen is refused at once', async () => {
  const discover = await message(await modern('server/discover'));
  assert.equal(discover.result.capabilities.tools.listChanged, false);
  const res = await modern('subscriptions/listen', { notifications: { toolsListChanged: true } });
  assert.equal(res.headers.get('content-type'), 'application/json', 'an answer, not a stream left open');
  assert.equal((await res.json()).error.message, 'Subscription limit reached');
  assert.equal((await message(await modern('tools/list'))).result.tools.length, 4);
});

test(`validate refuses an object with more than ${MAX_KEYS} keys, at any depth, quickly`, async () => {
  const many = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, 1]));
  const base = { id: 'urn:ngsi-ld:Task:1', type: 'Task', name: 'x', progress: 'completed' };
  const t = process.cpuUsage();
  const r = await call('validate', { model: 'Task', entity: { ...base, ...many(6000) } });
  const cpu = process.cpuUsage(t);
  assert.match(r.error, /has 6004 keys; at most 1000/);
  assert.ok((cpu.user + cpu.system) / 1000 < 50, `took ${(cpu.user + cpu.system) / 1000} ms of CPU`);
  assert.match((await call('validate', { model: 'Task', entity: { ...base, address: many(MAX_KEYS + 1) } })).error, /\/address has 1001 keys/);
  // At the limit, each extra attribute is still named.
  const ok = await call('validate', { model: 'Task', entity: { ...base, ...many(MAX_KEYS - 4) } });
  assert.equal(ok.problemCount, MAX_KEYS - 4);
  assert.match(ok.problems[0].message, /is not an attribute here/);
});

test('readableErrors is linear in the number of errors, and its answer is the one the old lookup gave', () => {
  // What @cfworker/json-schema reports for n extra properties and one wrong value.
  const errors = (n) => [
    { instanceLocation: '#', keyword: 'properties', error: 'Property "progress" does not match schema.' },
    { instanceLocation: '#/progress', keyword: 'enum', error: 'Instance does not match any of ["completed"].' },
    { instanceLocation: '#', keyword: 'additionalProperties', error: 'Property "progress" does not match additional properties schema.' },
    { instanceLocation: '#/progress', keyword: 'false', error: 'False boolean schema.' },
    ...Array.from({ length: n }, (_, i) => [
      { instanceLocation: '#', keyword: 'additionalProperties', error: `Property "k${i}" does not match additional properties schema.` },
      { instanceLocation: `#/k${i}`, keyword: 'false', error: 'False boolean schema.' },
    ]).flat(),
  ];
  // The lookup before the fix (a filter over every error for each extra property).
  const before = (list) => {
    const all = list.map((e) => ({ path: e.instanceLocation.replace(/^#/, '') || '/', message: e.error, keyword: e.keyword }));
    const out = [];
    for (const e of all) {
      if (e.keyword === 'false') continue;
      const extra = e.keyword === 'additionalProperties' && /^Property "(.+)" does not match additional properties schema\.$/.exec(e.message);
      if (extra) {
        const path = `${e.path === '/' ? '' : e.path}/${extra[1]}`;
        if (!all.filter((x) => x.path === path && x.keyword !== 'false').length) out.push({ path, message: `"${extra[1]}" is not an attribute here: the schema allows no other properties` });
        continue;
      }
      if (!['properties', '$ref', 'items', 'prefixItems', 'allOf', 'additionalItems', 'unevaluatedItems', 'contains'].includes(e.keyword) && !/^A subschema had errors\.$/.test(e.message)) out.push(e);
    }
    return out;
  };
  assert.deepEqual(readableErrors(errors(300)), before(errors(300)));
  const big = errors(6000);
  const t = process.cpuUsage();
  const out = readableErrors(big);
  const cpu = process.cpuUsage(t);
  assert.equal(out.length, 6001);
  assert.ok((cpu.user + cpu.system) / 1000 < 50, `took ${(cpu.user + cpu.system) / 1000} ms of CPU`);
});

test(`validate refuses an entity nested deeper than ${MAX_DEPTH} levels, as an object or as JSON text`, async () => {
  let deep = 1; for (let i = 0; i < 200; i++) deep = { a: deep };
  const base = { id: 'urn:ngsi-ld:Task:1', type: 'Task', name: 'x', progress: 'completed' };
  assert.match((await call('validate', { model: 'Task', entity: { ...base, description: deep } })).error, /nested too deeply/);
  const text = `{"id":"urn:x","type":"Task","name":"x","description":${'{"a":'.repeat(5000)}1${'}'.repeat(5000)}}`;
  assert.match((await call('validate', { model: 'Task', entity: text })).error, /nested too deeply/);
});

test('an own "__proto__" key is reported, not dropped, in both forms', async () => {
  const kv = await readFile(join(dir, 'examples/task/Task/example.json'), 'utf8');
  const withProto = (json) => json.replace(/^\{/, '{"__proto__": {"polluted": true},');
  // Raw JSON-RPC text, so the key arrives as JSON.parse makes it: an own property.
  const callRaw = async (entityJson, form) => {
    const r = await send(`{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"validate","arguments":{"model":"Task","form":"${form}","entity":${entityJson}}}}`);
    return JSON.parse((await message(r)).result.content[0].text);
  };
  let r = await callRaw(withProto(kv), 'key-values');
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => p.path === '/__proto__'), JSON.stringify(r.problems));
  r = await call('validate', { model: 'Task', entity: withProto(kv) });
  assert.equal(r.valid, false, 'also as JSON text');
  const norm = await readFile(join(dir, 'examples/task/Task/example-normalized.jsonld'), 'utf8');
  r = await callRaw(withProto(norm), 'normalized');
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => p.path === '/__proto__' && /not an attribute of Task/.test(p.message)), JSON.stringify(r.problems));
  assert.equal({}.polluted, undefined);
});

test('a one-character Japanese word or a two-letter word is found in titles, names and descriptions', async () => {
  let r = await call('search_models', { query: '判' });
  assert.equal(r.results[0]?.model, 'decision/Decision', JSON.stringify(r));
  assert.deepEqual(r.results[0].matched, ['判']);
  r = await call('search_models', { query: 'ae' });
  assert.ok(r.results.some((x) => x.model === 'facility/AEDLocation'), JSON.stringify(r.results.map((x) => x.model)));
  r = await call('find_attribute', { query: '郵' });
  assert.ok(r.results.some((a) => a.name === 'postalCode'), JSON.stringify(r.results.map((a) => a.name)));
  assert.deepEqual((await call('search_models', { query: '鰻' })).results, []);
});

// --- Second review: uniqueItems, BOM, address keys, logging, date-time -------

const medical = async () => JSON.parse(await readFile(join(dir, 'examples/facility/MedicalInstitution/example.json'), 'utf8'));

test('uniqueItems: a 64 KiB array of distinct strings is checked in linear time', async () => {
  const ex = await medical();
  const items = []; for (let i = 0; JSON.stringify(items).length < MAX_BODY_BYTES - 2500; i++) items.push(`d${i}`);
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'validate', arguments: { model: 'MedicalInstitution', entity: { ...ex, medicalDepartments: items } } } });
  assert.ok(body.length <= MAX_BODY_BYTES && body.length > MAX_BODY_BYTES - 3000, `${body.length} bytes`);
  await send(body); // warm
  const t = process.cpuUsage();
  const r = JSON.parse((await message(await send(body))).result.content[0].text);
  const cpu = process.cpuUsage(t);
  assert.equal(r.valid, true, JSON.stringify(r.problems));
  assert.ok((cpu.user + cpu.system) / 1000 < 50, `took ${(cpu.user + cpu.system) / 1000} ms of CPU for ${items.length} items`);
  // One duplicate at the end is still found.
  const dup = await call('validate', { model: 'MedicalInstitution', entity: { ...ex, medicalDepartments: [...items.slice(0, 5000), 'd7'] } });
  assert.deepEqual(dup.problems, [{ path: '/medicalDepartments', message: 'Duplicate items at indexes 7 and 5000.' }]);
});

test('uniqueItems: duplicates are reported as the validator reported them, for strings, numbers, objects and arrays', async () => {
  const { Validator } = await import('@cfworker/json-schema');
  const ex = await medical();
  const schema = JSON.parse(await readFile(join(dir, new URL(catalog.models.find((m) => m.type === 'MedicalInstitution').schemaUrl).pathname), 'utf8'));
  const refs = await Promise.all(index.models.find((m) => m.type === 'MedicalInstitution').refs.map(async (u) => JSON.parse(await readFile(join(dir, new URL(u).pathname), 'utf8'))));
  // The validator with uniqueItems left in, as before: what it says about duplicates is the reference.
  const reference = new Validator(schema, '2020-12', false); for (const r of refs) reference.addSchema(r);
  const cases = [
    ['内科', '外科', '内科'],
    ['a', 'b', 'c', 'b', 'a'],
    [1, 2, 3, 2],
    [{ a: 1, b: 2 }, { b: 2, a: 1 }],
    [[1, 2], [2, 1], [1, 2]],
    [{ a: [1, { x: 1, y: 2 }] }, { a: [1, { y: 2, x: 1 }] }],
    ['1', 1],
    [],
  ];
  for (const items of cases) {
    const entity = { ...ex, medicalDepartments: items };
    const want = reference.validate(entity).errors.filter((e) => e.keyword === 'uniqueItems').map((e) => ({ path: e.instanceLocation.slice(1), message: e.error }));
    const r = await call('validate', { model: 'MedicalInstitution', entity, form: 'key-values' });
    assert.deepEqual(r.problems.filter((p) => /^Duplicate items/.test(p.message)), want, JSON.stringify(items));
  }
  // Inside a value type reached through $ref: OpeningHours.dayOfWeek in openingHoursSpecification.
  const hours = { ...ex.openingHoursSpecification, dayOfWeek: ['Monday', 'Tuesday', 'Monday'] };
  const r = await call('validate', { model: 'MedicalInstitution', entity: { ...ex, openingHoursSpecification: hours }, form: 'key-values' });
  assert.deepEqual(r.problems, [{ path: '/openingHoursSpecification/dayOfWeek', message: 'Duplicate items at indexes 0 and 2.' }]);
});

test('a byte order mark does not hide a batch, and a single message after one is served', async () => {
  const one = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
  let r = await send(`﻿${JSON.stringify([one, { ...one, id: 2 }])}`);
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error.code, -32600);
  r = await send(`﻿${JSON.stringify(one)}`);
  assert.equal(r.status, 200);
  assert.equal((await message(r)).result.tools.length, 4);
});

test('answers are plain JSON, whatever the client accepts', async () => {
  for (const accept of ['application/json', 'application/json, text/event-stream', '*/*']) {
    const r = await send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_models', arguments: { query: 'task', limit: 1 } } }, { headers: { 'content-type': 'application/json', accept } });
    assert.equal(r.status, 200, accept);
    assert.match(r.headers.get('content-type'), /^application\/json/, accept);
  }
});

test('the rate-limit key: IPv4 as it is, IPv6 by its /64, IPv4-mapped IPv6 as IPv4', async () => {
  const { limiterKey } = await import('../worker/limit.mjs');
  assert.equal(limiterKey('203.0.113.7'), '203.0.113.7');
  assert.equal(limiterKey('2001:0db8:85a3:0000:0000:8a2e:0370:7334'), '2001:db8:85a3:0::/64');
  assert.equal(limiterKey('2001:db8:85a3::8a2e:370:7334'), '2001:db8:85a3:0::/64');
  assert.equal(limiterKey('2001:DB8:85A3:0:ffff:1:2:3'), '2001:db8:85a3:0::/64', 'another address in the same /64');
  assert.equal(limiterKey('2001:db8::1'), '2001:db8:0:0::/64');
  assert.equal(limiterKey('::1'), '0:0:0:0::/64');
  assert.equal(limiterKey('fe80::1%eth0'), 'fe80:0:0:0::/64');
  assert.equal(limiterKey('::ffff:192.0.2.1'), '192.0.2.1');
  assert.equal(limiterKey('::ffff:c000:201'), '192.0.2.1');
  assert.equal(limiterKey(null), 'unknown');
  assert.equal(limiterKey(''), 'unknown');
  assert.equal(limiterKey('not:an::address::'), 'not:an::address::');
});

test('client mistakes are not logged; a real failure is logged once', async () => {
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.map(String).join(' '));
  try {
    await send('{"jsonrpc": "2.0", "id": 1, "method": ');
    await send({ hello: 'world' });
    await send({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { headers: { ...HEADERS, 'mcp-protocol-version': '2026-07-28' } });
    await send('x', { headers: { ...HEADERS, 'content-type': 'text/plain' } });
    await modern('subscriptions/listen', { notifications: { toolsListChanged: true } });
    await call('nope_tool', {});
    assert.deepEqual(logged, []);
    const down = { ASSETS: { fetch: async () => new Response('down', { status: 503 }) } };
    await call('search_models', { query: 'task' }, down);
    assert.equal(logged.length, 1, logged.join('\n'));
    assert.match(logged[0], /^mcp: search_models: .*index\.json is not published \(503\)/);
  } finally { console.error = original; }
});

test('date-time follows ajv-formats, as CI does: a leap second with an offset is accepted', async () => {
  const { dateTime } = await import('../worker/validate.mjs');
  const { fullFormats } = await import('ajv-formats/dist/formats.js');
  for (const s of ['2026-10-14T08:59:60-15:00', '2016-12-31T23:59:60Z', '2026-10-14T09:00:00+09:00', '2026-10-14T09:00:00', '2026-10-14T23:59:60+09:00', '2026-02-30T00:00:00Z', '2026-10-14t09:00:00.123z', '2026-10-14 09:00:00Z']) {
    assert.equal(dateTime(s), fullFormats['date-time'].validate(s), s);
  }
  const kv = JSON.parse(await readFile(join(dir, 'examples/task/Task/example.json'), 'utf8'));
  const r = await call('validate', { model: 'Task', entity: { ...kv, dateCreated: '2026-10-14T08:59:60-15:00' } });
  assert.equal(r.valid, true, JSON.stringify(r.problems));
});

test('a large wrong array lists its first problems quickly instead of every error', async () => {
  const task = { id: 'urn:ngsi-ld:Task:1', type: 'Task', name: 'x', progress: 'completed' };
  const coordinates = []; while (JSON.stringify(coordinates).length < MAX_BODY_BYTES - 1000) coordinates.push(7);
  const t = process.cpuUsage();
  const r = await call('validate', { model: 'Task', entity: { ...task, location: { type: 'Point', coordinates } } });
  const cpu = process.cpuUsage(t);
  assert.equal(r.valid, false);
  assert.ok(r.problems.length > 0 && r.problems.length <= MAX_PROBLEMS);
  assert.ok((cpu.user + cpu.system) / 1000 < 100, `took ${(cpu.user + cpu.system) / 1000} ms of CPU`);
});

// --- Third review: error caps, complete, conditional uniqueItems, queries ----

// The best of five runs: one garbage collection (counted in process CPU) must not fail a run on a busy CI machine.
const cpuOf = async (fn) => { let best = Infinity, out; for (let i = 0; i < 5; i++) { const t = process.cpuUsage(); out = await fn(); const d = process.cpuUsage(t); best = Math.min(best, (d.user + d.system) / 1000); } return [out, best]; };

test('invalid entities that make many validator errors stay cheap, and say they are not complete', async () => {
  const task = { id: 'urn:x', type: 'Task', name: 'x', progress: 'completed' };
  const cases = {
    'GeometryCollection of 4,990 empty members': { ...task, location: { type: 'GeometryCollection', geometries: Array.from({ length: 4990 }, () => ({})) } },
    'GeometryCollection of 990 empty members': { ...task, location: { type: 'GeometryCollection', geometries: Array.from({ length: 990 }, () => ({})) } },
    'GeometryCollection of 240 empty members (full check, error cap)': { ...task, location: { type: 'GeometryCollection', geometries: Array.from({ length: 240 }, () => ({})) } },
    'Point with 4,990 numbers': { ...task, location: { type: 'Point', coordinates: Array.from({ length: 4990 }, (_, i) => i % 10) } },
    'location without type, 4,990 empty arrays': { ...task, location: { coordinates: Array.from({ length: 4990 }, () => []) } },
  };
  for (const [name, entity] of Object.entries(cases)) {
    await call('validate', { model: 'Task', entity }); // warm
    const [r, ms] = await cpuOf(() => call('validate', { model: 'Task', entity }));
    assert.equal(r.valid, false, name);
    assert.equal(r.complete, false, name);
    assert.match(r.note, /stopped at the first problems/, name);
    assert.ok(r.problems.length > 0 && r.problemCount <= MAX_PROBLEMS * 2, `${name}: ${r.problemCount} problems`);
    // Before: 42-66 ms for the 4,990-value cases, 7-10 ms locally (52 ms on CI) for 990.
    assert.ok(ms < 25, `${name}: ${ms} ms of CPU`);
  }
});

test('complete is true for a valid entity and for a small invalid one, whose count is the total', async () => {
  const kv = JSON.parse(await readFile(join(dir, 'examples/task/Task/example.json'), 'utf8'));
  let r = await call('validate', { model: 'Task', entity: kv });
  assert.equal(r.complete, true);
  assert.equal(r.note, undefined);
  r = await call('validate', { model: 'Task', entity: { ...kv, progress: 'nope', colour: 1, size: 2 } });
  assert.equal(r.complete, true);
  assert.equal(r.problemCount, 3);
  // A valid Polygon of about 64 KiB: checked with the first-error validator, and still complete.
  const ring = Array.from({ length: 3800 }, (_, i) => [139 + (i % 100) / 1000, 35 + Math.floor(i / 100) / 1000]); ring.push(ring[0]);
  r = await call('validate', { model: 'Task', entity: { ...kv, location: { type: 'Polygon', coordinates: [ring] } } });
  assert.equal(r.valid, true, JSON.stringify(r.problems));
  assert.equal(r.complete, true);
});

test('uniqueItems on a node that is also reached through anyOf stays with the validator', async () => {
  const { prepareSchemas, makeChecker } = await import('../worker/validate.mjs');
  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'https://example.org/s.json', type: 'object',
    $defs: { tags: { type: 'array', uniqueItems: true }, only: { type: 'array', uniqueItems: true } },
    properties: {
      a: { $ref: '#/$defs/tags' },
      b: { anyOf: [{ $ref: '#/$defs/tags' }, { type: 'string' }] },
      c: { $ref: '#/$defs/only' },
    },
  };
  const prepared = prepareSchemas(schema, []);
  assert.equal(prepared.root.$defs.tags.uniqueItems, true, 'kept: also reached through anyOf');
  assert.equal(prepared.root.$defs.only.uniqueItems, undefined, 'stripped: reached only unconditionally');
  assert.equal(schema.$defs.only.uniqueItems, true, 'the published schema itself is not changed');
  const { problems } = makeChecker(schema, [])({ a: [1, 1], b: [2, 2], c: [3, 3] }, 10);
  const dups = problems.filter((p) => /^Duplicate items/.test(p.message)).map((p) => p.path).sort();
  assert.deepEqual(dups, ['/a', '/b', '/c']);
});

test('in every published schema, no stripped uniqueItems is reachable through a conditional keyword', async () => {
  const { prepareSchemas, conditionalNodes } = await import('../worker/validate.mjs');
  let stripped = 0;
  for (const m of index.models) {
    const read = async (u) => JSON.parse(await readFile(join(dir, new URL(u).pathname), 'utf8'));
    const prepared = prepareSchemas(await read(m.schemaUrl), await Promise.all(m.refs.map(read)));
    const conditional = conditionalNodes(prepared.root, prepared.resolve);
    for (const node of prepared.unique) assert.ok(!conditional.has(node), `${m.id}: a stripped node is reachable conditionally`);
    stripped += prepared.unique.size;
  }
  // medicalDepartments, hazardTypes, and OpeningHours.dayOfWeek in the four facility models and OpeningHours itself.
  assert.ok(stripped >= 3, `${stripped} nodes stripped`);
});

test('an empty query is refused; one hiragana or punctuation character does not match everything', async () => {
  for (const tool of ['search_models', 'find_attribute']) {
    for (const query of ['   ', '\t\n']) assert.match((await call(tool, { query })).error, /query is empty/, `${tool} ${JSON.stringify(query)}`);
    for (const query of ['の', '、', 'です', '!']) {
      const r = await call(tool, { query });
      assert.deepEqual(r.results, [], `${tool} ${query}`);
    }
  }
  // Spaces around a word do not matter.
  assert.equal((await call('search_models', { query: '  Task  ' })).results[0].model, 'task/Task');
  assert.equal((await call('search_models', { query: ' 判 ' })).results[0].model, 'decision/Decision');
  assert.equal((await call('search_models', { query: ' * ' })).results.length, catalog.models.length);
});
