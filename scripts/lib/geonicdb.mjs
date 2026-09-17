// Build a GeonicDB Custom Data Model request body from a catalog model.
// The body is what POST /custom-data-models accepts; contextUrl points at the
// exact catalog context so the broker uses the catalog vocabulary.
import { attributesOf, subjectUrls, CORE_CONTEXT_URL } from './models.mjs';

function valueTypeOf(prop) {
  const ngsi = prop['x-ngsi']?.type;
  if (ngsi === 'Relationship') return 'uri';
  if (ngsi === 'GeoProperty') return 'geojson';
  if (prop.format === 'date-time') return 'datetime';
  if (prop.format === 'uri') return 'uri';
  return prop.type; // string | number | integer | boolean | array | object
}

export function toCustomDataModel(subject, model, { typePrefix = '', contextUrl } = {}) {
  const urls = subjectUrls(subject);
  const example = model.examples['example.json'] ?? {};
  const propertyDetails = {};
  for (const [name, prop] of attributesOf(model)) {
    const d = {
      ngsiType: prop['x-ngsi'].type,
      valueType: valueTypeOf(prop),
      example: example[name],
      required: (model.schema.required ?? []).includes(name),
      description: model.catalog?.attributes?.[name]?.ja ?? prop.description ?? '',
    };
    if (prop['x-geonicdb']?.indexed) d.indexed = true;
    // GeonicDB reads a property-level `@context` as the term IRI when it
    // generates a context itself (custom-data-model.service.ts, terms.set).
    // With contextUrl set it is not needed, but carrying the IRI keeps the
    // body self-describing if contextUrl is ever dropped. Core-context terms
    // are left to the broker.
    const iri = prop['x-iri'];
    if (typeof iri === 'string' && /^https?:\/\//.test(iri) && !iri.startsWith(CORE_CONTEXT_URL)) d['@context'] = iri;
    const validation = {};
    for (const k of ['minLength', 'maxLength', 'minimum', 'maximum', 'pattern', 'enum']) if (prop[k] !== undefined) validation[k] = prop[k];
    if (Object.keys(validation).length) d.validation = validation;
    propertyDetails[name] = d;
  }
  return {
    type: `${typePrefix}${model.type}`,
    domain: subject.name,
    description: model.catalog?.description?.ja ?? model.schema.description,
    contextUrl: contextUrl ?? urls.contextExact,
    propertyDetails,
    additionalProperties: model.schema.additionalProperties === false ? false : true,
  };
}
