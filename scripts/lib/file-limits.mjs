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
// (resolveContextTerms and MAX_CONTEXT_IMPORT_DEPTH in models.mjs).
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import YAML from 'yaml';

export const MAX_FILE_BYTES = 256 * 1024;
export const MAX_NESTING = 32;
export const MAX_REFS = 100;
export const MAX_PATTERN_LENGTH = 256;

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
  return { len, repeats: max > 1, varies: max > min && max > 1, optional: max > min };
}

// True when a single-character atom (`.`, `\d`, `[^/]`, `x`) can match `ch`; unsure counts as yes.
// Tested with the i and s flags whatever the pattern says, since a modifier group such as (?i:
// can turn them on for a part of it: A and [a-z] overlap there, and . matches a line break.
function atomMatches(src, ch) {
  try { return new RegExp(`^(?:${src})$`, 'uis').test(ch); } catch { return true; }
}
// The separator a group starts or ends with: a literal character, or an escaped punctuation character such as `\.`.
function literalOf(src) {
  // Never a regular-expression syntax character: `?` after a `(` the parser misread, say.
  if (src.length === 1 && !'.^$?*+()[]{}|\\'.includes(src)) return src;
  if (src.length === 2 && src[0] === '\\' && /[^A-Za-z0-9]/.test(src[1])) return src[1];
  return null;
}
// A group such as (\d+\.) or ([a-z]+-), or (-[a-z0-9]{2,8}) as in a language tag: it ends or
// starts with a separator, unquantified, that no other atom of the group can match, so every
// repetition ends (or starts) at a separator, and at most one other atom has a count that varies
// (`?` included), so a repetition splits one way only: (\d+\d+\.)+ and (\d+\d?\.)+ do not count.
// Not when the group has alternatives or inner groups.
function separated(group) {
  const { atoms, alt } = group;
  if (alt || atoms.length < 2) return false;
  const bySeparatorAt = (at) => {
    const edge = atoms[at];
    const sep = !edge.q && edge.src !== null ? literalOf(edge.src) : null;
    if (sep === null) return false;
    const rest = atoms.filter((_, k) => k !== at);
    // An inner group is an atom with no source (src null), so `rest.every` below rejects it.
    if (rest.filter((a) => a.q?.optional).length > 1) return false;
    return rest.every((a) => a.src !== null && !atomMatches(a.src, sep));
  };
  return bySeparatorAt(atoms.length - 1) || bySeparatorAt(0);
}

/**
 * True when a group whose length varies is itself repeated, as in (a+)+,
 * (a*)*, (a{1,9})+ or ((ab)*c)+: the classic form of a pattern that
 * backtracks exponentially. A group that ends or starts with a separator its
 * other parts cannot match, as in (\d+\.)+ or (-[a-z0-9]{2,8})*, is not
 * counted: it splits one way only.
 * A heuristic: it does not prove a pattern safe (overlapping alternatives like
 * (a|aa)+ pass), review still checks the rest. `p` must be a valid regular
 * expression.
 */
