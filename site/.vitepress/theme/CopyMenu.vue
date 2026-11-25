<!--
  The Copy menu at the top of every page with prose (#345): one click copies
  the page as Markdown; the menu next to it views the Markdown, opens the page
  in an AI chat, connects an AI tool through MCP, and on a model page copies the
  example or the schema URL. The Markdown is the page's .md version, written by
  the build (scripts/lib/page-markdown.mjs) at the path of the page's source.
  A menu button (WAI-ARIA APG): arrow keys move, Escape closes and returns focus.
-->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useData, useRoute } from 'vitepress'

const { page, lang, frontmatter } = useData()
const route = useRoute()

const TEXT = {
  ja: {
    copy: 'ページをコピー', copied: 'コピーしました', failed: 'コピーできませんでした', more: 'ほかの操作',
    view: ['Markdown で表示', 'このページをテキストで開く'],
    claude: ['Claude で開く', 'このページについて Claude に聞く'],
    chatgpt: ['ChatGPT で開く', 'このページについて ChatGPT に聞く'],
    mcp: ['MCP で接続', 'AI ツールからカタログを使う'],
    example: ['例の JSON をコピー', 'key-values の形の例'],
    schema: ['スキーマの URL をコピー', 'JSON Schema（バージョンの別名）'],
    prompt: (url: string) => `${url} を読んで、この内容について私の質問に答えてください。`,
  },
  en: {
    copy: 'Copy page', copied: 'Copied', failed: 'Could not copy', more: 'More actions',
    view: ['View as Markdown', 'Open this page as plain text'],
    claude: ['Open in Claude', 'Ask Claude about this page'],
    chatgpt: ['Open in ChatGPT', 'Ask ChatGPT about this page'],
    mcp: ['Connect with MCP', 'Use the catalog from an AI tool'],
    example: ['Copy example JSON', 'The example in key-values form'],
    schema: ['Copy schema URL', 'The JSON Schema (version alias)'],
    prompt: (url: string) => `Read ${url} and answer my questions about it.`,
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

type Item = { key: string, label: string, hint: string, external?: boolean, href?: () => string, run?: () => Promise<void> }
const items = computed<Item[]>(() => {
  const list: Item[] = [
    { key: 'view', label: t.value.view[0], hint: t.value.view[1], external: true, href: () => mdPath.value },
    { key: 'claude', label: t.value.claude[0], hint: t.value.claude[1], external: true, href: () => `https://claude.ai/new?q=${encodeURIComponent(t.value.prompt(mdUrl()))}` },
    { key: 'chatgpt', label: t.value.chatgpt[0], hint: t.value.chatgpt[1], external: true, href: () => `https://chatgpt.com/?q=${encodeURIComponent(t.value.prompt(mdUrl()))}` },
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
let timer: ReturnType<typeof setTimeout> | undefined
// The text is fetched after the click. Safari only lets a page write to the clipboard
// within the click, so the write starts at once and waits for the text (ClipboardItem).
async function copy(text: Promise<string>) {
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      const blob = text.then((s) => new Blob([s], { type: 'text/plain' }))
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

// The menu.
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const toggle = ref<HTMLButtonElement | null>(null)
const entries = ref<HTMLElement[]>([])

function focusItem(i: number) {
  const n = entries.value.length
  entries.value[((i % n) + n) % n]?.focus()
}
async function show(focus = 0) {
  entries.value = []
  open.value = true
  await nextTick()
  focusItem(focus)
}
function hide(returnFocus = true) {
  open.value = false
  if (returnFocus) toggle.value?.focus()
}
function onToggleKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(0) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); show(entries.value.length ? entries.value.length - 1 : items.value.length - 1) }
}
function onMenuKey(e: KeyboardEvent) {
  const i = entries.value.indexOf(document.activeElement as HTMLElement)
  if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(i + 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(i - 1) }
  else if (e.key === 'Home') { e.preventDefault(); focusItem(0) }
  else if (e.key === 'End') { e.preventDefault(); focusItem(-1) }
  else if (e.key === 'Escape') { e.preventDefault(); hide() }
  else if (e.key === 'Tab') hide(false)
}
async function choose(item: Item) {
  if (item.run) await item.run()
  hide(!item.external)
}

// A click elsewhere closes it; so does going to another page.
function onDocClick(e: MouseEvent) { if (open.value && !root.value?.contains(e.target as Node)) hide(false) }
watch(open, (v) => { if (v) document.addEventListener('click', onDocClick); else document.removeEventListener('click', onDocClick) })
watch(() => route.path, () => { open.value = false; status.value = '' })
onBeforeUnmount(() => { document.removeEventListener('click', onDocClick); clearTimeout(timer) })
</script>

<template>
  <div ref="root" class="copy-menu">
    <div class="copy-menu-buttons">
      <button type="button" class="copy-menu-main" @click="copyPage">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
        <span>{{ status === 'copied' ? t.copied : status === 'failed' ? t.failed : t.copy }}</span>
      </button>
      <button
        ref="toggle" type="button" class="copy-menu-toggle" aria-haspopup="menu" :aria-expanded="open"
        :aria-label="t.more" :title="t.more" @click="open ? hide() : show(0)" @keydown="onToggleKey"
      >
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </div>
    <span class="visually-hidden" role="status">{{ status === 'copied' ? t.copied : status === 'failed' ? t.failed : '' }}</span>
    <ul v-if="open" class="copy-menu-list" role="menu" :aria-label="t.more" @keydown="onMenuKey">
      <li v-for="item in items" :key="item.key" role="none">
        <a
          v-if="item.href" :ref="(el) => { if (el) entries[items.indexOf(item)] = el as HTMLElement }"
          role="menuitem" tabindex="-1" :href="item.href()" :target="item.external ? '_blank' : undefined"
          :rel="item.external ? 'noopener' : undefined" @click="choose(item)"
        >
          <span class="label">{{ item.label }}<span v-if="item.external" class="ext" aria-hidden="true"> ↗</span></span>
          <span class="hint">{{ item.hint }}</span>
        </a>
        <button
          v-else :ref="(el) => { if (el) entries[items.indexOf(item)] = el as HTMLElement }"
          role="menuitem" tabindex="-1" type="button" @click="choose(item)"
        >
          <span class="label">{{ item.label }}</span>
          <span class="hint">{{ item.hint }}</span>
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
.copy-menu-list :is(a, button):hover, .copy-menu-list :is(a, button):focus { background: var(--vp-c-default-soft); }
.label { font-size: 14px; font-weight: 500; }
.ext { color: var(--vp-c-text-3); }
.hint { font-size: 12px; color: var(--vp-c-text-2); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
