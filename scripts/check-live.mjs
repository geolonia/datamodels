// Check the deployed site against the URL contract. Run after every deploy:
//   npm run check:live            (datamodels.jp)
//   npm run check:live -- https://preview.example   (another origin)
// Fails on the first contract violation. Needs network access only.
import jsonld from 'jsonld';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { loadSubjects, subjectUrls, modelUrls, BASE_URL } from './lib/models.mjs';
import { listReleases } from './lib/releases.mjs';
import { exactCacheControl, isPrerelease } from './lib/cache.mjs';
import { CATALOG_LICENSE } from './lib/publish.mjs';

const origin = (process.argv[2] ?? BASE_URL).replace(/\/$/, '');
const swap = (url) => url.replace(BASE_URL, origin);
const failures = [];
const expect = (cond, msg) => { if (!cond) failures.push(msg); };
const head = async (url) => fetch(swap(url), { method: 'HEAD', redirect: 'manual' });
const h = (r, name) => r.headers.get(name) ?? '';
// Exact versions must carry exactly this value: a joined value such as
// "public, max-age=300, public, max-age=31536000, immutable" means the
// inherited short cache was not detached. Which value applies follows
// `prerelease` in node.yaml (scripts/lib/cache.mjs), so run this from a
// checkout of the deployed commit.
const EXACT = exactCacheControl();
const RULE = `${isPrerelease() ? 'pre-release' : 'launched'} rule`;
const isExactCache = (r) => h(r, 'cache-control').trim() === EXACT;
const exactCacheMessage = (url, r) => `${url}: cache-control "${h(r, 'cache-control')}" must be exactly "${EXACT}" (${RULE})`;

const loader = async (url) => {
  const r = await fetch(swap(url), { headers: { accept: 'application/ld+json, application/json' } });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return { documentUrl: url, document: await r.json() };
};

