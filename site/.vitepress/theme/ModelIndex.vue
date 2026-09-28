<!--
  The filterable list of every model on /models/ and /en/models/. The rows come
  from the generated page (scripts/lib/site.mjs), so the full table is
  pre-rendered and works without JavaScript; the filters only hide rows.
-->
<script setup lang="ts">
import { computed, ref } from 'vue'

interface Row {
  type: string; href: string; title: string; otherTitle: string
  subject: string; subjectTitle: string; subjectHref: string
  kind: 'entity' | 'value'; status: 'draft' | 'stable' | 'deprecated'
  text: string // lower-cased names, titles, descriptions and attribute names in both languages
}
const props = defineProps<{ models: Row[]; lang: 'ja' | 'en' }>()

const L = {
  ja: {
    search: 'モデル名・属性名・説明で絞り込む', subject: 'サブジェクト', kind: '種類', status: '段階', all: 'すべて',
    type: '型', name: '名前', entity: 'エンティティ', value: '値型', count: (n: number, all: number) => `${all} 件中 ${n} 件`,
    none: '当てはまるモデルはありません。', statusLabel: { draft: 'ドラフト', stable: '安定', deprecated: '非推奨' },
  },
  en: {
    search: 'Filter by model, attribute or description', subject: 'Subject', kind: 'Kind', status: 'Stage', all: 'All',
    type: 'Type', name: 'Name', entity: 'entity', value: 'value type', count: (n: number, all: number) => `${n} of ${all} models`,
    none: 'No model matches.', statusLabel: { draft: 'draft', stable: 'stable', deprecated: 'deprecated' },
  },
}[props.lang]

const q = ref('')
const subject = ref('')
const kind = ref('')
const status = ref('')

const unique = <T,>(values: T[]) => [...new Set(values)]
const subjects = computed(() => unique(props.models.map((m) => m.subject)).map((s) => ({ value: s, label: props.models.find((m) => m.subject === s)!.subjectTitle })))
const kinds = computed(() => unique(props.models.map((m) => m.kind)))
const statuses = computed(() => unique(props.models.map((m) => m.status)))

// Full-width letters and digits (Ｔａｓｋ) match their ASCII form.
const norm = (s: string) => s.normalize('NFKC').toLowerCase()
const shown = computed(() => {
  const terms = norm(q.value).split(/\s+/).filter(Boolean)
  return props.models.filter((m) =>
    (!subject.value || m.subject === subject.value) &&
    (!kind.value || m.kind === kind.value) &&
    (!status.value || m.status === status.value) &&
    terms.every((t) => m.text.includes(t)))
})
const badgeType = (s: Row['status']) => (s === 'stable' ? 'tip' : s === 'deprecated' ? 'danger' : 'info')
</script>

<template>
  <div class="model-index">
    <div class="filters" role="search">
      <input v-model="q" type="search" :placeholder="L.search" :aria-label="L.search" />
      <!-- A filter with a single value would filter nothing; it appears once there is a choice. -->
      <label v-if="subjects.length > 1">{{ L.subject }}
        <select v-model="subject"><option value="">{{ L.all }}</option><option v-for="s in subjects" :key="s.value" :value="s.value">{{ s.label }}</option></select>
      </label>
      <label v-if="kinds.length > 1">{{ L.kind }}
        <select v-model="kind"><option value="">{{ L.all }}</option><option v-for="k in kinds" :key="k" :value="k">{{ L[k] }}</option></select>
      </label>
      <label v-if="statuses.length > 1">{{ L.status }}
        <select v-model="status"><option value="">{{ L.all }}</option><option v-for="s in statuses" :key="s" :value="s">{{ L.statusLabel[s] }}</option></select>
      </label>
    </div>
    <p class="count" aria-live="polite">{{ L.count(shown.length, models.length) }}</p>
    <div class="table">
      <table>
        <thead><tr><th>{{ L.type }}</th><th>{{ L.name }}</th><th>{{ L.subject }}</th><th>{{ L.kind }}</th><th>{{ L.status }}</th></tr></thead>
        <tbody>
          <tr v-for="m in shown" :key="m.href">
            <td><a :href="m.href"><code>{{ m.type }}</code></a></td>
            <td>{{ m.title }}<span v-if="m.otherTitle && m.otherTitle !== m.title" class="other">{{ m.otherTitle }}</span></td>
            <td><a :href="m.subjectHref">{{ m.subjectTitle }}</a></td>
            <td>{{ L[m.kind] }}</td>
            <td><Badge :type="badgeType(m.status)" :text="L.statusLabel[m.status]" /></td>
          </tr>
          <tr v-if="!shown.length"><td colspan="5">{{ L.none }}</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.filters { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; margin: 16px 0 8px; }
.filters input { flex: 1 1 240px; min-width: 0; padding: 6px 10px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg); color: var(--vp-c-text-1); }
.filters label { display: flex; gap: 6px; align-items: center; font-size: 14px; color: var(--vp-c-text-2); }
.filters select { padding: 4px 6px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg); color: var(--vp-c-text-1); }
.count { margin: 0; font-size: 14px; color: var(--vp-c-text-2); }
.table { overflow-x: auto; }
.table table { display: table; width: 100%; margin: 8px 0 0; }
/* Short cells stay on one line; on a narrow screen the table scrolls inside .table, not the page. */
.table th, .table td:not(:nth-child(2)) { white-space: nowrap; }
.table td:nth-child(2) { min-width: 9em; }
.other { display: block; font-size: 13px; color: var(--vp-c-text-2); }
</style>
