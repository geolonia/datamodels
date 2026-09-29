// /models/standards/ (scripts/lib/standards.mjs): every mapping file once, linked to its table.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects } from '../scripts/lib/models.mjs';
import { standardGroup, standardRows, standardsPage } from '../scripts/lib/standards.mjs';

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

test('rows are grouped (government, international, tools), then sorted by name', () => {
  const rows = standardRows('en', subjects);
  const order = ['government', 'international', 'tool'];
  assert.deepEqual([...new Set(rows.map((r) => r.group))], order, 'every group once, in this order');
  for (const g of order) {
    const names = rows.filter((r) => r.group === g).map((r) => r.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'en')), g);
  }
  const group = (name) => rows.find((r) => r.name.startsWith(name)).group;
  assert.equal(group('Essential Elements of Information'), 'government');
  assert.equal(group('Municipal standard open dataset'), 'government');
  assert.equal(group('JSCalendar'), 'international');
  assert.equal(group('Redmine'), 'tool');
  const page = standardsPage('ja', '', subjects);
  assert.ok(page.indexOf('## 国・自治体') < page.indexOf('## 国際標準') && page.indexOf('## 国際標準') < page.indexOf('## ツール'));
});

test('a standard of an unknown publisher fails the build instead of landing in a group by chance', () => {
  assert.equal(standardGroup('https://www.bousai.go.jp/x.pdf'), 'government');
  assert.throws(() => standardGroup('https://example.com/spec'), /no group/);
  assert.throws(() => standardGroup(undefined), /no group/);
});

test('standards link their page, not a download', () => {
  for (const r of standardRows('ja', subjects)) assert.doesNotMatch(r.url, /\.(xlsx?|csv|zip)$/i, r.name);
});

test('a standard\'s files sit together, and a pipe in a name cannot break the table', () => {
  const names = standardRows('en', subjects).map((r) => r.name);
  const eei = names.map((n, i) => (n.startsWith('Essential Elements of Information') ? i : -1)).filter((i) => i >= 0);
  assert.ok(eei.length >= 4 && eei.at(-1) - eei[0] === eei.length - 1, 'the EEI files are consecutive');
  const odd = { name: 'odd', version: '1.0.0', title: { en: 'Odd' }, models: [{ type: 'X', catalog: {}, mappings: [{ name: 'x', standard: { name: { en: 'A | B' }, url: 'https://www.rfc-editor.org/rfc/rfc0000' }, fields: { a: { to: null } } }] }] };
  const page = standardsPage('en', '/en', [odd]);
  assert.match(page, /\| \[A \\\| B\]\(<https:\/\/www\.rfc-editor\.org\/rfc\/rfc0000>\) \| \[`X`\]/);
  assert.match(page, /\| 0 of 1 \| — \|/);
});

test('a licence is shown in the page\'s language, with no English on the Japanese page', () => {
  const english = /\b(and|under|the|compatible|schema|repository)\b/;
  for (const r of standardRows('ja', subjects)) assert.doesNotMatch(r.license, english, `${r.type} ${r.anchor}`);
  const en = standardRows('en', subjects);
  assert.ok(en.some((r) => r.license.startsWith('Public Data License (Version 1.0)')));
  const one = (license) => standardRows('en', [{ name: 'x', version: '1.0.0', title: { en: 'X' }, models: [{ type: 'X', catalog: {}, mappings: [{ name: 'x', standard: { name: { en: 'X' }, url: 'https://www.rfc-editor.org/rfc/rfc0000', license }, fields: {} }] }] }])[0].license;
  assert.equal(one('CC BY 4.0'), 'CC BY 4.0', 'a plain string reads the same in both languages');
  assert.equal(one({ ja: 'スキーマは CC BY 4.0', en: 'CC BY 4.0 (schema)' }), 'CC BY 4.0 (schema)');
  assert.equal(one(undefined), '');
});
