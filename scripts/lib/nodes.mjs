// Known data model nodes (nodes.yaml) and what their indexes say
// (nodes.snapshot.json, written by npm run nodes and committed): a page that
// lists them, and on each model page the models of other nodes built on it
// (their extends, aliasOf and subClassOf), with the attributes they add. The
// build reads only the snapshot, never the network, so a node that is down
// cannot break it.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import { ROOT, attributesOf, modelUrls } from './models.mjs';

export const NODES_FILE = join(ROOT, 'nodes.yaml');
export const SNAPSHOT_FILE = join(ROOT, 'nodes.snapshot.json');

// Text from other sites ends up in Markdown pages (and Vue): plain text only, one line, not too long.
export const cleanText = (s) => (typeof s === 'string' ? s.replace(/[<>{}`|\\[\]*_#~]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200) : '');
// A URL only when it is a plain http(s) URL with a host and no credentials.
export function cleanUrl(u) {
  if (typeof u !== 'string' || /[\s`<>{}|"\\^()[\]]/.test(u)) return null;
  try { const x = new URL(u); return (x.protocol === 'https:' || x.protocol === 'http:') && x.hostname && !x.username && !x.password ? x.href : null; } catch { return null; }
}
const texts = (o) => Object.fromEntries(Object.entries(o && typeof o === 'object' ? o : {}).filter(([l]) => /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(l)).map(([l, v]) => [l, cleanText(v)]).filter(([, v]) => v));

/** The listed nodes: [{ url, index }]. */
export async function readNodeList(file = NODES_FILE) {
  const list = YAML.parse(await readFile(file, 'utf8')) ?? [];
  if (!Array.isArray(list)) throw new Error(`${file}: a list of { url, index }`);
  return list.map((n, i) => {
    const url = cleanUrl(n?.url); const index = cleanUrl(n?.index);
    if (!url || !index) throw new Error(`${file}: node ${i + 1} needs url and index, plain http(s) URLs`);
    return { url, index };
  });
}

// An index URL to compare: without its #fragment, which is never sent in the request, so
// catalog.json#models and catalog.json are one index (as the toolkit reads them).
const indexKey = (u) => cleanUrl(u)?.replace(/#.*$/, '') || null;

/**
 * The indexes that the known nodes link to (their `nodes`, and the `extends` of
 * their models) but nodes.yaml does not list (#222): nodes to propose for it,
 * in a pull request. read: [{ node, catalog }], the indexes just read.
 * Returns [{ index, from: [index, …] }]; datamodels.jp's own index is never one.
 */
export function unlistedNodes(list, read, self = 'https://datamodels.jp/catalog.json') {
  const listed = new Set([self, ...list.map((n) => n.index)].map(indexKey));
  const found = new Map();
  for (const { node, catalog } of read) {
    const links = [
      ...(Array.isArray(catalog?.nodes) ? catalog.nodes.map((n) => n?.index) : []),
      ...(Array.isArray(catalog?.models) ? catalog.models.flatMap((m) => (Array.isArray(m?.extends) ? m.extends.map((e) => e?.index) : [])) : []),
    ].map(indexKey).filter(Boolean);
    for (const index of links) {
      if (listed.has(index)) continue;
      if (!found.has(index)) found.set(index, new Set());
      found.get(index).add(node.index);
    }
  }
  return [...found].map(([index, from]) => ({ index, from: [...from] }));
}

/** Whether a response is a node index at all: an object with a models list. Otherwise the previous entry is kept. */
export const isIndex = (catalog) => Boolean(catalog) && typeof catalog === 'object' && Array.isArray(catalog.models);

/**
 * The attribute IRIs of every catalog model, by type IRI: what a node model
 * builds on. Only the model that defines a type (not an alias of it elsewhere).
 */
export function catalogAttributeIris(subjects) {
  const out = new Map();
  for (const s of subjects) for (const m of s.models) if (!m.schema['x-alias-of']) out.set(modelUrls(s, m).typeIri, new Set(attributesOf(m).map(([, p]) => p['x-iri']).filter(Boolean)));
  return out;
}

// What brokers accept as a term (see /guide/names): letters, digits and _.
const TERM = /^[A-Za-z][A-Za-z0-9_]*$/;
// Enough for any real extension; a node cannot fill a page with thousands of rows.
const MAX_ADDED = 50;

/**
 * What a node model adds to the catalog models it builds on, for the model
 * page: the attributes of its catalog.json whose IRI none of those catalog
 * models has, and its @context. Compared by IRI, not by name: an attribute the
 * node renamed with a JSON-LD alias is still the catalog's, and one it named
 * like a catalog attribute but under its own IRI is new. Nothing when the model
 * builds on no catalog model; no `added` when the node publishes no attributes,
 * so "adds nothing" and "not known" stay apart.
 */
function addedToCatalog(m, catalogIris) {
  const bases = [m?.aliasOf, m?.subClassOf, ...(Array.isArray(m?.extends) ? m.extends.map((e) => e?.typeIri) : [])].filter((iri) => catalogIris.has(iri));
  if (!bases.length) return {};
  const known = new Set(bases.flatMap((iri) => [...catalogIris.get(iri)]));
  const contextUrl = cleanUrl(m.contextAliasUrl) ?? cleanUrl(m.contextUrl);
  const added = Array.isArray(m.attributes)
    ? m.attributes.map((a) => ({ name: cleanText(a?.name), iri: cleanUrl(a?.iri), description: texts(a?.description) }))
      .filter((a) => TERM.test(a.name) && a.iri && !known.has(a.iri)).slice(0, MAX_ADDED)
    : null;
  return { ...(contextUrl ? { contextUrl } : {}), ...(added ? { added } : {}) };
}

/**
 * What the snapshot keeps of one node's catalog.json: only the fields the pages
 * show, cleaned. catalogIris (catalogAttributeIris): the catalog's attributes, to
 * record what each model adds to the catalog model it builds on.
 */
export function nodeEntry(node, catalog, fetchedAt, catalogIris = new Map()) {
  const models = (Array.isArray(catalog?.models) ? catalog.models : []).map((m) => ({
    type: cleanText(m?.type), typeIri: cleanUrl(m?.typeIri), pageUrl: cleanUrl(m?.pageUrl),
    title: texts(m?.title), status: cleanText(m?.status),
    ...(cleanUrl(m?.aliasOf) ? { aliasOf: cleanUrl(m.aliasOf) } : {}),
    ...(cleanUrl(m?.subClassOf) ? { subClassOf: cleanUrl(m.subClassOf) } : {}),
    extends: (Array.isArray(m?.extends) ? m.extends : []).map((e) => ({ typeIri: cleanUrl(e?.typeIri), version: /^\d+\.\d+\.\d+$/.test(e?.version) ? e.version : '' })).filter((e) => e.typeIri),
    ...addedToCatalog(m, catalogIris),
  })).filter((m) => m.type && m.typeIri);
  return { url: node.url, index: node.index, fetchedAt, publisher: { name: texts(catalog?.publisher?.name), url: cleanUrl(catalog?.publisher?.url) }, license: cleanText(catalog?.license), models };
}

/** The committed snapshot: { nodes: [...] }; no file, no nodes. */
export async function readSnapshot(file = SNAPSHOT_FILE) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return { nodes: [] }; throw e; }
}

/**
 * The models of other nodes built on the type `typeIri`: [{ node, model, how, version }],
 * how: 'alias' (the same type under another name), 'subclass' or 'extends'.
 */
export function builtOn(snapshot, typeIri) {
  const out = [];
  for (const node of snapshot.nodes ?? []) for (const model of node.models ?? []) {
    const ext = model.extends?.find((e) => e.typeIri === typeIri);
    const how = model.aliasOf === typeIri ? 'alias' : model.subClassOf === typeIri ? 'subclass' : ext ? 'extends' : null;
    if (how) out.push({ node, model, how, version: ext?.version ?? '' });
  }
  return out;
}

/**
 * The listed extensions (models/<subject>/<Type>/extensions/) that a node already
 * shows, among the node models `others` (builtOn of the same type): shown once,
 * as the node's model, because the node publishes it itself and keeps it current.
 * They are the same when the extension's page (url) or @context URL is on the
 * node's site: it starts with the node's url (https://models.example.org/ or
 * https://user.github.io/models/, so two nodes on one host stay apart). An
 * inline @context and no url never match: such an extension has no site.
 */
export function shownByNode(ext, others) {
  // Both sides as URL parsing writes them (lower-case host), the node's ending in /.
  const urls = [ext.url, typeof ext.context === 'string' ? ext.context : null].map(cleanUrl).filter(Boolean);
  return others.some(({ node }) => { const base = node.url.endsWith('/') ? node.url : `${node.url}/`; return urls.some((u) => u.startsWith(base)); });
}

export const nodeName = (node, lang) => node.publisher?.name?.[lang] ?? Object.values(node.publisher?.name ?? {})[0] ?? new URL(node.url).host;
