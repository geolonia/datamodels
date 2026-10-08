// Generate the VitePress pages for every subject and model, in Japanese
// (root locale, /models/...) and English (/en/models/...). Pages are written
// into site/ at build time and are not committed.
//
// Anchors: every attribute is a level-3 heading with an explicit id
// (`### roadName {#roadName}`) so that the /ns/<subject>/<term> redirects,
// which point at `#<term>`, keep working with case preserved.
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { attributesOf, subjectUrls, modelUrls, BASE_URL, ROOT, CORE_TERMS } from './models.mjs';
import { modelAnchor } from './adapter-pages.mjs';
import { graphSvg, graphTitle } from './graph.mjs';
import { listReleases } from './releases.mjs';
import { standardsPage } from './standards.mjs';
import { standardLicense } from './mapping-check.mjs';

const SITE = join(ROOT, 'site');
const rel = (url) => url.slice(BASE_URL.length);
const code = (s) => `\`${s}\``;
// A Markdown link to any URL that renders as exactly that URL: the text is
// escaped (brackets, emphasis), the destination is serialised (spaces) and
// angle-bracketed (an unmatched parenthesis would end a bare destination).
export const externalLink = (url) => `[${url.replace(/[\\`*_{}[\]()<>#!|~]/g, '\\$&')}](<${new URL(url).href}>)`;
const fence = (obj) => '```json\n' + JSON.stringify(obj, null, 2) + '\n```';

