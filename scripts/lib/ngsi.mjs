// NGSI-LD entity forms: normalized (every attribute an object with its type)
// and key-values (plain values; JsonProperty and VocabProperty keep a
// {"json": ...} or {"vocab": ...} wrapper). Pure functions without Node
// imports: used by the validator (validate-models.mjs) and by the example
// playground in the browser (site/.vitepress/theme/ExamplePlayground.vue).

/** NGSI-LD attribute types a model may declare in x-ngsi.type. JsonProperty and VocabProperty are NGSI-LD 1.8. */
export const NGSI_TYPES = ['Property', 'Relationship', 'GeoProperty', 'JsonProperty', 'VocabProperty'];

/**
 * The member that holds the value of a JsonProperty (json) or a VocabProperty
 * (vocab). NGSI-LD keeps it in the key-values (simplified) form too:
 * `"answers": {"json": [...]}`, so a broker knows the type (ETSI GS CIM 009
 * clause 4.5.4, Simplified Representation).
 */
export const WRAPPED = { JsonProperty: 'json', VocabProperty: 'vocab' };

/**
 * The key-values entity with the json and vocab wrappers removed, as the
 * model's JSON Schema describes it (the schema describes the value, as for a
 * Property). Throws when an attribute of one of these types is not wrapped.
 */
export function unwrapKeyValues(keyValues, schema) {
  const out = { ...keyValues };
  for (const [k, prop] of Object.entries(schema.properties ?? {})) {
    const member = WRAPPED[prop['x-ngsi']?.type];
    if (!member || !(k in out)) continue;
    const unwrap = (v) => {
      if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length !== 1 || !(member in v)) {
        throw new Error(`attribute ${k}: a ${prop['x-ngsi'].type} is {"${member}": ...} in key-values form`);
      }
      return v[member];
    };
    out[k] = prop['x-ngsi'].multi && Array.isArray(out[k]) ? out[k].map(unwrap) : unwrap(out[k]);
  }
  return out;
}

/**
 * Key-values projection of an NGSI-LD normalized entity.
 *
 * `multi` names the attributes the schema declares `x-ngsi.multi`: their
 * key-values form is always an array, one element per instance, even when the
 * normalized entity carries a single instance. Instances are distinguished by
 * datasetId; at most one (the default instance) may omit it.
 */
export function toKeyValues(normalized, { multi = new Set() } = {}) {
  const out = {};
  for (const [k, v] of Object.entries(normalized)) {
    if (k === '@context') continue;
    if (k === 'id' || k === 'type') { out[k] = v; continue; }
    if (Array.isArray(v) || multi.has(k)) {
      const instances = Array.isArray(v) ? v : [v];
      if (instances.length === 0) throw new Error(`attribute ${k}: empty multi-valued attribute`);
      const seen = new Set();
      let defaults = 0;
      out[k] = instances.map((inst) => {
        const single = toKeyValues({ [k]: inst });
        if (inst.datasetId === undefined) defaults += 1;
        else if (seen.has(inst.datasetId)) throw new Error(`attribute ${k}: duplicate datasetId ${inst.datasetId}`);
        else seen.add(inst.datasetId);
        return single[k];
      });
      if (defaults > 1) throw new Error(`attribute ${k}: only one instance of a multi-valued attribute may omit datasetId`);
      continue;
    }
    if (!v || typeof v !== 'object' || !('type' in v)) throw new Error(`attribute ${k}: not a normalized attribute object`);
    if (v.type === 'Relationship') { if (typeof v.object !== 'string') throw new Error(`attribute ${k}: Relationship needs a string object`); out[k] = v.object; }
    else if (v.type === 'GeoProperty') { if (!v.value || typeof v.value !== 'object' || typeof v.value.type !== 'string') throw new Error(`attribute ${k}: GeoProperty needs a GeoJSON value`); out[k] = v.value; }
    else if (v.type in WRAPPED) {
      const member = WRAPPED[v.type];
      if (!(member in v)) throw new Error(`attribute ${k}: ${v.type} needs a ${member} member`);
      out[k] = { [member]: v[member] };
    } else if (v.type === 'Property') {
      if (!('value' in v)) throw new Error(`attribute ${k}: Property needs a value`);
      out[k] = (v.value && typeof v.value === 'object' && '@type' in v.value && '@value' in v.value) ? v.value['@value'] : v.value;
    } else throw new Error(`attribute ${k}: unknown attribute type "${v.type}"`);
  }
  return out;
}

/**
 * Normalized form of a key-values entity, for a model's JSON Schema: each
 * attribute takes the NGSI-LD type the schema declares (x-ngsi.type),
 * date-time Properties become typed DateTime values, and each instance of a
 * multi-valued attribute gets a datasetId (urn:ngsi-ld:dataset:<attribute>:<n>,
 * the form the catalog's examples use). An attribute the schema does not
 * declare becomes a Property.
 */
export function toNormalized(keyValues, schema, context) {
  const out = context ? { '@context': context } : {};
  const props = schema.properties ?? {};
  for (const [k, v] of Object.entries(keyValues)) {
    if (k === '@context') continue;
    if (k === 'id' || k === 'type') { out[k] = v; continue; }
    const prop = props[k] ?? {};
    const ngsi = prop['x-ngsi'] ?? {};
    const one = (value) => {
      if (ngsi.type === 'Relationship') return { type: 'Relationship', object: value };
      if (ngsi.type === 'GeoProperty') return { type: 'GeoProperty', value };
      // Key-values carries the wrapper ({"json": ...}); take its content.
      const member = WRAPPED[ngsi.type];
      if (member) return { type: ngsi.type, [member]: value && typeof value === 'object' && member in value ? value[member] : value };
      const format = prop.format ?? prop.items?.format;
      return { type: 'Property', value: format === 'date-time' && typeof value === 'string' ? { '@type': 'DateTime', '@value': value } : value };
    };
    if (ngsi.multi && Array.isArray(v)) out[k] = v.map((item, i) => ({ ...one(item), datasetId: `urn:ngsi-ld:dataset:${k}:${i + 1}` }));
    else out[k] = one(v);
  }
  return out;
}
