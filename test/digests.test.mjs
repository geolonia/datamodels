// catalog.json lists a SHA-256 digest per exact-version file (#295), so a
// consumer can pin a file or check a copy against what was published.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSubjects, BASE_URL } from '../scripts/lib/models.mjs';
import { listReleases } from '../scripts/lib/releases.mjs';
import { publishModels, sriDigest } from '../scripts/lib/publish.mjs';
import { discoverAdapters } from '../scripts/lib/adapters.mjs';
import { readNodeList } from '../scripts/lib/nodes.mjs';

let dir; let catalog; let subjects;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'datamodels-digests-'));
  subjects = await loadSubjects();
  ({ catalog } = await publishModels(subjects, await discoverAdapters(), { nodes: await readNodeList(), outDir: dir }));
});
after(() => rm(dir, { recursive: true, force: true }));

const fileOf = (url) => join(dir, url.slice(BASE_URL.length));

test('a digest is sha256-<base64> of the bytes, as Subresource Integrity writes it', () => {
  assert.equal(sriDigest(Buffer.from('')), 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=');
});

test('catalog.json on disk carries the digests', async () => {
  const written = JSON.parse(await readFile(join(dir, 'catalog.json'), 'utf8'));
  assert.deepEqual(written.digests, catalog.digests);
  assert.deepEqual(Object.keys(written.digests), Object.keys(written.digests).toSorted(), 'sorted by URL');
});

test('every digest matches the file written to dist/', async () => {
  for (const [url, digest] of Object.entries(catalog.digests)) assert.equal(sriDigest(await readFile(fileOf(url))), digest, url);
});

test('every released file has the digest of its snapshot', async () => {
  let n = 0;
  for (const subject of subjects) for (const release of await listReleases(subject)) for (const f of release.files) {
    n++;
    assert.equal(catalog.digests[f.url], sriDigest(await readFile(f.path)), f.url);
  }
  assert.ok(n > 0, 'the catalog has released files');
});

test('the exact URLs of every model are listed, the aliases are not', () => {
  for (const m of catalog.models) for (const url of [m.contextUrl, m.schemaUrl, m.vocabularyUrl]) assert.ok(catalog.digests[url], `${m.type}: ${url}`);
  for (const m of catalog.models) assert.equal(catalog.digests[m.contextAliasUrl], undefined, m.contextAliasUrl);
});
