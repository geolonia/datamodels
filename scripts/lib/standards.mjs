// /guide/standards: every standard a model is mapped to (mapping/*.yaml), with
// the model and its correspondence table. A municipality that knows which
// standard its data follows (a 自治体標準オープンデータセット sheet, GSI's lists,
// EEI) finds the matching model from here.
import { modelUrls, BASE_URL, mdText } from './models.mjs';
import { standardLicense } from './mapping-check.mjs';

const T = {
  ja: {
    title: '対応している標準',
    intro: '自分たちのデータが従っている標準（自治体標準オープンデータセット、EEI、国土地理院の避難所データなど）がわかっていれば、ここから対応するモデルと、項目ごとの対応表にたどれます。それぞれの標準の説明は[他のデータモデルカタログ](/guide/catalogs)にあります。',
    part: '部分', model: 'モデル', fields: '対応する項目', of: (n, total) => `${total} 項目中 ${n}`,
    groups: { government: '国・自治体', international: '国際標準・海外のモデル', tool: 'ツール・サービス' },
  },
  en: {
    title: 'Standards covered',
    intro: 'If you know the standard your data follows (the municipal standard open datasets, EEI, GSI\'s shelter data and more), find the matching model here, with a table of which field matches which. For a description of each standard, see [Other data model catalogs](/en/guide/catalogs).',
    part: 'Part', model: 'Model', fields: 'Fields matched', of: (n, total) => `${n} of ${total}`,
    groups: { government: 'National and local government', international: 'International standards and models', tool: 'Tools and services' },
  },
};

