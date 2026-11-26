<!--
  The Copy menu at the top of every page with prose (#345): one click copies
  the page as Markdown; the menu next to it views the Markdown, opens the page
  in an AI chat, connects an AI tool through MCP, and on a model page copies the
  example or the schema URL. The Markdown is the page's .md version, written by
  the build (scripts/lib/page-markdown.mjs) at the path of the page's source.
  Only in the built site: `vitepress dev` answers /x.md with a Vite module.
  A menu button (WAI-ARIA APG): Enter, Space or ArrowDown opens it, arrow keys
  move, Enter or Space chooses, Escape closes and returns focus.
-->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useData, useRoute } from 'vitepress'

const { page, lang, frontmatter } = useData()
const route = useRoute()

const TEXT = {
  ja: {
    // The button shows a short label (it sits in a narrow row); its name, its title and the
    // announcement say the whole thing.
    copy: 'コピー', copyPage: 'ページをコピー', shown: { copied: '完了', failed: '失敗' },
    copied: 'コピーしました', failed: 'コピーできませんでした', more: 'ほかの操作', newTab: '（新しいタブ）',
    view: ['Markdown で表示', 'このページをテキストで開く'],
    claude: ['Claude で開く', 'このページについて Claude に聞く'],
    chatgpt: ['ChatGPT で開く', 'このページについて ChatGPT に聞く'],
    mcp: ['MCP で接続', 'AI ツールからカタログを使う'],
    example: ['例の JSON をコピー', 'key-values の形の例'],
    schema: ['スキーマの URL をコピー', 'JSON Schema（バージョンの別名）'],
    prompt: (url: string) => `次のページを読んで、内容について私の質問に答えてください: ${url}`,
  },
  en: {
    copy: 'Copy', copyPage: 'Copy page', shown: { copied: 'Copied', failed: 'Failed' },
    copied: 'Copied', failed: 'Could not copy', more: 'More actions', newTab: ' (new tab)',
    view: ['View as Markdown', 'Open this page as plain text'],
    claude: ['Open in Claude', 'Ask Claude about this page'],
    chatgpt: ['Open in ChatGPT', 'Ask ChatGPT about this page'],
    mcp: ['Connect with MCP', 'Use the catalog from an AI tool'],
    example: ['Copy example JSON', 'The example in key-values form'],
    schema: ['Copy schema URL', 'The JSON Schema (version alias)'],
    prompt: (url: string) => `Read this page and answer my questions about it: ${url}`,
  },
}
const t = computed(() => (lang.value === 'ja' ? TEXT.ja : TEXT.en))

// The Markdown of this page: fetched from the same origin, so previews serve their own files.
const mdPath = computed(() => `/${page.value.relativePath}`)
// An AI chat reads the public URL that the page's head names (config.ts, from BASE_URL):
// it cannot open localhost or a preview.
const mdUrl = () => document.querySelector<HTMLLinkElement>('link[rel="alternate"][type="text/markdown"]')?.href
  ?? new URL(mdPath.value, location.origin).href
const mcpHref = computed(() => (lang.value === 'ja' ? '/ai#mcp-server' : '/en/ai#mcp-server'))
const prompt = () => encodeURIComponent(t.value.prompt(mdUrl()))

// A link (href) or an action (run). External links open in a new tab.
type Item = { key: string, label: string, hint: string, external?: boolean, href?: () => string, run?: () => Promise<void> }
const items = computed<Item[]>(() => {
  const list: Item[] = [
    { key: 'view', label: t.value.view[0], hint: t.value.view[1], external: true, href: () => mdPath.value },
    { key: 'claude', label: t.value.claude[0], hint: t.value.claude[1], external: true, href: () => `https://claude.ai/new?q=${prompt()}` },
    // hints=search: ChatGPT reads the page instead of answering from memory.
    { key: 'chatgpt', label: t.value.chatgpt[0], hint: t.value.chatgpt[1], external: true, href: () => `https://chatgpt.com/?hints=search&q=${prompt()}` },
    { key: 'mcp', label: t.value.mcp[0], hint: t.value.mcp[1], href: () => mcpHref.value },
  ]
  // A model page: its example and schema (frontmatter written by scripts/lib/site.mjs).
  const { exampleUrl, schemaUrl } = frontmatter.value
  if (exampleUrl) list.push({ key: 'example', label: t.value.example[0], hint: t.value.example[1], run: () => copy(fetchText(sameOrigin(exampleUrl))) })
  if (schemaUrl) list.push({ key: 'schema', label: t.value.schema[0], hint: t.value.schema[1], run: () => copy(Promise.resolve(schemaUrl)) })
  return list
})

