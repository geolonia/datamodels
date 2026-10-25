// Published exact versions live on in models/<subject>/releases/<version>/ as
// committed snapshots, so the build can keep serving every version ever
// published while models/ moves on. `pnpm exec datamodels release <subject>` writes
// the snapshot for the current version; publish copies every snapshot into dist/.
//
//   models/<subject>/releases/v1.0.0/context.jsonld
//   models/<subject>/releases/v1.0.0/vocab.jsonld
//   models/<subject>/releases/v1.0.0/schema/<Type>.json
import { readFile } from 'node:fs/promises';
import { verifyRelease as tkVerify, listReleases as tkList } from '@geolonia/datamodels/build';
import { BASE_URL, URLS, NODE } from './models.mjs';

// The toolkit's release snapshots (#226), with the settings of node.yaml.
const options = { urls: URLS, languages: NODE.languages };

/**
 * The snapshot of the current version, when it exists, must hold exactly what
 * the sources produce. `recorded`: whether the version must have a snapshot
 * already (the toolkit's option; datamodels check --all-released asks the
 * same). Returns a list of problems.
 */
export const verifyRelease = (subject, { recorded = false } = {}) => tkVerify(subject, options, { recorded });

/** All snapshots of a subject: [{ version, dir, files: [{ url, path }] }]. */
export const listReleases = (subject) => tkList(subject, options);

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
