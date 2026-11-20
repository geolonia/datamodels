// Limits on the contributed files (#293). A published schema, context,
// example or mapping file is input to its consumers' validators and JSON-LD
// processors, and to this repository's own build: a very large or deeply
// nested file, or a `pattern` that backtracks without end, harms them. The
// limits sit well above what the catalog needs today (2026-11: largest file
// 22 KB, nesting 10, 8 `$ref`s in one schema, 1 level of context imports, no
// nested quantifier); a model that needs more is a reason to talk, not to
// raise them quietly.
//
// validate-models.mjs checks these before anything else reads the files.
// The depth of context imports is checked where they are resolved
// (resolveContextTerms in models.mjs), with MAX_CONTEXT_IMPORT_DEPTH below.
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import YAML from 'yaml';

export const MAX_FILE_BYTES = 256 * 1024;
export const MAX_NESTING = 32;
export const MAX_REFS = 100;
export const MAX_PATTERN_LENGTH = 256;
export const MAX_CONTEXT_IMPORT_DEPTH = 2;

/** The nesting depth of a parsed value (a scalar is 0), counted up to `cap` + 1 without recursion. */
export function nestingDepth(value, cap = MAX_NESTING) {
  let max = 0;
  const stack = [[value, 0]];
  while (stack.length) {
    const [v, d] = stack.pop();
    if (!v || typeof v !== 'object') continue;
    if (d + 1 > max) { max = d + 1; if (max > cap) return max; }
    for (const child of Object.values(v)) stack.push([child, d + 1]);
  }
  return max;
}

// A quantifier at p[i]: whether it repeats the atom (more than once) and whether that count varies.
function quantifierAt(p, i) {
  const c = p[i];
  let len, min, max;
  if (c === '*') [len, min, max] = [1, 0, Infinity];
  else if (c === '+') [len, min, max] = [1, 1, Infinity];
  else if (c === '?') [len, min, max] = [1, 0, 1];
  else if (c === '{') {
    const m = /^\{(\d+)(,(\d*))?\}/.exec(p.slice(i));
    if (!m) return null;
    len = m[0].length; min = Number(m[1]); max = m[2] === undefined ? min : m[3] === '' ? Infinity : Number(m[3]);
  } else return null;
  if (p[i + len] === '?') len++; // lazy
  // `?` (at most once) does not count as varying: (-?\d)+ is safe, and (a?)+ is left to review.
  return { len, repeats: max > 1, varies: max > min && max > 1 };
}

/**
 * True when a group whose length varies is itself repeated, as in (a+)+,
 * (a*)*, (a{1,9})+ or ((ab)*c)+: the classic form of a pattern that
 * backtracks exponentially. A heuristic: it does not prove a pattern safe
 * (overlapping alternatives like (a|a)+ pass), review still checks the rest.
 * `p` must be a valid regular expression.
 */