const T = {
  ja: {
    models: 'データモデル', overview: '概要', subjects: 'サブジェクト', attributes: '属性', example: '例（key-values）', normalized: '例（normalized）', exampleNote: (href) => `例は架空のシナリオ（東京都千代田区の大雨対応）です。地名とコードは実在のものですが、出来事・人・チームは架空です。書き方は[例の書き方](${href})にあります。`,
    linkHeader: 'Link ヘッダー', notes: '注記', type: '型', name: '名前', stage: '段階', typeIri: '型 IRI', otherName: '英語名', useGuide: (href) => `データの検証とブローカーへの送り方は[使い方](${href})にあります。`, context: '@context',
    urlNote: (versions, guide, withSchema) => `上の @context${withSchema ? ' と JSON Schema' : ''} の URL は、互換性のある新しいバージョンに追従します。バージョンごとの固定の URL は[バージョン](${versions})に、使い分けは[URL とバージョン](${guide})にあります。`, schema: 'JSON Schema', examples: '例',
    adapters: 'アダプター', adaptersRow: 'ブローカーやツール向けのファイル', mappingFiles: '対応表（YAML）',
    source: 'ソース', namespace: '名前空間', version: 'バージョン', vocabulary: '語彙',
    tryIt: '例を試す',
    extendThis: (href) => `このモデルに独自の属性を足すときは、[拡張ビルダー](${href})で @context と JSON Schema を作れます。`,
    required: '必須', pii: '個人情報', deprecated: '非推奨', value: '値', relationshipTo: '→', license: 'このページの文章は CC BY 4.0、モデルのファイル（JSON Schema、@context、例）は CC0 です。',
    filesLicense: (href) => `この表のファイル（@context、JSON Schema、例など）は [CC0 1.0](${href}) で、条件なしで使えます。`,
    playground: (href) => `[JSON-LD Playground で開く](${href})：属性ごとの IRI（展開形）が見られます。`,
    improveTitle: '改善の提案', improve: (issue, form, guide) => `属性が足りない、説明がおかしいと思ったら、[Issue で知らせてください](${issue})。新しい属性やモデルは[提案フォーム](${form})から提案できます。進め方は[貢献する](${guide})にあります。`,
    deprecatedNote: (link) => `このモデルは非推奨です。${link ? `代わりに ${link} を使ってください。` : ''}公開済みのファイルと URL はそのまま残ります。`, valueType: '値型', valueTypeNote: 'これはエンティティ型ではなく、属性の値として使う構造です。', fields: 'フィールド', versions: 'バージョン', current: '現行', usage: '使い方',
    forPrograms: 'プログラムからは、同じ一覧を [catalog.json](/catalog.json) で読めます。',
    intro: 'モデルは分野（サブジェクト）ごとにまとめています。分野を開くか、名前・属性・説明で探してください。',
    statusLabel: { draft: 'ドラフト', stable: '安定', deprecated: '非推奨' },
    sourceLabel: { minted: 'このカタログで定義', profile: '上流モデルの日本向け拡張', global: '上流（Smart Data Models）' },
    subject: 'サブジェクト', mappings: '対応する標準', mappingField: 'このモデル', mappingTo: '対応先', mappingNote: '備考', none: '対応なし',
    alias: 'エイリアス', aliasNote: (link) => `${link} と同じ型です（IRI が同一）。名称だけがこのサブジェクトの言い方に合わせてあり、属性も必須項目も同じです。ブローカーでは同じ型として保存・照合されます。`,
    subclass: 'サブクラス', subclassNote: (link) => `${link} のサブクラスです。同名の属性は親と同じ IRI を持ち、親の必須項目はここでも必須なので、親の属性を読むコードはこの型もそのまま読めます。型そのものは別なので、親の型で検索するクライアントは語彙の rdfs:subClassOf をたどって初めてこの型を見つけます。`,
  },
  en: {
    models: 'Data models', overview: 'Overview', subjects: 'Subjects', attributes: 'Attributes', example: 'Example (key-values)', normalized: 'Example (normalized)', exampleNote: (href) => `The examples are a fictional scenario (heavy rain in Chiyoda, Tokyo). Place names and codes are real; the events, people and teams are invented. See [writing examples](${href}).`,
    linkHeader: 'Link header', notes: 'Notes', type: 'Type', name: 'Name', stage: 'Stage', typeIri: 'Type IRI', otherName: 'Japanese name', useGuide: (href) => `How to validate data and send it to a broker: [Using the models](${href}).`, context: '@context',
    urlNote: (versions, guide, withSchema) => `The @context${withSchema ? ' and JSON Schema URLs' : ' URL'} above ${withSchema ? 'follow' : 'follows'} new compatible versions. The fixed URLs of each version are under [Versions](${versions}); which one to use when: [URLs and versions](${guide}).`, schema: 'JSON Schema', examples: 'Examples',
    adapters: 'Adapters', adaptersRow: 'files for particular brokers and tools', mappingFiles: 'Mapping files (YAML)',
    source: 'Source', namespace: 'Namespace', version: 'Version', vocabulary: 'Vocabulary',
    tryIt: 'Try the example',
    extendThis: (href) => `To add attributes of your own to this model, the [extension builder](${href}) writes the @context and JSON Schema.`,
    required: 'required', pii: 'personal data', deprecated: 'deprecated', value: 'Value', relationshipTo: '→', license: 'The text of this page is licensed under CC BY 4.0; the model files (JSON Schema, @context, examples) are CC0.',
    filesLicense: (href) => `The files in this table (@context, JSON Schema, examples and others) are [CC0 1.0](${href}): use them without conditions.`,
    playground: (href) => `[Open in the JSON-LD Playground](${href}): see the full IRI behind every attribute (expanded form).`,
    improveTitle: 'Something missing or wrong?', improve: (issue, form, guide) => `[Open an issue](${issue}), or propose new attributes or models with the [proposal form](${form}). How it works: [Contributing](${guide}).`,
    deprecatedNote: (link) => `This model is deprecated.${link ? ` Use ${link} instead.` : ''} Its published files and URLs stay as they are.`, valueType: 'value type', valueTypeNote: 'This is not an entity type but a structure used as the value of an attribute.', fields: 'Fields', versions: 'Versions', current: 'current', usage: 'Usage',
    forPrograms: 'Programs can read the same list from [catalog.json](/catalog.json).',
    intro: 'Models are grouped by subject. Open a subject, or search by name, attribute or description.',
    statusLabel: { draft: 'draft', stable: 'stable', deprecated: 'deprecated' },
    sourceLabel: { minted: 'defined in this catalog', profile: 'Japanese profile of an upstream model', global: 'upstream (Smart Data Models)' },
    subject: 'Subject', mappings: 'Corresponding standards', mappingField: 'This model', mappingTo: 'Maps to', mappingNote: 'Note', none: 'no counterpart',
    alias: 'alias', aliasNote: (link) => `The same type as ${link} (identical IRI). Only the name follows this subject's wording; attributes and required fields are the same. A broker stores and matches both names as one type.`,
    subclass: 'subclass', subclassNote: (link) => `A subclass of ${link}. Attributes with the same name carry the parent's IRIs and the parent's required attributes stay required, so code that reads the parent's attributes reads this type too. The type itself differs: a client that selects by the parent type finds this one only by following rdfs:subClassOf in the vocabulary.`,
  },
};

