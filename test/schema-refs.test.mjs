// A schema's $ref points to a datamodels.jp schema or inside the file (#292,
// threat model P-REFS-CATALOG-ONLY).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schemaRefProblems } from '../scripts/lib/catalog-rules.mjs';

const at = (ref, key = '$ref') => ({ type: 'object', properties: { a: { [key]: ref } } });

test('a pointer and a catalog schema URL pass', () => {
  assert.deepEqual(schemaRefProblems(at('#/$defs/Point')), []);
  assert.deepEqual(schemaRefProblems(at('https://datamodels.jp/schema/common/Geometry/v1.0.0.json')), []);
  assert.deepEqual(schemaRefProblems(at('https://datamodels.jp/schema/common/Geometry/v1.0.0.json#/$defs/Point')), []);
});

test('a reference to another site, over http, relative or outside /schema/ fails', () => {
  for (const ref of [
    'https://example.org/schema.json',
    'http://datamodels.jp/schema/common/Geometry/v1.0.0.json',
    'Geometry/v1.0.0.json',
    '../common/Geometry/v1.0.0.json',
    'https://datamodels.jp/schema/../context/common/v1.jsonld',
    'https://datamodels.jp/ns/common/Geometry',
    'https://datamodels.jp.example.org/schema/x.json',
    'https://datamodels.jp@example.org/schema/x.json',
    'https://datamodels.jp/schema/x/..%2f..%2fcontext/y.json',
    'https://datamodels.jp/schema/x/%5cy.json',
    'https://datamodels.jp/schema/x.json?v=1',
    'https://datamodels.jp/schema/x.json?',
    // Not normalised: written as the URL parser would write it, the text shows where the reference points.
    'HTTPS://datamodels.jp/schema/common/Geometry/v1.0.0.json',
    'https://datamodels.jp:443/schema/common/Geometry/v1.0.0.json',
  ]) {
    const problems = schemaRefProblems(at(ref));
    assert.equal(problems.length, 1, ref);
    assert.match(problems[0], /must be a "#" pointer or an absolute https:\/\/datamodels\.jp\/schema\/ URL in normalised form/);
  }
});

test('refs under patternProperties, dependentSchemas and dependencies are checked, also below a property named like a keyword', () => {
  const schema = { patternProperties: { '^x': { $ref: 'https://example.org/p.json' } }, dependentSchemas: { a: { $ref: 'https://example.org/d.json' } }, dependencies: { const: { $ref: 'https://example.org/c.json' }, b: ['a'] } };
  assert.equal(schemaRefProblems(schema).length, 3);
});

test('a ? inside the fragment is allowed', () => {
  assert.deepEqual(schemaRefProblems({ $ref: 'https://datamodels.jp/schema/x.json#/$defs/a?b' }), []);
});

test('$dynamicRef and a ref that is not a string are checked too', () => {
  assert.equal(schemaRefProblems(at('https://example.org/s.json', '$dynamicRef')).length, 1);
  assert.equal(schemaRefProblems(at(42)).length, 1);
});

test('refs are found in nested and array keywords, with their path', () => {
  const schema = { $defs: { X: { anyOf: [{ $ref: '#/$defs/Y' }, { items: { $ref: 'https://example.org/i.json' } }] } } };
  assert.deepEqual(schemaRefProblems(schema), ['/$defs/X/anyOf/1/items/$ref "https://example.org/i.json" must be a "#" pointer or an absolute https://datamodels.jp/schema/ URL in normalised form']);
});

test('a property named $ref and data keywords are not references', () => {
  const schema = {
    properties: { $ref: { type: 'string' } },
    const: { $ref: 'https://example.org/a' },
    enum: [{ $ref: 'https://example.org/b' }],
    default: { $ref: 'https://example.org/c' },
    examples: [{ $ref: 'https://example.org/d' }],
    'x-note': { $ref: 'https://example.org/e' },
    dependentRequired: { $ref: ['name'], $dynamicRef: ['other'] },
  };
  assert.deepEqual(schemaRefProblems(schema), []);
});
