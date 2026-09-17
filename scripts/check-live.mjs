// Check the deployed site against the URL contract. Run after every deploy:
//   npm run check:live            (models.geonicdb.com)
//   npm run check:live -- https://preview.example   (another origin)
// Fails on the first contract violation. Needs network access only.
import jsonld from 'jsonld';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadSubjects, subjectUrls, modelUrls, BASE_URL, ROOT } from './lib/models.mjs';
import { listReleases } from './lib/releases.mjs';

const origin = (process.argv[2] ?? BASE_URL).replace(/\/$/, '');
const swap = (url) => url.replace(BASE_URL, origin);
const failures = [];
const expect = (cond, msg) => { if (!cond) failures.push(msg); };
const head = async (url) => fetch(swap(url), { method: 'HEAD', redirect: 'manual' });
const h = (r, name) => r.headers.get(name) ?? '';
// Exact versions must carry exactly this value: a joined value such as
// "public, max-age=300, public, max-age=31536000, immutable" means the
// inherited short cache was not detached.
const IMMUTABLE = 'public, max-age=31536000, immutable';
const isImmutable = (r) => h(r, 'cache-control').trim() === IMMUTABLE;

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
  expect(isImmutable(r), `${u.contextExact}: cache-control "${h(r, 'cache-control')}" must be exactly "${IMMUTABLE}"`);
  expect(h(r, 'access-control-allow-origin') === '*', `${u.contextExact}: missing CORS`);
  for (const release of await listReleases(subject)) {
    for (const f of release.files) { const rr = await head(f.url); expect(rr.status === 200 && isImmutable(rr), `${f.url}: released file ${rr.status} ${h(rr, 'cache-control')}`); }
  }
  r = await head(u.contextAlias);
  expect(r.status === 200 && !/immutable/.test(h(r, 'cache-control')), `${u.contextAlias}: alias must not be immutable (${r.status}, ${h(r, 'cache-control')})`);
  r = await head(u.page); expect(r.status === 200, `${u.page}: ${r.status}`);

  for (const model of subject.models) {
    const mu = modelUrls(subject, model);
    r = await head(mu.schemaExact);
    expect(r.status === 200 && h(r, 'content-type').startsWith('application/schema+json'), `${mu.schemaExact}: ${r.status} ${h(r, 'content-type')}`);
    expect(isImmutable(r), `${mu.schemaExact}: cache-control "${h(r, 'cache-control')}" must be exactly "${IMMUTABLE}"`);
    r = await head(mu.typeIri);
    expect(r.status === 302 && h(r, 'location') === mu.page.replace(BASE_URL, ''), `${mu.typeIri}: ${r.status} -> ${h(r, 'location')}`);
    r = await head(mu.page); expect(r.status === 200, `${mu.page}: ${r.status}`);
    // Value types have no GeonicDB body and no normalized example of their own.
    if (model.kind === 'value') continue;
    r = await head(mu.geonicdb); expect(r.status === 200 && h(r, 'content-type').startsWith('application/json'), `${mu.geonicdb}: ${r.status} ${h(r, 'content-type')}`);

    const norm = model.examples['example-normalized.jsonld'];
    if (norm) {
      try {
        const expanded = await jsonld.expand(norm, { documentLoader: loader });
        expect(expanded[0]?.['@type']?.[0] === mu.typeIri, `${model.type}: live expansion gives type ${expanded[0]?.['@type']?.[0]}`);
      } catch (e) { failures.push(`${model.type}: live JSON-LD expansion failed: ${e.message}`); }
    }
  }
}
// Served bytes of every recorded immutable file must match the manifest. This
// is what makes an in-place correction of a published file verifiable: after a
// deploy, the CDN and the origin serve exactly what the repository says.
const manifest = JSON.parse(await readFile(join(ROOT, 'published-manifest.json'), 'utf8'));
for (const [path, hash] of Object.entries(manifest.files)) {
  const url = `${origin}/${path}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) { failures.push(`${url}: ${res.status}`); continue; }
  const served = createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex');
  expect(served === hash, `${url}: served bytes differ from published-manifest.json (deploy not live yet, or a stale cache)`);
}

const r = await fetch(swap(`${BASE_URL}/catalog.json`));
expect(r.ok, `catalog.json: ${r.status}`);
if (r.ok) { const c = await r.json(); expect(c.formatVersion === 1 && Array.isArray(c.models), 'catalog.json: unexpected shape'); }

if (failures.length) { console.error(`Live check failed (${failures.length}) against ${origin}:`); for (const f of failures) console.error(`  ${f}`); process.exit(1); }
console.log(`live ok: ${origin}, ${subjects.reduce((a, s) => a + s.models.length, 0)} model(s), ${Object.keys(manifest.files).length} immutable file(s) match the manifest`);
