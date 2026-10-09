// Known extensions of a model (models/<subject>/<Type>/extensions/<name>.yaml):
// attributes another organisation added to the model, under its own IRIs. The
// owner reports one with the issue form "Report an extension"; the catalog
// lists it so others can find it and reuse its names, and does not review it.
// The list shows on the model page ("Extended by") and in catalog.json.
import { BASE_URL, CORE_TERMS, attributesOf, subjectUrls } from './models.mjs';
import { bilingual } from './mapping-check.mjs';

const TOP = new Set(['organization', 'url', 'version', 'context', 'terms', 'data', 'since']);
// A file name is the anchor on the model page and the id in catalog.json.
export const EXTENSION_NAME = /^[a-z0-9][a-z0-9-]*$/;
// What brokers accept as a term (see /guide/names): letters, digits and _.
const TERM = /^[A-Za-z][A-Za-z0-9_]*$/;
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
// Reported by outsiders and rendered into the page (Markdown with HTML and Vue): plain text and
// plain URLs only, so nothing in a file can add markup, a script or a template expression.
const UNSAFE_TEXT = /[<>{}]/;
const isLink = (u) => { if (typeof u !== 'string' || /[\s`<>{}|"\\^()[\]]/.test(u)) return false; try { const x = new URL(u); return (x.protocol === 'https:' || x.protocol === 'http:') && x.hostname !== ''; } catch { return false; } };
const plain = (v) => bilingual(v) && !UNSAFE_TEXT.test(v.ja) && !UNSAFE_TEXT.test(v.en);
// A URL on the catalog's own host (any case, any subdomain): an extension's context and IRIs are the owner's.
const CATALOG_HOST = new URL(BASE_URL).hostname;
const ours = (u) => { try { const h = new URL(u).hostname.toLowerCase(); return h === CATALOG_HOST || h.endsWith(`.${CATALOG_HOST}`); } catch { return false; } };
const older = (a, b) => { const x = a.match(SEMVER).slice(1).map(Number); const y = b.match(SEMVER).slice(1).map(Number); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };

/** The IRI a term expands to in an inline context: its definition, with a prefix defined in the same context expanded. */
function inlineIri(defs, term) {
  const def = defs[term];
  const id = typeof def === 'string' ? def : def?.['@id'];
  if (typeof id !== 'string') return null;
  const colon = id.indexOf(':');
  if (colon > 0 && !id.slice(colon + 1).startsWith('//')) {
    const prefix = defs[id.slice(0, colon)];
    const base = typeof prefix === 'string' ? prefix : prefix?.['@id'];
    if (typeof base === 'string') return base + id.slice(colon + 1);
  }
  return id;
}

/** Problems with one extension file; an empty list when it is fine. */
export function extensionProblems(ext, model, subject) {
  const out = [];
  if (!EXTENSION_NAME.test(ext.name ?? '')) out.push('the file name must be lower-case letters, digits and -, for example wakayama-detour.yaml');
  // The file name is the id: the loader passes the keys written in the file (fileKeys), so a name: there cannot replace it.
  const keys = ext.fileKeys ?? Object.keys(ext).filter((k) => k !== 'name');
  if (keys.includes('name')) out.push('remove the key name: the file name is the extension\'s id');
  for (const k of keys) if (k !== 'name' && !TOP.has(k)) out.push(`unknown key ${k} (allowed: ${[...TOP].join(', ')})`);
  if (!plain(ext.organization)) out.push('organization needs ja and en, each non-empty plain text (no < > { }) and nothing else');
  for (const k of ['url', 'data']) if (ext[k] !== undefined && !isLink(ext[k])) out.push(`${k} must be a plain http(s) URL with a host, got ${JSON.stringify(ext[k])}`);
  if (ext.since !== undefined && !/^\d{4}-\d{2}(-\d{2})?$/.test(String(ext.since))) out.push(`since must be a date (2026-10 or 2026-10-09), got ${JSON.stringify(ext.since)}`);
  if (typeof ext.version !== 'string' || !SEMVER.test(ext.version)) out.push(`version must be the subject version the extension builds on (X.Y.Z), got ${JSON.stringify(ext.version)}`);
  else if (older(subject.version, ext.version) < 0) out.push(`version ${ext.version} is newer than the subject (${subject.version})`);

  // The extended @context: a URL on the owner's side, or written inline (the @context value).
  let defs = null;
  if (typeof ext.context === 'string') {
    if (!isLink(ext.context)) out.push(`context must be an http(s) URL or the @context value itself, got ${JSON.stringify(ext.context)}`);
    else if (ours(ext.context)) out.push('context must be the extension\'s own @context, not a datamodels.jp URL');
  } else if (ext.context && typeof ext.context === 'object') {
    const parts = Array.isArray(ext.context) ? ext.context : [ext.context];
    // One of the subject's published contexts: the major alias, the current version, or the version it builds on.
    const u = subjectUrls(subject);
    const accepted = new Set([u.contextAlias, u.contextExact, ...(typeof ext.version === 'string' && SEMVER.test(ext.version) ? [`${BASE_URL}/context/${subject.name}/v${ext.version}.jsonld`] : [])]);
    if (!parts.some((p) => accepted.has(p))) out.push(`an inline context must import the ${subject.name} context (${u.contextAlias}), so the catalog's attributes keep their meaning`);
    defs = Object.assign({}, ...parts.filter((p) => p && typeof p === 'object' && !Array.isArray(p)));
  } else out.push('context is required: the extension\'s @context URL, or the @context value written inline');

  const attrs = new Set(attributesOf(model).map(([n]) => n));
  const terms = ext.terms;
  if (!terms || typeof terms !== 'object' || Array.isArray(terms) || !Object.keys(terms).length) out.push('terms must list the added attributes: name, with iri and description');
  else for (const [term, t] of Object.entries(terms)) {
    if (!TERM.test(term)) out.push(`${term}: a term is letters, digits and _, starting with a letter (what brokers accept)`);
    if (attrs.has(term)) out.push(`${term}: the model already has this attribute; use it, or pick another name`);
    if (CORE_TERMS.has(term)) out.push(`${term}: the NGSI-LD core context defines this term`);
    if (!t || typeof t !== 'object') { out.push(`${term}: needs iri and description`); continue; }
    for (const k of Object.keys(t)) if (k !== 'iri' && k !== 'description') out.push(`${term}: unknown key ${k} (allowed: iri, description)`);
    if (!isLink(t.iri)) out.push(`${term}: iri must be an http(s) URL, got ${JSON.stringify(t.iri)}`);
    else if (ours(t.iri)) out.push(`${term}: the iri is under datamodels.jp; an extension names its terms under its own domain`);
    else if (defs && inlineIri(defs, term) !== t.iri) out.push(`${term}: the inline context does not define it as ${t.iri}`);
    if (!plain(t.description)) out.push(`${term}: description needs ja and en, each non-empty plain text (no < > { }) and nothing else`);
  }
  return out;
}

/** One extension in catalog.json (catalog.schema.json, models[].extensions). */
export function extensionEntry(ext) {
  return {
    id: ext.name,
    organization: { ja: ext.organization.ja, en: ext.organization.en },
    ...(ext.url ? { url: ext.url } : {}),
    version: ext.version,
    ...(typeof ext.context === 'string' ? { contextUrl: ext.context } : { context: ext.context }),
    terms: Object.entries(ext.terms).map(([name, t]) => ({ name, iri: t.iri, description: { ja: t.description.ja, en: t.description.en } })),
    ...(ext.data ? { dataUrl: ext.data } : {}),
    ...(ext.since !== undefined ? { since: String(ext.since) } : {}),
  };
}
