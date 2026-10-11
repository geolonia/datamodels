// Known data model nodes (nodes.yaml) and what their indexes say
// (nodes.snapshot.json, written by npm run nodes and committed): a page that
// lists them, and on each model page the models of other nodes built on it
// (their extends, aliasOf and subClassOf). The build reads only the snapshot,
// never the network, so a node that is down cannot break it.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import { ROOT } from './models.mjs';

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

/** What the snapshot keeps of one node's catalog.json: only the fields the pages show, cleaned. */
export function nodeEntry(node, catalog, fetchedAt) {
  const models = (Array.isArray(catalog?.models) ? catalog.models : []).map((m) => ({
    type: cleanText(m?.type), typeIri: cleanUrl(m?.typeIri), pageUrl: cleanUrl(m?.pageUrl),
    title: texts(m?.title), status: cleanText(m?.status),
    ...(cleanUrl(m?.aliasOf) ? { aliasOf: cleanUrl(m.aliasOf) } : {}),
    ...(cleanUrl(m?.subClassOf) ? { subClassOf: cleanUrl(m.subClassOf) } : {}),
    extends: (Array.isArray(m?.extends) ? m.extends : []).map((e) => ({ typeIri: cleanUrl(e?.typeIri), version: /^\d+\.\d+\.\d+$/.test(e?.version) ? e.version : '' })).filter((e) => e.typeIri),
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

export const nodeName = (node, lang) => node.publisher?.name?.[lang] ?? Object.values(node.publisher?.name ?? {})[0] ?? new URL(node.url).host;
