// The validate tool's checks (worker/mcp.mjs): one entity against one model's
// JSON Schema, with the rules of the catalog's example check where they apply
// to data: NGSI-LD attribute types, multi-valued attributes, typed dates, the
// json/vocab wrappers, closed rings. The rules come from the toolkit's
// @geolonia/datamodels/ngsi (attributeProblems, unclosedRings; toolkit 0.3.16,
// geolonia/datamodels-toolkit#120), which check uses too; the messages are
// worded here.
//
// The JSON Schema validator is @cfworker/json-schema, because Ajv (what CI
// uses) compiles schemas with new Function, which Workers do not allow. Two of
// its costs are kept in check here, so one anonymous request cannot use
// hundreds of milliseconds of CPU:
//   - uniqueItems compares every pair of items (n²). The schemas are given to
//     it without uniqueItems, and duplicates are found here with a Set.
//   - with all errors collected, a long wrong array gives one error per item,
//     and a few nested wrappers per error (an invalid geometry under oneOf
//     about 15). Entities with many values are checked with the validator
//     stopping at the first error, and a full check that finds too many
//     errors falls back to that. The answer then says it is not complete.
// The format date-time follows ajv-formats, so a date-time CI accepts (a leap
// second with an offset) is accepted here too.
import { Validator, format } from '@cfworker/json-schema';
import { NGSI_TYPES, toKeyValues, unwrapKeyValues, attributeProblems, unclosedRings } from '@geolonia/datamodels/ngsi';

/** At most this many problems are listed; problemCount says how many were found (all, when complete is true). */
export const MAX_PROBLEMS = 20;
/** Most keys one object of an entity may have; no model has more than a few dozen attributes. */
export const MAX_KEYS = 1000;
/** Deepest nesting of an entity: real ones (a MultiPolygon in a normalized attribute) stay under 10. */
export const MAX_DEPTH = 64;
/**
 * Entities with more values than this (numbers, strings, objects, arrays at
 * any depth) are checked with the validator stopping at its first error, so
 * an invalid one lists its first problems, not all (complete: false). A valid
 * one is checked in full either way, and legitimate GeoJSON is never refused
 * for its size: a valid 64 KiB Polygon takes about 5-15 ms of CPU. The costly
 * case is an invalid one in a full check: the validator collects every error
 * first, about 9 µs per value on a fast machine and several times that on a
 * slow one (an invalid GeometryCollection of 4,990 members: 55-66 ms before
 * this limit; 990 members: 8 ms locally, 52 ms on a CI runner). 250 values
 * keep a full check to a few ms. The values are counted in the key-values
 * form the schema checks (a normalized entity sends about 2.7 times as many).
 */
export const FULL_CHECK_VALUES = 250;
/** A full check that reports more errors than this is answered with the first-error check instead. */
export const MAX_RAW_ERRORS = 2000;
/** What the answer says when not every problem was looked for. */
export const INCOMPLETE = 'The check stopped at the first problems (a large entity, or many problems): fix them and check again to find any others.';
/** What the answer says when the entity could not be read as the model's attributes, so the schema was not checked. */
export const NOT_CHECKED = 'The entity could not be read as attributes of this model, so its schema was not checked yet: fix this and check again.';

const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
export const TOO_DEEP = `the entity is nested too deeply (at most ${MAX_DEPTH} levels)`;
export const TOO_LARGE = 'the entity is too large to check: send a smaller one';

// --- date-time as ajv-formats checks it (full mode) ---------------------------
const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
const TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
const isLeapYear = (y) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
function fullDate(str) {
  const m = DATE.exec(str);
  if (!m) return false;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= (mo === 2 && isLeapYear(y) ? 29 : DAYS[mo]);
}
function fullTime(str) {
  const m = TIME.exec(str);
  if (!m) return false;
  const [hr, min, sec] = [+m[1], +m[2], +m[3]];
  const sign = m[5] === '-' ? -1 : 1;
  const tzH = +(m[6] || 0); const tzM = +(m[7] || 0);
  if (tzH > 23 || tzM > 59 || !m[4]) return false;
  if (hr <= 23 && min <= 59 && sec < 60) return true;
  // A leap second: 23:59:60 in UTC, whatever the offset.
  const utcMin = min - tzM * sign;
  const utcHr = hr - tzH * sign - (utcMin < 0 ? 1 : 0);
  return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
}
export function dateTime(str) {
  const parts = str.split(/t|\s/i);
  return parts.length === 2 && fullDate(parts[0]) && fullTime(parts[1]);
}
format['date-time'] = dateTime;

