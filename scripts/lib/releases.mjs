// Published exact versions live on in models/<subject>/releases/<version>/ as
// committed snapshots, so the build can keep serving every version ever
// published while models/ moves on. `npm run manifest:record` writes the
// snapshot for the current version; publish copies every snapshot into dist/.
//
//   models/<subject>/releases/v1.0.0/context.jsonld
//   models/<subject>/releases/v1.0.0/schema/<Type>.json
import { cp, mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { BASE_URL } from './models.mjs';

async function isDir(p) { try { return (await stat(p)).isDirectory(); } catch { return false; } }

/** What the snapshot of the subject's current version must contain: [{ file, content, what }]. */
function releaseContents(subject) {
  const dir = join(subject.dir, 'releases', `v${subject.version}`);
  const json = (o) => JSON.stringify(o, null, 2) + '\n';
  const at = `${subject.name} v${subject.version}`;
  return {
    dir,
    entries: [
      { file: join(dir, 'context.jsonld'), content: json(subject.context), what: `${at} context` },
      ...subject.models.map((model) => ({ file: join(dir, 'schema', `${model.type}.json`), content: json(model.schema), what: `${at} ${model.type} schema` })),
    ],
  };
}

/** Write the snapshot of the subject's current version (idempotent). */
export async function snapshotRelease(subject) {
  const { dir, entries } = releaseContents(subject);
  await mkdir(join(dir, 'schema'), { recursive: true });
  for (const e of entries) await writeIfAbsentOrEqual(e.file, e.content, e.what);
  return dir;
}

/**
 * Read-only counterpart for CI: the snapshot of the current version, when it
 * exists, must hold exactly what the sources produce. The build serves the
 * current version from the sources, so a drifted snapshot would otherwise go
 * unnoticed until the next version made it the served copy. Returns a list of
 * problems (empty when consistent or not yet snapshotted).
 */
export async function verifyRelease(subject) {
  const { dir, entries } = releaseContents(subject);
  if (!(await isDir(dir))) return [];
  const problems = [];
  for (const e of entries) {
    let existing;
    try { existing = await readFile(e.file, 'utf8'); } catch (err) { if (err.code !== 'ENOENT') throw err; problems.push(`${e.what}: missing from ${dir}`); continue; }
    if (existing !== e.content) problems.push(`${e.what}: snapshot differs from the sources (${e.file})`);
  }
  const expected = new Set(entries.map((e) => e.file));
  const schemaDir = join(dir, 'schema');
  if (await isDir(schemaDir)) for (const f of await readdir(schemaDir)) if (!expected.has(join(schemaDir, f))) problems.push(`${subject.name} v${subject.version}: snapshot has ${f}, which is not a model of the subject`);
  return problems;
}

async function writeIfAbsentOrEqual(file, content, what) {
  try {
    const existing = await readFile(file, 'utf8');
    if (existing !== content) throw new Error(`${what}: release snapshot ${file} differs from the current source. A published version never changes; bump the version instead.`);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    await writeFile(file, content);
  }
}

/** All snapshots of a subject: [{ version, dir, files: [{ url, path }] }]. */
export async function listReleases(subject) {
  const base = join(subject.dir, 'releases');
  if (!(await isDir(base))) return [];
  const out = [];
  const bySemver = (a, b) => { const pa = a.slice(1).split('.').map(Number), pb = b.slice(1).split('.').map(Number); return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2]; };
  const names = (await readdir(base)).filter((n) => /^v\d+\.\d+\.\d+$/.test(n)).sort(bySemver);
  for (const name of names) {
    const m = /^v(\d+\.\d+\.\d+)$/.exec(name);
    const dir = join(base, name); const version = m[1];
    const files = [{ url: `${BASE_URL}/context/${subject.name}/v${version}.jsonld`, path: join(dir, 'context.jsonld') }];
    const schemaDir = join(dir, 'schema');
    if (await isDir(schemaDir)) for (const f of (await readdir(schemaDir)).sort()) {
      files.push({ url: `${BASE_URL}/schema/${subject.name}/${f.replace(/\.json$/, '')}/v${version}.json`, path: join(schemaDir, f) });
    }
    out.push({ version, dir, files });
  }
  return out;
}

/**
 * The context document a catalog context URL denotes, honouring versions:
 * an exact version resolves to its release snapshot, or to the current source
 * when it is the current version; a major alias resolves to the latest version
 * of that major; anything else is an error. Used by the validator so a context
 * that imports an old or nonexistent version is checked against what that URL
 * really serves.
 */
export async function resolveContextDocument(url, subjects) {
  const m = new RegExp(`^${BASE_URL}/context/([a-z][a-z0-9-]*)/v(\\d+)(?:\\.(\\d+)\\.(\\d+))?\\.jsonld$`).exec(url);
  if (!m) return undefined;
  const subject = subjects.find((s) => s.name === m[1]);
  if (!subject) throw new Error(`${url}: no subject "${m[1]}"`);
  const releases = await listReleases(subject);
  const candidates = [...releases.map((r) => ({ version: r.version, path: r.files[0].path })), { version: subject.version, doc: subject.context }];
  const parse = (v) => v.split('.').map(Number);
  let chosen;
  if (m[3] !== undefined) {
    const exact = `${m[2]}.${m[3]}.${m[4]}`;
    chosen = candidates.find((c) => c.version === exact);
    if (!chosen) throw new Error(`${url}: version ${exact} of subject "${subject.name}" is neither published (releases/) nor current (${subject.version})`);
  } else {
    const major = Number(m[2]);
    chosen = candidates.filter((c) => parse(c.version)[0] === major).sort((a, b) => { const x = parse(a.version), y = parse(b.version); return x[1] - y[1] || x[2] - y[2]; }).pop();
    if (!chosen) throw new Error(`${url}: subject "${subject.name}" has no version ${major}.x.y`);
  }
  return chosen.doc ?? JSON.parse(await readFile(chosen.path, 'utf8'));
}
