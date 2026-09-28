// Tabular data (CSV) to entities, driven by a model's mapping file. The mapping
// rows that carry `column` (and optionally `transform`, `value`, `via`) say how
// to fill each attribute; the rest of the mapping stays documentation. Pure
// functions without Node imports; scripts/convert.mjs is the command line.
//
// Real published lists come in Shift_JIS as well as UTF-8, lose leading zeros
// in Excel (92011 for 092011) and put a whole address into one column (#85).
// The converter repairs what it can prove and reports every repair.

/** Text of a CSV file: UTF-8 (with or without BOM), else Shift_JIS. */
export function decodeCsv(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return { text: new TextDecoder('utf-8').decode(b.subarray(3)), encoding: 'utf-8 (BOM)' };
  try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(b), encoding: 'utf-8' }; } catch { /* not UTF-8 */ }
  return { text: new TextDecoder('shift_jis').decode(b), encoding: 'shift_jis' };
}

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and line breaks inside quotes. */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head = [], ...body] = rows.filter((r) => r.some((v) => v.trim() !== ''));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

// 全国地方公共団体コード: the 5-digit JIS X 0402 code plus a check digit (MIC,
// 全国地方公共団体コード仕様): weights 6..2, remainder mod 11, (11 - r) mod 10.
const checkDigit = (d5) => (11 - ([...d5].reduce((s, c, i) => s + Number(c) * (6 - i), 0) % 11)) % 10;
const prefectureOk = (code) => { const p = Number(code.slice(0, 2)); return p >= 1 && p <= 47; };
const valid6 = (c) => /^\d{6}$/.test(c) && prefectureOk(c) && checkDigit(c.slice(0, 5)) === Number(c[5]);

/**
 * A 6-digit local government code from what a list holds: 6 digits as they
 * are; 5 digits either a 6-digit code that lost its leading zero (92011 →
 * 092011) or a JIS code without its check digit (13101 → 131016), decided by
 * the check digit; 4 digits a JIS code that lost its leading zero (1100 → 011002).
 */
export function code6(v) {
  const s = String(v ?? '').trim();
  if (/^\d{6}$/.test(s)) return valid6(s) ? { value: s } : { problem: `${s}: check digit does not match` };
  if (/^\d{5}$/.test(s)) {
    const zero = `0${s}`, withDigit = `${s}${checkDigit(s)}`;
    const a = valid6(zero), b = prefectureOk(s);
    if (a && b) return { problem: `${s}: ambiguous (${zero} or ${withDigit})` };
    if (a) return { value: zero, fix: { repair: 'restored the leading zero', detail: `${s} → ${zero}` } };
    if (b) return { value: withDigit, fix: { repair: 'added the check digit', detail: `${s} → ${withDigit}` } };
  }
  if (/^\d{4}$/.test(s) && prefectureOk(`0${s}`)) { const c = `0${s}${checkDigit(`0${s}`)}`; return { value: c, fix: { repair: 'restored the leading zero and added the check digit', detail: `${s} → ${c}` } }; }
  return { problem: `${s}: not a local government code` };
}

export const TRANSFORMS = ['text', 'code6', 'number', 'integer', 'numbers', 'flag', 'flags', 'split', 'municipality', 'machiazaId'];