// --- the entity's shape ------------------------------------------------------

/**
 * { problem, values }: why an entity is refused before it is checked (an
 * object with more than MAX_KEYS keys, or nesting deeper than MAX_DEPTH), or
 * null; and how many values it holds. A walk with its own stack, so a deep
 * entity cannot exhaust the call stack here.
 */
export function shape(entity) {
  const stack = [[entity, 1, '']];
  let values = 0;
  while (stack.length) {
    const [v, depth, path] = stack.pop();
    values++;
    if (!v || typeof v !== 'object') continue;
    if (depth > MAX_DEPTH) return { problem: TOO_DEEP, values };
    const keys = Object.keys(v);
    if (!Array.isArray(v) && keys.length > MAX_KEYS) return { problem: `${path || 'the entity'} has ${keys.length} keys; at most ${MAX_KEYS} are accepted`, values };
    for (const k of keys) stack.push([v[k], depth + 1, `${path}/${k}`]);
  }
  return { problem: null, values };
}

/** True when an entity is in the normalized form: an attribute is an NGSI-LD attribute object. */
export function looksNormalized(entity) {
  return Object.entries(entity).some(([k, v]) => k !== 'id' && k !== 'type' && k !== '@context'
    && [v].flat().some((i) => isObject(i) && NGSI_TYPES.includes(i.type) && ['value', 'object', 'json', 'vocab'].some((p) => Object.hasOwn(i, p))));
}

// --- the validator's errors ----------------------------------------------------

// Errors that only say a part below had errors; the part below says what.
const WRAPPERS = new Set(['properties', '$ref', 'items', 'prefixItems', 'allOf', 'additionalItems', 'unevaluatedItems', 'contains']);
const EXTRA = /^Property "(.+)" does not match additional properties schema\.$/;

/**
 * The validator's errors as problems a reader can act on: { path, message }.
 * Only the errors that say what is wrong are kept, not those that say a part
 * below had errors. @cfworker/json-schema also reports a declared attribute
 * with a wrong value as an additional property ("additionalProperties": false
 * sees it as not evaluated); that report is dropped when the attribute has
 * errors of its own, and a real extra attribute is named as one.
 */
