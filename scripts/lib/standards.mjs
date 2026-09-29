// /models/standards/: every standard a model is mapped to (mapping/*.yaml), with
// the model and its correspondence table. A municipality that knows which
// standard its data follows (a 自治体標準オープンデータセット sheet, GSI's lists,
// EEI) finds the matching model from here.
import { modelUrls, BASE_URL } from './models.mjs';

const T = {
  ja: {
    title: '対応する標準',
    intro: '各モデルの対応表（mapping/*.yaml）をまとめた一覧です。自団体のデータが沿っている標準から、対応するモデルと項目ごとの対応表にたどれます。',
    standard: '標準', model: 'モデル', fields: '対応する項目', license: 'ライセンス', of: (n, total) => `${n} / ${total}`,
    groups: { government: '国・自治体', international: '国際標準・海外のモデル', tool: 'ツール・サービス' },
  },
  en: {
    title: 'Standards mapped',
    intro: 'All correspondence tables of the models (mapping/*.yaml) in one list. From the standard your data follows, go to the matching model and its field-by-field table.',
    standard: 'Standard', model: 'Model', fields: 'Fields with a counterpart', license: 'Licence', of: (n, total) => `${n} of ${total}`,
    groups: { government: 'National and local government', international: 'International standards and models', tool: 'Tools and services' },
  },
};

// The group of a standard, by where it is published. Readers from government
// look for their own standards first; a tool's API comes last.
const GROUPS = [
  ['government', /^https:\/\/([a-z0-9-]+\.)*go\.jp\//],
  ['government', /^https:\/\/www\.jartic\.or\.jp\//],
  ['government', /^https:\/\/github\.com\/JDA-DM\//],
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

// Table cells: a pipe would end the cell, a line break the row.
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
/** Rows of the page: one per mapping file, by group, then the standard's name (a standard's files start with the same name), then model. */
export function standardRows(lang, subjects) {
  const rows = [];
  for (const s of subjects) for (const m of s.models) for (const map of m.mappings ?? []) {
    const fields = Object.values(map.fields ?? {});
    rows.push({
      name: map.standard?.name?.[lang] ?? map.name,
      url: map.standard?.url ?? null,
      group: standardGroup(map.standard?.url),
      license: map.standard?.license ?? '',
      type: m.type,
      subject: s.name,
      subjectTitle: s.title[lang],
      page: modelUrls(s, m).page.slice(BASE_URL.length),
      anchor: `mapping-${map.name}`,
      mapped: fields.filter((f) => f?.to !== null && f?.to !== undefined).length,
      total: fields.length,
    });
  }
  return rows.sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group) || a.name.localeCompare(b.name, lang) || a.type.localeCompare(b.type));
}

export function standardsPage(lang, prefix, subjects) {
  const t = T[lang];
  const rows = standardRows(lang, subjects);
  let md = `---\ntitle: ${JSON.stringify(t.title)}\ndescription: ${JSON.stringify(t.intro)}\n---\n\n# ${t.title}\n\n${t.intro}\n\n`;
  for (const group of ORDER) {
    const inGroup = rows.filter((r) => r.group === group);
    if (!inGroup.length) continue;
    md += `## ${t.groups[group]} {#${group}}\n\n`;
    md += `| ${t.standard} | ${t.model} | ${t.fields} | ${t.license} |\n|---|---|---|---|\n`;
    for (const r of inGroup) {
      const name = r.url ? `[${cell(r.name)}](<${r.url}>)` : cell(r.name);
      md += `| ${name} | [\`${r.type}\`](${prefix}${r.page}#${r.anchor})<br>${cell(r.subjectTitle)} | ${t.of(r.mapped, r.total)} | ${cell(r.license) || '—'} |\n`;
    }
    md += '\n';
  }
  return md;
}
