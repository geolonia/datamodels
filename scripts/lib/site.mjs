// Generate the VitePress pages for every subject and model, in Japanese
// (root locale, /models/...) and English (/en/models/...). Pages are written
// into site/ at build time and are not committed.
//
// Anchors: every attribute is a level-3 heading with an explicit id
// (`### roadName {#roadName}`) so that the /ns/<subject>/<term> redirects,
// which point at `#<term>`, keep working with case preserved.
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { attributesOf, subjectUrls, modelUrls, BASE_URL, ROOT } from './models.mjs';
import { sharedTerms } from './shared-terms.mjs';
import { listReleases } from './releases.mjs';

const SITE = join(ROOT, 'site');
const rel = (url) => url.slice(BASE_URL.length);
const code = (s) => `\`${s}\``;
const fence = (obj) => '```json\n' + JSON.stringify(obj, null, 2) + '\n```';

const T = {
  ja: {
    models: 'データモデル', overview: '概要', subjects: 'サブジェクト', attributes: '属性', example: '例（key-values）', normalized: '例（normalized）',
    linkHeader: 'Link ヘッダー', notes: '注記', shared: '複数のモデルで共有する属性', usedBy: '使用モデル', typeIri: '型 IRI', context: '@context',
    contextExact: '（このバージョン、不変）', contextAlias: '（エイリアス、互換性のある最新版）', schema: 'JSON Schema', examples: '例', geonicdb: 'GeonicDB 用定義',
    geonicdbNote: 'Custom Data Model の request body。`contextUrl` を含みます。', source: 'ソース', namespace: '名前空間', version: 'バージョン',
    required: '必須', indexed: 'インデックス', pii: '個人情報', deprecated: '非推奨', value: '値', relationshipTo: '→', license: 'このページのモデル内容は CC BY 4.0 で提供されています。',
    valueType: '値型', valueTypeNote: 'これはエンティティ型ではなく、属性の値として使う構造です。', fields: 'フィールド', versions: 'バージョン', current: '現行', usage: '使い方',
    subjectsIntro: 'サブジェクトごとに 1 つの `@context` を公開しています。型と属性の IRI は `/ns/<subject>/<term>` で解決できます。',
    statusLabel: { draft: 'ドラフト', stable: '安定', deprecated: '非推奨' },
    sourceLabel: { minted: 'このカタログで定義', profile: '上流モデルの日本向け拡張', global: '上流（Smart Data Models）' },
    subject: 'サブジェクト', mappings: '対応する標準', mappingField: 'このモデル', mappingTo: '対応先', mappingNote: '備考', none: '対応なし',
    alias: 'エイリアス', aliasNote: (link) => `${link} と同じ型です（IRI が同一）。名称だけがこのサブジェクトの言い方に合わせてあり、属性も必須項目も同じです。GeonicDB では同じ型として保存・照合されます。`,
    subclass: 'サブクラス', subclassNote: (link) => `${link} のサブクラスです。同名の属性は親と同じ IRI を持ち、親の必須項目はここでも必須です。親向けに書かれたクライアントはこの型をそのまま読めます。`,
  },
  en: {
    models: 'Data models', overview: 'Overview', subjects: 'Subjects', attributes: 'Attributes', example: 'Example (key-values)', normalized: 'Example (normalized)',
    linkHeader: 'Link header', notes: 'Notes', shared: 'Attributes shared by several models', usedBy: 'Used by', typeIri: 'Type IRI', context: '@context',
    contextExact: '(this version, immutable)', contextAlias: '(alias, latest compatible version)', schema: 'JSON Schema', examples: 'Examples', geonicdb: 'GeonicDB definition',
    geonicdbNote: 'Custom Data Model request body, `contextUrl` included.', source: 'Source', namespace: 'Namespace', version: 'Version',
    required: 'required', indexed: 'indexed', pii: 'personal data', deprecated: 'deprecated', value: 'Value', relationshipTo: '→', license: 'Model content on this page is licensed under CC BY 4.0.',
    valueType: 'value type', valueTypeNote: 'This is not an entity type but a structure used as the value of an attribute.', fields: 'Fields', versions: 'Versions', current: 'current', usage: 'Usage',
    subjectsIntro: 'One `@context` is published per subject. Type and attribute IRIs resolve at `/ns/<subject>/<term>`.',
    statusLabel: { draft: 'draft', stable: 'stable', deprecated: 'deprecated' },
    sourceLabel: { minted: 'defined in this catalog', profile: 'Japanese profile of an upstream model', global: 'upstream (Smart Data Models)' },
    subject: 'Subject', mappings: 'Corresponding standards', mappingField: 'This model', mappingTo: 'Maps to', mappingNote: 'Note', none: 'no counterpart',
    alias: 'alias', aliasNote: (link) => `The same type as ${link} (identical IRI). Only the name follows this subject's wording; attributes and required fields are the same. GeonicDB stores and matches both names as one type.`,
    subclass: 'subclass', subclassNote: (link) => `A subclass of ${link}. Attributes with the same name carry the parent's IRIs, and the parent's required attributes stay required here, so a client written for the parent reads this type unchanged.`,
  },
};

