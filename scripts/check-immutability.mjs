// Enforce the URL contract: a published versioned file never changes or
// disappears.
//
// published-manifest.json records the SHA-256 of every immutable file that has
// ever been published. This script compares the freshly built dist/ against
// it and fails when a recorded file is missing or has different content.
//
// Which files are immutable:
//   - dist/context/**  and  dist/schema/**  whose file name carries an exact
//     version, e.g. v1.0.0.jsonld or v2.3.1.json. Aliases such as v1.jsonld
//     are mutable by design (they advance to the latest compatible version)
//     and are not recorded.
//   - dist/context/mirror/**  (pinned copies of upstream contexts, named by
//     upstream commit).
//
// New immutable files must be recorded before they can be published:
//   node scripts/check-immutability.mjs --record
// appends them to the manifest (never rewriting an existing entry), so the
// manifest change shows up in the pull request diff for review. CI runs the
// check without --record and fails on unrecorded files.
import { createHash } from 'node:crypto';
import { loadSubjects } from './lib/models.mjs';
import { snapshotRelease, verifyRelease } from './lib/releases.mjs';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const manifestPath = join(root, 'published-manifest.json');
const record = process.argv.includes('--record');

const EXACT_VERSION = /(^|[^0-9A-Za-z])v\d+\.\d+\.\d+\.[A-Za-z0-9.]+$/;

function isImmutable(relPath) {
  const p = relPath.split(sep).join('/');
  if (p.startsWith('context/mirror/')) return true;
  if (!p.startsWith('context/') && !p.startsWith('schema/')) return false;
  return EXACT_VERSION.test(p.slice(p.lastIndexOf('/') + 1));
}

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (typeof manifest.files !== 'object' || manifest.files === null) {
  throw new Error('published-manifest.json must have a "files" object');
}

const built = new Map();
for (const file of await walk(dist)) {
  const rel = relative(dist, file).split(sep).join('/');
  if (isImmutable(rel)) built.set(rel, await sha256(file));
}

const violations = [];
for (const [rel, hash] of Object.entries(manifest.files)) {
  const current = built.get(rel);
  if (current === undefined) violations.push(`missing: ${rel} (published files are never removed)`);
  else if (current !== hash) violations.push(`changed: ${rel} (published files are never modified; publish a new version instead)`);
}

const unrecorded = [...built.keys()].filter((rel) => !(rel in manifest.files)).sort();

// The snapshot of each subject's current version must match its sources.
// A version counts as recorded once its exact context is in the manifest.
if (!record) for (const subject of await loadSubjects()) {
  const recorded = `context/${subject.name}/v${subject.version}.jsonld` in manifest.files;
  violations.push(...(await verifyRelease(subject, { recorded })));
}

if (violations.length > 0) {
  console.error('Immutability check failed:');
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

if (record) {
  // Snapshot the current version of every subject so it keeps being served
  // after models/ moves on (see lib/releases.mjs).
  for (const subject of await loadSubjects()) console.log(`release snapshot: ${await snapshotRelease(subject)}`);
}

if (unrecorded.length > 0) {
  if (record) {
    for (const rel of unrecorded) manifest.files[rel] = built.get(rel);
    const sorted = Object.fromEntries(Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b)));
    await writeFile(manifestPath, JSON.stringify({ ...manifest, files: sorted }, null, 2) + '\n');
    console.log(`recorded ${unrecorded.length} new immutable file(s) in published-manifest.json`);
  } else {
    console.error('Immutability check failed: unrecorded immutable files in dist/:');
    for (const rel of unrecorded) console.error(`  ${rel}`);
    console.error('Run `npm run manifest:record` and commit published-manifest.json.');
    process.exit(1);
  }
}

console.log(`immutability ok: ${Object.keys(manifest.files).length} published file(s) verified`);
