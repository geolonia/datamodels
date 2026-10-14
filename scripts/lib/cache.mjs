// Cache-Control for exact versions, shared by the build (publish.mjs) and
// check:live. After the official launch exact versions never change, so they
// are cached for a year as immutable. During the pre-release
// (`prerelease: true` in node.yaml) they may still be corrected in place, so
// they get the same short cache as aliases: a client never keeps a stale copy
// for long. The launch only flips the flag.
import { NODE } from './models.mjs';

export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
export const PRERELEASE_CACHE = 'public, max-age=300';

// Without the flag the catalog counts as launched, as in the toolkit.
export const isPrerelease = (node = NODE) => node.prerelease === true;
export const exactCacheControl = (node = NODE) => (isPrerelease(node) ? PRERELEASE_CACHE : IMMUTABLE_CACHE);

/**
 * The `_headers` rules for exact versions: one rule per path (a leading `/`),
 * each detaching the Cache-Control inherited from the glob rules in
 * public/_headers (`! Cache-Control`) before setting its own, since values
 * from several matching rules are otherwise joined with commas. The rule is
 * generated in both modes so that the launch changes only the value.
 */
export function exactVersionHeaderRules(paths, node = NODE) {
  const value = exactCacheControl(node);
  const lines = ['', isPrerelease(node)
    ? '# Generated: exact versions, short cache during the pre-release (prerelease: true in node.yaml). `! Cache-Control` detaches the cache inherited from the glob rules above.'
    : '# Generated: exact versions are immutable. `! Cache-Control` detaches the short cache inherited from the glob rules above.'];
  for (const path of new Set(paths)) lines.push(path, '  ! Cache-Control', `  Cache-Control: ${value}`);
  return lines;
}
