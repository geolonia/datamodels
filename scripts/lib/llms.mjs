// /llms.txt (https://llmstxt.org): a plain Markdown index for AI tools and
// agents. Generated from the models at build time, so it never lists a model
// or URL the build did not publish. English, with the Japanese names alongside.
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { subjectUrls, modelUrls, BASE_URL, ROOT } from './models.mjs';

// Guides in the order of the sidebar (site/.vitepress/config.ts); one whose
// English page does not exist is left out.
const GUIDES = [
  ['use', 'Using the models', 'validate JSON, send it to an NGSI-LD broker, use it as linked data'],
  ['geonicdb', 'Use with GeonicDB', 'register a catalog model in GeonicDB, then create and query entities'],
  ['extend', 'Adding attributes', 'add attributes of your own to a catalog model without copying it, and where to host the result'],
  ['builder', 'Extension builder', 'build the @context and JSON Schema for your own attributes on a catalog model, in the browser'],
  ['names', 'Your own names', 'use your own attribute and type names with JSON-LD aliases, without changing the model'],
  ['urls', 'URLs and versions', 'which URL to use, what never changes, versions and deprecation'],
  ['contribute', 'Contributing', 'propose or change models, stages and who decides'],
  ['rules', 'Rules for models', 'when to define a new type, the rules, mapping to standards, writing examples'],
  ['catalogs', 'Other data model catalogs', 'catalogs and standards used globally and in Japan, and how this catalog relates to them'],
];

const exists = (path) => access(path).then(() => true, () => false);
const oneLine = (s) => s.replace(/\s+/g, ' ').trim();

export async function llmsTxt(subjects) {
  let txt = `# datamodels.jp\n\n`;
  txt += `> Data models that work in Japan: JSON Schemas (2020-12), JSON-LD @context files and RDFS vocabularies at URLs that never change. Usable as plain JSON, as linked data, and with NGSI-LD brokers. Existing standards (Smart Data Models, the Digital Agency's GIF, RFC 8984) are extended and mapped, not copied.\n\n`;
  txt += `Every model page is published in Japanese (${BASE_URL}/models/...) and English (${BASE_URL}/en/models/...). Exact versions (v1.0.0) never change; major aliases (v1) follow the latest compatible version. Machine-readable list of every model with all its URLs: ${BASE_URL}/catalog.json.\n\n`;
  txt += `## Guides\n\n`;
  for (const [slug, title, what] of GUIDES) {
    if (await exists(join(ROOT, 'site', 'en', 'guide', `${slug}.md`))) txt += `- [${title}](${BASE_URL}/en/guide/${slug}): ${what}\n`;
  }
  txt += `\n`;
  for (const subject of subjects) {
    const su = subjectUrls(subject);
    txt += `## Subject: ${subject.name} (${subject.title.en} / ${subject.title.ja}), version ${subject.version}\n\n`;
    txt += `${oneLine(subject.description.en)}\n\n`;
    txt += `- [@context](${su.contextAlias}): use this alias in data and Link headers; exact version ${su.contextExact} for audits and reproducing results\n`;
    txt += `- [Vocabulary](${su.vocabExact}): RDFS classes, subclass relations, ja/en labels\n`;
    for (const model of subject.models) {
      const mu = modelUrls(subject, model);
      const kind = model.kind === 'value' ? 'value type' : 'entity type';
      const status = model.catalog.status ?? 'draft';
      txt += `- [${model.type}](${mu.page.replace(BASE_URL, `${BASE_URL}/en`)}) (${model.catalog.title.ja}; ${kind}, ${status}): ${oneLine(model.catalog.description.en)} JSON Schema: ${mu.schemaExact}\n`;
    }
    txt += `\n`;
  }
  txt += `## Optional\n\n`;
  txt += `- [catalog.json](${BASE_URL}/catalog.json): every model with its type IRI, context, schema, vocabulary, example, page (Japanese and English), mapping and adapter URLs, its attributes (type, required, IRI) and the licence (CC0-1.0)\n`;
  txt += `- [Find a model by standard](${BASE_URL}/en/guide/standards): every external standard a model is mapped to (EEI, the municipal standard open datasets, GSI, GIF and more), with a link to each field-by-field table\n`;
  txt += `- [Source repository](https://github.com/geolonia/datamodels): schemas, mappings to other standards, notes\n`;
  txt += `- [Licences](${BASE_URL}/LICENSE-CONTENT): machine-readable files CC0 1.0, prose CC BY 4.0, code Apache-2.0\n`;
  return txt;
}
