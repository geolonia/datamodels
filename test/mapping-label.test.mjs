// The line under a mapping table on a model page says "for converting data" only
// when the file has conversion rules (/guide/rules#mapping): most mapping files
// only document how the model relates to the standard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects } from '../scripts/lib/models.mjs';
import { renderModelPage } from '../scripts/lib/site.mjs';

const subjects = await loadSubjects();
const disaster = subjects.find((s) => s.name === 'disaster');
const site = disaster.models.find((m) => m.type === 'EvacuationSite');
const doc = { name: 'doc-only', standard: { name: { ja: '文書', en: 'Doc' } }, fields: { name: { to: '名称' } } };
const rule = (r) => ({ name: 'with-rules', standard: { name: { ja: '変換', en: 'Rules' } }, fields: { name: { to: '名称', ...r } } });
const page = (mappings, lang = 'en') => renderModelPage(lang, lang === 'en' ? '/en' : '', subjects, disaster, { ...site, mappings });

test('a mapping file without conversion rules is not labelled as one for converting data', () => {
  const en = page([doc]);
  assert.match(en, /Mapping file \(YAML\) for this standard: <a href="[^"]*doc-only\.yaml">/);
  assert.doesNotMatch(en, /for converting data/);
  assert.match(page([doc], 'ja'), /この標準との対応表（YAML）/);
});

test('a column, value, via, transform or convert.id makes it one for converting data', () => {
  for (const r of [{ column: '名称' }, { value: 'x' }, { via: 'common/JapaneseAddress/x' }, { transform: 'flags' }]) {
    assert.match(page([rule(r)]), /Mapping file \(YAML\) for converting data from this standard: <a href="[^"]*with-rules\.yaml">/, JSON.stringify(r));
  }
  assert.match(page([{ ...doc, convert: { id: 'urn:x:{name}' } }]), /for converting data from this standard/);
  assert.match(page([rule({ column: '名称' })], 'ja'), /この標準のデータを変換するための対応表（YAML）/);
});
