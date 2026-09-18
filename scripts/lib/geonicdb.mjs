// Build a GeonicDB Custom Data Model request body from a catalog model.
// The body is what POST /custom-data-models accepts; contextUrl points at the
// exact catalog context so the broker uses the catalog vocabulary.
import { attributesOf, subjectUrls, CORE_CONTEXT_URL } from './models.mjs';

function valueTypeOf(prop) {
  const ngsi = prop['x-ngsi']?.type;
  if (ngsi === 'Relationship') return 'uri';
  if (ngsi === 'GeoProperty') return 'geojson';
  if (prop.format === 'date-time') return 'datetime';
  if (prop.allOf || prop.$ref) return 'object'; // value type referenced by $ref
  if (prop.format === 'uri') return 'uri';
  return prop.type; // string | number | integer | boolean | array | object
}

/**
 * Options:
 *   typePrefix       prefix for the type name (tenant-specific naming)
 *   contextUrl       context to declare instead of the exact catalog context
 *   allowAdditional  additionalProperties: true, so attributes the model does
 *                    not know are accepted (unvalidated)
 *   extend           { contextUrl?, description?, propertyDetails? }: a tenant's
 *                    own attributes merged into the body. A catalog attribute
 *                    cannot be redefined; a name clash throws. The extension's
 *                    contextUrl should import the catalog context and define
 *                    only the added terms.
 *   typeName         full replacement of the type name (alias; same IRI)
 *   rename           { catalogName: aliasName }: attribute aliases. The body
 *                    keeps each property's catalog IRI in `@context`, so the
 *                    caller's contextUrl must map the alias to that IRI.
 */
export function toCustomDataModel(subject, model, { typePrefix = '', typeName, contextUrl, allowAdditional = false, extend, rename = {} } = {}) {
  const urls = subjectUrls(subject);
  const catalogNames = new Set(attributesOf(model).map(([n]) => n));
  for (const [from, to] of Object.entries(rename)) {
    if (!catalogNames.has(from)) throw new Error(`rename: "${from}" is not an attribute of ${model.type}`);
    if (!/^[A-Za-z0-9_]+$/.test(to)) throw new Error(`rename: alias "${to}" must match [A-Za-z0-9_]+ (GeonicDB attribute name rule)`);
    if (catalogNames.has(to) && rename[to] === undefined) throw new Error(`rename: alias "${to}" collides with catalog attribute "${to}" of ${model.type}`);
  }
  const aliasTargets = Object.values(rename);
  if (new Set(aliasTargets).size !== aliasTargets.length) throw new Error('rename: two attributes mapped to the same alias');
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
    propertyDetails[rename[name] ?? name] = d;
  }
  if (extend?.propertyDetails) {
    for (const [name, detail] of Object.entries(extend.propertyDetails)) {
      if (name in propertyDetails) throw new Error(`extension redefines catalog attribute "${name}" of ${model.type}; add a new attribute instead`);
      if (!detail || typeof detail !== 'object' || !detail.ngsiType || !detail.valueType) throw new Error(`extension attribute "${name}" needs ngsiType and valueType`);
      propertyDetails[name] = detail;
    }
  }
  return {
    type: typeName ?? `${typePrefix}${model.type}`,
    domain: subject.name,
    description: extend?.description ?? model.catalog?.description?.ja ?? model.schema.description,
    contextUrl: extend?.contextUrl ?? contextUrl ?? urls.contextExact,
    propertyDetails,
    additionalProperties: allowAdditional ? true : (model.schema.additionalProperties === false ? false : true),
  };
}
