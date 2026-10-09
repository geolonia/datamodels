// Write the machine-readable tree for every subject into dist/ (pages come
// from VitePress, see build.mjs).
import { mkdir, writeFile, readFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { loadSubjects, attributesOf, subjectUrls, modelUrls, DIST, ROOT, BASE_URL } from './models.mjs';
import { listReleases } from './releases.mjs';
import { buildVocabulary } from './vocab.mjs';
import { exactVersionHeaderRules, readManifest } from './cache.mjs';

const rel = (url) => url.slice(BASE_URL.length).replace(/^\//, '');
async function write(url, content) {
  const file = join(DIST, rel(url).endsWith('/') ? rel(url) + 'index.html' : rel(url));
  await mkdir(join(file, '..'), { recursive: true });
  await writeFile(file, content);
}
const json = (o) => JSON.stringify(o, null, 2) + '\n';

// catalog.json and every file it lists are CC0; the prose of the pages is CC BY 4.0 (LICENSE-CONTENT).
export const CATALOG_LICENSE = { license: 'CC0-1.0', licenseUrl: `${BASE_URL}/LICENSE-CONTENT` };

/**
 * The attributes of a model as catalog.json lists them, so a tool can list a
 * model's attributes or match a CSV against several models without fetching
 * every schema (#156). The schema stays the authority; this is a summary.
 */
// A catalog value type, from the URL of the schema an attribute references:
// .../schema/<subject>/<Type>/vX.Y.Z.json is the type .../ns/<subject>/<Type>.
const catalogValueModel = (ref) => {
  const m = typeof ref === 'string' && ref.startsWith(`${BASE_URL}/schema/`) && /\/schema\/([^/]+)\/([^/]+)\/v[^/]+\.json$/.exec(ref);
  return m ? `${BASE_URL}/ns/${m[1]}/${m[2]}` : undefined;
};

export function attributeEntries(model) {
  const required = new Set(model.schema.required ?? []);
  return attributesOf(model).map(([name, prop]) => {
    const ngsi = prop['x-ngsi'] ?? {};
    // A value type ($ref, e.g. JapaneseAddress or Geometry) is an object; its own schema is at valueModel's schema URL.
    const type = prop.$ref || prop.allOf ? 'object' : prop.type;
    const items = prop.items && { ...(prop.items.type ? { type: prop.items.type } : {}), ...(prop.items.format ? { format: prop.items.format } : {}), ...(prop.items.enum ? { enum: prop.items.enum } : {}) };
    // A value that may take one of several formats (date or date-time) lists them, as the schema's anyOf does.
    const formats = (prop.anyOf ?? []).map((a) => a?.format).filter(Boolean);
    const description = model.catalog?.attributes?.[name];
    // catalog.schema.json requires both; say which attribute lacks one instead of failing on the whole catalog.
    if (!prop['x-iri']) throw new Error(`${model.type}.${name}: no x-iri, so catalog.json cannot list its IRI`);
    if (!description?.ja || !description?.en) throw new Error(`${model.type}.${name}: catalog.yaml needs ja and en descriptions for catalog.json`);
    return {
      name,
      iri: prop['x-iri'],
      // Members of a value type (JapaneseAddress, Geometry) are plain fields inside an attribute's value, not NGSI-LD attributes.
      ...(model.kind === 'value' ? {} : { ngsiType: ngsi.type ?? 'Property' }),
      ...(type ? { type } : {}),
      ...(prop.format ? { format: prop.format } : {}),
      ...(formats.length ? { formats } : {}),
      ...(prop.enum ? { enum: prop.enum } : {}),
      ...(items && Object.keys(items).length ? { items } : {}),
      // From the referenced catalog schema, not x-ngsi.model, which may name a narrower class (geojson Point).
      ...(catalogValueModel(prop.$ref) ? { valueModel: catalogValueModel(prop.$ref) } : {}),
      ...(ngsi.target ? { target: ngsi.target } : {}),
      ...(ngsi.multi ? { multi: true } : {}),
      required: required.has(name),
      description: { ja: description.ja, en: description.en },
    };
  });
}

/** One model in catalog.json (catalog.schema.json). adapterUrls: adapter name to URL. */
export function catalogEntry(subject, model, adapterUrls = {}) {
  const u = subjectUrls(subject); const mu = modelUrls(subject, model);
  return {
    type: model.type, kind: model.kind, typeIri: mu.typeIri, subject: subject.name, domain: subject.name, source: subject.source,
    contextUrl: u.contextExact, contextAliasUrl: u.contextAlias, schemaUrl: mu.schemaExact, vocabularyUrl: u.vocabExact, version: subject.version,
    status: model.catalog.status ?? 'draft', title: model.catalog.title, description: model.catalog.description,
    sampleProperties: attributesOf(model).map(([n]) => n), pageUrl: mu.page, pageUrlEn: mu.page.replace(BASE_URL, `${BASE_URL}/en`),
    exampleUrls: Object.keys(model.examples).sort().map((f) => `${mu.examples}${f}`),
    ...(model.mappings?.length ? { mappingUrls: model.mappings.map((m) => `${mu.mapping}${m.name}.yaml`) } : {}),
    // The same files with the standard each one maps, so a tool need not fetch them to show it (#156).
    ...(model.mappings?.length ? { mappings: model.mappings.map((m) => ({ url: `${mu.mapping}${m.name}.yaml`, standard: { ja: m.standard?.name?.ja ?? m.name, en: m.standard?.name?.en ?? m.name } })) } : {}),
    attributes: attributeEntries(model),
    ...(Object.keys(adapterUrls).length ? { adapters: adapterUrls } : {}),
    ...(model.schema['x-alias-of'] ? { aliasOf: model.schema['x-alias-of'] } : {}),
    ...(model.schema['x-subclass-of'] ? { subClassOf: model.schema['x-subclass-of'] } : {}),
    ...(model.catalog.supersededBy ? { supersededBy: model.catalog.supersededBy } : {}),
  };
}

/**
 * The redirects that make the IRIs of a subject resolve to documentation:
 * the namespace to the subject page, each type to its page, each attribute to
 * its heading on a model page. Only IRIs minted in this namespace get one;
 * reused IRIs (schema.org, task, core) resolve elsewhere. An attribute that
 * several models share (with one IRI) goes to the first of those models.
 */
export function termRedirects(subject) {
  const u = subjectUrls(subject);
  const out = [`/ns/${subject.name}/  /models/${subject.name}/  302`];
  const done = new Set();
  for (const model of subject.models) {
    // An alias has no IRI of its own under this namespace.
    if (modelUrls(subject, model).typeIri === `${u.namespace}${model.type}`) out.push(`/ns/${subject.name}/${model.type}  /models/${subject.name}/${model.type}/  302`);
    for (const [name] of attributesOf(model)) {
      const iri = model.schema.properties[name]['x-iri'] ?? '';
      if (done.has(name) || !iri.startsWith(u.namespace)) continue;
      done.add(name);
      out.push(`/ns/${subject.name}/${name}  /models/${subject.name}/${model.type}/#${name}  302`);
    }
  }
  return out;
}

/**
 * adapters: modules discovered under adapters/ by build.mjs (the core never
 * imports them). Each may add one file per model, listed in catalog.json.
 */
export async function publishModels(subjects, adapters = []) {
  const catalog = { formatVersion: 1, generatedAt: new Date().toISOString(), ...CATALOG_LICENSE, models: [] };
  const redirects = ['', '# Generated: type and attribute IRIs resolve to their documentation.'];
  // Exact versions get their own Cache-Control rule (scripts/lib/cache.mjs).
  const exactPaths = [];
  const exact = (url) => exactPaths.push(`/${rel(url)}`);

  for (const subject of subjects) {
    const u = subjectUrls(subject);
    // Every published version first, then the current one on top (identical
    // bytes when it has been snapshotted; the immutability check confirms).
    for (const release of await listReleases(subject)) {
      for (const f of release.files) { await write(f.url, await readFile(f.path)); exact(f.url); }
    }
    await write(u.contextExact, json(subject.context)); exact(u.contextExact);
    await write(u.contextAlias, json(subject.context));
    const vocab = json(buildVocabulary(subject));
    await write(u.vocabExact, vocab); exact(u.vocabExact);
    await write(u.vocabAlias, vocab);
    redirects.push(...termRedirects(subject));

    for (const model of subject.models) {
      const mu = modelUrls(subject, model);
      await write(mu.schemaExact, json(model.schema)); exact(mu.schemaExact);
      await write(mu.schemaAlias, json(model.schema));
      for (const [f, content] of Object.entries(model.examples)) await write(`${mu.examples}${f}`, json(content));
      // The source bytes, comments included, so a converter reads exactly what the validator checked.
      for (const m of model.mappings ?? []) await write(`${mu.mapping}${m.name}.yaml`, await readFile(join(model.dir, 'mapping', `${m.name}.yaml`)));
      const adapterUrls = {};
      for (const a of adapters) { const url = a.urlFor(subject, model); if (url) { await write(url, a.content(subject, model)); adapterUrls[a.name] = url; } }
      catalog.models.push(catalogEntry(subject, model, adapterUrls));
    }
  }

  const ajv = new Ajv2020({ allErrors: true, strict: false }); addFormats(ajv);
  const schema = JSON.parse(await readFile(join(ROOT, 'catalog.schema.json'), 'utf8'));
  const validate = ajv.compile(schema);
  if (!validate(catalog)) throw new Error(`catalog.json does not validate: ${ajv.errorsText(validate.errors)}`);
  await write(`${BASE_URL}/catalog.json`, json(catalog));
  await write(`${BASE_URL}/catalog.schema.json`, json(schema));
  // The raw file with the legal texts. /LICENSE-CONTENT itself is a page in each language (site/LICENSE-CONTENT.md),
  // the URL that x-license-url in the schemas and licenseUrl in catalog.json name.
  await write(`${BASE_URL}/LICENSE-CONTENT.md`, await readFile(join(ROOT, 'LICENSE-CONTENT.md')));
  await appendFile(join(DIST, '_redirects'), redirects.join('\n') + '\n');
  await appendFile(join(DIST, '_headers'), exactVersionHeaderRules(exactPaths, await readManifest()).join('\n') + '\n');
  return { subjects: subjects.length, models: catalog.models.length };
}
