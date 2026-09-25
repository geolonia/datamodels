// VitePress config for datamodels.jp. Japanese is the root locale with no
// /ja/ prefix, because the /ns IRI redirects point at /models/...; English is
// under /en/. Model pages are generated from models/ at build time
// (scripts/lib/site.mjs) and are not committed.
import type MarkdownIt from 'markdown-it'
import { defineConfig, type DefaultTheme } from 'vitepress'
import { loadSubjects, subjectUrls, modelUrls, BASE_URL } from '../../scripts/lib/models.mjs'

const subjects = await loadSubjects()
const rel = (url: string) => url.slice(BASE_URL.length)

function addVPreToInlineCode(md: MarkdownIt) {
  // Keep Vue from evaluating {{ }} inside inline code.
  const orig = md.renderer.rules.code_inline!
  md.renderer.rules.code_inline = (tokens, idx, options, env, self) =>
    orig(tokens, idx, options, env, self).replace(/^<code/, '<code v-pre')
}

const guides = (prefix: '' | '/en', lang: 'ja' | 'en'): DefaultTheme.SidebarItem[] => [
  { text: lang === 'ja' ? '拡張する・貢献する' : 'Extend and contribute', link: `${prefix}/guide/extend` },
  { text: lang === 'ja' ? '変わらない URL' : 'URLs that never change', link: `${prefix}/guide/urls` },
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
      { text: 'catalog.json', link: '/catalog.json' },
    ],
  }
  return {
    [`${prefix}/guide/`]: [
      { text: lang === 'ja' ? 'ガイド' : 'Guides', items: guides(prefix, lang) },
      {
        text: lang === 'ja' ? 'アダプター' : 'Adapters',
        items: [{ text: lang === 'ja' ? 'GeonicDB で使う' : 'Use with GeonicDB', link: `${prefix}/guide/geonicdb` }],
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
  { text: lang === 'ja' ? 'データモデル' : 'Data models', link: `${prefix}/models/` },
  { text: lang === 'ja' ? 'ガイド' : 'Guides', items: guides(prefix, lang) },
]

const SITE_URL = 'https://datamodels.jp';

export default defineConfig({
  title: 'datamodels.jp',
  description: 'Bilingual catalog of NGSI-LD data models: JSON-LD contexts, JSON Schemas and vocabularies at stable URLs',
  base: '/',
  cleanUrls: true,
  lastUpdated: false,
  // Links to the machine files and IRIs are not pages; everything else must resolve.
  ignoreDeadLinks: [/^\/(context|schema|examples|adapters|vocab|catalog|ns|LICENSE-CONTENT)/],
  markdown: { config: addVPreToInlineCode },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
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
    const description = pageData.description || pageData.frontmatter.description || 'Bilingual catalog of NGSI-LD data models: JSON-LD contexts, JSON Schemas and vocabularies at stable URLs';
    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: `${SITE_URL}/${path}` }],
      ['link', { rel: 'canonical', href: `${SITE_URL}/${path}` }],
    );
  },

  themeConfig: {
    // No logo: the catalog is product-neutral; the domain is the wordmark.
    siteTitle: 'datamodels.jp',
    socialLinks: [{ icon: 'github', link: 'https://github.com/geolonia/datamodels' }],
    search: {
      provider: 'local',
      options: {
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
      description: 'NGSI-LD データモデルカタログ',
      themeConfig: {
        nav: nav('', 'ja'),
        footer: { message: '運営: <a href="https://geolonia.com/">Geolonia</a> · モデル CC BY 4.0 · コード Apache-2.0' },
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
        footer: { message: 'Operated by <a href="https://geolonia.com/">Geolonia</a> · Models CC BY 4.0 · Code Apache-2.0' },
        sidebar: sidebar('/en', 'en'),
        outline: { level: [2, 3] },
      },
    },
  },
})
