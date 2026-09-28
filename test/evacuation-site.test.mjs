// EvacuationSite against real published rows (#85): one row of a municipality's
// 指定緊急避難場所一覧 (自治体標準オープンデータセット 03; Utsunomiya City, CC BY,
// https://catalog.city.utsunomiya.tochigi.jp/dataset/shiteikinkyuuhinanbashoichiran)
// and one of GSI's designated emergency evacuation site data (千代田区,
// https://hinanmap.gsi.go.jp/hinanjocp/hinanbasho/koukaidate.html), converted
// as the mapping files describe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { loadSubjects } from '../scripts/lib/models.mjs';

const subjects = await loadSubjects();
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
for (const s of subjects) for (const m of s.models) if (m.kind === 'value') ajv.addSchema(m.schema, m.schema.$id);
const validate = ajv.compile(subjects.find((s) => s.name === 'disaster').models.find((m) => m.type === 'EvacuationSite').schema);

// Utsunomiya, ID 1: the municipal ID, a code that lost its leading zero (92011, restored to 092011),
// the whole address in one column, hazards 洪水, 崖崩れ…, 地震, and 指定避難所との重複 = 1.
const municipal = {
  id: 'urn:ngsi-ld:EvacuationSite:092011-1', type: 'EvacuationSite', name: '中央小学校', nameKana: 'チュウオウショウガッコウ',
  externalSiteId: '1', localGovernmentCode: '092011',
  address: { addressCountry: 'JP', addressRegion: '栃木県', localGovernmentCode: '092011', addressText: '栃木県宇都宮市中央本町1-29' },
  location: { type: 'Point', coordinates: [139.8847723, 36.55925966] },
  hazardTypes: ['flood', 'landslide', 'earthquake'], alsoDesignatedShelter: true, telephone: '028-635-3043',
};
// GSI, 千代田区 row 28: no municipal ID, the nationwide common ID instead.
const gsi = {
  id: 'urn:ngsi-ld:EvacuationSite:E1310100002201', type: 'EvacuationSite', name: '番町小学校',
  nationalShelterId: 'E1310100002201', localGovernmentCode: '131016',
  address: { addressCountry: 'JP', addressText: '東京都千代田区六番町8' },
  location: { type: 'Point', coordinates: [139.73407899331, 35.688111802263] },
  hazardTypes: ['flood', 'stormSurge', 'earthquake', 'inlandFlood'], alsoDesignatedShelter: true,
};

test('a row of a municipal list and a row of GSI data are valid EvacuationSites', () => {
  assert.ok(validate(municipal), ajv.errorsText(validate.errors));
  assert.ok(validate(gsi), ajv.errorsText(validate.errors));
});

test('a site needs one of the two identifiers, a name and the publishing municipality', () => {
  const { externalSiteId, ...noMunicipalId } = municipal;
  assert.ok(!validate(noMunicipalId), 'no externalSiteId and no nationalShelterId');
  for (const k of ['name', 'localGovernmentCode']) { const { [k]: _, ...rest } = municipal; assert.ok(!validate(rest), k); }
});

test('values the standard does not have are rejected', () => {
  assert.ok(!validate({ ...municipal, hazardTypes: ['fire'] }), 'unknown hazard');
  assert.ok(!validate({ ...municipal, hazardTypes: [] }), 'an empty hazard list');
  assert.ok(!validate({ ...municipal, localGovernmentCode: '92011' }), 'a code with its leading zero lost');
  assert.ok(!validate({ ...gsi, nationalShelterId: 'E1310100002111' }), 'a designated-shelter ID (type 11) on a site');
  assert.ok(!validate({ ...municipal, location: { type: 'LineString', coordinates: [[139.88, 36.55], [139.89, 36.56]] } }), 'a site is a point');
});
