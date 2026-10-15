// Build a GeonicDB Custom Data Model request body from a catalog model.
// The body is what POST /custom-data-models accepts; contextUrl points at the
// exact catalog context so the broker uses the catalog vocabulary.
import { attributesOf, subjectUrls, dateFormats } from '../../scripts/lib/models.mjs';

// GeonicDB's datetime value type (and its alias date) accepts only a date-time,
// so a value that may be a plain date is a string checked by a pattern:
// YYYY-MM-DD, and for a date or date-time the time part GeonicDB's datetime
// check requires (seconds and Z or an offset). GeonicDB compiles patterns only
// without repeated groups that contain alternatives; this has none.
// A string check rejects a typed value ({"@type": "Date" | "DateTime", ...}),
// so these attributes need the plain string until GeonicDB can check "a date
// or a date-time" (#185). Typed date-times pass datetime from GeonicDB v0.22.0 (geonicdb#3368).
const DATE = '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])';
const TIME = 'T(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)';
export const DATE_PATTERN = `^${DATE}$`;
export const DATE_OR_DATE_TIME_PATTERN = `^${DATE}(?:${TIME})?$`;

// GeonicDB (v0.22.0) registers only these NGSI-LD types as a property's ngsiType
// (CUSTOM_DATA_MODELS.NGSI_TYPES). A VocabProperty or JsonProperty is registered
// as a Property: the model does not check the attribute's NGSI-LD type, and the
// entity is still sent and stored as a VocabProperty or JsonProperty (#280).
// Once GeonicDB accepts them, they are sent as their own types (#285).
const GEONICDB_NGSI_TYPES = new Set(['Property', 'GeoProperty', 'Relationship', 'LanguageProperty']);
const geonicdbNgsiType = (type) => (GEONICDB_NGSI_TYPES.has(type) ? type : 'Property');
const VALUE_CHECKS = ['minLength', 'maxLength', 'minimum', 'maximum', 'pattern', 'enum'];

/**
 * The full IRI of a VocabProperty term, or undefined, expanded with `terms` (the
 * context's term definitions, imports included) as JSON-LD expands a `vocab`
 * value: a term the context defines, a compact IRI whose prefix it defines, or
 * an absolute IRI. GeonicDB stores and checks the expanded IRI (#280).
 */
