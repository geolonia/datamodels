// VitePress config for datamodels.jp. Japanese is the root locale with no
// /ja/ prefix, because the /ns IRI redirects point at /models/...; English is
// under /en/. Model pages are generated from models/ at build time
// (scripts/lib/site.mjs) and are not committed.
import type MarkdownIt from 'markdown-it'
import { defineConfig, type DefaultTheme } from 'vitepress'
import { loadSubjects, subjectUrls, modelUrls, BASE_URL } from '../../scripts/lib/models.mjs'
import { tokenize } from './search-tokenize.mjs'
import { endUrlsAtNonAscii } from './linkify.mjs'

const subjects = await loadSubjects()
const rel = (url: string) => url.slice(BASE_URL.length)

function addVPreToInlineCode(md: MarkdownIt) {
  // Keep Vue from evaluating {{ }} inside inline code.
  const orig = md.renderer.rules.code_inline!
  md.renderer.rules.code_inline = (tokens, idx, options, env, self) =>
    orig(tokens, idx, options, env, self).replace(/^<code/, '<code v-pre')
}

// Guides explain the catalog and need no command: using the models, adding to the catalog, its rules,
// and pages to look things up in. Everything done with the datamodels command is in the Toolkit section.
// In groups (#251): for people who use a model as it is, for people who adapt one (more attributes,
// their own names), for people who add to the catalog, for people whose models belong elsewhere
// (the steps for that are in the Toolkit section), and reference. The Guides index has a diagram
// that picks the group.
// One level only; the one exception is GeonicDB, the product-specific page, under the generic "Using the models".
const guideGroups = (prefix: '' | '/en', lang: 'ja' | 'en'): DefaultTheme.SidebarItem[] => {
  const ja = lang === 'ja'
  const page = (jaText: string, enText: string, slug: string, items?: DefaultTheme.SidebarItem[]): DefaultTheme.SidebarItem =>
    ({ text: ja ? jaText : enText, link: `${prefix}/guide/${slug}`, ...(items ? { items } : {}) })
  return [
    {
      text: ja ? 'モデルを使う' : 'Use a model',
      items: [
        page('チュートリアル', 'Tutorial', 'tutorial'),
        // For a municipality with a CSV list: what to publish after convert, and where (#251).
        page('一覧を公開する', 'Publishing your list', 'publish'),
        // Its sub-pages start collapsed and open on this page or one of them.
        // What each file of the Download row is (/adapters/), then the recipes that use one, then a product's page.
        {
          ...page('使い方', 'Using the models', 'use', [
            { text: ja ? 'アダプター' : 'Adapters', link: `${prefix}/adapters/` },
            page('表計算ソフト（CSV）で使う', 'Using a spreadsheet (CSV)', 'csv'),
            page('PostgreSQL / PostGIS で使う', 'Using PostgreSQL / PostGIS', 'postgis'),
            page('AI でデータを取り出す', 'Extracting data with AI', 'ai-extraction'),
            page('GeonicDB で使う', 'Use with GeonicDB', 'geonicdb'),
          ]),
          collapsed: true,
        },
      ],
    },
    {
      text: ja ? 'モデルを合わせる' : 'Adapt a model',
      items: [
        // The extension builder is a section of this page (#builder).
        page('属性を足す', 'Adding attributes', 'extend'),
        page('独自の名前で使う', 'Your own names', 'names'),
      ],
    },
    {
      text: ja ? 'カタログに加わる' : 'Add to the catalog',
      items: [
        // Every request form (a model, an extension, a site, another catalog) has its section on Contributing.
        page('貢献する', 'Contributing', 'contribute'),
        page('モデルのルール', 'Rules for models', 'rules'),
      ],
    },
    {
      text: ja ? 'カタログの外のモデル' : 'Models outside the catalog',
      items: [
        page('自分のデータモデル', 'Your own data models', 'own-models'),
        // The steps are the Toolkit section's: a link there, not a copy.
        { text: ja ? '自分のサイトを作る（ツールキット）' : 'Your own site (Toolkit)', link: `${prefix}/toolkit/` },
      ],
    },
    {
      // Pages to look things up in, not tasks.
      text: ja ? '参照' : 'Reference',
      items: [
        page('対応している標準', 'Standards covered', 'standards'),
        page('対応表', 'Mapping files', 'mapping'),
        page('URL とバージョン', 'URLs and versions', 'urls'),
        page('他のデータモデルカタログ', 'Other data model catalogs', 'catalogs'),
        // Generated from nodes.snapshot.json (scripts/lib/site.mjs).
        page('データモデルのサイト', 'Data model sites', 'sites'),
      ],
    },
  ]
}