const subjects = await loadSubjects();
for (const subject of subjects) {
  const u = subjectUrls(subject);
  let r = await head(u.contextExact);
  expect(r.status === 200, `${u.contextExact}: ${r.status}`);
  expect(h(r, 'content-type').startsWith('application/ld+json'), `${u.contextExact}: content-type ${h(r, 'content-type')}`);
  expect(isExactCache(r), exactCacheMessage(u.contextExact, r));
  expect(h(r, 'access-control-allow-origin') === '*', `${u.contextExact}: missing CORS`);
  for (const release of await listReleases(subject)) {
    for (const f of release.files) { const rr = await head(f.url); expect(rr.status === 200, `${f.url}: released file ${rr.status}`); expect(isExactCache(rr), exactCacheMessage(f.url, rr)); }
  }
  r = await head(u.vocabExact);
  expect(r.status === 200 && h(r, 'content-type').startsWith('application/ld+json'), `${u.vocabExact}: ${r.status} ${h(r, 'content-type')}`);
  expect(isExactCache(r), exactCacheMessage(u.vocabExact, r));
  r = await head(u.contextAlias);
  expect(r.status === 200 && !/immutable/.test(h(r, 'cache-control')), `${u.contextAlias}: alias must not be immutable (${r.status}, ${h(r, 'cache-control')})`);
  r = await head(u.page); expect(r.status === 200, `${u.page}: ${r.status}`);

  for (const model of subject.models) {
    const mu = modelUrls(subject, model);
    r = await head(mu.schemaExact);
    expect(r.status === 200 && h(r, 'content-type').startsWith('application/schema+json'), `${mu.schemaExact}: ${r.status} ${h(r, 'content-type')}`);
    expect(isExactCache(r), exactCacheMessage(mu.schemaExact, r));
    // An alias (x-alias-of) shares the aliased type's IRI, which redirects to the owner's page; its own name has no IRI.
    if (mu.typeIri === `${BASE_URL}/ns/${subject.name}/${model.type}`) {
      r = await head(mu.typeIri);
      expect(r.status === 302 && h(r, 'location') === mu.page.replace(BASE_URL, ''), `${mu.typeIri}: ${r.status} -> ${h(r, 'location')}`);
      // A JSON-LD client gets the subject's vocabulary instead (#196); both answers vary by Accept.
      const vocab = u.vocabAlias.replace(BASE_URL, '');
      const ld = await fetch(swap(mu.typeIri), { method: 'HEAD', redirect: 'manual', headers: { accept: 'application/ld+json' } });
      expect(ld.status === 303 && h(ld, 'location') === vocab, `${mu.typeIri} (JSON-LD): ${ld.status} -> ${h(ld, 'location')}, expected 303 -> ${vocab}`);
      expect(/accept/i.test(h(r, 'vary')) && /accept/i.test(h(ld, 'vary')), `${mu.typeIri}: Vary must include Accept (${h(r, 'vary')} / ${h(ld, 'vary')})`);
    }
    r = await head(mu.page); expect(r.status === 200, `${mu.page}: ${r.status}`);
    // Value types have no adapter files and no normalized example of their own.
    if (model.kind === 'value') continue;

    const norm = model.examples['example-normalized.jsonld'];
    if (norm) {
      try {
        const expanded = await jsonld.expand(norm, { documentLoader: loader });
        expect(expanded[0]?.['@type']?.[0] === mu.typeIri, `${model.type}: live expansion gives type ${expanded[0]?.['@type']?.[0]}`);
      } catch (e) { failures.push(`${model.type}: live JSON-LD expansion failed: ${e.message}`); }
    }
  }
}
// Served bytes of every published version must match its release snapshot
// (models/<subject>/releases/). This is what makes an in-place correction of a
// published file verifiable: after a deploy, the CDN and the origin serve
// exactly what the repository says.
let recorded = 0;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
for (const subject of subjects) for (const release of await listReleases(subject)) for (const f of release.files) {
  recorded++;
  const res = await fetch(swap(f.url), { cache: 'no-store' });
  if (!res.ok) { failures.push(`${swap(f.url)}: ${res.status}`); continue; }
  expect(sha(Buffer.from(await res.arrayBuffer())) === sha(await readFile(f.path)), `${swap(f.url)}: served bytes differ from the release snapshot ${f.path} (deploy not live yet, or a stale cache)`);
}

// Indexes for search engines and AI tools.
for (const [path, type, marker] of [['/llms.txt', 'text/plain', '# datamodels.jp'], ['/sitemap.xml', 'application/xml', '<urlset'], ['/robots.txt', 'text/plain', 'Sitemap:']]) {
  try {
    const res = await fetch(`${origin}${path}`);
    const body = res.ok ? await res.text() : '';
    expect(res.ok && h(res, 'content-type').startsWith(type) && body.includes(marker), `${origin}${path}: ${res.status} ${h(res, 'content-type')}${res.ok ? `, or "${marker}" missing` : ''}`);
  } catch (e) { failures.push(`${origin}${path}: ${e.message}`); }
}

// The licence: x-license-url in every schema and licenseUrl in catalog.json name
// this URL, so it must answer itself (no redirect) with the page, in both
// languages; the raw file with the legal texts is /LICENSE-CONTENT.md.
const licenceEn = CATALOG_LICENSE.licenseUrl.replace(BASE_URL, `${BASE_URL}/en`);
for (const [url, type, marker] of [[CATALOG_LICENSE.licenseUrl, 'text/html', 'CC0 1.0'], [licenceEn, 'text/html', 'CC0 1.0'], [`${CATALOG_LICENSE.licenseUrl}.md`, 'text/plain', 'Creative Commons Attribution 4.0 International Public License']]) {
  try {
    const res = await fetch(swap(url), { redirect: 'manual' });
    const body = res.status === 200 ? await res.text() : '';
    expect(res.status === 200 && h(res, 'content-type').startsWith(type) && body.includes(marker), `${swap(url)}: ${res.status} ${h(res, 'content-type')}${res.status === 200 ? `, or "${marker}" missing` : ''}`);
  } catch (e) { failures.push(`${swap(url)}: ${e.message}`); }
}