// One attribute from one row. Returns { value } (undefined means leave it out), and optionally fix or problem.
function apply(rule, row, set) {
  const cols = rule.column === undefined ? [] : [].concat(rule.column);
  const raw = cols.map((c) => row[c] ?? '');
  const one = raw[0] ?? '';
  switch (rule.transform ?? 'text') {
    case 'text': return { value: one || undefined };
    case 'code6': { if (!one) return { value: undefined }; const r = code6(one); return r.problem ? { problem: r.problem } : { value: r.value, fix: r.fix }; }
    case 'number': { if (!one) return { value: undefined }; const n = Number(one); return Number.isFinite(n) ? { value: n } : { problem: `${cols[0]}: ${one} is not a number` }; }
    case 'integer': { if (!one) return { value: undefined }; const n = Number(one.replace(/[,，人]/g, '')); return Number.isInteger(n) ? { value: n } : { problem: `${cols[0]}: ${one} is not a whole number` }; }
    case 'numbers': {
      if (raw.every((x) => !x)) return { value: undefined };
      const ns = raw.map(Number);
      return ns.every(Number.isFinite) && raw.every((x) => x) ? { value: ns } : { problem: `${cols.join(', ')}: not all numbers (${raw.join(', ')})` };
    }
    case 'flag': return { value: one === '1' };
    case 'flags': { const vs = Object.entries(rule.values ?? {}).filter(([c]) => row[c] === '1').map(([, v]) => v); return { value: vs.length ? vs : undefined }; }
    case 'split': { const vs = one.split(/[;；]/).map((x) => x.trim()).filter(Boolean); return { value: vs.length ? vs : undefined }; }
    // A municipality name ends in 市, 区, 町 or 村; a value that goes on (宇都宮市中央本町1-29) is the rest of the address.
    case 'municipality': return !one ? { value: undefined } : /[市区町村]$/.test(one) ? { value: one } : { value: undefined, fix: { repair: `left out ${cols[0]}: not a municipality name`, detail: one } };
    // The Address Base Registry town id is 7 digits; lists write it as 0008-001.
    case 'machiazaId': { if (!one) return { value: undefined }; const d = one.replace(/-/g, ''); return /^\d{7}$/.test(d) ? { value: d, fix: d !== one ? { repair: 'removed the hyphen from the town id', detail: `${one} → ${d}` } : undefined } : { problem: `${cols[0]}: ${one} is not a 7-digit town id` }; }
    default: return { problem: `unknown transform ${rule.transform}` };
  }
}

/**
 * Entities from rows. `mapping` is the model's mapping file with `column`
 * rules; `mappings` resolves `via` names (subject/Type/mapping) to other
 * mapping files; `set` fills attributes the list does not carry (GSI's
 * municipality code from the file name) and goes through the same transform.
 * Returns one { entity, fixes, problems } per row; a fix is { field, repair, detail }.
 */
export function convertRows(rows, mapping, { type, mappings = {}, set = {} } = {}) {
  const build = (map, row, fixes, problems, top) => {
    const out = {};
    for (const [field, rule] of Object.entries(map.fields ?? {})) {
      if (rule?.value !== undefined) { out[field] = rule.value; continue; }
      if (rule?.via) {
        const sub = mappings[rule.via];
        if (!sub) { problems.push(`${field}: no mapping ${rule.via}`); continue; }
        const v = build(sub, row, fixes, problems, false);
        const meaningful = Object.entries(v).some(([k]) => sub.fields[k]?.value === undefined);
        if (meaningful) out[field] = v;
        continue;
      }
      const given = top && set[field] !== undefined;
      if (rule?.column === undefined && rule?.transform !== 'flags' && !given) continue;
      const r = given ? apply({ ...rule, column: '__set' }, { __set: String(set[field]) }) : apply(rule, row);
      if (r.problem) problems.push(`${field}: ${r.problem}`);
      if (r.fix) fixes.push({ field, ...r.fix });
      if (r.value !== undefined) out[field] = r.value;
    }
    return out;
  };
  return rows.map((row) => {
    const fixes = [], problems = [];
    const attrs = build(mapping, row, fixes, problems, true);
    const tpl = mapping.convert?.id;
    let id;
    if (tpl) {
      const missing = [];
      id = tpl.replace(/\{(\w+)\}/g, (_, k) => { if (attrs[k] === undefined) missing.push(k); return encodeURIComponent(String(attrs[k] ?? '')); });
      if (missing.length) { problems.push(`id: no ${missing.join(', ')} for ${tpl}`); id = undefined; }
    } else problems.push('the mapping has no convert.id template');
    return { entity: { ...(id ? { id } : {}), type, ...attrs }, fixes, problems };
  });
}
