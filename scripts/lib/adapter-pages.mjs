// /adapters/ and /adapters/<name>/: what each adapter publishes, and its file
// for every model. The core never imports an adapter: build.mjs passes the
// modules it discovered under adapters/ (see adapters/README.md).
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { modelUrls, BASE_URL, ROOT } from './models.mjs';

const T = {
  ja: {
    title: 'アダプター',
    description: '特定のブローカーやツール向けに、カタログのモデルから生成するファイルの一覧',
    intro: 'カタログのモデルは特定の製品に依存しません。いくつかのブローカーやツールのために、カタログは各モデルからそのまま読み込めるファイルも作って `/adapters/<name>/` で公開しています（例: GeonicDB にモデルを登録するための定義）。これをアダプターと呼びます。',
    rules: [
      'アダプターはファイルを足すだけで、`@context`、スキーマ、IRI は変えません。',
      'アダプターのファイルはカタログと一緒に作り直され、「公開したファイルは変えない」という約束の対象ではありません。あとで同じファイルが要るときは、ファイルを手元に保存し、作られたときのサブジェクトのバージョンも記録してください。',
      '各モデルのアダプターのファイルは `catalog.json` の `adapters` にも載っています。',
    ],
    adapter: 'アダプター', what: '内容', files: 'ファイル', guide: 'ガイド', perModel: 'モデルごとの一覧', byModel: 'モデルごとのファイル', model: 'モデル',
    more: (href) => `他のブローカーやツール向けのアダプターの候補は [#174](https://github.com/geolonia/datamodels/issues/174) に集めています。追加の仕方は [adapters/README.md](${href}) にあります。`,
    subject: 'サブジェクト', type: '型', file: 'ファイル',
    adapterIntro: (guide) => (guide ? `使い方は[ガイド](${guide})にあります。` : ''),
    back: (href) => `[アダプターの一覧](${href})`,
  },
  en: {
    title: 'Adapters',
    description: 'Files generated from the catalog models for a particular broker or tool',
    intro: 'The catalog\'s models do not depend on any product. For some brokers and tools, the catalog also publishes files made from each model that they can load as they are, under `/adapters/<name>/` (for example, a definition to register a model in GeonicDB). These are called adapters.',
    rules: [
      'An adapter only adds files; it does not change a `@context`, a schema or an IRI.',
      'Adapter files are rebuilt with the catalog and are not covered by the promise that published files never change. If you need the exact file later, keep a copy and note the subject version it was made from.',
      'Each model\'s adapter files are also listed under `adapters` in `catalog.json`.',
    ],
    adapter: 'Adapter', what: 'What it is', files: 'Files', guide: 'Guide', perModel: 'one per model', byModel: 'Files by model', model: 'Model',
    more: (href) => `Candidates for other brokers and tools are collected in [#174](https://github.com/geolonia/datamodels/issues/174); how to add one: [adapters/README.md](${href}).`,
    subject: 'Subject', type: 'Type', file: 'File',
    adapterIntro: (guide) => (guide ? `How to use them: [guide](${guide}).` : ''),
    back: (href) => `[All adapters](${href})`,
  },
};

const README = 'https://github.com/geolonia/datamodels/blob/main/adapters/README.md';
const rel = (url) => url.slice(BASE_URL.length);
const front = (title, description) => `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n\n`;

/** Every model an adapter has a file for, in catalog order: { subject, model, url }. */
export function adapterFiles(adapter, subjects) {
  const out = [];
  for (const subject of subjects) for (const model of subject.models) {
    const url = adapter.urlFor(subject, model);
    if (url) out.push({ subject, model, url });
  }
  return out;
}

/**
 * The anchor of a model's row on /adapters/, which its model page links. Lower
 * case: VitePress lowercases the hash of a Markdown link, and an id is
 * case-sensitive, so a mixed-case id would never be reached.
 */
export const modelAnchor = (subject, model) => `${subject.name}-${model.type}`.toLowerCase();

export function adaptersIndexPage(lang, prefix, adapters, subjects = []) {
  const t = T[lang];
  let md = front(t.title, t.description) + `# ${t.title}\n\n${t.intro}\n\n${t.rules.map((r) => `- ${r}`).join('\n')}\n\n`;
  md += `| ${t.adapter} | ${t.what} | ${t.files} | ${t.guide} |\n|---|---|---|---|\n`;
  for (const a of adapters) {
    md += `| ${a.label[lang]} | ${a.note?.[lang] ?? ''} | [${t.perModel}](${prefix}/adapters/${a.name}/) | ${a.guide ? `[${t.guide}](${prefix}${a.guide})` : '—'} |\n`;
  }
  md += `\n${t.more(README)}\n`;
  // One row per model that some adapter serves; the model page's "Adapters" row links here.
  const rows = subjects.flatMap((s) => s.models.map((m) => ({ s, m, urls: adapters.map((a) => a.urlFor(s, m)) }))).filter((r) => r.urls.some(Boolean));
  if (rows.length) {
    md += `\n## ${t.byModel} {#models}\n\n| ${t.model} | ${adapters.map((a) => a.label[lang]).join(' | ')} |\n|---|${adapters.map(() => '---|').join('')}\n`;
    for (const { s, m, urls } of rows) {
      md += `| <span id="${modelAnchor(s, m)}"></span>[${m.type}](${prefix}${rel(modelUrls(s, m).page)}) | ${urls.map((u) => (u ? `[\`${rel(u).split('/').pop()}\`](${rel(u)})` : '—')).join(' | ')} |\n`;
    }
  }
  return md;
}

export function adapterPage(lang, prefix, adapter, subjects) {
  const t = T[lang];
  let md = front(`${adapter.label[lang]} · ${t.title}`, adapter.note?.[lang] ?? t.description);
  md += `# ${adapter.label[lang]}\n\n${[adapter.note?.[lang], t.adapterIntro(adapter.guide && `${prefix}${adapter.guide}`)].filter(Boolean).join(' ')}\n\n`;
  md += `| ${t.subject} | ${t.type} | ${t.file} |\n|---|---|---|\n`;
  for (const { subject, model, url } of adapterFiles(adapter, subjects)) {
    md += `| ${subject.title[lang]} | [${model.type}](${prefix}${rel(modelUrls(subject, model).page)}) | [\`${rel(url)}\`](${rel(url)}) |\n`;
  }
  return md + `\n${t.back(`${prefix}/adapters/`)}\n`;
}

export async function generateAdapterPages(subjects, adapters) {
  for (const [lang, prefix] of [['ja', ''], ['en', '/en']]) {
    const base = join(ROOT, 'site', prefix.replace(/^\//, ''), 'adapters');
    await rm(base, { recursive: true, force: true });
    await mkdir(base, { recursive: true });
    await writeFile(join(base, 'index.md'), adaptersIndexPage(lang, prefix, adapters, subjects));
    for (const a of adapters) {
      await mkdir(join(base, a.name), { recursive: true });
      await writeFile(join(base, a.name, 'index.md'), adapterPage(lang, prefix, a, subjects));
    }
  }
}
