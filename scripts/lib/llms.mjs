// /llms.txt (https://llmstxt.org): a plain Markdown index for AI tools and
// agents. Generated from the models at build time, so it never lists a model
// or URL the build did not publish. English, with the Japanese names alongside.
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { subjectUrls, modelUrls, BASE_URL, ROOT } from './models.mjs';

// Guides in the order of the sidebar (site/.vitepress/config.ts), after their
// index ('' is the index page); one whose English page does not exist is left out.
const GUIDES = [
  ['', 'Guides', 'the index of the guides, with a diagram of which page to read, in groups: using a model, adapting a model (more attributes, your own names), adding to the catalog, models outside the catalog, reference'],
  ['tutorial', 'Tutorial: from a CSV file to a map', 'one real open-data CSV converted into a catalog model, step by step; an optional second part loads it into an NGSI-LD broker (GeonicDB in the examples), queries it and shows it on a map'],
  ['publish', 'Publishing your list', "for a municipality with a CSV list on its open data portal: check that the list follows the municipal standard open datasets, convert it with one command, and publish the key-values JSON next to the CSV under the CSV's licence, naming the model and its version alias URLs"],
  ['use', 'Using the models', 'validate JSON, send it to an NGSI-LD broker, use it as linked data'],
  ['csv', 'Using a spreadsheet (CSV)', "fill in a model's CSV template, check it with frictionless validate against its Table Schema, and convert it into NGSI-LD entities (datamodels convert ... csv-template)"],
  ['postgis', 'Using PostgreSQL / PostGIS', "load a model's PostgreSQL / PostGIS table (constraints, spatial index, column comments with IRIs), insert a row and query by distance"],
  ['ai-extraction', 'Extracting data with AI', "give a model's AI schema to an AI model (OpenAI response_format json_schema, or a Claude tool's input_schema) to extract entities from an e-mail or a PDF, then add id and type and check against the JSON Schema"],
  ['geonicdb', 'Use with GeonicDB', 'register a catalog model in GeonicDB, then create and query entities'],
  ['extend', 'Adding attributes', 'add attributes of your own to a catalog model without copying it (an extension), and where to host the result; its extension builder makes the @context and JSON Schema in the browser'],
  ['names', 'Your own names', 'use your own attribute and type names with JSON-LD aliases, without changing the model'],
  ['contribute', 'Contributing', 'how to take part: one section per issue form (propose a model or attributes, list an extension, list a data model site, tell us about another catalog) with what happens next; changing the files yourself follows CONTRIBUTING.md on GitHub'],
  ['rules', 'Rules for models', 'what the catalog accepts, when to define a new type, the rules, mapping to standards, writing examples, the stages of a model'],
  ['own-models', 'Your own data models', 'where to publish a model that does not belong in this catalog: your own site (a node) or Smart Data Models'],
  ['mapping', 'Mapping files', 'which field of a standard matches which attribute of a model, and the rules to convert a list'],
  ['urls', 'URLs and versions', 'which URL to use, what never changes, versions and deprecation'],
  ['catalogs', 'Other data model catalogs', 'catalogs and standards used globally and in Japan, and how this catalog relates to them'],
];

// The Toolkit section, in the order of its sidebar ('' is its landing page). The
// generated guide of data model sites is under Optional.
const TOOLKIT = [
  ['', 'Toolkit', 'datamodels-toolkit, the datamodels command and GitHub Action: publish your own models with fixed URLs on a site of your own, convert CSV lists into models, export models for other tools'],
  ['start', 'Starting a site', 'start a node with init, publish it on GitHub Pages and your own domain, a permanent w3id.org address'],
  ['models', "Your site's models", 'find an existing model in datamodels.jp and the sites it links to with search (and list those sites with nodes), add a model with add, or start from a catalog model with extend, and write its attributes'],
  ['check', 'Checking and building', 'check and build a node, and the GitHub Action that checks pull requests and publishes'],
  ['versions', 'Versions', 'change a published model: bump and release keep the old version online; upgrade moves the node to a newer toolkit'],
  ['hosts', 'Other hosts', 'publish a node on Cloudflare Pages, Netlify or another static host instead of GitHub Pages: content types, CORS, 404 and redirects (the _headers and _redirects files that build writes), and the workflow jobs'],
  ['convert', 'Converting your data', 'convert your own CSV list into entities of a catalog model (datamodels convert): with the mapping file of a standard the list follows, with a mapping of your own (datamodels mapping, then convert --check; an agent skill helps an AI agent fill it in), or from the CSV template'],
  ['export', 'Exporting to other tools', 'a CSV template, its Table Schema, a strict JSON Schema for the structured output of AI models and a PostgreSQL / PostGIS table from a model (datamodels export); on datamodels.jp each model page has them under Download'],
  ['reference', 'Command reference', 'every command of datamodels with its arguments, options, defaults and exit codes, linking the task page of each'],
  ['node', 'The node and build', 'what a node holds (node.yaml and its settings, models/) and what build writes: catalog.json, @contexts, schemas, vocabularies, examples, mapping files, adapter files, llms.txt and the pages; the build library for scripts'],
];