const badge = (type, text) => `<Badge type="${type}" text="${text}" />`;
// Label colours carry a meaning (custom.css): green (tip) ready to use, amber (warning)
// may still change, red (danger) careful, grey (info) just information.
const stageBadgeType = { stable: 'tip', draft: 'warning', deprecated: 'danger' };
const statusBadge = (lang, status) => badge(stageBadgeType[status] ?? 'info', T[lang].statusLabel[status] ?? status);
// The description is the page's meta and share-preview text, which shows no Markdown.
export const plainText = (s) => String(s ?? '')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/`([^`]*)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/\s+/g, ' ').trim();
const front = (title, description) => `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(plainText(description))}\n---\n\n`;
// "#85" in a note is an issue of this repository, as on GitHub.
// After a space, a bracket or Japanese punctuation (「2026-09-30、#118」).
export const issueLinks = (s) => s.replace(/(^|[\s(（、，。])#(\d+)\b/g, '$1[#$2](https://github.com/geolonia/datamodels/issues/$2)');

let allSubjects = [];
// Adapters discovered by build.mjs (the core never imports them): only whether one serves a model.
let allAdapters = [];
/** The URL table's "Adapters" row, or '' when no adapter serves the model. Product-neutral: it links the model's entry on /adapters/, which names the products and their files. */
export function adapterRow(lang, prefix, subject, model, adapters) {
  const t = T[lang];
  return adapters.some((a) => a.urlFor(subject, model)) ? `| ${t.adapters} | [${t.adaptersRow}](${prefix}/adapters/#${modelAnchor(subject, model)}) |\n` : '';
}

/** Everything the example playground (ExamplePlayground.vue) needs for one entity model. */
function playgroundData(lang, subject, model) {
  const norm = model.examples['example-normalized.jsonld'];
  const refs = new Map();
  const collect = (node) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.$ref === 'string' && node.$ref.startsWith(BASE_URL)) {
      const url = node.$ref.split('#')[0];
      for (const s of allSubjects) for (const m of s.models) if (m.kind === 'value' && m.schema.$id === url && !refs.has(url)) { refs.set(url, m.schema); collect(m.schema); }
    }
    for (const v of Object.values(node)) collect(v);
  };
  collect(model.schema);
  const iris = {};
  for (const [name, prop] of attributesOf(model)) {
    const iri = prop['x-iri'];
    if (!iri) continue;
    // A core term keeps "NGSI-LD core" as its origin, whatever host its IRI is on (description -> dcterms).
    const viaCore = CORE_TERMS.has(name);
    const own = iri.startsWith(`${BASE_URL}/ns/`) ? iri.slice(BASE_URL.length + 4).split('/')[0] : null;
    iris[name] = own
      ? { iri, origin: own === subject.name ? 'subject' : 'other', label: own }
      : viaCore || iri.startsWith('https://uri.etsi.org/ngsi-ld/') ? { iri, origin: 'core', label: 'NGSI-LD' } : { iri, origin: 'upstream', label: new URL(iri).host };
  }
  return { lang, type: model.type, kv: model.examples['example.json'], normalized: norm, context: norm['@context'], schema: model.schema, refs: [...refs.values()], iris };
}
/** The model documenting a type IRI: an alias in the same subject first, then the owner anywhere. */
function modelForIri(subject, iri, { ownerOnly = false } = {}) {
  const here = ownerOnly ? null : subject.models.find((m) => modelUrls(subject, m).typeIri === iri);
  if (here) return { subject, model: here };
  for (const s of allSubjects) { const m = s.models.find((x) => !x.schema['x-alias-of'] && modelUrls(s, x).typeIri === iri); if (m) return { subject: s, model: m }; }
  return null;
}
// encodeURIComponent keeps ( and ), and a ) in an example would end the Markdown link early.
export const playgroundUrl = (doc) => `https://json-ld.org/playground/#startTab=tab-expanded&json-ld=${encodeURIComponent(JSON.stringify(doc)).replace(/[()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;
const modelLink = (prefix, found) => `[${found.model.type}](${prefix}${rel(modelUrls(found.subject, found.model).page)})`;

export function valueText(lang, subject, prop, prefix) {
  const ngsi = prop['x-ngsi']?.type;
  if (ngsi === 'Relationship') {
    const targetIri = prop['x-ngsi'].target;
    const target = targetIri?.split('/').pop();
    const found = targetIri?.startsWith('http') ? modelForIri(subject, targetIri) : null;
    const multi = prop['x-ngsi'].multi ? (lang === 'ja' ? '（複数可）' : ' (multiple)') : '';
    return `Relationship ${T[lang].relationshipTo} ${found ? modelLink(prefix, found) : target === 'any' ? (lang === 'ja' ? '任意のエンティティ' : 'any entity') : target === 'agent' ? (lang === 'ja' ? '人・組織・チーム' : 'person, organisation or team') : target ?? 'entity'}${multi}`;
  }
  const ref = prop.$ref ?? prop.allOf?.find((a) => a.$ref)?.$ref;
  const m = ref && /\/schema\/([a-z0-9-]+)\/([A-Za-z0-9]+)\//.exec(ref);
  const refText = ref && (m ? `[${m[2]}](${prefix}/models/${m[1]}/${m[2]}/)` : code(ref));
  if (ngsi === 'GeoProperty') {
    const only = prop.properties?.type?.const;
    return `GeoProperty (${[refText, only].filter(Boolean).join(', ') || 'GeoJSON'})`;
  }
  const kind = ngsi === 'JsonProperty' || ngsi === 'VocabProperty' ? ngsi : 'Property';
  if (ref) return `${kind}, object: ${refText}`;
  let t = prop.type ?? '';
  if (prop.format) t += ` (${prop.format})`;
  if (prop.enum) t += `: ${prop.enum.map(code).join(' \\| ')}`;
  if (prop.minimum !== undefined) t += `, ≥ ${prop.minimum}`;
  if (prop.exclusiveMinimum !== undefined) t += `, > ${prop.exclusiveMinimum}`;
  if (prop.maximum !== undefined) t += `, ≤ ${prop.maximum}`;
  if (prop.exclusiveMaximum !== undefined) t += `, < ${prop.exclusiveMaximum}`;
  // JsonProperty and VocabProperty (NGSI-LD 1.8) describe their value like a Property.
  return `${kind}, ${t}`;
}

function modelPage(lang, prefix, subject, model) {
  const t = T[lang]; const u = subjectUrls(subject); const mu = modelUrls(subject, model);
  const required = new Set(model.schema.required ?? []);
  const title = model.catalog.title?.[lang] ?? model.type;
  const desc = model.catalog.description?.[lang] ?? '';
  const other = lang === 'ja' ? 'en' : 'ja';
  const isValue = model.kind === 'value';
  const aliasOf = model.schema['x-alias-of'] ? modelForIri(subject, model.schema['x-alias-of'], { ownerOnly: true }) : null;
  const subclassOf = model.schema['x-subclass-of'] ? modelForIri(subject, model.schema['x-subclass-of'], { ownerOnly: true }) : null;
  let md = front(`${model.type}`, desc);
  const playground = !isValue && model.examples['example.json'] && model.examples['example-normalized.jsonld'];
  // "<" escaped so no text can close the script block.
  if (playground) md += `<script setup>\nconst playground = ${JSON.stringify(playgroundData(lang, subject, model)).replaceAll('<', '\\u003c')}\n</script>\n\n`;
  md += `# ${model.type} ${statusBadge(lang, model.catalog.status ?? 'draft')}${isValue ? ` ${badge('info', t.valueType)}` : ''}${aliasOf ? ` ${badge('info', t.alias)}` : ''}${subclassOf ? ` ${badge('info', t.subclass)}` : ''}\n\n`;
  if (isValue) md += `> ${t.valueTypeNote}\n\n`;
  if ((model.catalog.status ?? 'draft') === 'deprecated') {
    // supersededBy is a type IRI of this catalog (link its page) or any other URL.
    const next = model.catalog.supersededBy;
    const found = next ? modelForIri(subject, next) : null;
    md += `> ${t.deprecatedNote(found ? modelLink(prefix, found) : next ? externalLink(next) : null)}\n\n`;
  }
  if (aliasOf) md += `> ${t.aliasNote(modelLink(prefix, aliasOf))}\n\n`;
  if (subclassOf) md += `> ${t.subclassNote(modelLink(prefix, subclassOf))}\n\n`;
  // One language per page (the switcher gives the other); the localised title
  // only when it says more than the type name, the other language's in the table.
  const sameName = (a) => a.replace(/\s+/g, '').toLowerCase() === model.type.toLowerCase();
  if (!sameName(title)) md += `**${title}**\n\n`;
  md += `${desc}\n\n`;
  md += `| | |\n|---|---|\n`;
  const otherTitle = model.catalog.title?.[other];
  if (otherTitle && !sameName(otherTitle)) md += `| ${t.otherName} | ${otherTitle} |\n`;
  md += `| ${isValue ? 'IRI' : t.typeIri} | ${code(mu.typeIri)} |\n`;
  // The aliases only; the fixed URLs of each version are on the subject page (urlNote below the table).
  md += `| ${t.context} | [${code(u.contextAlias)}](${rel(u.contextAlias)}) |\n`;
  md += `| ${t.schema} | [${code(rel(mu.schemaAlias))}](${rel(mu.schemaAlias)}) |\n`;
  md += isValue ? `| ${t.examples} | [example.json](${rel(mu.examples)}example.json) |\n`
    : `| ${t.examples} | [key-values](${rel(mu.examples)}example.json) · [normalized](${rel(mu.examples)}example-normalized.jsonld) |\n`;
  // The correspondence tables below, as files a converter reads.
  if (model.mappings?.length) md += `| ${t.mappingFiles} | ${model.mappings.map((m) => `[${m.name}.yaml](${rel(mu.mapping)}${m.name}.yaml)`).join(' · ')} |\n`;
  md += adapterRow(lang, prefix, subject, model, allAdapters);
  md += `| ${t.source} | [github.com/geolonia/datamodels](https://github.com/geolonia/datamodels/tree/main/models/${subject.name}/${model.type}) |\n\n`;
  md += `<small>${t.urlNote(`${prefix}${rel(subjectUrls(subject).page)}#versions`, `${prefix}/guide/urls`, true)}</small>\n\n`;
  // The source line above the page names the text's licence; the files have their own.
  md += `${t.filesLicense(`${prefix}/LICENSE-CONTENT`)}\n\n`;
  // This model and its neighbours, one step; each neighbour links to its own page.
  const neighbourhood = graphSvg(lang, prefix, allSubjects, null, 'LR', { center: `${subject.name}/${model.type}` });
  if (neighbourhood) md += `## ${graphTitle[lang]} {#graph}\n\n${neighbourhood}`;
  if (attributesOf(model).length) md += `## ${isValue ? t.fields : t.attributes} {#attributes}\n\n`;
  for (const [name, prop] of attributesOf(model)) {
    const flags = [required.has(name) ? badge('info', t.required) : '', prop['x-personal-data'] ? badge('danger', t.pii) : '', prop['x-deprecated'] ? badge('danger', t.deprecated) : ''].filter(Boolean).join(' ');
    md += `### ${name} {#${name}}\n\n`;
    if (flags) md += `${flags}\n\n`;
    md += `${model.catalog.attributes?.[name]?.[lang] ?? prop.description ?? ''}\n\n`;
    md += isValue ? `- ${t.value}: ${prop.type}${prop.const ? ` = ${code(prop.const)}` : ''}${prop.pattern ? `, pattern ${code(prop.pattern)}` : ''}\n- IRI: ${code(prop['x-iri'] ?? '')}\n\n`
      : `- ${t.value}: ${valueText(lang, subject, prop, prefix)}\n- IRI: ${code(prop['x-iri'] ?? '')}\n\n`;
  }
  if (isValue) {
    const u2 = subjectUrls(subject);
    // Geometries are the value of the core location GeoProperty; other value types of a Property.
    const geo = model.schema['x-ngsi']?.type === 'GeoProperty';
    const [attr, ngsiType, attrIri] = geo ? ['location', 'GeoProperty', 'https://uri.etsi.org/ngsi-ld/location'] : ['address', 'Property', 'https://schema.org/address'];
    md += `## ${t.usage} {#usage}\n\n\`\`\`json\n"${attr}": {\n  "$ref": "${mu.schemaExact}",\n  "x-ngsi": { "type": "${ngsiType}", "model": "${mu.typeIri}" },\n  "x-iri": "${attrIri}"\n}\n\`\`\`\n\n`;
    if (!geo) md += `\`\`\`json\n{ "@context": ["${u2.contextAlias}", { ... }] }\n\`\`\`\n\n`;
  }
  if (model.examples['example.json']) md += `## ${t.example} {#example}\n\n${t.exampleNote(`${prefix}/guide/rules#examples`)}\n\n${fence(model.examples['example.json'])}\n\n`;
  if (model.examples['example-normalized.jsonld']) {
    // The JSON-LD Playground fetches the published @context and shows every attribute as its full IRI.
    const playgroundLink = playgroundUrl(model.examples['example-normalized.jsonld']);
    md += `## ${t.normalized} {#example-normalized}\n\n${fence(model.examples['example-normalized.jsonld'])}\n\n${t.playground(playgroundLink)}\n\n`;
  }
  if (playground) md += `## ${t.tryIt} {#try}\n\n<ExamplePlayground v-bind="playground" />\n\n`;
  if (!isValue) md += `## ${t.linkHeader} {#link-header}\n\n\`\`\`http\nLink: <${u.contextAlias}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"\n\`\`\`\n\n`;
  if (!isValue) md += `${t.useGuide(`${prefix}/guide/use`)}\n\n`;
  if (!isValue) md += `${t.extendThis(`${prefix}/guide/builder?model=${subject.name}/${model.type}`)}\n\n`;
  for (const map of model.mappings ?? []) {
    md += `## ${t.mappings}: ${map.standard?.name?.[lang] ?? map.name} {#mapping-${map.name}}\n\n`;
    if (map.standard?.url) md += `[${map.standard.name?.[lang] ?? map.name}](${map.standard.url})${standardLicense(map.standard, lang) ? ` · ${standardLicense(map.standard, lang)}` : ''}\n\n`;
    if (map.standard?.note?.[lang]) md += `${map.standard.note[lang]}\n\n`;
    if (map.structure?.[lang]) md += `${map.structure[lang]}\n\n`;
    md += `| ${t.mappingField} | ${t.mappingTo} | ${t.mappingNote} |\n|---|---|---|\n`;
    // Link a field to its attribute row; a value type such as Geometry has no rows to link to.
    for (const [field, m] of Object.entries(map.fields ?? {})) md += `| ${model.schema.properties?.[field] ? `[${code(field)}](#${field})` : code(field)} | ${m.to ? code(m.to) : `*${t.none}*`} | ${m.note?.[lang] ?? ''} |\n`;
    md += '\n';
  }
  const notes = model.notes?.notes ?? [];
  if (notes.length) md += `## ${t.notes} {#notes}\n\n${notes.map((n) => `- ${issueLinks(n[lang])}`).join('\n')}\n\n`;
  // Invite corrections where readers notice them: an issue titled after the type, or the proposal form.
  const repo = 'https://github.com/geolonia/datamodels';
  md += `::: tip ${t.improveTitle}\n${t.improve(`${repo}/issues/new?title=${encodeURIComponent(`${model.type}: `)}`, `${repo}/issues/new?template=model-proposal.yml`, `${prefix}/guide/contribute`)}\n:::\n\n`;
  md += `<small>${t.license} [LICENSE-CONTENT](${prefix}/LICENSE-CONTENT)</small>\n`;
  return md;
}

