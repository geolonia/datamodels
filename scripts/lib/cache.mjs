// Cache-Control for exact versions, shared by the build (publish.mjs) and
// check:live. After the official launch exact versions never change, so they
// are cached for a year as immutable. During the pre-release
// ("prerelease": true in published-manifest.json) they may still be corrected
// in place (npm run rerecord), so they get the same short cache as aliases:
// a client never keeps a stale copy for long. The launch only flips the flag.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from './models.mjs';

export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
export const PRERELEASE_CACHE = 'public, max-age=300';

export const manifestPath = () => process.env.DATAMODELS_MANIFEST ?? join(ROOT, 'published-manifest.json');
export const readManifest = async () => JSON.parse(await readFile(manifestPath(), 'utf8'));

// A manifest without the flag counts as launched, as in check-manifest-base.
export const isPrerelease = (manifest) => manifest.prerelease === true;
export const exactCacheControl = (manifest) => (isPrerelease(manifest) ? PRERELEASE_CACHE : IMMUTABLE_CACHE);

/**
 * The `_headers` rules for exact versions: one rule per path (a leading `/`),
 * each detaching the Cache-Control inherited from the glob rules in
 * public/_headers (`! Cache-Control`) before setting its own, since values
 * from several matching rules are otherwise joined with commas. The rule is
 * generated in both modes so that the launch changes only the value.
 */
export function exactVersionHeaderRules(paths, manifest) {
  const value = exactCacheControl(manifest);
  const lines = ['', isPrerelease(manifest)
    ? '# Generated: exact versions, short cache during the pre-release ("prerelease": true in published-manifest.json). `! Cache-Control` detaches the cache inherited from the glob rules above.'
    : '# Generated: exact versions are immutable. `! Cache-Control` detaches the short cache inherited from the glob rules above.'];
  for (const path of new Set(paths)) lines.push(path, '  ! Cache-Control', `  Cache-Control: ${value}`);
  return lines;
}
