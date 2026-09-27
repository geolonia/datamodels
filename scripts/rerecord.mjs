// Pre-release only: correct a subject's current version in place.
//
//   npm run rerecord -- <subject> [<subject> ...]
//
// Deletes the subject's snapshot of its current version and that version's
// manifest entries, then builds and records again (npm run manifest:record).
// This is the README's pre-release procedure as one command. After the
// official launch a published version never changes: bump the version instead.
import { rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadSubjects, ROOT } from './lib/models.mjs';

const names = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const die = (msg) => { console.error(msg); process.exit(1); };
if (!names.length) die('usage: npm run rerecord -- <subject> [<subject> ...]');

const subjects = await loadSubjects();
const manifestPath = join(ROOT, 'published-manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

for (const name of names) {
  const subject = subjects.find((s) => s.name === name);
  if (!subject) die(`no subject "${name}"; existing subjects: ${subjects.map((s) => s.name).join(', ')}`);
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
  if (r.status !== 0) process.exit(r.status ?? 1);
}