const exists = (path) => access(path).then(() => true, () => false);
const oneLine = (s) => s.replace(/\s+/g, ' ').trim();

export async function llmsTxt(subjects) {
  let txt = `# datamodels.jp\n\n`;
  txt += `> Data models that work in Japan: JSON Schemas (2020-12), JSON-LD @context files and RDFS vocabularies at URLs that never change. Usable as plain JSON, as linked data, and with NGSI-LD brokers. Existing standards (Smart Data Models, the Digital Agency's GIF, RFC 8984) are extended and mapped, not copied.\n\n`;
  txt += `Every model page is published in Japanese (${BASE_URL}/models/...) and English (${BASE_URL}/en/models/...). Exact versions (v1.0.0) never change; version aliases (v1) follow the latest compatible version. Machine-readable list of every model with all its URLs: ${BASE_URL}/catalog.json.\n\n`;
  txt += `## Guides\n\n`;
  for (const [slug, title, what] of GUIDES) {
    if (await exists(join(ROOT, 'site', 'en', 'guide', `${slug || 'index'}.md`))) txt += `- [${title}](${BASE_URL}/en/guide/${slug}): ${what}\n`;
  }
  txt += `\n## Toolkit\n\n`;
  for (const [slug, title, what] of TOOLKIT) {
    if (await exists(join(ROOT, 'site', 'en', 'toolkit', `${slug || 'index'}.md`))) txt += `- [${title}](${BASE_URL}/en/toolkit/${slug}): ${what}\n`;
  }
  txt += `\n`;
  for (const subject of subjects) {
    const su = subjectUrls(subject);
    txt += `## Subject: ${subject.name} (${subject.title.en} / ${subject.title.ja}), version ${subject.version}\n\n`;
    txt += `${oneLine(subject.description.en)}\n\n`;
    txt += `- [@context](${su.contextAlias}): use this version alias in data and Link headers; exact version ${su.contextExact} for audits and reproducing results\n`;
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
  txt += `- [GeonicDB Custom Data Models](${BASE_URL}/en/adapters/geonicdb/): the GeonicDB definition of every model, to register it in GeonicDB (see the guide Use with GeonicDB)\n`;
  txt += `- [Adapters](${BASE_URL}/en/adapters/): the files made from each model for particular tools and brokers (a CSV template, its Table Schema, a strict JSON Schema for AI structured output, a PostgreSQL / PostGIS table, GeonicDB Custom Data Models): what each file is, how to use it and where to get it. The generic files are under Download on each model page and under \`adapters\` in catalog.json\n`;
  txt += `- [Standards covered](${BASE_URL}/en/guide/standards): every external standard a model is mapped to (EEI, the municipal standard open datasets, GSI, GIF and more), with a link to each field-by-field table\n`;
  txt += `- [Data model sites](${BASE_URL}/en/guide/sites): other sites that publish their own data models with datamodels-toolkit: one row per site, with its licence, how many models it has and which catalog models they build on. Each catalog model page lists the site models and listed extensions built on it, with the attributes they add and their IRIs ("Built on by others")\n`;
  txt += `- [AI and agents](${BASE_URL}/en/ai): how AI is used to make this site, and what agents can use\n`;
  txt += `- [About this site](${BASE_URL}/en/about): operator, licences, disclaimer and privacy\n`;
  txt += `- [Source repository](https://github.com/geolonia/datamodels): schemas, mappings to other standards, notes\n`;
  txt += `- [Licences](${BASE_URL}/en/LICENSE-CONTENT): machine-readable files CC0 1.0, prose CC BY 4.0, code Apache-2.0\n`;
  return txt;
}
