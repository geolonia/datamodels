// Scaffold a new model in an existing subject.
//
//   npm run new-model -- <subject> <Type>           an entity type
//   npm run new-model -- <subject> <Type> --value   a value type (like JapaneseAddress)
//
// Creates models/<subject>/<Type>/ with every file a model needs and adds the
// type to the subject's context. The generated text carries TODO markers; the
// validator rejects them, so `npm run check` lists what is left to write.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { loadSubjects, subjectUrls, modelUrls, MODELS_DIR, CORE_CONTEXT_URL } from './lib/models.mjs';

const [subjectName, type] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const isValue = process.argv.includes('--value');
const die = (msg) => { console.error(msg); process.exit(1); };

if (!subjectName || !type) die('usage: npm run new-model -- <subject> <Type> [--value]');
if (!/^[A-Z][A-Za-z0-9]*$/.test(type)) die(`type name "${type}" must be UpperCamelCase ASCII (letters and digits), for example RoadRestriction`);

const subjects = await loadSubjects();
const subject = subjects.find((s) => s.name === subjectName);
if (!subject) die(`no subject "${subjectName}"; existing subjects: ${subjects.map((s) => s.name).join(', ')}. A new subject is a proposal of its own; open an issue first.`);
const owner = subjects.flatMap((s) => s.models.map((m) => [s, m])).find(([, m]) => m.type === type);
if (owner) die(`type "${type}" already exists in subject "${owner[0].name}"`);

const dir = join(MODELS_DIR, subjectName, type);
if (await access(dir).then(() => true, () => false)) die(`${dir} already exists`);

const u = subjectUrls(subject);
const mu = modelUrls(subject, { type, schema: {} });
const json = (o) => JSON.stringify(o, null, 2) + '\n';

// The subject's context names its namespace with a prefix (tm, disaster, ...).
const contextPath = join(MODELS_DIR, subjectName, 'context.jsonld');
const context = JSON.parse(await readFile(contextPath, 'utf8'));
const parts = Array.isArray(context['@context']) ? context['@context'] : [context['@context']];
const terms = parts.find((p) => p && typeof p === 'object');
const prefix = Object.entries(terms).find(([, v]) => v === u.namespace)?.[0];
if (!prefix) die(`${contextPath} has no prefix for ${u.namespace}`);
// Type terms first (UpperCamelCase keys), then attributes, as in every context.
const entries = Object.entries(terms);
const lastType = entries.reduce((i, [k], j) => (/^[A-Z]/.test(k) ? j : i), -1);
const insertAt = lastType >= 0 ? lastType + 1 : entries.findIndex(([, v]) => typeof v !== 'string' || !v.endsWith('/'));
entries.splice(insertAt < 0 ? entries.length : insertAt, 0, [type, `${prefix}:${type}`]);
for (const k of Object.keys(terms)) delete terms[k];
Object.assign(terms, Object.fromEntries(entries));

const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: mu.schemaExact,
  title: type,
  ...(isValue ? { 'x-kind': 'value' } : {}),
  description: 'TODO: one sentence on what one instance of this type is.',
  'x-version': subject.version,
  'x-license-url': 'https://datamodels.jp/LICENSE-CONTENT',
  type: 'object',
  properties: isValue ? {} : {
    id: { type: 'string', format: 'uri', description: 'Entity id (URN)' },
    type: { type: 'string', const: type, description: 'Entity type' },
  },
  required: isValue ? [] : ['id', 'type'],
  additionalProperties: false,
};

const catalog = `title:
  ja: "TODO 日本語の名前"
  en: "TODO English name"
description:
  ja: "TODO 1 件が何を表すかを 1 文で。"
  en: "TODO One sentence on what one instance represents."
status: draft
tags: [${subjectName}]
# Every attribute in schema.json needs ja and en descriptions here:
# attributes:
#   someAttribute:
#     ja: 説明
#     en: Description
`;

const notes = `notes:
  - "TODO Which external standard or guideline this model rests on, with a link. Models must be built on an existing standard."
  - "TODO Upstream considered (date): the Smart Data Models or other types checked, and why each was adopted or not."
license: CC0 1.0 (machine-readable files), CC BY 4.0 (prose); see /LICENSE-CONTENT.md
`;

const adopters = `# Systems that use this model: name, organization, since, url, note.
# status: stable needs two from different organisations, each with a url.
adopters: []
`;

const readme = `# ${type}

TODO 日本語の名前 / TODO English name${isValue ? ' (value type)' : ''}

- ${isValue ? 'IRI' : 'Type IRI'}: \`${mu.typeIri}\`
- Context: \`${u.contextAlias}\` (alias), \`${u.contextExact}\` (exact)
- Schema: \`${mu.schemaAlias}\` (alias), \`${mu.schemaExact}\` (exact)
- Page: ${mu.page}

Files follow the Smart Data Models layout: \`schema.json\`, \`catalog.yaml\` (Japanese and English descriptions), \`examples/\`, \`notes.yaml\`, \`ADOPTERS.yaml\`. Writing examples: https://datamodels.jp/guide/extend#examples
`;

await mkdir(join(dir, 'examples'), { recursive: true });
await writeFile(join(dir, 'schema.json'), json(schema));
await writeFile(join(dir, 'catalog.yaml'), catalog);
await writeFile(join(dir, 'notes.yaml'), notes);
await writeFile(join(dir, 'ADOPTERS.yaml'), adopters);
await writeFile(join(dir, 'README.md'), readme);
await writeFile(join(dir, 'LICENSE.md'), [
  'Licences for this model folder (details: LICENSE-CONTENT.md at the repository root):',
  '',
  '- Machine-readable files (schema.json, catalog.yaml, examples/, mapping/): CC0 1.0 Universal.',
  '- Prose (notes.yaml, README.md): CC BY 4.0.',
  '- Copied from a CC BY source: none. A file that copies content from a CC BY',
  '  source (Smart Data Models, the GIF core data model schema) keeps CC BY 4.0;',
  '  list it here with its source.',
  '',
].join('\n'));
if (isValue) {
  await writeFile(join(dir, 'examples', 'example.json'), json({}));
} else {
  const id = `urn:ngsi-ld:${type}:0001`;
  await writeFile(join(dir, 'examples', 'example.json'), json({ id, type }));
  await writeFile(join(dir, 'examples', 'example-normalized.jsonld'), json({ '@context': [u.contextExact, CORE_CONTEXT_URL], id, type }));
}
await writeFile(contextPath, json(context));

console.log(`created models/${subjectName}/${type}/ and added "${type}": "${prefix}:${type}" to models/${subjectName}/context.jsonld

Next:
  1. Fill in the TODO markers (catalog.yaml, notes.yaml, schema.json, README.md).
  2. Add attributes to schema.json, their terms to the context, and ja/en descriptions to catalog.yaml.
  3. Write the examples (one fictional scenario for all subjects: https://datamodels.jp/guide/extend#examples).
  4. Run: npm run validate:models   (lists what is still missing)
Recording the release snapshot is a maintainer step.`);