export function expandVocabTerm(terms, term, depth = 0) {
  if (typeof term !== 'string' || depth >= 10) return undefined;
  const idOf = (def) => (typeof def === 'string' ? def : def?.['@id']);
  const defined = idOf(terms[term]);
  if (typeof defined === 'string' && defined !== term) return expandVocabTerm(terms, defined, depth + 1);
  const i = term.indexOf(':');
  if (i <= 0) return undefined;
  const rest = term.slice(i + 1);
  // https://example.org/x is an absolute IRI, not the prefix "https".
  const base = rest.startsWith('//') ? undefined : idOf(terms[term.slice(0, i)]);
  if (typeof base === 'string' && /^https?:\/\//.test(base)) return base + rest;
  if (/^(https?:\/\/|urn:)/.test(term)) return term;
  return undefined;
}

/**
 * A VocabProperty's checks as GeonicDB applies them: it checks the term after
 * expanding it to its full IRI (#280), so the allowed terms are sent as full
 * IRIs. A term that cannot be expanded would end up in the NGSI-LD default
 * context, which means nothing, so it fails the build (`fix` says what to do).
 * A pattern or a length is written for the term as data writes it, not for the
 * IRI: not sent, and the build says so.
 */
function vocabValidation(validation, terms, where, fix) {
  const v = { ...validation };
  const dropped = ['pattern', 'minLength', 'maxLength'].filter((k) => v[k] !== undefined);
  for (const k of dropped) delete v[k];
  if (dropped.length) console.warn(`${where}: GeonicDB adapter: ${dropped.join(', ')} of a VocabProperty not sent (GeonicDB checks the term as a full IRI, #280)`);
  if (v.enum) {
    v.enum = v.enum.map((t) => {
      const iri = terms ? expandVocabTerm(terms, t) : undefined;
      if (iri === undefined) throw new Error(`${where}: the VocabProperty term ${JSON.stringify(t)} cannot be expanded to a full IRI; ${fix}`);
      return iri;
    });
  }
  return v;
}

/** The pattern for a string Property that may be a plain date, or undefined. */
function datePattern(prop) {
  if (prop['x-ngsi']?.type !== 'Property' || prop.type !== 'string') return undefined;
  const dates = dateFormats(prop);
  if (!dates.includes('date')) return undefined;
  return dates.includes('date-time') ? DATE_OR_DATE_TIME_PATTERN : DATE_PATTERN;
}

function valueTypeOf(prop) {
  const ngsi = prop['x-ngsi']?.type;
  if (ngsi === 'Relationship') return 'uri';
  if (ngsi === 'GeoProperty') return 'geojson';
  if (datePattern(prop)) return 'string'; // may be a plain date: checked by the pattern
  if (prop.format === 'date-time') return 'datetime';
  if (prop.allOf || prop.$ref) return 'object'; // value type referenced by $ref
  if (prop.format === 'uri') return 'uri';
  return prop.type; // string | number | integer | boolean | array | object
}

/**
 * Options:
 *   typePrefix       prefix for the type name (tenant-specific naming)
 *   contextUrl       context to declare instead of the catalog alias (vN.jsonld, #117)
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
 *   contextTerms     the term definitions of the subject's context, imports
 *                    included, to expand VocabProperty terms; default
 *                    subject.contextTerms (set by loadSubjects)
 */
export function toCustomDataModel(subject, model, { typePrefix = '', typeName, contextUrl, allowAdditional = false, extend, rename = {}, contextTerms } = {}) {
  const urls = subjectUrls(subject);
  const terms = contextTerms ?? subject.contextTerms;
  const termsMissing = terms ? '' : ` (the ${subject.name} context's terms are not loaded${subject.contextTermsError ? `: ${subject.contextTermsError}` : '; load the subject with loadSubjects()'})`;
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
    const ngsiType = prop['x-ngsi'].type;
    const d = {
      // valueType stays the schema's: GeonicDB checks the stored value, which is
      // the expanded term (a string) for a VocabProperty and the JSON itself for
      // a JsonProperty, as the schema describes them.
      ngsiType: geonicdbNgsiType(ngsiType),
      valueType: valueTypeOf(prop),
      // GeonicDB requires the key on every property; null when the catalog example has no value.
      example: example[name] ?? null,
      required: (model.schema.required ?? []).includes(name),
      description: model.catalog?.attributes?.[name]?.ja ?? prop.description ?? '',
    };
    // GeonicDB reads a property-level `@context` as the term IRI when it
    // generates a context itself (custom-data-model.service.ts, terms.set).
    // With contextUrl set it is not needed, but carrying the IRI keeps the
    // body self-describing if contextUrl is ever dropped. Core terms
    // (location, description) carry theirs too: a generated context would
    // otherwise give them tenant IRIs, wrong for any processor outside the
    // broker. Their x-iri is the core context's own IRI, so nothing conflicts.
    const iri = prop['x-iri'];
    if (typeof iri === 'string' && /^https?:\/\//.test(iri)) d['@context'] = iri;
    let validation = {};
    for (const k of VALUE_CHECKS) if (prop[k] !== undefined) validation[k] = prop[k];
    if (ngsiType === 'VocabProperty') {
      validation = vocabValidation(validation, terms, `${model.type}.${name}`, `define its prefix or term in models/${subject.name}/context.jsonld (or a context it imports), or write the full IRI${termsMissing}`);
    }
    // A JsonProperty keeps its checks: GeonicDB applies them to the JSON itself,
    // which is what the schema describes.
    if (datePattern(prop) && validation.pattern === undefined) validation.pattern = datePattern(prop);
    if (Object.keys(validation).length) d.validation = validation;
    propertyDetails[rename[name] ?? name] = d;
  }
  if (extend?.propertyDetails) {
    for (const [name, detail] of Object.entries(extend.propertyDetails)) {
      if (name in propertyDetails) throw new Error(`extension redefines catalog attribute "${name}" of ${model.type}; add a new attribute instead`);
      if (!detail || typeof detail !== 'object' || !detail.ngsiType || !detail.valueType) throw new Error(`extension attribute "${name}" needs ngsiType and valueType`);
      // The same GeonicDB rules as the catalog's attributes (#280). The extension's
      // own context is not read here: its allowed terms expand with the catalog's.
      const ext = { ...detail, ngsiType: geonicdbNgsiType(detail.ngsiType), example: detail.example ?? null };
      if (detail.ngsiType === 'VocabProperty' && detail.validation) {
        ext.validation = vocabValidation(detail.validation, terms, `extension attribute "${name}"`, `write it as a full IRI, or as a term or prefix of the ${subject.name} context${termsMissing}`);
      }
      propertyDetails[name] = ext;
    }
  }
  return {
    type: typeName ?? `${typePrefix}${model.type}`,
    domain: subject.name,
    description: extend?.description ?? model.catalog?.description?.ja ?? model.schema.description,
    contextUrl: extend?.contextUrl ?? contextUrl ?? urls.contextAlias,
    propertyDetails,
    additionalProperties: allowAdditional ? true : (model.schema.additionalProperties === false ? false : true),
  };
}