const badge = (type, text) => `<Badge type="${type}" text="${text}" />`;
const statusBadge = (lang, status) => badge(status === 'stable' ? 'tip' : status === 'deprecated' ? 'danger' : 'info', T[lang].statusLabel[status] ?? status);
const front = (title, description) => `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description ?? '')}\n---\n\n`;

let allSubjects = [];
/** The model documenting a type IRI: an alias in the same subject first, then the owner anywhere. */
function modelForIri(subject, iri, { ownerOnly = false } = {}) {
  const here = ownerOnly ? null : subject.models.find((m) => modelUrls(subject, m).typeIri === iri);
  if (here) return { subject, model: here };
  for (const s of allSubjects) { const m = s.models.find((x) => !x.schema['x-alias-of'] && modelUrls(s, x).typeIri === iri); if (m) return { subject: s, model: m }; }
  return null;
}
const modelLink = (prefix, found) => `[${found.model.type}](${prefix}${rel(modelUrls(found.subject, found.model).page)})`;

function valueText(lang, subject, prop, prefix) {
  const ngsi = prop['x-ngsi']?.type;
  if (ngsi === 'Relationship') {
    const targetIri = prop['x-ngsi'].target;
    const target = targetIri?.split('/').pop();
    const found = targetIri?.startsWith('http') ? modelForIri(subject, targetIri) : null;
    const multi = prop['x-ngsi'].multi ? (lang === 'ja' ? '（複数可）' : ' (multiple)') : '';
    return `Relationship ${T[lang].relationshipTo} ${found ? modelLink(prefix, found) : target === 'any' ? (lang === 'ja' ? '任意のエンティティ' : 'any entity') : target === 'agent' ? (lang === 'ja' ? '人・組織・チーム' : 'person, organisation or team') : target ?? 'entity'}${multi}`;
  }
  if (ngsi === 'GeoProperty') return `GeoProperty (${prop.properties?.type?.const ?? 'GeoJSON'})`;
  const ref = prop.$ref ?? prop.allOf?.find((a) => a.$ref)?.$ref;
  if (ref) {
    const m = /\/schema\/([a-z0-9-]+)\/([A-Za-z0-9]+)\//.exec(ref);
    return `Property, object: ${m ? `[${m[2]}](${prefix}/models/${m[1]}/${m[2]}/)` : code(ref)}`;
  }
  let t = prop.type ?? '';
  if (prop.format) t += ` (${prop.format})`;
  if (prop.enum) t += `: ${prop.enum.map(code).join(' \\| ')}`;
  if (prop.minimum !== undefined) t += `, ≥ ${prop.minimum}`;
  return `Property, ${t}`;
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
  md += `# ${model.type} ${statusBadge(lang, model.catalog.status ?? 'draft')}${isValue ? ` ${badge('info', t.valueType)}` : ''}${aliasOf ? ` ${badge('info', t.alias)}` : ''}${subclassOf ? ` ${badge('info', t.subclass)}` : ''}\n\n`;
  if (isValue) md += `> ${t.valueTypeNote}\n\n`;
  if (aliasOf) md += `> ${t.aliasNote(modelLink(prefix, aliasOf))}\n\n`;
  if (subclassOf) md += `> ${t.subclassNote(modelLink(prefix, subclassOf))}\n\n`;
  md += `**${title}** <span style="color:var(--vp-c-text-2)">/ ${model.catalog.title?.[other] ?? ''}</span>\n\n${desc}\n\n`;
  md += `| | |\n|---|---|\n`;
  md += `| ${isValue ? 'IRI' : t.typeIri} | ${code(mu.typeIri)} |\n`;
  md += `| ${t.context} | ${code(u.contextAlias)} ${t.contextAlias}<br>${code(u.contextExact)} ${t.contextExact} |\n`;
  md += `| ${t.schema} | [${code(rel(mu.schemaAlias))}](${rel(mu.schemaAlias)})<br>[${code(rel(mu.schemaExact))}](${rel(mu.schemaExact)}) |\n`;
  md += isValue ? `| ${t.examples} | [example.json](${rel(mu.examples)}example.json) |\n`
    : `| ${t.examples} | [key-values](${rel(mu.examples)}example.json) · [normalized](${rel(mu.examples)}example-normalized.jsonld) |\n| ${t.geonicdb} | [${code(rel(mu.geonicdb))}](${rel(mu.geonicdb)}) ${t.geonicdbNote} |\n`;
  md += `| ${t.source} | [github.com/geolonia/geonicdb-models](https://github.com/geolonia/geonicdb-models/tree/main/models/${subject.name}/${model.type}) |\n\n`;
  md += `## ${isValue ? t.fields : t.attributes} {#attributes}\n\n`;
  for (const [name, prop] of attributesOf(model)) {
    const flags = [required.has(name) ? badge('warning', t.required) : '', prop['x-geonicdb']?.indexed ? badge('info', t.indexed) : '', prop['x-geonicdb']?.pii ? badge('danger', t.pii) : '', prop['x-deprecated'] ? badge('danger', t.deprecated) : ''].filter(Boolean).join(' ');
    md += `### ${name} {#${name}}\n\n`;
    if (flags) md += `${flags}\n\n`;
    md += `${model.catalog.attributes?.[name]?.[lang] ?? prop.description ?? ''}\n\n`;
    md += isValue ? `- ${t.value}: ${prop.type}${prop.const ? ` = ${code(prop.const)}` : ''}${prop.pattern ? `, pattern ${code(prop.pattern)}` : ''}\n- IRI: ${code(prop['x-iri'] ?? '')}\n\n`
      : `- ${t.value}: ${valueText(lang, subject, prop, prefix)}\n- IRI: ${code(prop['x-iri'] ?? '')}\n\n`;
  }
  if (isValue) {
    const u2 = subjectUrls(subject);
    md += `## ${t.usage} {#usage}\n\n\`\`\`json\n"address": {\n  "$ref": "${mu.schemaExact}",\n  "x-ngsi": { "type": "Property", "model": "${mu.typeIri}" },\n  "x-iri": "https://schema.org/address"\n}\n\`\`\`\n\n\`\`\`json\n{ "@context": ["${u2.contextExact}", { ... }] }\n\`\`\`\n\n`;
  }
  if (model.examples['example.json']) md += `## ${t.example} {#example}\n\n${fence(model.examples['example.json'])}\n\n`;
  if (model.examples['example-normalized.jsonld']) md += `## ${t.normalized} {#example-normalized}\n\n${fence(model.examples['example-normalized.jsonld'])}\n\n`;
  if (!isValue) md += `## ${t.linkHeader} {#link-header}\n\n\`\`\`http\nLink: <${u.contextAlias}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"\n\`\`\`\n\n`;
  for (const map of model.mappings ?? []) {
    md += `## ${t.mappings}: ${map.standard?.name?.[lang] ?? map.name} {#mapping-${map.name}}\n\n`;
    if (map.standard?.url) md += `[${map.standard.name?.[lang] ?? map.name}](${map.standard.url})${map.standard.license ? ` · ${map.standard.license}` : ''}\n\n`;
    if (map.standard?.note?.[lang]) md += `${map.standard.note[lang]}\n\n`;
    md += `| ${t.mappingField} | ${t.mappingTo} | ${t.mappingNote} |\n|---|---|---|\n`;
    for (const [field, m] of Object.entries(map.fields ?? {})) md += `| [${code(field)}](#${field}) | ${m.to ? code(m.to) : `*${t.none}*`} | ${m.note?.[lang] ?? ''} |\n`;
    md += '\n';
  }
  const notes = model.notes?.notes ?? [];
  if (notes.length) md += `## ${t.notes} {#notes}\n\n${notes.map((n) => `- ${n}`).join('\n')}\n\n`;
  md += `<small>${t.license} [LICENSE-CONTENT](/LICENSE-CONTENT)</small>\n`;
  return md;
}

