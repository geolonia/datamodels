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
  note: { ja: 'Custom Data Model の request body。`contextUrl` を含みます。', en: 'Custom Data Model request body, `contextUrl` included.' },
  guide: '/guide/geonicdb',
  /** URL of this adapter's file for a model, or null when the model has none. */
  urlFor(subject, model) {
    return model.kind === 'entity' ? `${BASE_URL}/adapters/geonicdb/${subject.name}/${model.type}.json` : null;
  },
  content(subject, model) {
    return JSON.stringify(toCustomDataModel(subject, model), null, 2) + '\n';
  },
};
