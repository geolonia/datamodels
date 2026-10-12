// /adapters/: what each adapter's file is, how to use it and where to get it;
// /adapters/<name>/: a product adapter's file for every model (the generic
// files are on the model pages instead). The core never imports an adapter: build.mjs passes the
// modules it discovered under adapters/ (see adapters/README.md).
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { modelUrls, BASE_URL, ROOT } from './models.mjs';

const T = {
  ja: {
    title: 'アダプター',
    description: '特定のブローカーやツール向けに、カタログのモデルから作るファイルの説明: 内容、使い方、入手先',
    intro: 'カタログのモデルは特定の製品に依存しません。いくつかのブローカーやツールのために、カタログは各モデルからそのまま読み込めるファイルも作り、`/adapters/<name>/` で公開しています。たとえば、表計算ソフトで使う CSV テンプレートや、GeonicDB にモデルを登録するための定義です。これをアダプターと呼びます。このページでは、ファイルごとに内容、使い方、入手先を説明します。',
    rules: [
      'アダプターはファイルを足すだけで、`@context`、スキーマ、IRI は変えません。',
      'アダプターのファイルはカタログと一緒に作り直され、「公開したファイルは変えない」という約束の対象ではありません。あとで同じファイルが要るときは、ファイルを手元に保存し、作られたときの分野のバージョンも記録してください。',
    ],
    downloads: 'モデルのページからダウンロードできるファイル',
    downloadsIntro: '製品に依存しないファイルです。各モデルのページの「ダウンロード」の行に、ファイルごとのボタンがあります。どれもモデルの属性名と IRI をそのまま使います。',
    products: '特定の製品向けのファイル',
    productsIntro: 'モデルのページは特定の製品を名指ししないので、これらのファイルはモデルのページにはなく、ここからたどります。',
    what: '内容', use: '使い方', get: '入手先', example: '例',
    getDownload: (name) => `各モデルのページの「ダウンロード」の行。プログラムからは \`catalog.json\` の \`adapters.${name}\`。`,
    getProduct: (name, list) => `[モデルごとの一覧](${list})。プログラムからは \`catalog.json\` の \`adapters.${name}\`。`,
    command: (cmd, guide) => `自分で作るときは \`${cmd}\`${guide ? `（[ガイド](${guide})）` : ''}。`,
    guide: (href) => `詳しくは[ガイド](${href})にあります。`,
    sep: '', end: '。', colon: '：',
    more: (href) => `他のブローカーやツール向けのアダプターの候補は [#174](https://github.com/geolonia/datamodels/issues/174) に集めています。追加の仕方は [adapters/README.md](${href}) にあります。`,
    subject: '分野', type: '型', file: 'ファイル',
    adapterIntro: (guide) => (guide ? `使い方は[ガイド](${guide})にあります。` : ''),
    back: (href) => `[アダプターの説明](${href})`,
  },
  en: {
    title: 'Adapters',
    description: 'Files made from the catalog models for a particular broker or tool: what each is, how to use it and where to get it',
    intro: 'The catalog\'s models do not depend on any product. For some brokers and tools, the catalog also publishes files made from each model that they can load as they are, under `/adapters/<name>/` (for example, a CSV template for a spreadsheet, or a definition to register a model in GeonicDB). These are called adapters. This page explains each file: what it is, how to use it and where to get it.',
    rules: [
      'An adapter only adds files; it does not change a `@context`, a schema or an IRI.',
      'Adapter files are rebuilt with the catalog and are not covered by the promise that published files never change. If you need the exact file later, keep a copy and note the subject version it was made from.',
    ],
    downloads: 'Files on the model pages',
    downloadsIntro: 'Files that do not depend on a product. Each model page has a button for each of them in its "Download" row. They all use the model\'s attribute names and IRIs as they are.',
    products: 'Files for particular products',
    productsIntro: 'Model pages do not name a product, so these files are not on the model pages; find them from here.',
    what: 'What it is', use: 'How to use it', get: 'Where to get it', example: 'Example',
    getDownload: (name) => `The "Download" row of each model page. Programs: \`adapters.${name}\` in \`catalog.json\`.`,
    getProduct: (name, list) => `[List by model](${list}). Programs: \`adapters.${name}\` in \`catalog.json\`.`,
    command: (cmd, guide) => `To make it yourself: \`${cmd}\`${guide ? ` ([guide](${guide}))` : ''}.`,
    guide: (href) => `More in the [guide](${href}).`,
    sep: ' ', end: '', colon: ': ',
    more: (href) => `Candidates for other brokers and tools are collected in [#174](https://github.com/geolonia/datamodels/issues/174); how to add one: [adapters/README.md](${href}).`,
    subject: 'Subject', type: 'Type', file: 'File',
    adapterIntro: (guide) => (guide ? `How to use them: [guide](${guide}).` : ''),
    back: (href) => `[About the adapters](${href})`,
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
 * The sections of /adapters/ that model pages link: the generic files, which
 * their "Download" row links ("about these files"), and the files for a
 * product, which their "Adapters" sentence links. Each adapter has its own
 * section under one of them, at #<name>; /adapters/<name>/ of a removed page
 * redirects there (public/_redirects).
 */
export const DOWNLOADS_ANCHOR = 'downloads';
export const PRODUCTS_ANCHOR = 'products';

/**
 * The generic adapters in the toolkit's order (its model pages show the same):
 * the CSV template first, the table last; any other after them, by name.
 */
const DOWNLOAD_ORDER = ['csv', 'table-schema', 'ai', 'postgis'];
const rank = (a) => (DOWNLOAD_ORDER.includes(a.name) ? DOWNLOAD_ORDER.indexOf(a.name) : DOWNLOAD_ORDER.length);
export const inDownloadOrder = (adapters) => [...adapters].sort((a, b) => rank(a) - rank(b));

/** The first file an adapter has, as an example on its section: { model, url } or null. */
function exampleFile(adapter, subjects) {
  return adapterFiles(adapter, subjects)[0] ?? null;
}

/** One adapter's section: what the file is, how to use it, where to get it. */
function adapterSection(lang, prefix, adapter, subjects) {
  const t = T[lang];
  const local = (href) => (href.startsWith('/') && prefix && !href.startsWith(`${prefix}/`) ? `${prefix}${href}` : href);
  const items = [];
  if (adapter.note?.[lang]) items.push(`**${t.what}**${t.colon}${adapter.note[lang]}`);
  if (adapter.use?.[lang]) items.push(`**${t.use}**${t.colon}${adapter.use[lang]}`);
  const guide = adapter.guide ? local(adapter.guide) : null;
  const get = [adapter.download ? t.getDownload(adapter.name) : t.getProduct(adapter.name, `${prefix}/adapters/${adapter.name}/`)];
  if (adapter.command) get.push(t.command(adapter.command, guide));
  else if (guide) get.push(t.guide(guide));
  items.push(`**${t.get}**${t.colon}${get.join(t.sep)}`);
  const ex = exampleFile(adapter, subjects);
  if (ex) items.push(`**${t.example}**${t.colon}[\`${rel(ex.url).split('/').pop()}\`](${rel(ex.url)})${t.end}`);
  return `### ${adapter.label[lang]} {#${adapter.name}}\n\n${items.map((i) => `- ${i}`).join('\n')}\n\n`;
}

/**
 * /adapters/: what each adapter's file is, how to use it and where to get it.
 * It explains the adapters and does not list the files by model, so it does
 * not grow with the catalog: the generic files are on each model page, a
 * product's on /adapters/<name>/.
 */
export function adaptersIndexPage(lang, prefix, adapters, subjects = []) {
  const t = T[lang];
  let md = front(t.title, t.description) + `# ${t.title}\n\n${t.intro}\n\n${t.rules.map((r) => `- ${r}`).join('\n')}\n\n`;
  const generic = inDownloadOrder(adapters.filter((a) => a.download));
  const products = adapters.filter((a) => !a.download);
  if (generic.length) {
    md += `## ${t.downloads} {#${DOWNLOADS_ANCHOR}}\n\n${t.downloadsIntro}\n\n`;
    for (const a of generic) md += adapterSection(lang, prefix, a, subjects);
  }
  if (products.length) {
    md += `## ${t.products} {#${PRODUCTS_ANCHOR}}\n\n${t.productsIntro}\n\n`;
    for (const a of products) md += adapterSection(lang, prefix, a, subjects);
  }
  return md + `${t.more(README)}\n`;
}

export function adapterPage(lang, prefix, adapter, subjects) {
  const t = T[lang];
  let md = front(`${adapter.label[lang]} · ${t.title}`, adapter.note?.[lang] ?? t.description);
  md += `# ${adapter.label[lang]}\n\n${[adapter.note?.[lang], t.adapterIntro(adapter.guide && `${prefix}${adapter.guide}`)].filter(Boolean).join(' ')}\n\n`;
  md += `| ${t.subject} | ${t.type} | ${t.file} |\n|---|---|---|\n`;
  for (const { subject, model, url } of adapterFiles(adapter, subjects)) {
    md += `| ${subject.title[lang]} | [${model.type}](${prefix}${rel(modelUrls(subject, model).page)}) | [\`${rel(url)}\`](${rel(url)}) |\n`;
  }
  return md + `\n${t.back(`${prefix}/adapters/#${adapter.name}`)}\n`;
}

export async function generateAdapterPages(subjects, adapters) {
  for (const [lang, prefix] of [['ja', ''], ['en', '/en']]) {
    const base = join(ROOT, 'site', prefix.replace(/^\//, ''), 'adapters');
    await rm(base, { recursive: true, force: true });
    await mkdir(base, { recursive: true });
    await writeFile(join(base, 'index.md'), adaptersIndexPage(lang, prefix, adapters, subjects));
    // A generic file is on each model page, so only a product's files get a list by model.
    for (const a of adapters.filter((x) => !x.download)) {
      await mkdir(join(base, a.name), { recursive: true });
      await writeFile(join(base, a.name, 'index.md'), adapterPage(lang, prefix, a, subjects));
    }
  }
}