async function subjectPage(lang, prefix, subject) {
  const t = T[lang]; const u = subjectUrls(subject);
  const other = lang === 'ja' ? 'en' : 'ja';
  let md = front(subject.title[lang], subject.description[lang]);
  md += `# ${subject.title[lang]} <span style="color:var(--vp-c-text-2);font-weight:normal">/ ${subject.title[other]}</span>\n\n${subject.description[lang]}\n\n`;
  md += `| | |\n|---|---|\n| ${t.subject} | ${code(subject.name)} ${badge('info', t.sourceLabel[subject.source] ?? subject.source)} |\n| ${t.version} | ${code(subject.version)} |\n`;
  md += `| ${t.context} | ${code(u.contextAlias)} ${t.contextAlias}<br>${code(u.contextExact)} ${t.contextExact} |\n| ${t.namespace} | ${code(u.namespace)} |\n\n`;
  md += `## ${t.models} {#models}\n\n| Type | | |\n|---|---|---|\n`;
  for (const m of subject.models) md += `| [${m.type}](${prefix}${rel(modelUrls(subject, m).page)}) | ${m.catalog.title?.[lang] ?? ''} | ${statusBadge(lang, m.catalog.status ?? 'draft')}${m.kind === 'value' ? ` ${badge('info', t.valueType)}` : ''}${m.schema['x-alias-of'] ? ` ${badge('info', t.alias)}` : ''}${m.schema['x-subclass-of'] ? ` ${badge('info', t.subclass)}` : ''} |\n`;
  const releases = await listReleases(subject);
  if (releases.length) {
    md += `\n## ${t.versions} {#versions}\n\n| | @context | JSON Schema |\n|---|---|---|\n`;
    for (const r of [...releases].reverse()) {
      const ctxUrl = r.files[0].url;
      const schemas = r.files.slice(1).map((f) => `[${f.url.split('/').slice(-2, -1)[0]}](${rel(f.url)})`).join(', ');
      md += `| v${r.version}${r.version === subject.version ? ` ${badge('tip', t.current)}` : ''} | [${code(rel(ctxUrl))}](${rel(ctxUrl)}) | ${schemas} |\n`;
    }
  }
  const shared = sharedTerms(subject);
  if (shared.size) {
    md += `\n## ${t.shared} {#shared}\n\n`;
    for (const [name, types] of [...shared].sort(([a], [b]) => a.localeCompare(b))) {
      const prop = subject.models.find((m) => m.type === types[0]).schema.properties[name];
      md += `### ${name} {#${name}}\n\n${subject.models.find((m) => m.type === types[0]).catalog.attributes?.[name]?.[lang] ?? ''}\n\n- IRI: ${code(prop['x-iri'] ?? '')}\n- ${t.usedBy}: ${types.map((ty) => `[${ty}](${prefix}${rel(modelUrls(subject, { type: ty }).page)})`).join(', ')}\n\n`;
    }
  }
  return md;
}

