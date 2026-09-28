// DesignatedShelter against GSI's designated shelter data (指定避難所データ,
// 千代田区, https://hinanmap.gsi.go.jp/hinanjocp/hinanbasho/koukaidate.html):
// real rows, converted as mapping/gsi-designated-shelter.yaml describes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { loadSubjects } from '../scripts/lib/models.mjs';

const subjects = await loadSubjects();
const disaster = subjects.find((s) => s.name === 'disaster');
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
for (const s of subjects) for (const m of s.models) if (m.kind === 'value') ajv.addSchema(m.schema, m.schema.$id);
const validate = ajv.compile(disaster.models.find((m) => m.type === 'DesignatedShelter').schema);

// GSI row 11: 都立一橋高校, and row 15: 番町小学校.
const row = (id, name, address, lat, lon) => ({
  id: `urn:ngsi-ld:DesignatedShelter:${id}`, type: 'DesignatedShelter', name, nationalShelterId: id, localGovernmentCode: '131016', shelterType: 'general',
  address: { addressCountry: 'JP', addressText: address }, location: { type: 'Point', coordinates: [lon, lat] }, alsoEmergencyEvacuationSite: true,
});
const hitotsubashi = row('E1310100012111', '都立一橋高校', '東京都千代田区東神田1-12-13', 35.6945488, 139.7810002);
const bancho = row('E1310100002111', '番町小学校', '東京都千代田区六番町8', 35.688111802263, 139.73407899331);

test('real GSI rows are valid DesignatedShelters', () => {
  for (const e of [hitotsubashi, bancho]) assert.ok(validate(e), `${e.name}: ${ajv.errorsText(validate.errors)}`);
});

test('a shelter needs one of the two identifiers; a site ID or an unknown type is rejected', () => {
  const { nationalShelterId, ...noId } = hitotsubashi;
  assert.ok(!validate(noId), 'no nationalShelterId and no externalShelterId');
  assert.ok(validate({ ...noId, externalShelterId: '13101-0012' }), 'the municipal ID is enough');
  assert.ok(!validate({ ...hitotsubashi, nationalShelterId: 'E1310100012201' }), 'type 20 is an emergency evacuation site');
  assert.ok(!validate({ ...hitotsubashi, shelterType: 'temporary' }));
});

test('shelterType agrees with the type digit of nationalShelterId', () => {
  assert.ok(!validate({ ...hitotsubashi, shelterType: 'welfare' }), '…111 is a general shelter');
  assert.ok(validate({ ...hitotsubashi, nationalShelterId: 'E1310100012121', shelterType: 'welfare' }), '…121 is a welfare shelter');
  assert.ok(!validate({ ...hitotsubashi, nationalShelterId: 'E1310100012121' }), 'general with a welfare ID');
  const { shelterType, ...noType } = hitotsubashi;
  assert.ok(validate(noType), 'shelterType is optional');
  const { nationalShelterId, ...municipalOnly } = { ...hitotsubashi, externalShelterId: '13101-0012', shelterType: 'welfare' };
  assert.ok(validate(municipalOnly), 'no national ID: nothing to agree with');
});

test('the shelter and the site at the same school share the facility code, and the examples link them', () => {
  const ex = (t) => disaster.models.find((m) => m.type === t).examples['example.json'];
  const shelter = ex('DesignatedShelter'), site = ex('EvacuationSite'), operation = ex('EvacuationShelter');
  assert.equal(shelter.nationalShelterId.slice(6, 11), site.nationalShelterId.slice(6, 11));
  assert.equal(shelter.site, site.id);
  assert.equal(operation.shelter, shelter.id);
  assert.equal(operation.site, site.id);
  assert.equal(operation.nationalShelterId, shelter.nationalShelterId);
});
