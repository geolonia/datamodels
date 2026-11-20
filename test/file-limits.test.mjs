// The limits on contributed files (scripts/lib/file-limits.mjs, #293); the
// validator runs that use them are in validate-models.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasNestedQuantifier, patternProblem, nestingDepth, schemaLimitProblems, MAX_PATTERN_LENGTH } from '../scripts/lib/file-limits.mjs';
import { resolveContextTerms } from '../scripts/lib/models.mjs';

test('a repeated group whose length varies is a nested quantifier', () => {
  for (const p of ['(a+)+', '(a*)*', '^(a{1,9})+$', '((ab)*c)+', '(?:a|b+)*', '(x+){2}', '(?<n>\\d+)+', '((a+)?)*', '(a+?)+?', '(\\d{2,})*']) assert.equal(hasNestedQuantifier(p), true, p);
});

test('the catalog patterns and other safe forms pass', () => {
  for (const p of [
    '^\\d{3}-?\\d{4}$', '^(([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?|24:00(:00)?)$', '^(0|[1-9][0-9]*|default)$',
    '^E[0-9]{10}1[12][1-9A-Za-z]$', '^P(?!$)(\\d+Y)?(\\d+M)?(\\d+W)?(\\d+D)?(T(?=\\d)(\\d+H)?(\\d+M)?(\\d+S)?)?$',
    '^(\\d{3}-)+$', '(-?\\d)+', '[(a+)+]', '\\(a+\\)+', '(a|b)*', '\\p{L}+(x)+', '[\\]+]+(a)*',
  ]) assert.equal(hasNestedQuantifier(p), false, p);
});

test('a pattern is checked for length, syntax and nesting', () => {
  assert.equal(patternProblem('^\\d+$'), null);
  assert.equal(patternProblem(42), null, "a non-string is the toolkit's to report");
  assert.match(patternProblem('a'.repeat(MAX_PATTERN_LENGTH + 1)), /257 characters long; at most 256/);
  assert.match(patternProblem('(a'), /not a valid regular expression/);
  assert.match(patternProblem('^(a+)+$'), /repeats a group/);
});

test('nesting depth counts objects and arrays, and stops past the cap', () => {
  assert.equal(nestingDepth('x'), 0);
  assert.equal(nestingDepth({ a: [1, { b: {} }] }), 4);
  const cyclic = {}; cyclic.self = cyclic; // a YAML alias can build this
  assert.equal(nestingDepth(cyclic, 5), 6);
});

test('a schema: patterns in data keywords and x- keys are not patterns, $refs are counted', () => {
  const bad = '(a+)+';
  assert.deepEqual(schemaLimitProblems({ const: { pattern: bad }, examples: [{ pattern: bad }], 'x-note': { pattern: bad }, properties: { pattern: { type: 'string' } } }), []);
  assert.deepEqual(schemaLimitProblems({ properties: { a: { pattern: bad } } }).map((m) => m.split(' ')[0]), ['/properties/a/pattern']);
  const refs = (n) => ({ $defs: Object.fromEntries(Array.from({ length: n }, (_, i) => [`d${i}`, { $ref: '#' }])) });
  assert.deepEqual(schemaLimitProblems(refs(100)), []);
  assert.match(schemaLimitProblems(refs(101))[0], /has 101 \$refs/);
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