export function hasNestedQuantifier(p) {
  const frame = (look = false) => ({ varies: false, alt: false, look, atoms: [] });
  const stack = [frame()];
  let i = 0;
  while (i < p.length) {
    const start = i;
    const c = p[i];
    let group = null;
    if (c === '\\') {
      // \p{...}, \P{...} and \u{...} end at their brace; any other escape is two characters.
      const close = /[pPu]/.test(p[i + 1]) && p[i + 2] === '{' ? p.indexOf('}', i) : -1;
      i = close >= 0 ? close + 1 : i + 2;
    } else if (c === '[') {
      let j = i + 1;
      if (p[j] === '^') j++;
      while (j < p.length && p[j] !== ']') j += p[j] === '\\' ? 2 : 1;
      i = j + 1;
    } else if (c === '(') {
      // (?: (?= (?! (?<= (?<! (?<name> and the modifier groups (?i: (?-s: (?ims-i:.
      const prefix = /^\(\?(?:[ims]*(?:-[ims]+)?:|=|!|<=|<!|<[A-Za-z_$][\w$]*>)/.exec(p.slice(i));
      // Any other (? is syntax this parser does not know: counted as nested, so it fails safe.
      if (!prefix && p[i + 1] === '?') return true;
      i += prefix ? prefix[0].length : 1;
      stack.push(frame(!!prefix && /^\(\?(=|!|<=|<!)$/.test(prefix[0])));
      continue;
    } else if (c === ')') {
      group = stack.length > 1 ? stack.pop() : frame();
      i++;
    } else if (c === '|') {
      stack[stack.length - 1].alt = true;
      i++;
      continue;
    } else if (c === '^' || c === '$') {
      i++;
      continue;
    } else {
      i++;
    }
    const top = stack[stack.length - 1];
    const q = quantifierAt(p, i);
    if (q) i += q.len;
    if (group) {
      // A lookaround matches no text, so its content does not make the enclosing group vary.
      if (!group.look) {
        if (group.varies && q?.repeats && !separated(group)) return true;
        if (group.varies || q?.varies) top.varies = true;
      }
      top.atoms.push({ src: null, q });
    } else {
      if (q?.varies) top.varies = true;
      top.atoms.push({ src: p.slice(start, i - (q?.len ?? 0)), q });
    }
  }
  return false;
}

/** What is wrong with a `pattern` (or a patternProperties name), or null. */
export function patternProblem(p) {
  if (typeof p !== 'string') return null;
  if (p.length > MAX_PATTERN_LENGTH) return `is ${p.length} characters long; at most ${MAX_PATTERN_LENGTH}`;
  try { new RegExp(p, 'u'); } catch (e) { return `is not a valid regular expression (${e.message})`; }
  if (hasNestedQuantifier(p)) return 'repeats a group whose length varies, as in (a+)+, which can take exponential time to fail; rewrite it without the nesting, or keep one part of varying length and end or start the group with a separator nothing else in it matches, as in (\\d+\\.)+ or (-[a-z0-9]+)*';
  return null;
}

// Keywords whose value is data, not a schema: a "$ref" or "pattern" key inside them is data
// (dependentRequired maps property names to lists of property names). Shared with catalog-rules.mjs.
export const DATA_KEYWORDS = new Set(['const', 'enum', 'default', 'examples', 'dependentRequired']);
// Keywords whose value maps names to schemas: the names are not keywords, the values are schemas.
export const SCHEMA_MAPS = new Set(['properties', 'patternProperties', '$defs', 'definitions', 'dependentSchemas', 'dependencies']);

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

// Every entry under dir, with whether it is a regular file; links are not followed.
async function entriesIn(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await entriesIn(p)));
    else out.push({ path: p, regular: e.isFile(), link: e.isSymbolicLink() });
  }
  return out;
}

// A model's schema.json, or a schema in a release snapshot (releases/v<version>/schema/<Type>.json).
const isSchemaFile = (rel) => rel.endsWith(`${sep}schema.json`) || new RegExp(`\\${sep}releases\\${sep}v[^\\${sep}]+\\${sep}schema\\${sep}[^\\${sep}]+\\.json$`).test(rel);

/** The limit problems of every file under `modelsDir`, as "models/<path>: <problem>" lines. */
export async function fileLimitProblems(modelsDir) {
  const out = [];
  for (const { path: file, regular, link } of (await entriesIn(modelsDir)).sort((a, b) => (a.path < b.path ? -1 : 1))) {
    const rel = relative(modelsDir, file);
    const where = `models/${rel.split(sep).join('/')}`;
    const fail = (msg) => out.push(`${where}: ${msg}`);
    // Never read through a link (it may point at /dev/zero or outside the repository); the toolkit refuses links too.
    if (link) { fail('is a symbolic link; models/ holds only regular files'); continue; }
    if (!regular) { fail('is not a regular file'); continue; }
    const { size } = await stat(file);
    // Too large to read further: every other check would read it whole.
    if (size > MAX_FILE_BYTES) { fail(`is ${size} bytes; at most ${MAX_FILE_BYTES} (${MAX_FILE_BYTES / 1024} KB)`); continue; }
    // JSON and YAML by extension, in any case; other files (Markdown, text) get the size limit only.
    const kind = /\.(json|jsonld|geojson)$/i.test(file) ? 'JSON' : /\.ya?ml$/i.test(file) ? 'YAML' : null;
    if (!kind) continue;
    let value;
    try {
      const text = await readFile(file, 'utf8');
      value = kind === 'JSON' ? JSON.parse(text) : YAML.parse(text);
    } catch (e) {
      // Also a YAML file nested too deep for the parser, or with too many aliases: no later step reads it.
      fail(`cannot be read as ${kind} (${String(e.message).split('\n')[0]})`);
      continue;
    }
    const depth = nestingDepth(value);
    if (depth > MAX_NESTING) { fail(`nests deeper than ${MAX_NESTING} levels`); continue; }
    if (isSchemaFile(`${sep}${rel}`)) for (const msg of schemaLimitProblems(value)) fail(msg);
  }
  return out;
}
