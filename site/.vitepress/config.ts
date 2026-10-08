// VitePress config for datamodels.jp. Japanese is the root locale with no
// /ja/ prefix, because the /ns IRI redirects point at /models/...; English is
// under /en/. Model pages are generated from models/ at build time
// (scripts/lib/site.mjs) and are not committed.
import type MarkdownIt from 'markdown-it'
import { defineConfig, type DefaultTheme } from 'vitepress'
import { loadSubjects, subjectUrls, modelUrls, BASE_URL } from '../../scripts/lib/models.mjs'
import { tokenize } from './search-tokenize.mjs'

const subjects = await loadSubjects()
const rel = (url: string) => url.slice(BASE_URL.length)

function addVPreToInlineCode(md: MarkdownIt) {
  // Keep Vue from evaluating {{ }} inside inline code.
  const orig = md.renderer.rules.code_inline!
  md.renderer.rules.code_inline = (tokens, idx, options, env, self) =>
    orig(tokens, idx, options, env, self).replace(/^<code/, '<code v-pre')
}

const guides = (prefix: '' | '/en', lang: 'ja' | 'en'): DefaultTheme.SidebarItem[] => [
  { text: lang === 'ja' ? '使い方' : 'Using the models', link: `${prefix}/guide/use` },
  { text: lang === 'ja' ? '拡張する' : 'Extending models', link: `${prefix}/guide/extend` },
  { text: lang === 'ja' ? '拡張ビルダー' : 'Extension builder', link: `${prefix}/guide/builder` },
  { text: lang === 'ja' ? '貢献する' : 'Contributing', link: `${prefix}/guide/contribute` },
  { text: lang === 'ja' ? '変わらない URL' : 'URLs that never change', link: `${prefix}/guide/urls` },
  { text: lang === 'ja' ? 'バージョンと非推奨' : 'Versions and deprecation', link: `${prefix}/guide/versioning` },
  { text: lang === 'ja' ? '他のデータモデルカタログ' : 'Other data model catalogs', link: `${prefix}/guide/catalogs` },
  { text: 'Tips & Tricks', link: `${prefix}/guide/tips` },
]

// One sidebar per section, so it stays short as the catalog grows: guide pages
// list the guides, model pages list the subjects. Subjects start collapsed; the
// one containing the current page opens by itself.
function sidebar(prefix: '' | '/en', lang: 'ja' | 'en'): DefaultTheme.Sidebar {
  const catalog: DefaultTheme.SidebarItem = {
    text: lang === 'ja' ? 'カタログ' : 'Catalog',
    items: [
      { text: lang === 'ja' ? 'データモデル一覧' : 'All data models', link: `${prefix}/models/` },
      { text: lang === 'ja' ? '対応する標準' : 'Standards mapped', link: `${prefix}/models/standards/` },
      { text: lang === 'ja' ? 'catalog.json（プログラム向け）' : 'catalog.json (for programs)', link: '/catalog.json' },
    ],
  }
  return {
    [`${prefix}/guide/`]: [
      {
        text: lang === 'ja' ? 'ガイド' : 'Guides',
        // Product-specific pages sit under "Using the models", after the steps that work with any broker.
        items: [
          { text: lang === 'ja' ? 'ガイド一覧' : 'All guides', link: `${prefix}/guide/` },
          ...guides(prefix, lang).map((g) => g.link === `${prefix}/guide/use`
            ? { ...g, items: [{ text: 'GeonicDB', link: `${prefix}/guide/geonicdb` }] }
            : g),
        ],
      },
      catalog,
    ],
    [`${prefix}/models/`]: [
      catalog,
      ...subjects.map((s) => ({
        text: s.title[lang],
        collapsed: true,
        items: [
          { text: lang === 'ja' ? '概要' : 'Overview', link: `${prefix}${rel(subjectUrls(s).page)}` },
          ...s.models.map((m) => ({ text: m.type, link: `${prefix}${rel(modelUrls(s, m).page)}` })),
        ],
      })),
    ],
  }
}

const nav = (prefix: '' | '/en', lang: 'ja' | 'en'): DefaultTheme.NavItem[] => [
  // Both sections are links to a landing page; the sidebar lists their pages.
  { text: lang === 'ja' ? 'データモデル' : 'Data models', link: `${prefix}/models/`, activeMatch: `^${prefix}/models/` },
  { text: lang === 'ja' ? 'ガイド' : 'Guides', link: `${prefix}/guide/`, activeMatch: `^${prefix}/guide/` },
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
  ignoreDeadLinks: [/^\/(context|schema|examples|adapters|vocab|catalog|ns|LICENSE-CONTENT)/],
  markdown: { config: addVPreToInlineCode },
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
    const title = pageData.title && pageData.title !== 'datamodels.jp' ? `${pageData.title} | datamodels.jp` : 'datamodels.jp';
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
        footer: { message: '運営: <a href="https://geolonia.com/">Geolonia</a> · モデルのファイル CC0 · 文章 CC BY 4.0 · コード Apache-2.0 · <a href="/about">このサイトについて</a>' },
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
        footer: { message: 'Operated by <a href="https://geolonia.com/">Geolonia</a> · Model files CC0 · Text CC BY 4.0 · Code Apache-2.0 · <a href="/en/about">About this site</a>' },
        sidebar: sidebar('/en', 'en'),
        outline: { level: [2, 3] },
      },
    },
  },
})
