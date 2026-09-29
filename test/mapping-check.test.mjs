// The validator's checks for mapping/*.yaml (scripts/lib/mapping-check.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects } from '../scripts/lib/models.mjs';
import { mappingProblems, viaCycles } from '../scripts/lib/mapping-check.mjs';

const subjects = await loadSubjects();
const model = (sub, type) => subjects.find((s) => s.name === sub).models.find((m) => m.type === type);
const task = model('task', 'Task').schema;
const geometry = model('common', 'Geometry').schema;
const ok = { name: 'x', standard: { name: { ja: '標準', en: 'Standard' }, url: 'https://example.org/std' }, fields: { progress: { to: 'state' } } };

test('every published mapping passes', () => {
  for (const s of subjects) for (const m of s.models) for (const map of m.mappings) assert.deepEqual(mappingProblems(map, m.schema), [], `${m.type}/${map.name}`);
});

test('a field that is not in the model, or a malformed row, is reported', () => {
  assert.deepEqual(mappingProblems(ok, task), []);
  assert.deepEqual(mappingProblems({ ...ok, fields: { progres: { to: 'state' } } }, task), ['progres: not a field of this model']);
  assert.deepEqual(mappingProblems({ ...ok, fields: { progress: 'state' } }, task), ['progress: needs "to" (the corresponding item, or null when there is none)']);
  assert.deepEqual(mappingProblems({ ...ok, fields: { progress: { to: '' } } }, task), ['progress: "to" must be a non-empty string or null']);
  assert.deepEqual(mappingProblems({ ...ok, fields: { progress: { to: null, note: { ja: 'なし' } } } }, task), ['progress: note needs ja and en, and nothing else (quote a text that contains a comma)']);
  assert.deepEqual(mappingProblems({ ...ok, fields: { progress: { to: 'a', notes: 'x' } } }, task), ['progress: unknown key "notes" (allowed: to, note, column, transform, values, value, via)']);
  assert.deepEqual(mappingProblems({ ...ok, fields: {} }, task), ['fields must map at least one field']);
});

test('a text cut at a comma by YAML is reported', async () => {
  // { ja: …, en: closed → completed, otherwise … } parses as three keys.
  const { parse } = await import('yaml');
  const cut = parse('progress: { to: status, note: { ja: 完了, en: closed → completed, otherwise needs-action } }');
  assert.deepEqual(Object.keys(cut.progress.note), ['ja', 'en', 'otherwise needs-action']);
  assert.deepEqual(mappingProblems({ ...ok, fields: cut }, task), ['progress: note needs ja and en, and nothing else (quote a text that contains a comma)']);
  const quoted = parse('progress: { to: status, note: { ja: 完了, en: "closed → completed, otherwise needs-action" } }');
  assert.deepEqual(mappingProblems({ ...ok, fields: quoted }, task), []);
});

test('conversion rules are checked: columns, known transforms, flags values, via targets, the id template', () => {
  const names = new Set(['common/Geometry/jichitai-opendata-location']);
  const rule = (r) => mappingProblems({ ...ok, fields: { progress: { to: 'x', ...r } } }, task, names);
  assert.deepEqual(rule({ column: '状態' }), []);
  assert.deepEqual(rule({ column: [] }), ['progress: column must be a column name or a list of them']);
  assert.deepEqual(rule({ column: 'a', transform: 'upper' }), [`progress: unknown transform "upper" (known: text, code6, number, integer, numbers, flag, flags, split, municipality, machiazaId)`]);
  assert.deepEqual(rule({ transform: 'flags' }), ['progress: transform flags needs values as column: value']);
  assert.deepEqual(rule({ transform: 'flags', values: ['flood'] }), ['progress: transform flags needs values as column: value']);
  assert.deepEqual(rule({ column: 'a', values: { a: 'b' } }), ['progress: values is only for transform flags']);
  assert.deepEqual(rule({ column: 'a', transform: 'numbers' }), ['progress: transform numbers needs at least two columns']);
  assert.deepEqual(rule({ via: 'common/Geometry/nothing' }), ['progress: via must name a mapping file as subject/Type/name, got "common/Geometry/nothing"']);
  assert.deepEqual(rule({ column: 'a', value: 'b' }), ['progress: use one of column, value and via']);
  assert.deepEqual(mappingProblems({ ...ok, convert: { id: 'urn:ngsi-ld:Task:1' } }, task), ['convert.id must be a template such as "urn:ngsi-ld:Type:{attribute}"']);
  assert.deepEqual(mappingProblems({ ...ok, convert: { id: 'urn:ngsi-ld:Task:{externalId}' } }, task), []);
  assert.deepEqual(mappingProblems({ ...ok, convert: { id: 'urn:ngsi-ld:Task:{externalId}', ids: 'x' } }, task), ['unknown key "convert.ids" (allowed: id)']);
});

test('a value type maps its own members, with array positions', () => {
  assert.deepEqual(mappingProblems({ ...ok, fields: { type: { to: null }, coordinates: { to: 'x' }, 'coordinates[2]': { to: null } } }, geometry), []);
  assert.deepEqual(mappingProblems({ ...ok, fields: { 'coordinates[x]': { to: null } } }, geometry), ['coordinates[x]: not a field name']);
  assert.deepEqual(mappingProblems({ ...ok, fields: { 'type[0]': { to: null } } }, geometry), ['type[0]: type is not an array, so it has no positions']);
  assert.deepEqual(mappingProblems({ ...ok, fields: { 'progress[1]': { to: null } } }, task), ['progress[1]: progress is not an array, so it has no positions']);
});

test('the standard needs a bilingual name; url, licence, note and structure are checked when present', () => {
  assert.deepEqual(mappingProblems({ ...ok, standard: { name: { ja: '標準' } } }, task), ['standard.name needs ja and en, and nothing else (quote a text that contains a comma)']);
  assert.deepEqual(mappingProblems({ ...ok, standard: { ...ok.standard, url: 'example.org' } }, task), ['standard.url must be an http(s) URL with a host, got "example.org"']);
  assert.deepEqual(mappingProblems({ ...ok, standard: { ...ok.standard, note: { en: 'only English' } } }, task), ['standard.note needs ja and en, and nothing else (quote a text that contains a comma)']);
  assert.deepEqual(mappingProblems({ ...ok, structure: { ja: '構造' } }, task), ['structure needs ja and en, and nothing else (quote a text that contains a comma)']);
  assert.deepEqual(mappingProblems({ ...ok, standard: { ...ok.standard, urI: 'https://example.org/std' } }, task), ['unknown key "standard.urI" (allowed: name, url, license, note)']);
  assert.deepEqual(mappingProblems({ ...ok, feilds: {} }, task), ['unknown key "feilds" (allowed: standard, fields, structure, convert)']);
  const { standard, ...noStandard } = ok;
  assert.deepEqual(mappingProblems(noStandard, task), ['standard is required']);
});

test('a via cycle is found, whether a mapping names itself or two name each other', () => {
  const m = (via) => ({ fields: { address: { to: 'x', via } } });
  assert.deepEqual(viaCycles({ 'a/A/x': m('a/A/x') }), [['a/A/x', 'a/A/x']]);
  assert.deepEqual(viaCycles({ 'a/A/x': m('b/B/y'), 'b/B/y': m('a/A/x') }), [['a/A/x', 'b/B/y', 'a/A/x']]);
  assert.deepEqual(viaCycles(Object.fromEntries(subjects.flatMap((s) => s.models.flatMap((mo) => mo.mappings.map((map) => [`${s.name}/${mo.type}/${map.name}`, map]))))), []);
});
