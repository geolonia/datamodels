<!--
  The example on an entity model page as tabs: the example in key-values and
  in normalized form (Markdown code blocks, passed as slots and pre-rendered),
  and "Try it" (ExamplePlayground), mounted only when that tab is first opened.
  The page writes the slots (scripts/lib/site.mjs).
-->
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ labels: { simple: string; ngsi: string; try: string } }>()
const tabs = ['simple', 'ngsi', 'try'] as const
type Tab = typeof tabs[number]
const active = ref<Tab>('simple')
const tried = ref(false)
const open = (t: Tab) => { active.value = t; if (t === 'try') tried.value = true }
</script>

<template>
  <div class="example-tabs">
    <div class="tabs" role="tablist">
      <button v-for="t in tabs" :key="t" type="button" role="tab" :aria-selected="active === t" :class="{ on: active === t }" @click="open(t)">{{ props.labels[t] }}</button>
    </div>
    <div v-show="active === 'simple'" role="tabpanel"><slot name="simple" /></div>
    <div v-show="active === 'ngsi'" role="tabpanel"><slot name="ngsi" /></div>
    <div v-if="tried" v-show="active === 'try'" role="tabpanel" class="try"><slot name="try" /></div>
  </div>
</template>

<style scoped>
.example-tabs { margin: 16px 0; }
.tabs { display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid var(--vp-c-divider); }
.tabs button { padding: 8px 14px; border-bottom: 2px solid transparent; margin-bottom: -1px; font-size: 14px; font-weight: 500; color: var(--vp-c-text-2); }
.tabs button:hover { color: var(--vp-c-text-1); }
.tabs button.on { color: var(--vp-c-text-1); border-bottom-color: var(--vp-c-brand-1); }
.example-tabs :deep(div[class*='language-']) { margin-top: 12px; }
.try { padding-top: 12px; }
</style>