// The group of a standard, by where it is published. Readers from government
// look for their own standards first; a tool's API comes last.
const GROUPS = [
  ['government', /^https:\/\/([a-z0-9-]+\.)*go\.jp\//],
  ['government', /^https:\/\/www\.jartic\.or\.jp\//],
  ['government', /^https:\/\/github\.com\/digital-go-jp\//],
  ['international', /^https:\/\/www\.rfc-editor\.org\//],
  ['international', /^https:\/\/github\.com\/smart-data-models\//],
  ['tool', /^https:\/\/docs\.github\.com\//],
  ['tool', /^https:\/\/www\.redmine\.org\//],
];
const ORDER = ['government', 'international', 'tool'];
export function standardGroup(url) {
  const found = GROUPS.find(([, re]) => re.test(url ?? ''));
  if (!found) throw new Error(`no group for the standard at ${url ?? '(no url)'}: add its host to GROUPS in scripts/lib/standards.mjs`);
  return found[0];
}

// The standards, each with the short name of the part each mapping file covers
// ("<Type>/<mapping name>"). The page shows one heading per standard and one row
// per part, so a reader who knows "our data follows EEI" finds every EEI part at
// once. A mapping file that is not listed here gets a heading of its own (its
// full name); the test lists them, so a new one is added here.
export const STANDARDS = [
  { id: 'jichitai-opendata', name: { ja: '自治体標準オープンデータセット（デジタル庁）', en: 'Municipal standard open datasets (Digital Agency)' }, parts: {
    'Geometry/jichitai-opendata-location': { ja: '緯度・経度', en: 'Latitude and longitude' },
    'JapaneseAddress/jichitai-opendata-address': { ja: '所在地の項目', en: 'Location columns' },
    'EvacuationShelter/jichitai-opendata-shelter': { ja: '03 指定緊急避難場所一覧', en: '03 Designated emergency evacuation sites' },
    'EvacuationSite/jichitai-opendata-site': { ja: '03 指定緊急避難場所一覧', en: '03 Designated emergency evacuation sites' },
  } },
  { id: 'eei', name: { ja: '災害対応基本共有情報（EEI）第1.1版（内閣府）', en: 'Essential Elements of Information (EEI) version 1.1 (Cabinet Office)' }, parts: {
    'RoadRestriction/eei': { ja: '05 通行止め情報（規制情報）', en: '05 Road closures and restrictions' },
    'EvacuationSite/eei': { ja: '21 避難場所', en: '21 Evacuation sites' },
    'EvacuationShelter/eei': { ja: '21 避難所（災害時に取得する属性）', en: '21 Shelters, attributes collected during a disaster' },
    'DesignatedShelter/eei': { ja: '21 避難所（平時に整備する属性）', en: '21 Shelters, attributes kept in normal times' },
  } },
  { id: 'gsi-shelters', name: { ja: '国土地理院 避難所等データ', en: "GSI's shelter and evacuation site data" }, parts: {
    'EvacuationSite/gsi-emergency-site': { ja: '指定緊急避難場所データ', en: 'Designated emergency evacuation sites' },
    'DesignatedShelter/gsi-designated-shelter': { ja: '指定避難所データ', en: 'Designated shelters' },
    'JapaneseAddress/gsi-address': { ja: '住所の列', en: 'Address column' },
  } },
  { id: 'national-shelter-id', name: { ja: '全国共通避難所・避難場所ID（内閣府・国土地理院）', en: 'Nationwide common shelter and evacuation site ID (Cabinet Office, GSI)' }, parts: {
    'EvacuationShelter/gsi-national-shelter-id': { ja: 'ID の採番と収録', en: 'How the ID is assigned and published' },
  } },
  { id: 'gif', name: { ja: 'デジタル庁 GIF コアデータモデル', en: 'Digital Agency GIF core data model' }, parts: {
    'JapaneseAddress/gif-address': { ja: '住所', en: 'Address' },
  } },
  { id: 'cao-hinanjo-guideline', name: { ja: '避難所運営等避難生活支援のためのガイドライン（内閣府）', en: 'Guideline for shelter operation and evacuation-life support (Cabinet Office)' }, parts: {
    'EvacuationShelter/cao-hinanjo-guideline': { ja: 'チェックリスト（令和6年12月改定）', en: 'Checklist (revised December 2024)' },
  } },
  { id: 'npa-traffic-regulation', name: { ja: '交通規制情報 拡張版標準フォーマット（警察庁）', en: 'Traffic regulation information, extended standard format (National Police Agency)' }, parts: {
    'RoadRestriction/npa-traffic-regulation-format': { ja: '説明書 Ver: k_2.1', en: 'Manual, version k_2.1' },
  } },
  { id: 'mlit-road-info', name: { ja: '道路情報提供システム（国土交通省）', en: 'Road Information Provision System (MLIT)' }, parts: {
    'RoadRestriction/mlit-road-info-prvs': { ja: '通行規制情報', en: 'Traffic regulation information' },
  } },
  { id: 'smart-data-models', name: { ja: 'Smart Data Models', en: 'Smart Data Models' }, parts: {
    'Task/iudx-issuereporting': { ja: 'IssueReporting（IUDX 由来）', en: 'IssueReporting (from IUDX)' },
    'Task/open311': { ja: 'Open311 GeoReport v2 service_requests', en: 'Open311 GeoReport v2 service_requests' },
    'RoadRestriction/sdm-roadsegment': { ja: 'RoadSegment', en: 'RoadSegment' },
  } },
  { id: 'jscalendar', name: { ja: 'JSCalendar（RFC 8984）', en: 'JSCalendar (RFC 8984)' }, parts: {
    'Task/jscalendar': { ja: 'Task', en: 'Task' },
  } },
  { id: 'github', name: { ja: 'GitHub', en: 'GitHub' }, parts: {
    'Task/github-issues': { ja: 'Issues（REST API）', en: 'Issues (REST API)' },
    'Milestone/github': { ja: 'マイルストーン', en: 'Milestones' },
    'Project/github': { ja: 'リポジトリ', en: 'Repositories' },
  } },
  { id: 'redmine', name: { ja: 'Redmine', en: 'Redmine' }, parts: {
    'Task/redmine': { ja: 'Issue（redmine_gtt_fiware の出力を含む）', en: 'Issues (including redmine_gtt_fiware output)' },
    'Milestone/redmine': { ja: 'バージョン（マイルストーン）', en: 'Versions (milestones)' },
    'Project/redmine': { ja: 'プロジェクト', en: 'Projects' },
  } },
];
const standardOf = (type, mapName) => STANDARDS.find((f) => f.parts[`${type}/${mapName}`]);

// Table cells: a pipe would end the cell, a line break the row; < and { as in mdText.
const cell = (s) => mdText(s).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
/** Rows of the page: one per mapping file, by group, then the standard's name (a standard's files start with the same name), then model. */
export function standardRows(lang, subjects) {
  const rows = [];
  for (const s of subjects) for (const m of s.models) for (const map of m.mappings ?? []) {
    const fields = Object.values(map.fields ?? {});
    const std = standardOf(m.type, map.name);
    const name = map.standard?.name?.[lang] ?? map.name;
    rows.push({
      name,
      // The standard (heading) and the part (row); an unlisted file is a standard of its own.
      standard: std ? std.name[lang] : name,
      standardId: std ? std.id : `mapping-${m.type}-${map.name}`.toLowerCase(),
      part: std ? std.parts[`${m.type}/${map.name}`][lang] : name,
      listed: !!std,
      url: map.standard?.url ?? null,
      group: standardGroup(map.standard?.url),
      license: standardLicense(map.standard, lang),
      type: m.type,
      subject: s.name,
      subjectTitle: s.title[lang],
      page: modelUrls(s, m).page.slice(BASE_URL.length),
      anchor: `mapping-${map.name}`,
      mapped: fields.filter((f) => f?.to !== null && f?.to !== undefined).length,
      total: fields.length,
    });
  }
  return rows.sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group) || a.standard.localeCompare(b.standard, lang) || a.part.localeCompare(b.part, lang) || a.type.localeCompare(b.type));
}

export function standardsPage(lang, prefix, subjects) {
  const t = T[lang];
  const rows = standardRows(lang, subjects);
  // The outline lists the standards (h3), so a reader jumps to theirs.
  let md = `---\ntitle: ${JSON.stringify(t.title)}\ndescription: ${JSON.stringify(t.intro.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'))}\noutline: [2, 3]\n---\n\n# ${t.title}\n\n${t.intro}\n\n`;
  for (const group of ORDER) {
    const inGroup = rows.filter((r) => r.group === group);
    if (!inGroup.length) continue;
    md += `## ${t.groups[group]} {#${group}}\n\n`;
    // One heading per standard (in the page outline), one row per part.
    for (const id of [...new Set(inGroup.map((r) => r.standardId))]) {
      const parts = inGroup.filter((r) => r.standardId === id);
      md += `### ${cell(parts[0].standard)} {#${id}}\n\n| ${t.part} | ${t.model} | ${t.fields} |\n|---|---|---|\n`;
      for (const r of parts) {
        const part = r.url ? `[${cell(r.part)}](<${r.url}>)` : cell(r.part);
        md += `| ${part} | [\`${r.type}\`](${prefix}${r.page}#${r.anchor})<br>${cell(r.subjectTitle)} | ${t.of(r.mapped, r.total)} |\n`;
      }
      md += '\n';
    }
  }
  return md;
}
