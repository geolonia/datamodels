// Checks for a model's correspondence tables (mapping/*.yaml), run by the
// validator. A mapping renders as a table on the model page: a field that is
// not in the model links to nothing, and a missing name, note language or
// target silently leaves a hole in the page.

const FIELD = /^([A-Za-z][A-Za-z0-9]*)(\[\d+\])?$/;
const TOP = new Set(['standard', 'fields', 'structure']);
const bilingual = (v) => v && typeof v === 'object' && typeof v.ja === 'string' && v.ja.trim() !== '' && typeof v.en === 'string' && v.en.trim() !== '';
const isLink = (u) => { if (typeof u !== 'string') return false; try { const x = new URL(u); return (x.protocol === 'https:' || x.protocol === 'http:') && x.hostname !== ''; } catch { return false; } };

/** Every property name anywhere in a schema: attributes, and the members of value types such as Geometry's type and coordinates. */
export function fieldNames(schema) {
  const names = new Set();
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.properties && typeof node.properties === 'object') for (const k of Object.keys(node.properties)) names.add(k);
    for (const v of Object.values(node)) walk(v);
  };
  walk(schema);
  return names;
}

/**
 * Problems of one mapping file, as messages. `map` is the parsed YAML (the
 * loader adds `name`, the file name); `schema` is the model's JSON Schema.
 * A value type's own members count, and an array position (`coordinates[2]`).
 */
export function mappingProblems(map, schema) {
  const out = [];
  const { name, ...doc } = map ?? {};
  for (const k of Object.keys(doc)) if (!TOP.has(k)) out.push(`unknown key "${k}" (allowed: standard, fields, structure)`);
  const std = doc.standard;
  if (!std || typeof std !== 'object') out.push('standard is required');
  else {
    if (!bilingual(std.name)) out.push('standard.name needs ja and en');
    if (std.url !== undefined && !isLink(std.url)) out.push(`standard.url must be an http(s) URL with a host, got ${JSON.stringify(std.url)}`);
    if (std.license !== undefined && (typeof std.license !== 'string' || !std.license.trim())) out.push('standard.license must be a non-empty string');
    if (std.note !== undefined && !bilingual(std.note)) out.push('standard.note needs ja and en');
  }
  if (doc.structure !== undefined && !bilingual(doc.structure)) out.push('structure needs ja and en');
  const fields = doc.fields;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields) || !Object.keys(fields).length) { out.push('fields must map at least one field'); return out; }
  const known = fieldNames(schema);
  for (const [field, m] of Object.entries(fields)) {
    const f = FIELD.exec(field);
    if (!f) out.push(`${field}: not a field name`);
    else if (!known.has(f[1])) out.push(`${field}: not a field of this model`);
    if (!m || typeof m !== 'object' || Array.isArray(m) || !('to' in m)) { out.push(`${field}: needs "to" (the corresponding item, or null when there is none)`); continue; }
    if (m.to !== null && (typeof m.to !== 'string' || !m.to.trim())) out.push(`${field}: "to" must be a non-empty string or null`);
    for (const k of Object.keys(m)) if (k !== 'to' && k !== 'note') out.push(`${field}: unknown key "${k}" (allowed: to, note)`);
    if (m.note !== undefined && !bilingual(m.note)) out.push(`${field}: note needs ja and en`);
  }
  return out;
}
