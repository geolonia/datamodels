// Pre-release only: correct a subject's current version in place.
//
//   npm run rerecord -- <subject> [<subject> ...]
//
// Deletes the subject's snapshot of its current version and that version's
// manifest entries, then builds and records again (npm run manifest:record).
// This is the README's pre-release procedure as one command. After the
// official launch a published version never changes: bump the version instead.
import { rm, readFile, writeFile, cp, mkdtemp, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadSubjects, ROOT } from './lib/models.mjs';

const names = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const die = (msg) => { console.error(msg); process.exit(1); };
if (!names.length) die('usage: npm run rerecord -- <subject> [<subject> ...]');

const subjects = await loadSubjects();
const manifestPath = join(ROOT, 'published-manifest.json');
const manifestText = await readFile(manifestPath, 'utf8');
const manifest = JSON.parse(manifestText);

// Resolve every name before changing anything, so a typo leaves the tree as it was.
const unknown = names.filter((n) => !subjects.some((s) => s.name === n));
if (unknown.length) die(`no subject ${unknown.map((n) => `"${n}"`).join(', ')}; existing subjects: ${subjects.map((s) => s.name).join(', ')}`);

// Keep copies of every subject's current snapshot (recording rewrites all of
// them, not only the named ones) and of the manifest, so any failure puts the
// tree back as it was.
const backup = await mkdtemp(join(tmpdir(), 'datamodels-rerecord-'));
const saved = [];
try {
  for (const subject of subjects) {
    const dir = join(subject.dir, 'releases', `v${subject.version}`);
    const copy = join(backup, subject.name);
    const existed = await access(dir).then(() => true, () => false);
    if (existed) await cp(dir, copy, { recursive: true });
    saved.push({ dir, copy, existed });
  }
} catch (e) {
  await rm(backup, { recursive: true, force: true }).catch(() => {});
  throw e;
}
async function restore() {
  await writeFile(manifestPath, manifestText);
  for (const { dir, copy, existed } of saved) {
    await rm(dir, { recursive: true, force: true });
    if (existed) await cp(copy, dir, { recursive: true });
  }
}

let failure = null;
try {
  for (const name of names) {
    const subject = subjects.find((s) => s.name === name);
    const v = `v${subject.version}`;
    // context/<s>/vX.Y.Z.jsonld, vocab/<s>/vX.Y.Z.jsonld and schema/<s>/<Type>/vX.Y.Z.json
    const ours = new RegExp(`^(context|vocab)/${name}/${v.replace(/\./g, '\\.')}\\.jsonld$|^schema/${name}/[^/]+/${v.replace(/\./g, '\\.')}\\.json$`);
    const dropped = Object.keys(manifest.files).filter((k) => ours.test(k));
    for (const k of dropped) delete manifest.files[k];
    await rm(join(subject.dir, 'releases', v), { recursive: true, force: true });
    console.log(`${name} ${subject.version}: removed the snapshot and ${dropped.length} manifest entr${dropped.length === 1 ? 'y' : 'ies'}`);
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  console.log('pre-release correction in place; after the official launch, bump the version instead');
  for (const script of [['scripts/build.mjs'], ['scripts/check-immutability.mjs', '--record']]) {
    const r = spawnSync(process.execPath, script.map((s, i) => (i === 0 ? join(ROOT, s) : s)), { stdio: 'inherit' });
    if (r.status !== 0) { failure = `${script[0]} failed`; break; }
  }
} catch (e) {
  failure = e.message;
}

if (failure) {
  try {
    await restore();
  } catch (e) {
    console.error(`${failure}, and restoring failed (${e.message}). The backup is kept in ${backup}: copy its folders back to models/<subject>/releases/ and run git checkout published-manifest.json.`);
    process.exit(1);
  }
  await rm(backup, { recursive: true, force: true });
  console.error(`${failure}; the snapshots and published-manifest.json are restored. Fix the errors above and run rerecord again.`);
  process.exit(1);
}
await rm(backup, { recursive: true, force: true });