export function hasNestedQuantifier(p) {
  const stack = [{ varies: false }];
  let i = 0;
  while (i < p.length) {
    const c = p[i];
    let group = null;
    if (c === '\\') {
      // \p{...}, \P{...} and \u{...} end at their brace; any other escape is two characters.
      i += /[pPu]/.test(p[i + 1]) && p[i + 2] === '{' ? p.indexOf('}', i) + 1 - i : 2;
    } else if (c === '[') {
      let j = i + 1;
      if (p[j] === '^') j++;
      while (j < p.length && p[j] !== ']') j += p[j] === '\\' ? 2 : 1;
      i = j + 1;
    } else if (c === '(') {
      const prefix = /^\(\?(?::|=|!|<=|<!|<[A-Za-z_$][\w$]*>)/.exec(p.slice(i));
      i += prefix ? prefix[0].length : 1;
      stack.push({ varies: false });
      continue;
    } else if (c === ')') {
      group = stack.length > 1 ? stack.pop() : { varies: false };
      i++;
    } else {
      i++;
      if (c === '|') continue;
    }
    const top = stack[stack.length - 1];
    const q = quantifierAt(p, i);
    if (q) {
      if (group?.varies && q.repeats) return true;
      i += q.len;
      if (q.varies) top.varies = true;
    }
    if (group?.varies) top.varies = true;
  }
  return false;
}

/** What is wrong with a `pattern` (or a patternProperties name), or null. */
export function patternProblem(p) {
  if (typeof p !== 'string') return null;
  if (p.length > MAX_PATTERN_LENGTH) return `is ${p.length} characters long; at most ${MAX_PATTERN_LENGTH}`;
  try { new RegExp(p, 'u'); } catch (e) { return `is not a valid regular expression (${e.message})`; }
  if (hasNestedQuantifier(p)) return 'repeats a group whose length varies, as in (a+)+, which can take exponential time to fail; rewrite it without the nesting';
  return null;
}

// Keywords whose value is data, not a schema (as in catalog-rules.mjs).
const DATA_KEYWORDS = new Set(['const', 'enum', 'default', 'examples', 'dependentRequired']);
const SCHEMA_MAPS = new Set(['properties', 'patternProperties', '$defs', 'definitions', 'dependentSchemas', 'dependencies']);

/** The problems of one parsed schema: its `pattern`s, its patternProperties names, its number of `$ref`s. */
export function schemaLimitProblems(schema) {
  const out = [];
  let refs = 0;
  const walk = (node, path) => {
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}/${i}`)); return; }
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (DATA_KEYWORDS.has(k) || k.startsWith('x-')) continue;
      if (k === '$ref' || k === '$dynamicRef') refs++;
      else if (k === 'pattern') { const msg = patternProblem(v); if (msg) out.push(`${path}/pattern ${msg}`); }
      else if (SCHEMA_MAPS.has(k) && v && typeof v === 'object' && !Array.isArray(v)) {
        for (const [name, sub] of Object.entries(v)) {
          if (k === 'patternProperties') { const msg = patternProblem(name); if (msg) out.push(`${path}/patternProperties ${JSON.stringify(name)} ${msg}`); }
          walk(sub, `${path}/${k}/${name}`);
        }
      } else walk(v, `${path}/${k}`);
    }
  };
  walk(schema, '');
  if (refs > MAX_REFS) out.push(`has ${refs} $refs; at most ${MAX_REFS}`);
  return out;
}

async function filesIn(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await filesIn(p)));
    else out.push(p);
  }
  return out;
}

// A model's schema.json, or a schema in a release snapshot (releases/v<version>/schema/<Type>.json).
const isSchemaFile = (rel) => rel.endsWith(`${sep}schema.json`) || new RegExp(`\\${sep}releases\\${sep}v[^\\${sep}]+\\${sep}schema\\${sep}[^\\${sep}]+\\.json$`).test(rel);

/** The limit problems of every file under `modelsDir`, as "models/<path>: <problem>" lines. */
export async function fileLimitProblems(modelsDir) {
  const out = [];
  for (const file of (await filesIn(modelsDir)).sort()) {
    const rel = relative(modelsDir, file);
    const where = `models/${rel.split(sep).join('/')}`;
    const fail = (msg) => out.push(`${where}: ${msg}`);
    const { size } = await stat(file);
    // Too large to read further: every other check would read it whole.
    if (size > MAX_FILE_BYTES) { fail(`is ${size} bytes; at most ${MAX_FILE_BYTES} (${MAX_FILE_BYTES / 1024} KB)`); continue; }
    let value;
    try {
      if (/\.(json|jsonld)$/.test(file)) value = JSON.parse(await readFile(file, 'utf8'));
      else if (/\.ya?ml$/.test(file)) value = YAML.parse(await readFile(file, 'utf8'));
      else continue;
    } catch { continue; } // A file that does not parse is the toolkit's problem to report.
    const depth = nestingDepth(value);
    if (depth > MAX_NESTING) { fail(`nests deeper than ${MAX_NESTING} levels`); continue; }
    if (isSchemaFile(`${sep}${rel}`)) for (const msg of schemaLimitProblems(value)) fail(msg);
  }
  return out;
}
