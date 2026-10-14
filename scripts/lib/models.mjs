// The model repository, read with the toolkit (#226): models/<subject>/{subject.yaml, context.jsonld, <Type>/...}
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readNode, catalogUrls, loadSubjects as loadNodeSubjects, attributesOf } from '@geolonia/datamodels/build';

export const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
// DATAMODELS_MODELS_DIR lets the test suite point the loader at a mutated copy.
export const MODELS_DIR = process.env.DATAMODELS_MODELS_DIR ?? join(ROOT, 'models');
export const DIST = join(ROOT, 'dist');
// The node's settings (node.yaml) as the toolkit reads them: the address, languages, publisher and licence in one place (#226).
export const NODE = await readNode(ROOT);
export const BASE_URL = NODE.baseUrl;
export const CORE_CONTEXT_URL = 'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld';
export const CORE_CONTEXT_FIXTURE = join(ROOT, 'test', 'fixtures', 'ngsi-ld-core-context-v1.8.jsonld');
/** Terms the pinned core context defines (location, description, ...): protected, and left to the broker. */
export const CORE_TERMS = new Set(Object.keys(JSON.parse(readFileSync(CORE_CONTEXT_FIXTURE, 'utf8'))['@context']).filter((k) => !k.startsWith('@')));

/** True when an IRI is in this catalog's namespace (a type the catalog must define). */
export const isCatalogIri = (iri) => typeof iri === 'string' && iri.startsWith(`${BASE_URL}/ns/`);
// Vocabularies outside the catalog whose types x-subclass-of may name. A short
// list on purpose: a typo in an external IRI cannot be checked by fetching it,
// so an unknown namespace fails instead. Add a namespace here when a model
// really needs it.
export const EXTERNAL_PARENT_NAMESPACES = ['https://schema.org/', 'https://smartdatamodels.org/', 'https://uri.etsi.org/ngsi-ld/'];
/** Why an x-subclass-of target outside the catalog is not accepted, or null when it is. */
export function externalParentProblem(iri) {
  let url;
  try { url = new URL(iri); } catch { return 'is not an absolute IRI'; }
  if (!['http:', 'https:'].includes(url.protocol) || url.href !== iri) return 'is not an absolute http(s) IRI';
  if (!EXTERNAL_PARENT_NAMESPACES.some((ns) => iri.startsWith(ns))) return `is outside the known vocabularies (${EXTERNAL_PARENT_NAMESPACES.join(', ')}); add the namespace to EXTERNAL_PARENT_NAMESPACES in scripts/lib/models.mjs if it is right`;
  // Class names start with a capital (schema.org ContactPoint, not the property contactPoint).
  // Only the form: a misspelled class name (ContcatPoint) passes, so open the IRI before adding it.
  if (!/^[A-Z]/.test(url.pathname.split('/').pop() ?? '')) return 'does not name a class (a class name starts with a capital letter)';
  return null;
}

// The URLs and the loader are the toolkit's (#226): the same files as any node builds, from node.yaml.
// The English pages are under /en.
export const URLS = catalogUrls(BASE_URL, { iris: NODE.iris, pageEn: (url) => url.replace(BASE_URL, `${BASE_URL}/en`) });
export const subjectUrls = (subject) => URLS.subjectUrls(subject);
export const modelUrls = (subject, model) => URLS.modelUrls(subject, model);
export { attributesOf };

/** The subjects in MODELS_DIR, each title, summary and description in every language of the node. */
export function loadSubjects() {
  return loadNodeSubjects(MODELS_DIR, { urls: URLS, languages: NODE.languages });
}

// The projection between the two forms is the toolkit's (@geolonia/datamodels/ngsi, #226), which has
// no Node imports, so the site's example playground runs the same code in the browser.
export { toKeyValues, toNormalized, unwrapKeyValues, dateFormats, typedDate, NGSI_TYPES } from '@geolonia/datamodels/ngsi';

/** Imports (URLs) and merged inline terms of a context document. */
export function splitContext(doc) {
  const parts = Array.isArray(doc['@context']) ? doc['@context'] : [doc['@context']];
  return { imports: parts.filter((p) => typeof p === 'string'), inlineTerms: Object.assign({}, ...parts.filter((p) => p && typeof p === 'object')) };
}

/**
 * All term definitions a context document provides: imported catalog contexts
 * first (resolved by version, see releases.mjs), inline definitions last.
 */
export async function resolveContextTerms(doc, subjects, resolveDocument) {
  const { imports, inlineTerms } = splitContext(doc);
  const terms = {};
  for (const url of imports) {
    const imported = await resolveDocument(url, subjects);
    if (!imported) throw new Error(`context imports ${url}, which is not a catalog context URL`);
    Object.assign(terms, await resolveContextTerms(imported, subjects, resolveDocument));
  }
  return Object.assign(terms, inlineTerms);
}

// Text from the model files (descriptions, notes, mapping notes) is Markdown: links and
// `code` work. Outside code spans, < and { become character references, so a "<owner>"
// or a "{{ x }}" shows as written instead of being read as an HTML tag or a Vue expression.
// A code span is as in CommonMark: a run of backticks up to the next run of the same
// length, within one paragraph (no blank line between). A run with no partner is text.
export function mdText(s) {
  const text = String(s ?? '');
  const escape = (part) => part.replace(/</g, '&lt;').replace(/\{/g, '&#123;');
  let out = '';
  let i = 0;
  while (i < text.length) {
    const open = /`+/g;
    open.lastIndex = i;
    const o = open.exec(text);
    if (!o) { out += escape(text.slice(i)); break; }
    const run = o[0];
    const close = new RegExp(`(?<!\`)${run}(?!\`)`, 'g');
    close.lastIndex = o.index + run.length;
    const c = close.exec(text);
    const span = c ? text.slice(o.index, c.index + run.length) : '';
    if (c && !/\n[ \t]*\n/.test(span)) {
      out += escape(text.slice(i, o.index)) + span;
      i = c.index + run.length;
    } else {
      out += escape(text.slice(i, o.index + run.length));
      i = o.index + run.length;
    }
  }
  return out;
}