async function subjectPage(lang, prefix, subject) {
  const t = T[lang]; const u = subjectUrls(subject);
  let md = front(subject.title[lang], subject.description[lang]);
  md += `# ${subject.title[lang]}\n\n${subject.description[lang]}\n\n`;
  md += `| | |\n|---|---|\n| ${t.subject} | ${code(subject.name)} ${badge('info', t.sourceLabel[subject.source] ?? subject.source)} |\n| ${t.version} | ${code(subject.version)} |\n`;
  md += `| ${t.context} | [${code(u.contextAlias)}](${rel(u.contextAlias)}) |\n| ${t.namespace} | ${code(u.namespace)} |\n| ${t.vocabulary} | [${code(rel(u.vocabExact))}](${rel(u.vocabExact)}) |\n\n<small>${t.urlNote('#versions', `${prefix}/guide/urls`, false)}</small>\n\n`;
  md += `## ${t.models} {#models}\n\n| ${t.type} | ${t.name} | ${t.stage} |\n|---|---|---|\n`;
  for (const m of subject.models) md += `| [${m.type}](${prefix}${rel(modelUrls(subject, m).page)}) | ${m.catalog.title?.[lang] ?? ''} | ${statusBadge(lang, m.catalog.status ?? 'draft')}${m.kind === 'value' ? ` ${badge('info', t.valueType)}` : ''}${m.schema['x-alias-of'] ? ` ${badge('info', t.alias)}` : ''}${m.schema['x-subclass-of'] ? ` ${badge('info', t.subclass)}` : ''} |\n`;
  const releases = await listReleases(subject);
  if (releases.length) {
    md += `\n## ${t.versions} {#versions}\n\n| | @context | JSON Schema |\n|---|---|---|\n`;
    for (const r of [...releases].reverse()) {
      const ctxUrl = r.files[0].url;
      const schemas = r.files.filter((f) => f.url.includes('/schema/')).map((f) => `[${f.url.split('/').slice(-2, -1)[0]}](${rel(f.url)})`).join(', ');
      md += `| v${r.version}${r.version === subject.version ? ` ${badge('tip', t.current)}` : ''} | [${code(rel(ctxUrl))}](${rel(ctxUrl)}) | ${schemas} |\n`;
    }
  }
  return md;
}

