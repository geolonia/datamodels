// /models/standards/ (scripts/lib/standards.mjs): every mapping file once, linked to its table.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects } from '../scripts/lib/models.mjs';
import { standardRows, standardsPage } from '../scripts/lib/standards.mjs';

const subjects = await loadSubjects();
const files = subjects.flatMap((s) => s.models.flatMap((m) => m.mappings.map((map) => `${m.type}#mapping-${map.name}`)));

test('every mapping file is one row, linked to its table on the model page', () => {
  for (const lang of ['ja', 'en']) {
    const rows = standardRows(lang, subjects);
    assert.deepEqual(rows.map((r) => `${r.type}#${r.anchor}`).sort(), [...files].sort());
    const page = standardsPage(lang, lang === 'en' ? '/en' : '', subjects);
    for (const r of rows) assert.ok(page.includes(`(${lang === 'en' ? '/en' : ''}${r.page}#${r.anchor})`), `${r.type} ${r.anchor}`);
  }
});

test('a standard\'s files sit together, and a pipe in a name cannot break the table', () => {
  const names = standardRows('en', subjects).map((r) => r.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'en')));
  const eei = names.map((n, i) => (n.startsWith('Essential Elements of Information') ? i : -1)).filter((i) => i >= 0);
  assert.ok(eei.length >= 4 && eei.at(-1) - eei[0] === eei.length - 1, 'the EEI files are consecutive');
  const odd = { name: 'odd', version: '1.0.0', title: { en: 'Odd' }, models: [{ type: 'X', catalog: {}, mappings: [{ name: 'x', standard: { name: { en: 'A | B' } }, fields: { a: { to: null } } }] }] };
  const page = standardsPage('en', '/en', [odd]);
  assert.match(page, /\| A \\\| B \| \[`X`\]/);
  assert.match(page, /\| 0 of 1 \| — \|/);
});