function indexPage(lang, prefix, subjects) {
  const t = T[lang];
  let md = front(t.models, t.subjectsIntro) + `# ${t.models}\n\n${t.subjectsIntro}\n\n`;
  for (const s of subjects) {
    md += `## [${s.title[lang]}](${prefix}${rel(subjectUrls(s).page)}) {#${s.name}}\n\n${s.description[lang]}\n\n`;
    md += s.models.map((m) => `- [${m.type}](${prefix}${rel(modelUrls(s, m).page)}) — ${m.catalog.title?.[lang] ?? ''}`).join('\n') + '\n\n';
  }
  return md;
}

async function put(path, content) { await mkdir(join(path, '..'), { recursive: true }); await writeFile(path, content); }

export async function generateSitePages(subjects) {
  allSubjects = subjects;
  for (const [lang, prefix] of [['ja', ''], ['en', '/en']]) {
    const base = join(SITE, prefix.replace(/^\//, ''), 'models');
    await rm(base, { recursive: true, force: true });
    await put(join(base, 'index.md'), indexPage(lang, prefix, subjects));
    for (const s of subjects) {
      await put(join(base, s.name, 'index.md'), await subjectPage(lang, prefix, s));
      for (const m of s.models) await put(join(base, s.name, m.type, 'index.md'), modelPage(lang, prefix, s, m));
    }
  }
}
