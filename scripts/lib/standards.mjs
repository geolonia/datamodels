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
  },
  en: {
    title: 'Standards mapped',
    intro: 'All correspondence tables of the models (mapping/*.yaml) in one list. From the standard your data follows, go to the matching model and its field-by-field table.',
    standard: 'Standard', model: 'Model', fields: 'Fields with a counterpart', license: 'Licence', of: (n, total) => `${n} of ${total}`,
  },
};

// Table cells: a pipe would end the cell, a line break the row.
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
/** Rows of the page: one per mapping file, by the standard's name (a standard's files start with the same name), then model. */
export function standardRows(lang, subjects) {
  const rows = [];
  for (const s of subjects) for (const m of s.models) for (const map of m.mappings ?? []) {
    const fields = Object.values(map.fields ?? {});
    rows.push({
      name: map.standard?.name?.[lang] ?? map.name,
      url: map.standard?.url ?? null,
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
  return rows.sort((a, b) => a.name.localeCompare(b.name, lang) || a.type.localeCompare(b.type));
}

export function standardsPage(lang, prefix, subjects) {
  const t = T[lang];
  let md = `---\ntitle: ${JSON.stringify(t.title)}\ndescription: ${JSON.stringify(t.intro)}\n---\n\n# ${t.title}\n\n${t.intro}\n\n`;
  md += `| ${t.standard} | ${t.model} | ${t.fields} | ${t.license} |\n|---|---|---|---|\n`;
  for (const r of standardRows(lang, subjects)) {
    const name = r.url ? `[${cell(r.name)}](<${r.url}>)` : cell(r.name);
    md += `| ${name} | [\`${r.type}\`](${prefix}${r.page}#${r.anchor})<br>${cell(r.subjectTitle)} | ${t.of(r.mapped, r.total)} | ${cell(r.license) || '—'} |\n`;
  }
  return `${md}\n`;
}
