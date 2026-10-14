// The lookup index of the MCP server at /mcp (worker/mcp.mjs, #223), written by
// the build to dist/mcp/index.json. The Worker reads it from the assets once
// per isolate, so each tool call is a lookup, never a scan of every file. It
// holds what the tools answer with, from catalog.json and the known nodes
// (nodes.snapshot.json, which is not published on its own), plus the search
// words of every model, made by the same code as the duplicate check on model
// proposals (scripts/lib/similar.mjs, #224).
//
// It is published like every file in dist/, but it is not a stable interface:
// its shape follows the Worker. Tools should read catalog.json.
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { modelIndex, words } from './similar.mjs';

export const MCP_INDEX_PATH = 'mcp/index.json';

const texts = (o) => (o && typeof o === 'object' ? Object.values(o).filter((v) => typeof v === 'string') : []);
const terms = (map) => Object.fromEntries([...map].sort(([a], [b]) => a.localeCompare(b)));

/**
 * The catalog schemas that a schema refers to with $ref, at any depth and
 * through each other: their URLs, in the order found. `schemaOf(url)` returns
 * the schema published at a catalog URL, or undefined.
 */
export function schemaRefs(schema, schemaOf, base) {
  const out = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.$ref === 'string' && node.$ref.startsWith(base)) {
      const url = node.$ref.split('#')[0];
      if (url !== schema.$id && !out.includes(url)) {
        const ref = schemaOf(url);
        if (!ref) throw new Error(`${schema.$id}: $ref ${url} is not a schema of the catalog`);
        out.push(url);
        walk(ref);
      }
    }
    for (const v of Object.values(node)) walk(v);
  };
  walk(schema);
  return out;
}

/**
 * The attributes of every model to reuse, one entry per name and IRI:
 * { name, iri, ngsiType, type, description, models: ["<subject>/<Type>"], terms }.
 * The description is the one of the model in the subject the IRI belongs to,
 * when there is one. Attributes that a node's model adds to a catalog model
 * (nodes.snapshot.json, "added") come after, with the node's models.
 */
function attributeIndex(catalog, snapshot, base) {
  const byKey = new Map();
  for (const m of catalog.models ?? []) {
    for (const a of m.attributes ?? []) {
      const key = `${a.name} ${a.iri ?? ''}`;
      let e = byKey.get(key);
      if (!e) byKey.set(key, (e = { name: a.name, ...(a.iri ? { iri: a.iri } : {}), ngsiType: a.ngsiType, type: a.type, description: a.description ?? {}, models: [] }));
      e.models.push(`${m.subject}/${m.type}`);
      // The model of the IRI's own subject describes it best (https://datamodels.jp/ns/<subject>/...).
      if (a.iri?.startsWith(`${base}/ns/${m.subject}/`) && a.description) e.description = a.description;
    }
  }
  for (const n of snapshot.nodes ?? []) {
    const site = Object.values(n.publisher?.name ?? {})[0] ?? n.url;
    for (const m of n.models ?? []) for (const a of m.added ?? []) {
      const key = `${a.name} ${a.iri}`;
      let e = byKey.get(key);
      if (!e) byKey.set(key, (e = { name: a.name, iri: a.iri, description: a.description ?? {}, models: [] }));
      (e.nodeModels ??= []).push({ type: m.type, site, pageUrl: m.pageUrl });
    }
  }
  return [...byKey.values()].map((e) => {
    const t = new Map();
    for (const w of words(e.name)) t.set(w, 3);
    for (const d of texts(e.description)) for (const w of words(d)) t.set(w, Math.max(t.get(w) ?? 0, 1));
    return { ...e, terms: terms(t) };
  });
}

/**
 * The index. catalog: catalog.json as the build wrote it; snapshot:
 * nodes.snapshot.json; schemaOf(url): a published schema, to list each
 * model's $ref closure (the schemas get_model and validate read with it).
 */
export function mcpIndex(catalog, snapshot, schemaOf, base = 'https://datamodels.jp') {
  const models = (catalog.models ?? []).map((m) => ({
    id: `${m.subject}/${m.type}`,
    type: m.type, subject: m.subject, kind: m.kind, status: m.status, version: m.version,
    typeIri: m.typeIri, title: m.title, description: m.description,
    ...(m.aliasOf ? { aliasOf: m.aliasOf } : {}), ...(m.subClassOf ? { subClassOf: m.subClassOf } : {}),
    pageUrl: m.pageUrl, pageUrlEn: m.pageUrlEn,
    contextUrl: m.contextAliasUrl, contextExactUrl: m.contextUrl, schemaUrl: m.schemaUrl, vocabularyUrl: m.vocabularyUrl,
    refs: schemaRefs(schemaOf(m.schemaUrl) ?? (() => { throw new Error(`${m.schemaUrl} is not published`); })(), schemaOf, base),
    exampleUrls: m.exampleUrls ?? [],
    mappings: m.mappings ?? [],
    adapters: m.adapters ?? {},
    attributes: (m.attributes ?? []).map(({ name, iri, ngsiType, type, required, description }) => ({ name, iri, ngsiType, type, required, description })),
  }));
  const nodeModels = [];
  for (const n of snapshot.nodes ?? []) {
    const site = Object.values(n.publisher?.name ?? {})[0] ?? n.url;
    (n.models ?? []).forEach((m, i) => nodeModels.push({
      key: `${n.url}#${i}`, type: m.type, typeIri: m.typeIri, site, siteUrl: n.url, pageUrl: m.pageUrl, title: m.title ?? {}, status: m.status,
      ...(m.aliasOf ? { aliasOf: m.aliasOf } : {}), ...(m.subClassOf ? { subClassOf: m.subClassOf } : {}),
      ...(m.extends?.length ? { extends: m.extends } : {}), ...(m.contextUrl ? { contextUrl: m.contextUrl } : {}),
    }));
  }
  const search = modelIndex(catalog, snapshot, { values: true }).map((e) => ({ key: e.key, terms: terms(e.terms) }));
  return { formatVersion: 1, about: `The lookup index of the MCP server at ${base}/mcp. Not a stable interface: read ${base}/catalog.json instead.`, models, nodeModels, search, attributes: attributeIndex(catalog, snapshot, base) };
}

/** Write the index into a built tree: outDir holds catalog.json's files, at the paths of their URLs. */
export async function writeMcpIndex(outDir, catalog, snapshot, base = 'https://datamodels.jp') {
  const schemaOf = (url) => {
    if (!url.startsWith(`${base}/`)) return undefined;
    try { return JSON.parse(readFileSync(join(outDir, new URL(url).pathname), 'utf8')); } catch (e) { if (e.code === 'ENOENT') return undefined; throw e; }
  };
  const index = mcpIndex(catalog, snapshot, schemaOf, base);
  const file = join(outDir, MCP_INDEX_PATH);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(index));
  return index;
}