let firstAdapterUrl, firstMappingUrl;
const r = await fetch(swap(`${BASE_URL}/catalog.json`));
expect(r.ok, `catalog.json: ${r.status}`);
if (r.ok) {
  const c = await r.json();
  expect(c.formatVersion === 1 && Array.isArray(c.models), 'catalog.json: unexpected shape');
  // Adapter files are listed per model in the catalog; each must be served with the type of its extension (public/_headers).
  const adapterType = (url) => (url.endsWith('.csv') ? 'text/csv' : url.endsWith('.sql') ? 'application/sql' : 'application/json');
  for (const m of c.models ?? []) for (const [name, url] of Object.entries(m.adapters ?? {})) {
    firstAdapterUrl ??= url;
    const ar = await head(url);
    expect(ar.status === 200 && h(ar, 'content-type').startsWith(adapterType(url)), `${name} adapter ${url}: ${ar.status} ${h(ar, 'content-type')}`);
  }
  // Mapping files are listed per model too; each must be served as YAML.
  for (const m of c.models ?? []) for (const url of m.mappingUrls ?? []) {
    firstMappingUrl ??= url;
    const mr = await head(url);
    expect(mr.status === 200 && h(mr, 'content-type').startsWith('application/yaml'), `mapping ${url}: ${mr.status} ${h(mr, 'content-type')}`);
  }
  expect(firstMappingUrl, 'catalog.json: no model lists a mapping file');
  // A model page's links to /adapters/ (the Download row, the Adapters sentence) must land on a section there.
  const withAdapter = (c.models ?? []).find((m) => Object.keys(m.adapters ?? {}).length);
  expect(withAdapter?.pageUrl, 'catalog.json: no model lists an adapter, so its links to /adapters/ cannot be checked');
  if (withAdapter?.pageUrl) {
    try {
      const [page, index] = await Promise.all([withAdapter.pageUrl, `${BASE_URL}/adapters/`].map(async (u) => { const res = await fetch(swap(u)); return res.ok ? res.text() : ''; }));
      const anchors = [...page.matchAll(/href="\/adapters\/#([^"]+)"/g)].map((m) => m[1]);
      expect(anchors.length, `${withAdapter.pageUrl}: no link to /adapters/`);
      for (const anchor of anchors) expect(index.includes(`id="${anchor}"`), `${withAdapter.pageUrl}: links /adapters/#${anchor}, which /adapters/ does not have`);
    } catch (e) { failures.push(`${withAdapter.pageUrl}: ${e.message}`); }
  }
  // /adapters/ and each adapter's section there, in both languages: a product adapter keeps its list by
  // model at /adapters/<name>/; the list of a generic one redirects to its section (public/_redirects).
  const names = [...new Set((c.models ?? []).flatMap((m) => Object.keys(m.adapters ?? {})))];
  for (const prefix of ['', '/en']) {
    const pr = await head(`${BASE_URL}${prefix}/adapters/`);
    expect(pr.status === 200 && h(pr, 'content-type').startsWith('text/html'), `${origin}${prefix}/adapters/: ${pr.status} ${h(pr, 'content-type')}`);
    for (const n of names) {
      const r = await head(`${BASE_URL}${prefix}/adapters/${n}/`);
      const ok = (r.status === 200 && h(r, 'content-type').startsWith('text/html')) || (r.status === 301 && h(r, 'location').endsWith(`${prefix}/adapters/#${n}`));
      expect(ok, `${origin}${prefix}/adapters/${n}/: ${r.status} ${h(r, 'content-type')} ${h(r, 'location')}`);
    }
  }
}

