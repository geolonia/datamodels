// GeonicDB adapter: publishes a ready-made Custom Data Model request body per
// entity model at /adapters/geonicdb/<subject>/<Type>.json.
//
// Adapter interface (see adapters/README.md): { name, label, urlFor, content }.
// The catalog core never imports an adapter; scripts/build.mjs discovers them.
import { BASE_URL } from '../../scripts/lib/models.mjs';
import { toCustomDataModel } from './custom-data-model.mjs';

export default {
  name: 'geonicdb',
  label: { ja: 'GeonicDB', en: 'GeonicDB' },
  note: { ja: 'GeonicDB（Geolonia の NGSI-LD ブローカー）に登録する Custom Data Model の request body。`contextUrl` を含みます。', en: 'Custom Data Model request bodies for GeonicDB, Geolonia\'s NGSI-LD broker, with `contextUrl` included.' },
  guide: '/guide/geonicdb',
  use: { ja: 'GeonicDB の `/custom-data-models` に POST して、テナントにモデルを登録します。登録すると、その型のエンティティはモデルで検証されます。', en: 'POST it to GeonicDB\'s `/custom-data-models` to register the model in a tenant; entities of that type are then validated against the model.' },
  // Tenant-specific variants (prefixes, aliases, extra attributes), from a clone of this repository.
  command: 'node adapters/geonicdb/export.mjs <subject>',
  /** URL of this adapter's file for a model, or null when the model has none. */
  urlFor(subject, model) {
    return model.kind === 'entity' ? `${BASE_URL}/adapters/geonicdb/${subject.name}/${model.type}.json` : null;
  },
  content(subject, model) {
    return JSON.stringify(toCustomDataModel(subject, model), null, 2) + '\n';
  },
};
