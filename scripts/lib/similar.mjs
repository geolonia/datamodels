// Similar models for a model proposal (#224): the words of the proposal are
// matched against the catalog's models and the known nodes' models
// (nodes.snapshot.json), so the proposer and the group see what may already
// cover it ("extend, do not duplicate", /guide/rules). Deterministic: no AI,
// the same answer every time. The same index can serve a search tool later (#223).
import { nodeName } from './node-name.mjs';

// Words too common to tell models apart.
const STOP = new Set(('the and for with from that this which one each are is was were has have had not but its into per any all can may when where what who how also other than then them they their there these those such only more most some same both own over under about after before between while within without data model models record records type types entity entities attribute attributes value values name names field fields list item items new use used using example examples based like etc via eg ie').split(' '));

/** The words of a text: Latin words (camelCase split, lower case, 3+ letters, no stop words) and, for Japanese, pairs of characters that contain a kanji or katakana. */
export function words(text) {
  const out = new Set();
  const s = String(text ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  // A plural is made singular: roads → road, facilities → facility; not status, process,
  // analysis, or words whose -ies is not a plural (series, species).
  for (const w of s.toLowerCase().match(/[a-z]{3,}/g) ?? []) if (!STOP.has(w)) out.add(singular(w));
  for (const run of s.match(/[\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}ー]+/gu) ?? []) {
    const chars = [...run];
    for (let i = 0; i + 1 < chars.length; i++) {
      const pair = chars[i] + chars[i + 1];
      if (/[\p{Script=Han}\p{Script=Katakana}]/u.test(pair)) out.add(pair);
    }
  }
  return out;
}

const NOT_PLURAL_IES = new Set(['series', 'species', 'movies', 'cookies', 'pies', 'ties', 'lies']);
const singular = (w) => (NOT_PLURAL_IES.has(w) ? w
  : w.length > 4 && w.endsWith('ies') ? `${w.slice(0, -3)}y`
  : w.length > 4 && /[^sui]s$/.test(w) ? w.slice(0, -1) : w);

const texts = (o) => (o && typeof o === 'object' ? Object.values(o).filter((v) => typeof v === 'string') : []);

/**
 * The searchable models: [{ type, title, url, where, key, terms: Map(word → weight) }].
 * catalog: datamodels.jp's catalog.json; snapshot: nodes.snapshot.json. A word
 * counts most in the type name, then the title, the attribute names, the description.
 * key: "<subject>/<Type>" for a catalog model, "<node url>#<n>" for a node's model.
 * values: list the value types (Geometry, JapaneseAddress) too, as the MCP
 * server's search_models does (#223); a proposal is never for one of them.
 */
export function modelIndex(catalog, snapshot = { nodes: [] }, { values = false } = {}) {
  const entries = [];
  const add = (m, where, url, extra, key) => {
    const terms = new Map();
    const put = (text, weight) => { for (const w of words(text)) terms.set(w, Math.max(terms.get(w) ?? 0, weight)); };
    put(m.type, 4);
    for (const t of texts(m.title)) put(t, 3);
    for (const a of m.attributes ?? []) put(a?.name, 2);
    for (const t of texts(m.description)) put(t, 1);
    for (const t of extra ?? []) put(t, 1);
    entries.push({ type: m.type, title: m.title ?? {}, url, where, key, terms });
  };
  for (const m of catalog?.models ?? []) if (values || m.kind !== 'value') add(m, 'datamodels.jp', m.pageUrlEn ?? m.pageUrl, (m.attributes ?? []).flatMap((a) => texts(a.description)), `${m.subject}/${m.type}`);
  for (const n of snapshot?.nodes ?? []) {
    const site = nodeName(n, 'en');
    (n.models ?? []).forEach((m, i) => add(m, site, m.pageUrl, [], `${n.url}#${i}`));
  }
  return entries;
}

/**
 * The models most similar to `text`: [{ entry, score, matched }], best first.
 * Each matched word scores its weight in the model, times how rare it is
 * across all models; a model needs `min` points to be listed.
 */
export function similarModels(text, index, { limit = 5, min = 4 } = {}) {
  const asked = words(text);
  const df = new Map();
  for (const e of index) for (const w of e.terms.keys()) df.set(w, (df.get(w) ?? 0) + 1);
  const n = index.length || 1;
  return index.map((entry) => {
    let score = 0; const matched = [];
    for (const w of asked) {
      const weight = entry.terms.get(w);
      if (!weight) continue;
      score += weight * (1 + Math.log(n / df.get(w)));
      matched.push(w);
    }
    return { entry, score, matched };
  }).filter((r) => r.score >= min).sort((a, b) => b.score - a.score || a.entry.type.localeCompare(b.entry.type)).slice(0, limit);
}

/** The parts of a proposal (issue form) that say what is modelled: "What to model" and "Sample record". */
export function proposalText(body) {
  const parts = String(body ?? '').split(/^### /m).slice(1);
  const pick = (label) => parts.filter((p) => p.split('\n')[0].includes(label)).map((p) => p.split('\n').slice(1).join('\n')).join('\n');
  return [pick('What to model'), pick('Sample record')].join('\n').replace(/_No response_/g, '');
}

export const MARKER = '<!-- similar-models (#224) -->';

/** The comment: up to five similar models with their matching words, or that none were found. */
export function comment(results) {
  let md = `${MARKER}\n**似ているモデル / Similar models**\n\nこの提案の言葉から自動で探しました。新しい型を提案する前に、使える・拡張できるモデルがないか確かめてください（[モデルのルール](https://datamodels.jp/guide/rules)）。\nFound automatically from the words of this proposal: check whether one of them can be used or extended before a new type is proposed ([Rules for models](https://datamodels.jp/en/guide/rules)).\n\n`;
  if (!results.length) return `${md}似ているモデルは見つかりませんでした。 / No similar model found.\n`;
  for (const r of results) {
    const title = [r.entry.title.ja, r.entry.title.en].filter(Boolean).join(' / ');
    md += `- [${r.entry.type}](${r.entry.url})${title ? ` ${title}` : ''} (${r.entry.where}): ${r.matched.slice(0, 6).map((w) => `\`${w}\``).join(', ')}\n`;
  }
  return md;
}

/**
 * The comment this workflow made before, on any page of an issue's comments
 * (`page(n)` returns page n, 100 per page, and throws when GitHub answers with
 * an error: posting anyway would add a second comment instead of updating it).
 */
export async function findMarkedComment(page) {
  for (let n = 1; ; n++) {
    const comments = await page(n);
    if (!Array.isArray(comments)) throw new Error('the comment list is not a list');
    const mine = comments.find((c) => c.user?.type === 'Bot' && c.body?.startsWith(MARKER));
    if (mine) return mine;
    if (comments.length < 100) return null;
  }
}
