// One NGSI-LD type per attribute name across the catalog (#326). GeonicDB
// refuses to register, in one tenant, models whose attributes of the same name
// have different types (a Property here, a LanguageProperty there), so a
// catalog that mixes them could not be used whole in one tenant.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects, attributesOf } from '../scripts/lib/models.mjs';

test('every attribute name has one NGSI-LD type in every model of the catalog', async () => {
  const seen = new Map(); // name -> Map(type -> first model)
  for (const subject of await loadSubjects()) {
    for (const model of subject.models) {
      for (const [name, prop] of attributesOf(model)) {
        const type = prop['x-ngsi']?.type;
        if (!type) continue;
        if (!seen.has(name)) seen.set(name, new Map());
        const types = seen.get(name);
        if (!types.has(type)) types.set(type, `${subject.name}/${model.type}`);
      }
    }
  }
  const mixed = [...seen].filter(([, types]) => types.size > 1)
    .map(([name, types]) => `${name}: ${[...types].map(([t, m]) => `${t} (${m})`).join(', ')}`);
  assert.deepEqual(mixed, []);
});