export function readableErrors(errors) {
  const all = errors.map((e) => ({ path: e.instanceLocation.replace(/^#/, '') || '/', message: e.error, keyword: e.keyword }));
  // The paths that have errors of their own, built once: a lookup per error keeps this linear.
  const owned = new Set(all.filter((x) => x.keyword !== 'false').map((x) => x.path));
  const out = [];
  for (const e of all) {
    if (e.keyword === 'false') continue;
    const extra = e.keyword === 'additionalProperties' && EXTRA.exec(e.message);
    if (extra) {
      // A JSON pointer, escaped as the validator's own paths are (RFC 6901), so the lookup in owned matches.
      const path = pointer(e.path === '/' ? '' : e.path, extra[1]);
      if (!owned.has(path)) out.push({ path, message: `"${extra[1]}" is not an attribute here: the schema allows no other properties` });
      continue;
    }
    if (!WRAPPERS.has(e.keyword) && !/^A subschema had errors\.$/.test(e.message)) out.push(e);
  }
  return out.length ? out : all;
}

// --- uniqueItems, in linear time ----------------------------------------------

/** JSON with the keys of every object sorted: equal values, equal text. */
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (isObject(v)) return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

/**
 * The first duplicate pair of an array as @cfworker/json-schema reports it:
 * the lowest index whose value comes again, and where it comes next. null
 * when the items are unique.
 */
export function firstDuplicate(items) {
  const seen = new Map();
  let best = null;
  items.forEach((item, i) => {
    const key = canonical(item);
    const at = seen.get(key);
    if (at === undefined) seen.set(key, [i, undefined]);
    else if (at[1] === undefined) { at[1] = i; if (!best || at[0] < best[0]) best = at; }
  });
  return best;
}

const pointer = (base, token) => `${base}/${String(token).replaceAll('~', '~0').replaceAll('/', '~1')}`;

/**
 * The schemas as the validator gets them: copies without the uniqueItems that
 * always apply to an instance location (reached from the root through $ref,
 * allOf, properties, items and prefixItems). Those are checked by
 * duplicateProblems instead. uniqueItems under a branch that applies only
 * sometimes (anyOf, oneOf, not, if/then/else, ...) stays with the validator;
 * no catalog schema has one there.
 */
export function prepareSchemas(root, refs) {
  const copies = [root, ...refs].map((s) => structuredClone(s));
  const resources = new Map(copies.map((s) => [s.$id, s]));
  const unique = new Set();
  const resolve = (ref, resource) => {
    const [base, fragment = ''] = ref.split('#');
    let target = base ? resources.get(new URL(base, resource.$id).href) : resource;
    if (!target || (fragment && !fragment.startsWith('/'))) return null;
    const res = target;
    for (const token of fragment.split('/').slice(1)) target = target?.[token.replaceAll('~1', '/').replaceAll('~0', '~')];
    return target && typeof target === 'object' ? [target, res] : null;
  };
  // The nodes that apply only sometimes (below anyOf, oneOf, not, if/then/else,
  // additionalProperties, ...): a node there keeps its uniqueItems for the
  // validator, also when it is reached unconditionally too (a $defs entry used
  // from both), because duplicateProblems follows only the unconditional paths.
  const conditional = conditionalNodes(copies[0], resolve);
  const seen = new Set();
  const strip = (node, resource) => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (node.uniqueItems === true && !conditional.has(node)) { delete node.uniqueItems; unique.add(node); }
    if (typeof node.$ref === 'string') { const r = resolve(node.$ref, resource); if (r) strip(...r); }
    for (const s of node.allOf ?? []) strip(s, resource);
    for (const s of Object.values(node.properties ?? {})) strip(s, resource);
    if (isObject(node.items)) strip(node.items, resource);
    for (const s of node.prefixItems ?? []) strip(s, resource);
  };
  strip(copies[0], copies[0]);
  return { root: copies[0], refs: copies.slice(1), unique, conditional, resolve };
}

// Subschema keywords that always apply to the instance at hand (what
// duplicateProblems follows), and those that apply only sometimes.
const ALWAYS = { single: ['items'], list: ['allOf', 'prefixItems'], map: ['properties'] };
const SOMETIMES = { single: ['not', 'if', 'then', 'else', 'contains', 'additionalProperties', 'propertyNames', 'unevaluatedItems', 'unevaluatedProperties', 'additionalItems'], list: ['anyOf', 'oneOf'], map: ['patternProperties', 'dependentSchemas', 'dependencies'] };

/** Every schema node reachable from `root` through at least one keyword that applies only sometimes. */
export function conditionalNodes(root, resolve) {
  const out = new Set();
  // Each node is visited at most twice: once unconditionally, once conditionally.
  const visited = new Map();
  const stack = [[root, root, false]];
  while (stack.length) {
    const [node, resource, cond] = stack.pop();
    if (!node || typeof node !== 'object' || Array.isArray(node)) continue;
    const bit = cond ? 2 : 1;
    const state = visited.get(node) ?? 0;
    if (state & bit) continue;
    visited.set(node, state | bit);
    if (cond) out.add(node);
    const push = (child, c) => stack.push([child, resource, c]);
    if (typeof node.$ref === 'string') { const r = resolve(node.$ref, resource); if (r) stack.push([r[0], r[1], cond]); }
    for (const [kinds, c] of [[ALWAYS, cond], [SOMETIMES, true]]) {
      for (const k of kinds.single) if (node[k] && typeof node[k] === 'object') push(node[k], c);
      for (const k of kinds.list) for (const s of Array.isArray(node[k]) ? node[k] : []) push(s, c);
      for (const k of kinds.map) for (const s of Object.values(isObject(node[k]) ? node[k] : {})) push(s, c);
    }
  }
  return out;
}

/** The duplicates in the arrays the stripped uniqueItems applied to, as the validator words them. */
export function duplicateProblems(instance, prepared) {
  const out = [];
  const walk = (value, node, resource, path, hops) => {
    if (!node || typeof node !== 'object' || hops > 100) return;
    if (prepared.unique.has(node) && Array.isArray(value)) {
      const dup = firstDuplicate(value);
      if (dup) out.push({ path: path || '/', message: `Duplicate items at indexes ${dup[0]} and ${dup[1]}.` });
    }
    if (typeof node.$ref === 'string') { const r = prepared.resolve(node.$ref, resource); if (r) walk(value, r[0], r[1], path, hops + 1); }
    for (const s of node.allOf ?? []) walk(value, s, resource, path, hops + 1);
    if (isObject(value) && node.properties) {
      for (const [k, s] of Object.entries(node.properties)) if (Object.hasOwn(value, k)) walk(value[k], s, resource, pointer(path, k), 0);
    }
    if (Array.isArray(value)) {
      const prefix = node.prefixItems ?? [];
      prefix.forEach((s, i) => { if (i < value.length) walk(value[i], s, resource, pointer(path, i), 0); });
      if (isObject(node.items)) for (let i = prefix.length; i < value.length; i++) walk(value[i], node.items, resource, pointer(path, i), 0);
    }
  };
  walk(instance, prepared.root, prepared.root, '', 0);
  return out;
}

// --- one model ------------------------------------------------------------------

/**
 * The checker of one model, made once per isolate: `root` is the model's
 * published schema, `refs` the catalog schemas it refers to.
 */
export function makeChecker(root, refs) {
  const prepared = prepareSchemas(root, refs);
  const validator = (shortCircuit) => {
    const v = new Validator(prepared.root, '2020-12', shortCircuit);
    for (const r of prepared.refs) v.addSchema(r);
    return v;
  };
  const full = validator(false);
  const first = validator(true);
  /** { problems, complete } of a plain key-values entity; `values` from shape(). */
  return (plain, values) => {
    let complete = values <= FULL_CHECK_VALUES;
    let result = (complete ? full : first).validate(plain);
    // Too many errors to sort out: answer with the first ones, as for a large entity.
    if (complete && result.errors.length > MAX_RAW_ERRORS) { result = first.validate(plain); complete = false; }
    const out = result.valid ? [] : readableErrors(result.errors);
    // A valid entity has no other problems, whichever check found that.
    return { problems: [...out, ...duplicateProblems(plain, prepared)], complete: complete || result.valid };
  };
}

/** The message of one of the toolkit's attributeProblems, as the validate tool words it. */
function attributeMessage(p) {
  if (p.rule === 'multi') return 'has several instances, but the model does not declare it multi-valued';
  if (p.rule === 'type') return `is a ${p.found}, but the model makes it a ${p.expected}`;
  if (p.rule === 'date') return `the value must be { "@type": "${p.expected['@type']}", "@value": ${JSON.stringify(p.expected['@value'])} }`;
  // A rule a later toolkit adds: named, so the answer still says which attribute breaks it.
  return `breaks the model's rule "${p.rule}"`;
}

/**
 * Check an entity that passed shape(). m: the model's index entry; root: its
 * published schema; check: makeChecker(...). Returns the tool's answer.
 */
export function checkEntity(m, root, check, data, form, values) {
  const usedForm = form ?? (looksNormalized(data) ? 'normalized' : 'key-values');
  if (usedForm === 'normalized' && m.kind === 'value') return { error: `${m.id} is a value type: it has only the key-values form` };
  const problems = [];
  let complete = true;
  let note = INCOMPLETE;
  const answer = () => ({
    model: m.id, version: m.version, form: usedForm, valid: problems.length === 0,
    problemCount: problems.length, complete, ...(complete ? {} : { note }), problems: problems.slice(0, MAX_PROBLEMS),
  });
  // The schema check never ran: the answer must not say that every problem was found.
  const stop = (e) => { problems.push({ path: '/', message: e.message }); complete = false; note = NOT_CHECKED; return answer(); };

  let kv = data;
  if (usedForm === 'normalized') {
    // The toolkit's rules for normalized data, as check applies them: the declared attribute types, x-ngsi.multi, typed dates.
    // toKeyValues keeps an own "__proto__" key (toolkit 0.3.16), so the schema check below reports it as an extra attribute.
    for (const p of attributeProblems(data, Object.entries(root.properties ?? {}))) problems.push({ path: `/${p.attribute}`, message: attributeMessage(p) });
    const multi = new Set(Object.entries(root.properties ?? {}).filter(([, p]) => p?.['x-ngsi']?.multi).map(([n]) => n));
    try { kv = toKeyValues(data, { multi }); } catch (e) { return stop(e); }
  }
  let plain;
  try { plain = unwrapKeyValues(kv, root); } catch (e) { return stop(e); }
  const seen = new Set();
  // Counted on what the schema checks, not on the form as sent.
  const checked = check(plain, shape(plain).values);
  complete = checked.complete;
  for (const { path, message } of checked.problems) {
    const key = `${path} ${message}`;
    if (!seen.has(key)) { seen.add(key); problems.push({ path, message }); }
  }
  for (const p of unclosedRings(kv, { style: 'pointer' })) problems.push({ path: p, message: 'the polygon ring does not close: its first and last positions must be the same (RFC 7946)' });
  return answer();
}
