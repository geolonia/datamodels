// The CSV converter (scripts/lib/convert.mjs) on the shapes real lists have (#85).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects } from '../scripts/lib/models.mjs';
import { decodeCsv, parseCsv, code6, convertRows } from '../scripts/lib/convert.mjs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const subjects = await loadSubjects();
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
for (const s of subjects) for (const m of s.models) if (m.kind === 'value') ajv.addSchema(m.schema, m.schema.$id);
const validSite = ajv.compile(subjects.find((s) => s.name === 'disaster').models.find((m) => m.type === 'EvacuationSite').schema);
const mappings = Object.fromEntries(subjects.flatMap((s) => s.models.flatMap((m) => m.mappings.map((map) => [`${s.name}/${m.type}/${map.name}`, map]))));

test('encoding: UTF-8 with or without BOM, else Shift_JIS', () => {
  const enc = new TextEncoder();
  assert.deepEqual(decodeCsv(new Uint8Array([0xef, 0xbb, 0xbf, ...enc.encode('ID,名称')])), { text: 'ID,名称', encoding: 'utf-8 (BOM)' });
  assert.deepEqual(decodeCsv(enc.encode('ID,名称')), { text: 'ID,名称', encoding: 'utf-8' });
  // "ID,名称" in Shift_JIS: 名 = 96 BC, 称 = 8F CC.
  assert.deepEqual(decodeCsv(new Uint8Array([0x49, 0x44, 0x2c, 0x96, 0xbc, 0x8f, 0xcc])), { text: 'ID,名称', encoding: 'shift_jis' });
});

test('CSV: quoted fields with commas, doubled quotes and line breaks; CRLF; blank lines', () => {
  assert.deepEqual(parseCsv('a,b,c\r\n"x, y","say ""hi""","line\nbreak"\r\n\r\n1,,3\r\n'), [
    { a: 'x, y', b: 'say "hi"', c: 'line\nbreak' },
    { a: '1', b: '', c: '3' },
  ]);
});

test('local government codes: kept, repaired when the check digit proves it, else reported', () => {
  assert.deepEqual(code6('131016'), { value: '131016' });
  assert.deepEqual(code6('92011'), { value: '092011', fix: { repair: 'restored the leading zero', detail: '92011 → 092011' } });
  assert.deepEqual(code6('13101'), { value: '131016', fix: { repair: 'added the check digit', detail: '13101 → 131016' } });
  assert.deepEqual(code6('1100'), { value: '011002', fix: { repair: 'restored the leading zero and added the check digit', detail: '1100 → 011002' } });
  assert.match(code6('131017').problem, /check digit does not match/);
  assert.match(code6('99999').problem, /not a local government code/);
});

// Utsunomiya's first row (自治体標準オープンデータセット 03, CC BY) as published:
// codes without their leading zero, the whole address in 所在地_市区町村.
const sheet03 = parseCsv([
  '全国地方公共団体コード,ID,名称,名称_カナ,所在地_全国地方公共団体コード,町字ID,所在地_連結表記,所在地_都道府県,所在地_市区町村,緯度,経度,電話番号,災害種別_洪水,災害種別_崖崩れ、土石流及び地滑り,災害種別_地震,指定避難所との重複,想定収容人数,対象となる町会・自治会',
  '92011,1,中央小学校,チュウオウショウガッコウ,92011,,栃木県宇都宮市中央本町1-29,栃木県,宇都宮市中央本町1-29,36.55925966,139.8847723,028-635-3043,1,1,1,1,,',
].join('\n'));

test('a sheet 03 row becomes a valid EvacuationSite, with every repair reported', () => {
  const [r] = convertRows(sheet03, mappings['disaster/EvacuationSite/jichitai-opendata-site'], { type: 'EvacuationSite', mappings });
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.entity, {
    id: 'urn:ngsi-ld:EvacuationSite:092011-1', type: 'EvacuationSite', externalSiteId: '1', localGovernmentCode: '092011',
    name: '中央小学校', nameKana: 'チュウオウショウガッコウ',
    address: { addressCountry: 'JP', addressRegion: '栃木県', addressText: '栃木県宇都宮市中央本町1-29', localGovernmentCode: '092011' },
    location: { type: 'Point', coordinates: [139.8847723, 36.55925966] },
    telephone: '028-635-3043', hazardTypes: ['flood', 'landslide', 'earthquake'], alsoDesignatedShelter: true,
  });
  assert.ok(validSite(r.entity), ajv.errorsText(validSite.errors));
  assert.deepEqual(r.fixes.map((f) => `${f.field}: ${f.repair}`).sort(), [
    'addressLocality: left out 所在地_市区町村: not a municipality name',
    'localGovernmentCode: restored the leading zero',
    'localGovernmentCode: restored the leading zero',
  ]);
});

test('a GSI row becomes a valid EvacuationSite; the municipality comes from --set', () => {
  const rows = parseCsv('NO,共通ID,施設・場所名,住所,洪水,崖崩れ、土石流及び地滑り,高潮,地震,津波,大規模な火事,内水氾濫,火山現象,指定避難所との住所同一,緯度,経度,備考\n28,E1310100002201,番町小学校,東京都千代田区六番町8,1,,1,1,,,1,,1,35.688111802263,139.73407899331,');
  const [r] = convertRows(rows, mappings['disaster/EvacuationSite/gsi-emergency-site'], { type: 'EvacuationSite', mappings, set: { localGovernmentCode: '13101' } });
  assert.deepEqual(r.problems, []);
  assert.ok(validSite(r.entity), ajv.errorsText(validSite.errors));
  assert.equal(r.entity.id, 'urn:ngsi-ld:EvacuationSite:E1310100002201');
  assert.equal(r.entity.localGovernmentCode, '131016');
  assert.equal(r.entity.address.localGovernmentCode, undefined, '--set is for the top level only');
  assert.deepEqual(r.entity.hazardTypes, ['flood', 'stormSurge', 'earthquake', 'inlandFlood']);
});

test('a row without the values the id needs is reported, not guessed', () => {
  const [r] = convertRows([{ 名称: 'x' }], mappings['disaster/EvacuationSite/jichitai-opendata-site'], { type: 'EvacuationSite', mappings });
  assert.match(r.problems.join(' '), /id: no localGovernmentCode, externalSiteId/);
  assert.equal(r.entity.id, undefined);
});
