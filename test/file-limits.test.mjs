// The limits on contributed files (scripts/lib/file-limits.mjs, #293); more
// validator runs that use them are in validate-models.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasNestedQuantifier, patternProblem, nestingDepth, schemaLimitProblems, fileLimitProblems, MAX_PATTERN_LENGTH, MAX_FILE_BYTES } from '../scripts/lib/file-limits.mjs';
import { resolveContextTerms } from '../scripts/lib/models.mjs';

// Read at run time, so the nested patterns stay data (a code scanner would take literals for live regexes).
const patterns = JSON.parse(await readFile(fileURLToPath(new URL('./fixtures/file-limits-patterns.json', import.meta.url)), 'utf8'));
const nested = patterns.nested[0];

test('a repeated group whose length varies is a nested quantifier', () => {
  for (const p of patterns.nested) assert.equal(hasNestedQuantifier(p), true, p);
});

test('the catalog patterns, separated groups and other safe forms pass', () => {
  for (const p of patterns.safe) assert.equal(hasNestedQuantifier(p), false, p);
});

test('a pattern is checked for length, syntax and nesting', () => {
  assert.equal(patternProblem(patterns.safe[0]), null);
  assert.equal(patternProblem(42), null, "a non-string is the toolkit's to report");
  assert.equal(patternProblem('a'.repeat(MAX_PATTERN_LENGTH)), null);
  assert.match(patternProblem('a'.repeat(MAX_PATTERN_LENGTH + 1)), /257 characters long; at most 256/);
  assert.match(patternProblem('(a'), /not a valid regular expression/);
  assert.match(patternProblem(nested), /repeats a group/);
});

test('nesting depth counts objects and arrays, and stops past the cap', () => {
  assert.equal(nestingDepth('x'), 0);
  assert.equal(nestingDepth({ a: [1, { b: {} }] }), 4);
  const cyclic = {}; cyclic.self = cyclic; // a YAML alias can build this
  assert.equal(nestingDepth(cyclic, 5), 6);
});

test('a schema: patterns in data keywords and x- keys are not patterns, $refs and $dynamicRefs are counted', () => {
  assert.deepEqual(schemaLimitProblems({ const: { pattern: nested }, examples: [{ pattern: nested }], 'x-note': { pattern: nested }, properties: { pattern: { type: 'string' } } }), []);
  assert.deepEqual(schemaLimitProblems({ properties: { a: { pattern: nested } } }).map((m) => m.split(' ')[0]), ['/properties/a/pattern']);
  assert.deepEqual(schemaLimitProblems({ patternProperties: { [nested]: {} } }).map((m) => m.split(' ')[0]), ['/patternProperties']);
  const refs = (n, key = '$ref') => ({ $defs: Object.fromEntries(Array.from({ length: n }, (_, i) => [`d${i}`, { [key]: '#' }])) });
  assert.deepEqual(schemaLimitProblems(refs(100)), []);
  assert.match(schemaLimitProblems(refs(101))[0], /has 101 \$refs/);
  assert.match(schemaLimitProblems(refs(101, '$dynamicRef'))[0], /has 101 \$refs/);
});

test('files: limits at their boundary, JSON and YAML in any case, links and unreadable files', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'file-limits-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const nest = (n) => { let v = 'x'; for (let i = 0; i < n; i++) v = [v]; return v; };
  await mkdir(join(dir, 's', 'T'), { recursive: true });
  const put = (name, text) => writeFile(join(dir, 's', name), text);
  await put('README.md', 'x'.repeat(MAX_FILE_BYTES));
  await put('big.md', 'x'.repeat(MAX_FILE_BYTES + 1));
  await put('ok.json', JSON.stringify(nest(32)));
  await put('deep.JSON', JSON.stringify(nest(33)));
  await put('deep.geojson', JSON.stringify(nest(33)));
  await put('deep.yaml', JSON.stringify(nest(33))); // JSON is YAML
  await put('broken.yml', 'a: [');
  await put('T/schema.json', JSON.stringify({ properties: { a: { pattern: nested } } }));
  await symlink('/dev/zero', join(dir, 's', 'zero.json'));
  const out = await fileLimitProblems(dir);
  assert.deepEqual(out.map((l) => l.split(/ \(|, as in/)[0]), [
    'models/s/T/schema.json: /properties/a/pattern repeats a group whose length varies',
    'models/s/big.md: is 262145 bytes; at most 262144',
    'models/s/broken.yml: cannot be read as YAML',
    'models/s/deep.JSON: nests deeper than 32 levels',
    'models/s/deep.geojson: nests deeper than 32 levels',
    'models/s/deep.yaml: nests deeper than 32 levels',
    'models/s/zero.json: is a symbolic link; models/ holds only regular files',
  ]);
});

test('context imports nest at most two levels, which also ends a cycle', async () => {
  const docs = {
    a: { '@context': ['b', { ta: 'x:a' }] },
    b: { '@context': ['c', { tb: 'x:b' }] },
    c: { '@context': { tc: 'x:c' } },
    d: { '@context': ['a'] },
    self: { '@context': ['self'] },
  };
  const resolve = async (url) => docs[url];
  assert.deepEqual(await resolveContextTerms(docs.a, [], resolve), { tc: 'x:c', tb: 'x:b', ta: 'x:a' });
  await assert.rejects(resolveContextTerms(docs.d, [], resolve), /context imports nest deeper than 2 levels \(a -> b -> c\)/);
  await assert.rejects(resolveContextTerms(docs.self, [], resolve), /nest deeper than 2 levels \(self -> self -> self\)/);
});