// The Toolkit section is the documentation of datamodels-toolkit (the datamodels command): one page
// per task, and the pages to look things up in, the command reference among them. The toolkit's README
// keeps the essentials and links here (decided 2026-10-12, geolonia/datamodels-toolkit#87).
const toolkitPages = (prefix: '' | '/en', lang: 'ja' | 'en'): DefaultTheme.SidebarItem[] => {
  const ja = lang === 'ja'
  const page = (jaText: string, enText: string, slug: string): DefaultTheme.SidebarItem =>
    ({ text: ja ? jaText : enText, link: `${prefix}/toolkit/${slug}` })
  // In groups, as the guides: publishing your own site (in the order of the work), converting
  // your own data into the models and out to other tools, and reference (every command; what a
  // node holds and what build writes). The landing page lists the same groups.
  return [
    {
      text: ja ? '自分のサイトを公開する' : 'Publish your site',
      items: [
        page('サイトを始める', 'Starting a site', 'start'),
        page('サイトのモデル', "Your site's models", 'models'),
        page('検査とビルド', 'Checking and building', 'check'),
        page('バージョン', 'Versions', 'versions'),
        page('GitHub Pages 以外のホスト', 'Other hosts', 'hosts'),
      ],
    },
    {
      text: ja ? '自分のデータ' : 'Your data',
      items: [
        page('データを変換する', 'Converting your data', 'convert'),
        page('他のツールに書き出す', 'Exporting to other tools', 'export'),
      ],
    },
    {
      text: ja ? '参照' : 'Reference',
      items: [
        page('コマンドリファレンス', 'Command reference', 'reference'),
        page('ノードとビルド', 'The node and build', 'node'),
      ],
    },
  ]
}

// One sidebar per section, so it stays short as the catalog grows: guide pages
// list the guides, model pages list the subjects, toolkit pages list the
// toolkit's tasks. Each starts with its topic (a link to its landing page) and
// ends with the other topics, styled as topics (sb-topic, custom.css). Subjects
// start collapsed; the one containing the current page opens by itself.
// catalog.json is linked from the model list and the URL guide, not here: it is
// a file for programs.
function sidebar(prefix: '' | '/en', lang: 'ja' | 'en'): DefaultTheme.Sidebar {
  const ja = lang === 'ja'
  const topic = (text: string, link: string, other = false): DefaultTheme.SidebarItem =>
    ({ text: `<span class="sb-topic${other ? ' sb-other' : ''}">${text}</span>`, link })
  const about = topic(ja ? 'このサイトについて' : 'About this site', `${prefix}/about`, true)
  const modelsSidebar: DefaultTheme.SidebarItem[] = [
    topic(ja ? 'データモデル' : 'Data models', `${prefix}/models/`),
    ...subjects.map((s) => ({
      text: s.title[lang],
      collapsed: true,
      items: [
        { text: ja ? '概要' : 'Overview', link: `${prefix}${rel(subjectUrls(s).page)}` },
        ...s.models.map((m) => ({ text: m.type, link: `${prefix}${rel(modelUrls(s, m).page)}` })),
      ],
    })),
    topic(ja ? 'ガイド' : 'Guides', `${prefix}/guide/`, true),
    topic(ja ? 'ツールキット' : 'Toolkit', `${prefix}/toolkit/`, true),
    about,
  ]
  const guides: DefaultTheme.SidebarItem[] = [
    topic(ja ? 'ガイド' : 'Guides', `${prefix}/guide/`),
    ...guideGroups(prefix, lang),
    topic(ja ? 'データモデル' : 'Data models', `${prefix}/models/`, true),
    topic(ja ? 'ツールキット' : 'Toolkit', `${prefix}/toolkit/`, true),
    about,
  ]
  return {
    [`${prefix}/guide/`]: guides,
    // The adapters page says what each file of a model page's Download row is and how to use it: a guide
    // (sites built with the toolkit link it as "About these files"), so it keeps the Guides sidebar.
    [`${prefix}/adapters/`]: guides,
    [`${prefix}/toolkit/`]: [
      topic(ja ? 'ツールキット' : 'Toolkit', `${prefix}/toolkit/`),
      ...toolkitPages(prefix, lang),
      topic(ja ? 'データモデル' : 'Data models', `${prefix}/models/`, true),
      topic(ja ? 'ガイド' : 'Guides', `${prefix}/guide/`, true),
      about,
    ],
    [`${prefix}/models/`]: modelsSidebar,
    // The pages about the site itself: not a topic in the navigation, but no dead end either.
    ...Object.fromEntries([`${prefix}/about`, `${prefix}/LICENSE-CONTENT`, `${prefix}/ai`].map((path) => [path, [
      topic(ja ? 'このサイトについて' : 'About this site', `${prefix}/about`),
      { text: ja ? 'ライセンス' : 'Licences', link: `${prefix}/LICENSE-CONTENT` },
      { text: ja ? 'AI とエージェント' : 'AI and agents', link: `${prefix}/ai` },
      topic(ja ? 'データモデル' : 'Data models', `${prefix}/models/`, true),
      topic(ja ? 'ガイド' : 'Guides', `${prefix}/guide/`, true),
      topic(ja ? 'ツールキット' : 'Toolkit', `${prefix}/toolkit/`, true),
    ]])),
  }
}

