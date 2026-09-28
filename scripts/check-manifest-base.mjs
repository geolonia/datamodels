// Compare published-manifest.json with the base branch's, so a pull request
// cannot quietly rewrite or drop a recorded (published) file.
//
//   node scripts/check-manifest-base.mjs [--base <git ref>]   (default origin/main)
//   node scripts/check-manifest-base.mjs --base-file <path>   (tests: base manifest from a file)
//
// New entries are always fine. A changed or removed entry means a published
// file changed. While both the base and this manifest say "prerelease": true,
// that is the README's in-place correction: it is listed in the job summary
// and passes. The base decides: once the official launch has set it to false,
// a pull request can neither turn it back on nor remove it (a base without the
// flag counts as launched for corrections; the flag may only be introduced).
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './lib/models.mjs';
import { reportFailures } from './lib/ci-summary.mjs';

/** Entries of `head` that differ from `base`: changed hash, removed, added. */
export function diffManifests(base, head) {
  const b = base.files ?? {};
  const h = head.files ?? {};
  return {
    changed: Object.keys(b).filter((k) => k in h && h[k] !== b[k]).sort(),
    removed: Object.keys(b).filter((k) => !(k in h)).sort(),
    added: Object.keys(h).filter((k) => !(k in b)).sort(),
  };
}

async function main() {
  const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? (process.argv[i + 1] ?? '') : undefined; };
  const baseFile = arg('--base-file');
  const base = baseFile ?? arg('--base') ?? 'origin/main';
  if (!base) throw new Error('--base needs a git ref (for example origin/main), --base-file a path');
  const manifestPath = process.env.DATAMODELS_MANIFEST ?? join(ROOT, 'published-manifest.json');
  const head = JSON.parse(await readFile(manifestPath, 'utf8'));

  let baseText;
  if (baseFile !== undefined) {
    baseText = await readFile(baseFile, 'utf8');
  } else {
    try {
      baseText = execFileSync('git', ['show', `${base}:published-manifest.json`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      // A missing base ref must not pass silently: fetch it first (CI does).
      throw new Error(`cannot read published-manifest.json at ${base}: ${String(e.stderr || e.message).trim()}. Fetch the base branch first, for example: git fetch origin main`);
    }
  }
  const baseManifest = JSON.parse(baseText);
  const { changed, removed, added } = diffManifests(baseManifest, head);
  const touched = [...changed.map((k) => `${k}: changed`), ...removed.map((k) => `${k}: removed`)];

  // The flag itself, whatever else changed: once the base has it, a pull
  // request may not remove it or turn a launched base back into a pre-release.
  const flagProblem = 'prerelease' in baseManifest && !('prerelease' in head)
    ? `removes "prerelease" from the manifest; ${base} has it, so it stays`
    : 'prerelease' in baseManifest && baseManifest.prerelease !== true && head.prerelease === true
      ? `sets "prerelease" back to true; ${base} is launched, and a pull request cannot turn the pre-release exception back on`
      : null;
  if (flagProblem) {
    console.error(`Manifest check failed: this pull request ${flagProblem}.`);
    await reportFailures('Pre-release flag changed', [`published-manifest.json: ${flagProblem}`], 'The official launch sets "prerelease" to false once and for all (launch plan #30).');
    process.exit(1);
  }

  if (!touched.length) {
    console.log(`manifest ok against ${base}: ${added.length} new entr${added.length === 1 ? 'y' : 'ies'}, none changed or removed`);
    return;
  }
  // The exception holds only while the base is still a pre-release too.
  if (head.prerelease === true && baseManifest.prerelease === true) {
    console.log(`pre-release: ${touched.length} published file(s) corrected in place against ${base}:`);
    for (const t of touched) console.log(`  ${t}`);
    await reportFailures('Published files corrected in place (pre-release)', touched, 'Allowed until the official launch (README, "Adding or changing a model"). Say so in the pull request; after the launch this check fails instead.');
    return;
  }
  if (head.prerelease === true) console.error(`${base} has no pre-release flag, so it counts as launched; corrections in place need "prerelease": true on ${base} first.`);
  console.error(`Manifest check failed: ${touched.length} published file(s) changed or removed against ${base}:`);
  for (const t of touched) console.error(`  ${t}`);
  await reportFailures('Published files changed or removed', touched, 'A published version never changes. Keep the recorded entries and publish the change as a new version.');
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
