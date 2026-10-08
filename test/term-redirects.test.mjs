// /ns/<subject>/<term> redirects (scripts/lib/publish.mjs termRedirects): every
// minted type and attribute IRI leads to a heading on a model page that exists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects, attributesOf } from '../scripts/lib/models.mjs';
import { termRedirects } from '../scripts/lib/publish.mjs';

const subjects = await loadSubjects();

test('attribute IRIs redirect to a model page that documents the attribute', () => {
  for (const s of subjects) {
    for (const line of termRedirects(s)) {
      const [from, to] = line.split(/\s+/);
      const m = /^\/models\/([^/]+)\/([^/]+)\/#(.+)$/.exec(to);
      if (!m) continue; // the namespace and type pages
      assert.equal(m[1], s.name, line);
      const model = s.models.find((x) => x.type === m[2]);
      assert.ok(model, `${line}: no model ${m[2]}`);
      assert.ok(attributesOf(model).some(([n]) => n === m[3]), `${line}: ${m[2]} has no attribute ${m[3]}`);
      assert.equal(from, `/ns/${s.name}/${m[3]}`, line);
    }
  }
});

test('an attribute shared by several models redirects once, to a model page', () => {
  const disaster = subjects.find((s) => s.name === 'disaster');
  const lines = termRedirects(disaster).filter((l) => l.startsWith('/ns/disaster/nationalShelterId '));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /\/models\/disaster\/[A-Za-z]+\/#nationalShelterId\s+302$/);
});

test('no IRI gets two redirects', () => {
  for (const s of subjects) {
    const from = termRedirects(s).map((l) => l.split(/\s+/)[0]);
    assert.equal(new Set(from).size, from.length, s.name);
  }
});