// The MCP server (/mcp, worker/mcp.mjs): the handshake and the four tools, on
// every origin, previews included (they run the same Worker). Two requests, and
// a third on datamodels.jp below (Python-urllib), of the 100 a minute the rate
// limit allows.
const MCP_TOOLS = ['find_attribute', 'get_model', 'search_models', 'validate'];
const mcp = (body, headers = {}) => fetch(`${origin}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers }, body: JSON.stringify(body) });
/** The JSON-RPC answer, sent as JSON or as one SSE event. */
const mcpMessage = async (res) => {
  const text = await res.text();
  return JSON.parse((res.headers.get('content-type') ?? '').includes('text/event-stream') ? text.split('\n').find((l) => l.startsWith('data:')).slice(5) : text);
};
try {
  const init = await mcp({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'check-live', version: '1' } } });
  const serverName = init.ok ? (await mcpMessage(init)).result?.serverInfo?.name : undefined;
  expect(serverName === 'datamodels.jp', `${origin}/mcp: initialize ${init.status}, server ${serverName}`);
  const list = await mcp({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  const tools = list.ok ? ((await mcpMessage(list)).result?.tools ?? []).map((t) => t.name).sort() : [];
  expect(JSON.stringify(tools) === JSON.stringify(MCP_TOOLS), `${origin}/mcp: tools/list ${list.status}, tools ${tools.join(', ') || 'none'}, expected ${MCP_TOOLS.join(', ')}`);
} catch (e) { failures.push(`${origin}/mcp: ${e.message}`); }

// Machine clients: tools that fetch contexts with Python's urllib (rdflib and
// others) send "Python-urllib/3.x", which Cloudflare's Browser Integrity Check
// blocks by default (error 1010). A configuration rule on the datamodels.jp
// zone turns the check off for the machine-readable paths, /llms.txt and /mcp; this
// catches it if that rule goes missing. Other origins (workers.dev previews)
// keep Cloudflare's default and are skipped unless CHECK_MACHINE_UA=1.
if (origin === BASE_URL || process.env.CHECK_MACHINE_UA === '1') {
  const first = subjects.find((s) => s.models.some((m) => m.kind === 'entity'));
  const entity = first.models.find((m) => m.kind === 'entity');
  const machinePaths = [
    subjectUrls(first).contextExact, subjectUrls(first).contextAlias, subjectUrls(first).vocabExact,
    modelUrls(first, entity).schemaExact, `${modelUrls(first, entity).examples}example.json`,
    `${BASE_URL}/catalog.json`,
    `${BASE_URL}/llms.txt`,
    // One adapter file, as listed in the live catalog (the core does not name adapters).
    ...(firstAdapterUrl ? [firstAdapterUrl] : []),
    // One mapping file, as listed in the live catalog.
    ...(firstMappingUrl ? [firstMappingUrl] : []),
  ];
  for (const url of machinePaths) {
    try {
      const r = await fetch(swap(url), { headers: { 'user-agent': 'Python-urllib/3.13' }, redirect: 'manual' });
      expect(r.status === 200, `${swap(url)}: ${r.status} for user agent Python-urllib (Browser Integrity Check rule for machine-readable paths missing?)`);
    } catch (e) { failures.push(`${swap(url)}: ${e.message} for user agent Python-urllib`); }
  }
  // MCP clients written in Python (the official Python SDK uses httpx; others use urllib) pass the same rule.
  try {
    const r = await mcp({ jsonrpc: '2.0', id: 3, method: 'tools/list' }, { 'user-agent': 'Python-urllib/3.13' });
    expect(r.status === 200, `${origin}/mcp: ${r.status} for user agent Python-urllib (is /mcp in the Browser Integrity Check rule? docs/deployment.md)`);
  } catch (e) { failures.push(`${origin}/mcp: ${e.message} for user agent Python-urllib`); }
}

// A current release's files are also the exact versions checked above, so a failure can repeat.
const unique = [...new Set(failures)];
if (unique.length) { console.error(`Live check failed (${unique.length}) against ${origin}:`); for (const f of unique) console.error(`  ${f}`); process.exit(1); }
console.log(`live ok: ${origin}, ${subjects.reduce((a, s) => a + s.models.length, 0)} model(s), ${recorded} published file(s) match their release snapshots, exact versions cached as "${EXACT}" (${RULE})`);