// A catalog URL fetched from this origin (a preview serves the same files).
const sameOrigin = (url: string) => new URL(url).pathname
async function fetchText(path: string) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return res.text()
}

const status = ref<'' | 'copied' | 'failed'>('')
const label = computed(() => (status.value ? t.value[status.value] : ''))
const shown = computed(() => (status.value ? t.value.shown[status.value] : t.value.copy))
let timer: ReturnType<typeof setTimeout> | undefined
// The text is fetched after the click. Safari only lets a page write to the clipboard
// within the click, so the write starts at once and waits for the text (ClipboardItem).
// Browsers without ClipboardItem (Firefox before 127) write when the text has arrived.
async function copy(text: Promise<string>) {
  text.catch(() => {})   // a failed fetch is reported below, never as an unhandled rejection
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      const blob = text.then((s) => new Blob([s], { type: 'text/plain' }))
      blob.catch(() => {})
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })])
    } else {
      await navigator.clipboard.writeText(await text)
    }
    status.value = 'copied'
  } catch {
    status.value = 'failed'
  }
  clearTimeout(timer)
  timer = setTimeout(() => { status.value = '' }, 2000)
}
const copyPage = () => copy(fetchText(mdPath.value))

// The menu. Its entries are read from the DOM when needed, so they always match what is shown.
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const toggle = ref<HTMLButtonElement | null>(null)
const entries = () => [...(root.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]

function focusItem(i: number) {
  const list = entries()
  if (list.length) list[((i % list.length) + list.length) % list.length].focus()
}
async function show(focus = 0) {
  open.value = true
  await nextTick()
  focusItem(focus)
}
function hide(returnFocus = true) {
  open.value = false
  if (returnFocus) toggle.value?.focus()
}
function onToggleKey(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open.value ? hide() : show(0) }
  else if (e.key === 'ArrowDown') { e.preventDefault(); show(0) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); show(-1) }
  else if (e.key === 'Escape' && open.value) { e.preventDefault(); hide() }
}
function onMenuKey(e: KeyboardEvent) {
  const i = entries().indexOf(document.activeElement as HTMLElement)
  if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(i + 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(i - 1) }
  else if (e.key === 'Home') { e.preventDefault(); focusItem(0) }
  else if (e.key === 'End') { e.preventDefault(); focusItem(-1) }
  else if (e.key === 'Escape') { e.preventDefault(); hide() }
  // Space chooses a link too (a link only answers Enter by itself); the click keeps target=_blank.
  else if (e.key === ' ' && i >= 0) { e.preventDefault(); entries()[i].click() }
}
// The menu closes at once. After an action focus goes back to the button; after a link the
// browser or router moves it. A copy goes on in the background (its clipboard write has
// started inside the click, as Safari needs) and shows its result on the button, so a slow
// fetch never takes focus back from where the user has gone since.
function choose(item: Item) {
  item.run?.()
  hide(!item.href)
}

// A tap or click elsewhere, or focus moving out, closes it; so does going to another page.
// pointerdown: iOS Safari does not send click to the document for a tap on plain text.
function onOutside(e: Event) { if (open.value && !root.value?.contains(e.target as Node)) hide(false) }
watch(open, (v) => {
  for (const type of ['pointerdown', 'focusin']) {
    if (v) document.addEventListener(type, onOutside)
    else document.removeEventListener(type, onOutside)
  }
})
watch(() => route.path, () => { open.value = false; status.value = '' })
onBeforeUnmount(() => {
  for (const type of ['pointerdown', 'focusin']) document.removeEventListener(type, onOutside)
  clearTimeout(timer)
})
</script>

