// VitePress config for models.geonicdb.com, modelled on docs.geonicdb.com
// (geolonia/geonicdb-docs). Differences: Japanese is the root locale with no
// /ja/ prefix, because the /ns IRI redirects point at /models/...; English is
// under /en/. Model pages are generated from models/ at build time
// (scripts/lib/site.mjs) and are not committed.
import type MarkdownIt from 'markdown-it'
import { defineConfig, type DefaultTheme } from 'vitepress'
import { loadSubjects, subjectUrls, modelUrls, BASE_URL } from '../../scripts/lib/models.mjs'

const subjects = await loadSubjects()
const rel = (url: string) => url.slice(BASE_URL.length)

function addVPreToInlineCode(md: MarkdownIt) {
  // As in geonicdb-docs: keep Vue from evaluating {{ }} inside inline code.
  const orig = md.renderer.rules.code_inline!
  md.renderer.rules.code_inline = (tokens, idx, options, env, self) =>
    orig(tokens, idx, options, env, self).replace(/^<code/, '<code v-pre')
}

const guides = (prefix: '' | '/en', lang: 'ja' | 'en'): DefaultTheme.SidebarItem[] => [
  { text: lang === 'ja' ? '拡張する・貢献する' : 'Extend and contribute', link: `${prefix}/guide/extend` },
  { text: lang === 'ja' ? '変わらない URL' : 'URLs that never change', link: `${prefix}/guide/urls` },
  { text: lang === 'ja' ? 'GeonicDB で使う' : 'Use with GeonicDB', link: `${prefix}/guide/geonicdb` },
  { text: lang === 'ja' ? '他のデータモデルカタログ' : 'Other data model catalogs', link: `${prefix}/guide/catalogs` },
]

function sidebar(prefix: '' | '/en', lang: 'ja' | 'en'): DefaultTheme.Sidebar {
  return [
    {
      text: lang === 'ja' ? 'カタログ' : 'Catalog',
      items: [
        { text: lang === 'ja' ? 'データモデル一覧' : 'All data models', link: `${prefix}/models/` },
        { text: 'catalog.json', link: '/catalog.json' },
      ],
    },
    { text: lang === 'ja' ? 'ガイド' : 'Guides', items: guides(prefix, lang) },
    ...subjects.map((s) => ({
      text: s.title[lang],
      collapsed: false,
      items: [
        { text: lang === 'ja' ? '概要' : 'Overview', link: `${prefix}${rel(subjectUrls(s).page)}` },
        ...s.models.map((m) => ({ text: m.type, link: `${prefix}${rel(modelUrls(s, m).page)}` })),
      ],
    })),
  ]
}

const nav = (prefix: '' | '/en', lang: 'ja' | 'en'): DefaultTheme.NavItem[] => [
  { text: lang === 'ja' ? 'データモデル' : 'Data models', link: `${prefix}/models/` },
  { text: lang === 'ja' ? 'ガイド' : 'Guides', items: guides(prefix, lang) },
  { text: 'GeonicDB Docs', link: lang === 'ja' ? 'https://docs.geonicdb.com/ja/' : 'https://docs.geonicdb.com/en/' },
]

export default defineConfig({
  title: 'GeonicDB Data Models',
  description: 'Curated bilingual catalog of NGSI-LD data models for GeonicDB',
  base: '/',
  cleanUrls: true,
  lastUpdated: false,
  // Links to the machine files and IRIs are not pages; everything else must resolve.
  ignoreDeadLinks: [/^\/(context|schema|examples|geonicdb|catalog|ns|LICENSE-CONTENT)/],
  markdown: { config: addVPreToInlineCode },
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/geonicdb-logo.svg' }]],

  themeConfig: {
    logo: '/geonicdb-logo.svg',
    siteTitle: 'Data Models',
    socialLinks: [{ icon: 'github', link: 'https://github.com/geolonia/geonicdb-models' }],
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
      description: 'GeonicDB 向け NGSI-LD データモデルカタログ',
      themeConfig: {
        nav: nav('', 'ja'),
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
        sidebar: sidebar('/en', 'en'),
        outline: { level: [2, 3] },
      },
    },
  },
})
