// Generated Cache-Control rules for exact versions: short while the manifest
// says "prerelease": true, immutable for a year after the launch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../scripts/lib/models.mjs';
import { exactVersionHeaderRules, exactCacheControl, IMMUTABLE_CACHE, PRERELEASE_CACHE } from '../scripts/lib/cache.mjs';

const paths = ['/context/disaster/v1.0.0.jsonld', '/schema/disaster/EvacuationSite/v1.0.0.json', '/context/disaster/v1.0.0.jsonld'];

// Rules as Cloudflare reads them: path -> the Cache-Control it ends up with
// (a `! Header` line detaches what earlier matching rules set).
function parse(lines) {
  const rules = new Map();
  let current;
  for (const line of lines) {
    if (line.startsWith('/')) { current = []; rules.set(line, current); }
    else if (current && line.trim()) current.push(line.trim());
  }
  return rules;
}

test('pre-release: exact versions get the short cache, detached from the glob rule', () => {
  const rules = parse(exactVersionHeaderRules(paths, { prerelease: true }));
  assert.deepEqual([...rules.keys()], ['/context/disaster/v1.0.0.jsonld', '/schema/disaster/EvacuationSite/v1.0.0.json']);
  for (const lines of rules.values()) assert.deepEqual(lines, ['! Cache-Control', `Cache-Control: ${PRERELEASE_CACHE}`]);
  assert.doesNotMatch(exactVersionHeaderRules(paths, { prerelease: true }).join('\n'), /immutable|31536000/);
});

test('launched: exact versions are immutable for a year', () => {
  for (const manifest of [{ prerelease: false }, {}]) {
    const rules = parse(exactVersionHeaderRules(paths, manifest));
    assert.equal(rules.size, 2);
    for (const lines of rules.values()) assert.deepEqual(lines, ['! Cache-Control', `Cache-Control: ${IMMUTABLE_CACHE}`]);
  }
  assert.equal(IMMUTABLE_CACHE, 'public, max-age=31536000, immutable');
});

test('only a literal true counts as pre-release', () => {
  assert.equal(exactCacheControl({ prerelease: true }), PRERELEASE_CACHE);
  for (const prerelease of [false, 'true', 1, undefined]) assert.equal(exactCacheControl({ prerelease }), IMMUTABLE_CACHE);
});

test('the pre-release cache is the aliases\' short cache from public/_headers', async () => {
  const headers = await readFile(join(ROOT, 'public', '_headers'), 'utf8');
  const rules = parse(headers.split('\n').filter((l) => !l.startsWith('#')));
  for (const glob of ['/context/*.jsonld', '/vocab/*.jsonld', '/schema/*.json']) {
    assert.ok(rules.get(glob).includes(`Cache-Control: ${PRERELEASE_CACHE}`), glob);
  }
});