<template>
  <div ref="root" class="copy-menu">
    <div class="copy-menu-buttons">
      <button type="button" class="copy-menu-main" :aria-label="t.copyPage" :title="t.copyPage" @click="copyPage">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
        <!-- All three labels take the same place, so the button keeps the width of the longest. -->
        <span class="copy-menu-labels">
          <span v-for="s in [t.copy, t.shown.copied, t.shown.failed]" :key="s" :class="{ shown: s === shown }" aria-hidden="true">{{ s }}</span>
        </span>
      </button>
      <button
        ref="toggle" type="button" class="copy-menu-toggle" aria-haspopup="menu" :aria-expanded="open"
        :aria-label="t.more" :title="t.more" @click="open ? hide() : show(0)" @keydown="onToggleKey"
      >
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </div>
    <span class="visually-hidden" role="status">{{ label }}</span>
    <ul v-if="open" class="copy-menu-list" role="menu" :aria-label="t.more" @keydown="onMenuKey">
      <li v-for="item in items" :key="item.key" role="none">
        <a
          v-if="item.href" role="menuitem" tabindex="-1" :href="item.href()" :aria-describedby="`copy-menu-hint-${item.key}`"
          :target="item.external ? '_blank' : undefined" :rel="item.external ? 'noopener' : undefined" @click="choose(item)"
        >
          <span class="label">{{ item.label }}<span v-if="item.external" class="ext" aria-hidden="true"> ↗</span><span v-if="item.external" class="visually-hidden">{{ t.newTab }}</span></span>
          <span :id="`copy-menu-hint-${item.key}`" class="hint" aria-hidden="true">{{ item.hint }}</span>
        </a>
        <button v-else role="menuitem" tabindex="-1" type="button" :aria-describedby="`copy-menu-hint-${item.key}`" @click="choose(item)">
          <span class="label">{{ item.label }}</span>
          <span :id="`copy-menu-hint-${item.key}`" class="hint" aria-hidden="true">{{ item.hint }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.copy-menu { position: relative; flex: none; }
.copy-menu-buttons {
  display: inline-flex; border: 1px solid var(--vp-c-border); border-radius: 8px;
  background: var(--vp-c-bg-elv); overflow: hidden;
}
.copy-menu-buttons button {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; min-height: 32px;
  font-size: 13px; font-weight: 500; color: var(--vp-c-text-1); background: transparent;
}
.copy-menu-buttons button:hover { background: var(--vp-c-default-soft); }
.copy-menu-toggle { border-left: 1px solid var(--vp-c-border); padding: 4px 8px !important; }
.copy-menu-labels { display: grid; }
.copy-menu-labels > span { grid-area: 1 / 1; visibility: hidden; }
.copy-menu-labels > .shown { visibility: visible; }
.copy-menu-buttons button:focus-visible, .copy-menu-list :is(a, button):focus-visible {
  outline: 2px solid var(--vp-c-brand-1); outline-offset: -2px;
}
.icon { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.copy-menu-list {
  position: absolute; right: 0; top: calc(100% + 6px); z-index: 30; width: max-content; max-width: min(320px, calc(100vw - 32px));
  margin: 0; padding: 6px; list-style: none; border: 1px solid var(--vp-c-divider); border-radius: 10px;
  background: var(--vp-c-bg-elv); box-shadow: var(--vp-shadow-3);
}
.copy-menu-list li { margin: 0; }
.copy-menu-list :is(a, button) {
  display: flex; flex-direction: column; gap: 2px; width: 100%; padding: 8px 10px; border-radius: 6px;
  text-align: left; text-decoration: none; color: var(--vp-c-text-1);
}
/* Hover and keyboard focus are highlighted; the first entry focused after a mouse click is not. */
.copy-menu-list :is(a, button):is(:hover, :focus-visible) { background: var(--vp-c-default-soft); }
.copy-menu-list :is(a, button):focus:not(:focus-visible) { outline: none; }
.label { font-size: 14px; font-weight: 500; }
.ext { color: var(--vp-c-text-3); }
.hint { font-size: 12px; color: var(--vp-c-text-2); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media print { .copy-menu { display: none; } }
</style>
