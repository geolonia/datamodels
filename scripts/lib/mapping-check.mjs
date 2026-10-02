// Checks for a model's correspondence tables (mapping/*.yaml), run by the
// validator. A mapping renders as a table on the model page: a field that is
// not in the model links to nothing, and a missing name, note language or
// target silently leaves a hole in the page.

const FIELD = /^([A-Za-z][A-Za-z0-9]*)(\[\d+\])?$/;
const TOP = new Set(['standard', 'fields', 'structure', 'convert']);
const STANDARD = new Set(['name', 'url', 'license', 'note']);
// Documentation keys, and the conversion rules that `datamodels convert`
// (geolonia/datamodels-toolkit) reads. Their structure is checked here; which
// transform names exist is the converter's to check (#91).
const ROW = new Set(['to', 'note', 'column', 'transform', 'values', 'value', 'via']);
// Exactly ja and en: in YAML's { … } form a comma inside the text starts a new
// key, so an extra key means the text was cut there ("closed → completed, otherwise …").
export const bilingual = (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every((k) => k === 'ja' || k === 'en')
  && typeof v.ja === 'string' && v.ja.trim() !== '' && typeof v.en === 'string' && v.en.trim() !== '';
/**
 * The licence of a standard in one language. A plain string (a name such as
 * "CC BY 4.0") reads the same on both pages; anything longer is { ja, en }.
 */
export const standardLicense = (std, lang) => typeof std?.license === 'string' ? std.license : std?.license?.[lang] ?? '';
const isLink = (u) => { if (typeof u !== 'string') return false; try { const x = new URL(u); return (x.protocol === 'https:' || x.protocol === 'http:') && x.hostname !== ''; } catch { return false; } };

/**
 * Every property name anywhere in a schema: attributes, and the members of
 * value types such as Geometry's type and coordinates. The value says whether
 * the property is an array somewhere (its own type, or a $ref within the
 * schema such as Geometry's #/$defs/position), so a mapping may name a position.
 */
export function fieldNames(schema) {
  const names = new Map();
  const local = (ref) => typeof ref === 'string' && ref.startsWith('#/')
    ? ref.slice(2).split('/').reduce((n, k) => n?.[k.replaceAll('~1', '/').replaceAll('~0', '~')], schema) : undefined;
  const isArray = (p) => p?.type === 'array' || (Array.isArray(p?.type) && p.type.includes('array')) || local(p?.$ref)?.type === 'array';
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.properties && typeof node.properties === 'object') for (const [k, p] of Object.entries(node.properties)) names.set(k, names.get(k) || isArray(p));
    for (const v of Object.values(node)) walk(v);
  };
  walk(schema);
  return names;
}

/**
 * Cycles among `via` references, as lists of mapping names (subject/Type/name):
 * the converter follows via recursively, so a mapping that reaches itself
 * would never finish. `mappings` maps each name to its parsed file.
 */
export function viaCycles(mappings) {
  const cycles = [], done = new Set();
  const visit = (name, chain) => {
    if (chain.includes(name)) { cycles.push([...chain.slice(chain.indexOf(name)), name]); return; }
    if (done.has(name) || !mappings[name]) return;
    for (const rule of Object.values(mappings[name].fields ?? {})) if (typeof rule?.via === 'string') visit(rule.via, [...chain, name]);
    done.add(name);
  };
  for (const name of Object.keys(mappings)) visit(name, []);
  return cycles;
}

/**
 * Problems of one mapping file, as messages. `map` is the parsed YAML (the
 * loader adds `name`, the file name); `schema` is the model's JSON Schema.
 * A value type's own members count, and an array position (`coordinates[2]`).
 * `mappingNames` (subject/Type/name of every mapping file) checks `via`.
 */