export function indexPage(lang, prefix, subjects) {
  const t = T[lang];
  const other = lang === 'ja' ? 'en' : 'ja';
  // One card per subject, and one row per model for the search results
  // (site/.vitepress/theme/ModelIndex.vue).
  const rows = subjects.flatMap((s) => s.models.map((m) => ({
    type: m.type, href: `${prefix}${rel(modelUrls(s, m).page)}`, title: m.catalog.title?.[lang] ?? '', otherTitle: m.catalog.title?.[other] ?? '',
    subject: s.name, subjectTitle: s.title[lang], subjectHref: `${prefix}${rel(subjectUrls(s).page)}`,
    kind: m.kind, status: m.catalog.status ?? 'draft',
    text: [m.type, s.name, s.title.ja, s.title.en, m.catalog.title?.ja, m.catalog.title?.en, m.catalog.description?.ja, m.catalog.description?.en, ...attributesOf(m).map(([n]) => n)]
      .filter(Boolean).join(' ').normalize('NFKC').toLowerCase(),
  })));
  const cards = subjects.map((s) => ({
    name: s.name, title: s.title[lang], summary: s.summary[lang], href: `${prefix}${rel(subjectUrls(s).page)}`,
    models: s.models.map((m) => ({ type: m.type, href: `${prefix}${rel(modelUrls(s, m).page)}` })),
  }));
  // "<" escaped so no text can close the script block. No outline column: the cards are the page's contents.
  const data = (v) => JSON.stringify(v).replaceAll('<', '\\u003c');
  let md = front(t.models, t.intro).replace(/\n---\n\n$/, '\naside: false\n---\n\n');
  md += `<script setup>\nconst models = ${data(rows)}\nconst cards = ${data(cards)}\n</script>\n\n`;
  md += `# ${t.models}\n\n${t.intro}\n\n<ModelIndex lang="${lang}" :models="models" :cards="cards" />\n\n${t.forPrograms}\n`;
  return md;
}

async function put(path, content) { await mkdir(join(path, '..'), { recursive: true }); await writeFile(path, content); }

export async function generateSitePages(subjects, adapters = []) {
  allSubjects = subjects;
  allAdapters = adapters;
  for (const [lang, prefix] of [['ja', ''], ['en', '/en']]) {
    const base = join(SITE, prefix.replace(/^\//, ''), 'models');
    await rm(base, { recursive: true, force: true });
    await put(join(base, 'index.md'), indexPage(lang, prefix, subjects));
    // Generated into the guides (ignored by git), next to the hand-written pages.
    await put(join(SITE, prefix.replace(/^\//, ''), 'guide', 'standards.md'), standardsPage(lang, prefix, subjects));
    for (const s of subjects) {
      await put(join(base, s.name, 'index.md'), await subjectPage(lang, prefix, s));
      for (const m of s.models) await put(join(base, s.name, m.type, 'index.md'), modelPage(lang, prefix, s, m));
    }
  }
}