const nav = (prefix: '' | '/en', lang: 'ja' | 'en'): DefaultTheme.NavItem[] => [
  // Every section is a link to a landing page; the sidebar lists its pages.
  { text: lang === 'ja' ? 'データモデル' : 'Data models', link: `${prefix}/models/`, activeMatch: `^${prefix}/models/` },
  { text: lang === 'ja' ? 'ガイド' : 'Guides', link: `${prefix}/guide/`, activeMatch: `^${prefix}/(guide|adapters)/` },
  { text: lang === 'ja' ? 'ツールキット' : 'Toolkit', link: `${prefix}/toolkit/`, activeMatch: `^${prefix}/toolkit/` },
]

const SITE_URL = 'https://datamodels.jp';
// The fallback description of a page without its own, in the page's language (share previews).
const DESCRIPTION = {
  ja: '日本で使えるデータモデルのカタログ。JSON Schema、JSON-LD の @context、語彙を変わらない URL で公開し、NGSI-LD にそのまま使えます',
  en: 'Data models that work in Japan: JSON Schemas, JSON-LD contexts and vocabularies at stable URLs, ready for NGSI-LD',
};

export default defineConfig({
  title: 'datamodels.jp',
  description: DESCRIPTION.en,
  base: '/',
  cleanUrls: true,
  // sitemap.xml for search engines; robots.txt (public/) points to it.
  sitemap: { hostname: SITE_URL },
  lastUpdated: false,
  // Links to the machine files and IRIs are not pages; everything else must resolve.
  ignoreDeadLinks: [/^\/(context|schema|examples|adapters|vocab|catalog|ns|LICENSE-CONTENT|llms\.txt)/],
  markdown: {
    config(md) {
      addVPreToInlineCode(md)
      endUrlsAtNonAscii(md)
    },
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
    // Link previews (Slack, X, LINE): a PNG, absolute URL. Source: site/og-card.svg,
    // rendered with `rsvg-convert -w 1200 -h 630 -o site/public/og-image.png site/og-card.svg`.
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'datamodels.jp' }],
    ['meta', { property: 'og:image', content: `${SITE_URL}/og-image.png` }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],
  // Per-page title, description and canonical URL for the same previews.
  transformPageData(pageData) {
    const path = pageData.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '');
    // A page with titleTemplate: false (the home pages) has its whole title in its frontmatter.
    const title = pageData.frontmatter.titleTemplate === false && pageData.title ? pageData.title
      : pageData.title && pageData.title !== 'datamodels.jp' ? `${pageData.title} | datamodels.jp` : 'datamodels.jp';
    const lang = pageData.relativePath.startsWith('en/') ? 'en' : 'ja';
    const description = pageData.description || pageData.frontmatter.description || DESCRIPTION[lang];
    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: `${SITE_URL}/${path}` }],
      ['link', { rel: 'canonical', href: `${SITE_URL}/${path}` }],
    );
  },

  themeConfig: {
    // The catalog's own mark (docs/brand.md); no Geolonia branding, the catalog is product-neutral.
    logo: { light: '/logo-mark.svg', dark: '/logo-mark-dark.svg', alt: '' },
    siteTitle: 'datamodels.jp',
    socialLinks: [{ icon: 'github', link: 'https://github.com/geolonia/datamodels' }],
    search: {
      provider: 'local',
      options: {
        // Japanese has no spaces: split it into words (search-tokenize.mjs), for the index and the queries.
        // A query of several words (福祉避難所 → 福祉, 避難所) finds pages that have all of them.
        miniSearch: { options: { tokenize }, searchOptions: { combineWith: 'AND' } },
        locales: {
          root: {
            translations: {
              button: { buttonText: '検索', buttonAriaLabel: '検索' },
              modal: {
                noResultsText: '見つかりませんでした',
                resetButtonTitle: 'クリア',
                footer: { selectText: '選択', navigateText: '移動', closeText: '閉じる' },
              },
            },
          },
        },
      },
    },
  },

  locales: {
    root: {
      label: '日本語',
      lang: 'ja',
      description: DESCRIPTION.ja,
      themeConfig: {
        nav: nav('', 'ja'),
        footer: { message: '運営: <a href="https://geolonia.com/">Geolonia</a> · <a href="/LICENSE-CONTENT">モデルのファイル CC0 · 文章 CC BY 4.0 · コード Apache-2.0</a> · <a href="/about">このサイトについて</a>' },
        sidebar: sidebar('', 'ja'),
        outline: { label: '目次', level: [2, 3] },
        docFooter: { prev: '前のページ', next: '次のページ' },
        returnToTopLabel: 'トップへ戻る',
        sidebarMenuLabel: 'メニュー',
        darkModeSwitchLabel: '外観',
        langMenuLabel: '言語',
      },
    },
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      themeConfig: {
        nav: nav('/en', 'en'),
        footer: { message: 'Operated by <a href="https://geolonia.com/">Geolonia</a> · <a href="/en/LICENSE-CONTENT">Model files CC0 · Text CC BY 4.0 · Code Apache-2.0</a> · <a href="/en/about">About this site</a>' },
        sidebar: sidebar('/en', 'en'),
        outline: { level: [2, 3] },
      },
    },
  },
})
