<!--
  The example on an entity model page as tabs: the example in key-values and
  in normalized form (Markdown code blocks, passed as slots and pre-rendered),
  and "Try it" (ExamplePlayground), whose content is mounted only when that tab
  is first opened. The page writes the slots (scripts/lib/site.mjs).
  Tabs follow the WAI-ARIA tabs pattern: each tab names its panel, only the
  selected tab is in the Tab order, and the arrow keys, Home and End move between tabs.
-->
<script setup lang="ts">
import { nextTick, ref, useId } from 'vue'

const props = defineProps<{ labels: { simple: string; ngsi: string; try: string } }>()
const tabs = ['simple', 'ngsi', 'try'] as const
type Tab = typeof tabs[number]
const id = useId()
const active = ref<Tab>('simple')
const tried = ref(false)
const buttons = ref<HTMLButtonElement[]>([])
const open = (t: Tab) => { active.value = t; if (t === 'try') tried.value = true }
function key(e: KeyboardEvent, i: number) {
  const next = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 }[e.key]
  if (next === undefined) return
  e.preventDefault()
  open(tabs[next])
  nextTick(() => buttons.value[next]?.focus())
}
</script>

<template>
  <div class="example-tabs">
    <div class="tabs" role="tablist">
      <button
        v-for="(t, i) in tabs" :key="t" ref="buttons" type="button" role="tab"
        :id="`${id}-tab-${t}`" :aria-controls="`${id}-panel-${t}`" :aria-selected="active === t" :tabindex="active === t ? 0 : -1"
        :class="{ on: active === t }" @click="open(t)" @keydown="key($event, i)"
      >{{ props.labels[t] }}</button>
    </div>
    <div v-for="t in tabs" v-show="active === t" :key="t" :id="`${id}-panel-${t}`" role="tabpanel" :aria-labelledby="`${id}-tab-${t}`" tabindex="0" :class="{ try: t === 'try' }">
      <slot v-if="t === 'simple'" name="simple" />
      <slot v-else-if="t === 'ngsi'" name="ngsi" />
      <slot v-else-if="tried" name="try" />
    </div>
  </div>
</template>

<style scoped>
.example-tabs { margin: 16px 0; }
.tabs { display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid var(--vp-c-divider); }
.tabs button { padding: 8px 14px; border-bottom: 2px solid transparent; margin-bottom: -1px; font-size: 14px; font-weight: 500; color: var(--vp-c-text-2); }
.tabs button:hover { color: var(--vp-c-text-1); }
.tabs button.on { color: var(--vp-c-text-1); border-bottom-color: var(--vp-c-brand-1); }
.tabs button:focus-visible, [role='tabpanel']:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
/* A mouse click leaves no focus ring; the keyboard does. */
.tabs button:focus:not(:focus-visible), [role='tabpanel']:focus:not(:focus-visible) { outline: none; }
.example-tabs :deep(div[class*='language-']) { margin-top: 12px; }
.try { padding-top: 12px; }
</style>
