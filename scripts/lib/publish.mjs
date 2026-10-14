// Write the machine-readable tree for every subject into dist/ (pages come
// from VitePress, see build.mjs). The files are the toolkit's (publishCatalog,
// #226); what only datamodels.jp adds stays here: the check of catalog.json
// against catalog.schema.json, the licence file, the redirect and cache rules.
import { writeFile, readFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { publishCatalog, catalogEntry as tkCatalogEntry, attributeEntries as tkAttributeEntries, termRedirects as tkTermRedirects } from '@geolonia/datamodels/build';
import { DIST, ROOT, NODE, URLS } from './models.mjs';
import { exactVersionHeaderRules } from './cache.mjs';

const options = { urls: URLS, languages: NODE.languages };
const json = (o) => JSON.stringify(o, null, 2) + '\n';

// catalog.json and every file it lists are CC0; the prose of the pages is CC BY 4.0 (LICENSE-CONTENT). From node.yaml.
export const CATALOG_LICENSE = { license: NODE.license, licenseUrl: NODE.licenseUrl };
// Who publishes the catalog, in the node format (docs/node.md), so tools that read many catalogs can name it (decided 2026-10-12). From node.yaml.
export const CATALOG_PUBLISHER = NODE.publisher;

/** The attributes of a model as catalog.json lists them (#156). */
export const attributeEntries = (model) => tkAttributeEntries(model, options);

/** One model in catalog.json; `adapterUrls`: adapter name to URL. */
export const catalogEntry = (subject, model, adapterUrls = {}) => tkCatalogEntry(subject, model, { ...options, adapterUrls });

/**
 * Redirect rules (Cloudflare _redirects) that make every minted IRI lead to its
 * documentation: the namespace to the subject page, each type to its page, each
 * attribute to its heading on a model page.
 */
export const termRedirects = (subject) => tkTermRedirects(subject, options).map(([from, to]) => `${from}  ${to}  302`);

/**
 * The top of catalog.json, before its models. nodes: the nodes datamodels.jp
 * knows (nodes.yaml, [{ url, index }]), listed so that tools starting here find
 * them, as every node lists the nodes it knows (docs/node.md, section 3).
 */
export const catalogHead = (nodes = []) => ({ formatVersion: 1, generatedAt: new Date().toISOString(), publisher: CATALOG_PUBLISHER, ...CATALOG_LICENSE, ...(nodes.length ? { nodes: nodes.map(({ url, index }) => ({ url, index })) } : {}) });

/**
 * adapters: modules discovered under adapters/ by build.mjs (the core never
 * imports them). Each may add one file per model, listed in catalog.json.
 * nodes: the known nodes, for catalogHead. outDir: where to write (dist/;
 * the tests write a copy elsewhere). Returns the counts and catalog.json.
 */
export async function publishModels(subjects, adapters = [], { nodes = [], outDir = DIST } = {}) {
  const { generatedAt, formatVersion, ...head } = catalogHead(nodes);
  const { catalog, exactPaths, redirects } = await publishCatalog(subjects, { ...options, outDir, head, adapters, now: new Date(generatedAt) });
  const ajv = new Ajv2020({ allErrors: true, strict: false }); addFormats(ajv);
  const schema = JSON.parse(await readFile(join(ROOT, 'catalog.schema.json'), 'utf8'));
  const validate = ajv.compile(schema);
  if (!validate(catalog)) throw new Error(`catalog.json does not validate: ${ajv.errorsText(validate.errors)}`);
  await writeFile(join(outDir, 'catalog.schema.json'), json(schema));
  // The raw file with the legal texts. /LICENSE-CONTENT itself is a page in each language (site/LICENSE-CONTENT.md),
  // the URL that x-license-url in the schemas and licenseUrl in catalog.json name.
  await writeFile(join(outDir, 'LICENSE-CONTENT.md'), await readFile(join(ROOT, 'LICENSE-CONTENT.md')));
  const rules = ['', '# Generated: type and attribute IRIs resolve to their documentation.', ...redirects.map(([from, to]) => `${from}  ${to}  302`)];
  await appendFile(join(outDir, '_redirects'), rules.join('\n') + '\n');
  await appendFile(join(outDir, '_headers'), exactVersionHeaderRules(exactPaths).join('\n') + '\n');
  return { subjects: subjects.length, models: catalog.models.length, catalog };
}
