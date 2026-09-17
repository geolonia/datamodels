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

/** Write the snapshot of the subject's current version (idempotent). */
export async function snapshotRelease(subject) {
  const dir = join(subject.dir, 'releases', `v${subject.version}`);
  await mkdir(join(dir, 'schema'), { recursive: true });
  const json = (o) => JSON.stringify(o, null, 2) + '\n';
  const ctx = join(dir, 'context.jsonld');
  await writeIfAbsentOrEqual(ctx, json(subject.context), `${subject.name} v${subject.version} context`);
  for (const model of subject.models) {
    await writeIfAbsentOrEqual(join(dir, 'schema', `${model.type}.json`), json(model.schema), `${subject.name} v${subject.version} ${model.type} schema`);
  }
  return dir;
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
  for (const name of (await readdir(base)).sort()) {
    const m = /^v(\d+\.\d+\.\d+)$/.exec(name); if (!m) continue;
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
