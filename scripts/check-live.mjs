// Check the deployed site against the URL contract. Run after every deploy:
//   npm run check:live            (datamodels.jp)
//   npm run check:live -- https://preview.example   (another origin)
// Fails on the first contract violation. Needs network access only.
import jsonld from 'jsonld';
import { createHash } from 'node:crypto';
import { loadSubjects, subjectUrls, modelUrls, BASE_URL } from './lib/models.mjs';
import { listReleases } from './lib/releases.mjs';
import { exactCacheControl, isPrerelease, readManifest } from './lib/cache.mjs';
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
// "prerelease" in published-manifest.json (scripts/lib/cache.mjs), so run this
// from a checkout of the deployed commit.
const manifest = await readManifest();
const EXACT = exactCacheControl(manifest);
const RULE = `${isPrerelease(manifest) ? 'pre-release' : 'launched'} rule`;
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
// Served bytes of every recorded file must match the manifest. This
// is what makes an in-place correction of a published file verifiable: after a
// deploy, the CDN and the origin serve exactly what the repository says.
for (const [path, hash] of Object.entries(manifest.files)) {
  const url = `${origin}/${path}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) { failures.push(`${url}: ${res.status}`); continue; }
  const served = createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex');
  expect(served === hash, `${url}: served bytes differ from published-manifest.json (deploy not live yet, or a stale cache)`);
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

let firstAdapterUrl;
const r = await fetch(swap(`${BASE_URL}/catalog.json`));
expect(r.ok, `catalog.json: ${r.status}`);
if (r.ok) {
  const c = await r.json();
  expect(c.formatVersion === 1 && Array.isArray(c.models), 'catalog.json: unexpected shape');
  // Adapter files are listed per model in the catalog; each must be served as JSON.
  for (const m of c.models ?? []) for (const [name, url] of Object.entries(m.adapters ?? {})) {
    firstAdapterUrl ??= url;
    const ar = await head(url);
    expect(ar.status === 200 && h(ar, 'content-type').startsWith('application/json'), `${name} adapter ${url}: ${ar.status} ${h(ar, 'content-type')}`);
  }
  // A model page's Adapters row must land on its row on /adapters/ (the id exists there).
  const withAdapter = (c.models ?? []).find((m) => Object.keys(m.adapters ?? {}).length);
  expect(withAdapter?.pageUrl, 'catalog.json: no model lists an adapter, so the Adapters row cannot be checked');
  if (withAdapter?.pageUrl) {
    try {
      const [page, index] = await Promise.all([withAdapter.pageUrl, `${BASE_URL}/adapters/`].map(async (u) => { const res = await fetch(swap(u)); return res.ok ? res.text() : ''; }));
      const anchor = /href="\/adapters\/#([^"]+)"/.exec(page)?.[1];
      expect(anchor && index.includes(`id="${anchor}"`), `${withAdapter.pageUrl}: the Adapters row links /adapters/#${anchor ?? '(none)'}, which /adapters/ does not have`);
    } catch (e) { failures.push(`${withAdapter.pageUrl}: ${e.message}`); }
  }
  // The index pages of the adapters named in the catalog, in both languages.
  const names = [...new Set((c.models ?? []).flatMap((m) => Object.keys(m.adapters ?? {})))];
  for (const prefix of ['', '/en']) for (const path of ['/adapters/', ...names.map((n) => `/adapters/${n}/`)]) {
    const pr = await head(`${BASE_URL}${prefix}${path}`);
    expect(pr.status === 200 && h(pr, 'content-type').startsWith('text/html'), `${origin}${prefix}${path}: ${pr.status} ${h(pr, 'content-type')}`);
  }
}

// Machine clients: tools that fetch contexts with Python's urllib (rdflib and
// others) send "Python-urllib/3.x", which Cloudflare's Browser Integrity Check
// blocks by default (error 1010). A configuration rule on the datamodels.jp
// zone turns the check off for the machine-readable paths and /llms.txt; this
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
  ];
  for (const url of machinePaths) {
    try {
      const r = await fetch(swap(url), { headers: { 'user-agent': 'Python-urllib/3.13' }, redirect: 'manual' });
      expect(r.status === 200, `${swap(url)}: ${r.status} for user agent Python-urllib (Browser Integrity Check rule for machine-readable paths missing?)`);
    } catch (e) { failures.push(`${swap(url)}: ${e.message} for user agent Python-urllib`); }
  }
}

// A current release's files are also the exact versions checked above, so a failure can repeat.
const unique = [...new Set(failures)];
if (unique.length) { console.error(`Live check failed (${unique.length}) against ${origin}:`); for (const f of unique) console.error(`  ${f}`); process.exit(1); }
console.log(`live ok: ${origin}, ${subjects.reduce((a, s) => a + s.models.length, 0)} model(s), ${Object.keys(manifest.files).length} recorded file(s) match the manifest, exact versions cached as "${EXACT}" (${RULE})`);