export function mappingProblems(map, schema, mappingNames = null) {
  const out = [];
  const { name, ...doc } = map ?? {};
  for (const k of Object.keys(doc)) if (!TOP.has(k)) out.push(`unknown key "${k}" (allowed: standard, fields, structure, convert)`);
  if (doc.convert !== undefined && (!doc.convert || typeof doc.convert.id !== 'string' || !/\{\w+\}/.test(doc.convert.id))) out.push('convert.id must be a template such as "urn:ngsi-ld:Type:{attribute}"');
  else if (doc.convert) for (const k of Object.keys(doc.convert)) if (k !== 'id') out.push(`unknown key "convert.${k}" (allowed: id)`);
  const std = doc.standard;
  if (!std || typeof std !== 'object') out.push('standard is required');
  else {
    for (const k of Object.keys(std)) if (!STANDARD.has(k)) out.push(`unknown key "standard.${k}" (allowed: name, url, license, note)`);
    if (!bilingual(std.name)) out.push('standard.name needs ja and en, and nothing else (quote a text that contains a comma)');
    if (std.url !== undefined && !isLink(std.url)) out.push(`standard.url must be an http(s) URL with a host, got ${JSON.stringify(std.url)}`);
    if (std.license !== undefined && !(typeof std.license === 'string' ? std.license.trim() : bilingual(std.license))) out.push('standard.license must be a non-empty string, or ja and en and nothing else (quote a text that contains a comma)');
    if (std.note !== undefined && !bilingual(std.note)) out.push('standard.note needs ja and en, and nothing else (quote a text that contains a comma)');
  }
  if (doc.structure !== undefined && !bilingual(doc.structure)) out.push('structure needs ja and en, and nothing else (quote a text that contains a comma)');
  const fields = doc.fields;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields) || !Object.keys(fields).length) { out.push('fields must map at least one field'); return out; }
  const known = fieldNames(schema);
  for (const [field, m] of Object.entries(fields)) {
    const f = FIELD.exec(field);
    if (!f) out.push(`${field}: not a field name`);
    else if (!known.has(f[1])) out.push(`${field}: not a field of this model`);
    else if (f[2] && !known.get(f[1])) out.push(`${field}: ${f[1]} is not an array, so it has no positions`);
    if (!m || typeof m !== 'object' || Array.isArray(m) || !('to' in m)) { out.push(`${field}: needs "to" (the corresponding item, or null when there is none)`); continue; }
    if (m.to !== null && (typeof m.to !== 'string' || !m.to.trim())) out.push(`${field}: "to" must be a non-empty string or null`);
    for (const k of Object.keys(m)) if (!ROW.has(k)) out.push(`${field}: unknown key "${k}" (allowed: ${[...ROW].join(', ')})`);
    if (m.note !== undefined && !bilingual(m.note)) out.push(`${field}: note needs ja and en, and nothing else (quote a text that contains a comma)`);
    // Conversion rules (datamodels convert in geolonia/datamodels-toolkit).
    const cols = m.column === undefined ? [] : [].concat(m.column);
    if (m.column !== undefined && (!cols.length || cols.some((c) => typeof c !== 'string' || !c.trim()))) out.push(`${field}: column must be a column name or a list of them`);
    if (m.transform !== undefined && (typeof m.transform !== 'string' || !/^[a-z][A-Za-z0-9]*$/.test(m.transform))) out.push(`${field}: transform must be a transform name such as code6 (the converter checks which names exist)`);
    if (m.transform === 'flags' && (!m.values || typeof m.values !== 'object' || Array.isArray(m.values) || !Object.keys(m.values).length || Object.values(m.values).some((v) => typeof v !== 'string' || !v.trim()))) out.push(`${field}: transform flags needs values as column: value`);
    if (m.values !== undefined && m.transform !== 'flags') out.push(`${field}: values is only for transform flags`);
    if (m.transform === 'numbers' && cols.length < 2) out.push(`${field}: transform numbers needs at least two columns`);
    if (m.via !== undefined && (typeof m.via !== 'string' || (mappingNames && !mappingNames.has(m.via)))) out.push(`${field}: via must name a mapping file as subject/Type/name, got ${JSON.stringify(m.via)}`);
    if ([m.column !== undefined, m.value !== undefined, m.via !== undefined].filter(Boolean).length > 1) out.push(`${field}: use one of column, value and via`);
  }
  return out;
}
