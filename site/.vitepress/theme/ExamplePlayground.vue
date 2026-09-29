<!--
  "Try the example" on each entity model page: edit the example in key-values
  or normalized form and see, live, whether it fits the model's JSON Schema and
  which IRI each attribute stands for. The page passes the model's data
  (scripts/lib/site.mjs). Ajv, the validator CI uses, is loaded only when the
  section comes into view; the form switch uses the same code as CI
  (scripts/lib/ngsi.mjs).
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { toKeyValues, toNormalized } from '../../../scripts/lib/ngsi.mjs'

interface Iri { iri: string; origin: 'subject' | 'other' | 'core' | 'upstream'; label: string }
const props = defineProps<{
  lang: 'ja' | 'en'; type: string
  kv: Record<string, unknown>; normalized: Record<string, unknown>; context: unknown[]
  schema: any; refs: any[]; iris: Record<string, Iri>
}>()

const DEFAULT_VOCAB = 'https://uri.etsi.org/ngsi-ld/default-context/'
const L = {
  ja: {
    hint: '書き換えると、その場で検証します。', reset: '元に戻す', loading: 'スキーマを読み込んでいます…',
    valid: (t: string) => `${t} のスキーマに合っています。`, invalid: (n: number) => `${n} 件の問題があります。`,
    syntax: 'JSON の書式エラー: ', notObject: 'エンティティは JSON のオブジェクト（{ … }）です。',
    typeMismatch: (k: string, got: string, want: string) => `${k}: ${got} になっていますが、このモデルでは ${want} です。`,
    fixFirst: '切り替える前に JSON の書式エラーを直してください。', loadFailed: 'スキーマの検証を読み込めませんでした: ',
    attribute: '属性', iri: 'IRI', origin: '出どころ', none: '属性がまだありません。',
    origins: { subject: 'このサブジェクト', core: 'NGSI-LD コア', other: (s: string) => `サブジェクト ${s}`, upstream: (h: string) => `上流（${h}）` },
    unknown: 'このモデルに無い属性。NGSI-LD の既定のコンテキストに展開され、カタログの意味は付きません。',
  },
  en: {
    hint: 'Edit it and it is checked as you type.', reset: 'Reset', loading: 'Loading the schema…',
    valid: (t: string) => `Fits the ${t} schema.`, invalid: (n: number) => `${n} problem${n === 1 ? '' : 's'}.`,
    syntax: 'JSON syntax error: ', notObject: 'An entity is a JSON object ({ … }).',
    typeMismatch: (k: string, got: string, want: string) => `${k}: this is a ${got}, the model declares ${want}.`,
    fixFirst: 'Fix the JSON syntax error before switching.', loadFailed: 'Could not load the schema check: ',
    attribute: 'Attribute', iri: 'IRI', origin: 'Defined by', none: 'No attributes yet.',
    origins: { subject: 'this subject', core: 'NGSI-LD core', other: (s: string) => `subject ${s}`, upstream: (h: string) => `upstream (${h})` },
    unknown: 'Not in this model. It expands into the NGSI-LD default context and carries no catalog meaning.',
  },
}[props.lang]

const pretty = (v: unknown) => JSON.stringify(v, null, 2)
const form = ref<'kv' | 'norm'>('kv')
const text = ref(pretty(props.kv))
const switchError = ref('')
const multi = new Set(Object.entries(props.schema.properties ?? {}).filter(([, p]: [string, any]) => p['x-ngsi']?.multi).map(([n]) => n))

// Ajv compiles the schema to code; it is loaded once the section is visible.
const validate = shallowRef<any>(null)
const loadError = ref('')
const root = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined
let loading: Promise<void> | undefined
// Loaded once: when the section comes into view, or on the first interaction
// with it (visibility events do not fire in a hidden or background page).
const load = () => (loading ??= loadValidator())
async function loadValidator() {
  try {
    const [{ default: Ajv2020 }, { default: addFormats }] = await Promise.all([import('ajv/dist/2020.js'), import('ajv-formats')])
    const ajv = new Ajv2020({ allErrors: true, strict: false })
    addFormats(ajv)
    for (const s of props.refs) ajv.addSchema(s, s.$id)
    validate.value = ajv.compile(props.schema)
  } catch (e: any) {
    // Say so instead of "loading" forever (a blocked chunk, an old browser).
    loadError.value = e?.message ?? String(e)
  }
}
onMounted(() => {
  observer = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { observer?.disconnect(); load() } })
  if (root.value) observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())

const parsed = computed<{ ok: true; value: any } | { ok: false; error: string }>(() => {
  try { return { ok: true, value: JSON.parse(text.value) } } catch (e: any) { return { ok: false, error: e.message } }
})
const isEntity = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v)

const result = computed<{ errors: string[]; pending?: boolean }>(() => {
  const p = parsed.value
  if (!p.ok) return { errors: [L.syntax + p.error] }
  if (!isEntity(p.value)) return { errors: [L.notObject] }
  const errors: string[] = []
  let kv = p.value
  if (form.value === 'norm') {
    // The same check as CI: each attribute is the NGSI-LD type the model declares.
    for (const [name, prop] of Object.entries<any>(props.schema.properties ?? {})) {
      if (name === 'id' || name === 'type' || name === '@context' || !(name in p.value)) continue
      const want = prop['x-ngsi']?.type
      for (const inst of Array.isArray(p.value[name]) ? p.value[name] : [p.value[name]]) {
        if (want && inst?.type !== want) errors.push(L.typeMismatch(name, String(inst?.type ?? typeof inst), want))
      }
    }
    try { kv = toKeyValues(p.value, { multi }) } catch (e: any) { return { errors: [...errors, e.message] } }
  }
  if (loadError.value) return { errors: [...errors, L.loadFailed + loadError.value] }
  if (!validate.value) return { errors, pending: true }
  if (!validate.value(kv)) {
    for (const e of validate.value.errors ?? []) {
      const extra = e.params?.additionalProperty ? `: ${e.params.additionalProperty}` : e.params?.allowedValues ? `: ${e.params.allowedValues.join(', ')}` : ''
      errors.push(`${e.instancePath || '/'} ${e.message}${extra}`)
    }
  }
  return { errors }
})

const attributes = computed(() => {
  const p = parsed.value
  if (!p.ok || !isEntity(p.value)) return []
  return Object.keys(p.value).filter((k) => k !== '@context' && k !== 'id' && k !== 'type').map((name) => {
    const known = props.iris[name]
    if (!known) return { name, iri: DEFAULT_VOCAB + name, label: L.unknown, unknown: true }
    const label = known.origin === 'other' ? L.origins.other(known.label) : known.origin === 'upstream' ? L.origins.upstream(known.label) : L.origins[known.origin]
    return { name, iri: known.iri, label, unknown: false }
  })
})

function switchTo(to: 'kv' | 'norm') {
  switchError.value = ''
  if (to === form.value) return
  const p = parsed.value
  if (!p.ok) { switchError.value = L.fixFirst; return }
  try {
    text.value = pretty(to === 'norm' ? toNormalized(p.value, props.schema, props.context) : toKeyValues(p.value, { multi }))
    form.value = to
  } catch (e: any) { switchError.value = e.message }
}
function reset() {
  switchError.value = ''
  text.value = pretty(form.value === 'kv' ? props.kv : props.normalized)
}
const rows = computed(() => Math.min(30, Math.max(10, text.value.split('\n').length + 1)))
</script>

<template>
  <div ref="root" class="example-playground" @focusin="load" @pointerdown="load">
    <div class="bar">
      <div class="forms" role="radiogroup" aria-label="NGSI-LD">
        <button type="button" role="radio" :aria-checked="form === 'kv'" :class="{ on: form === 'kv' }" @click="switchTo('kv')">key-values</button>
        <button type="button" role="radio" :aria-checked="form === 'norm'" :class="{ on: form === 'norm' }" @click="switchTo('norm')">normalized</button>
      </div>
      <button type="button" class="reset" @click="reset">{{ L.reset }}</button>
    </div>
    <p class="hint">{{ L.hint }}</p>
    <textarea v-model="text" :rows="rows" spellcheck="false" autocapitalize="off" autocomplete="off" :aria-label="`${type} (${form === 'kv' ? 'key-values' : 'normalized'})`" aria-describedby="playground-status" />
    <div id="playground-status" class="status" :class="result.errors.length ? 'bad' : result.pending ? 'wait' : 'good'" aria-live="polite">
      <p v-if="switchError">{{ switchError }}</p>
      <template v-if="result.errors.length">
        <p>{{ L.invalid(result.errors.length) }}</p>
        <ul><li v-for="(e, i) in result.errors" :key="i"><code>{{ e }}</code></li></ul>
      </template>
      <p v-else-if="result.pending">{{ L.loading }}</p>
      <p v-else>{{ L.valid(type) }}</p>
    </div>
    <div class="table">
      <table>
        <thead><tr><th>{{ L.attribute }}</th><th>{{ L.iri }}</th><th>{{ L.origin }}</th></tr></thead>
        <tbody>
          <tr v-for="a in attributes" :key="a.name" :class="{ unknown: a.unknown }">
            <td><code>{{ a.name }}</code></td><td><code>{{ a.iri }}</code></td><td>{{ a.label }}</td>
          </tr>
          <tr v-if="!attributes.length"><td colspan="3">{{ L.none }}</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.bar { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
.forms { display: inline-flex; border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; }
.forms button { padding: 4px 12px; font-size: 14px; font-family: var(--vp-font-family-mono); color: var(--vp-c-text-2); background: var(--vp-c-bg); }
.forms button.on { color: var(--vp-c-text-1); background: var(--vp-c-default-soft); font-weight: 600; }
.reset { padding: 4px 12px; font-size: 14px; border: 1px solid var(--vp-c-divider); border-radius: 8px; color: var(--vp-c-text-2); }
.reset:hover, .forms button:hover { color: var(--vp-c-brand-1); }
.hint { margin: 8px 0 4px; font-size: 14px; color: var(--vp-c-text-2); }
textarea { display: block; width: 100%; padding: 12px; font-family: var(--vp-font-family-mono); font-size: 13px; line-height: 1.5; color: var(--vp-c-text-1); background: var(--vp-c-bg-alt); border: 1px solid var(--vp-c-divider); border-radius: 8px; resize: vertical; tab-size: 2; }
textarea:focus { outline: 2px solid var(--vp-c-brand-1); outline-offset: -1px; }
.status { margin: 8px 0; padding: 8px 12px; border-radius: 8px; font-size: 14px; }
.status p { margin: 0; }
.status ul { margin: 4px 0 0; padding-left: 20px; }
.status.good { background: var(--vp-c-tip-soft); color: var(--vp-c-tip-1); }
.status.bad { background: var(--vp-c-danger-soft); color: var(--vp-c-danger-1); }
.status.wait { background: var(--vp-c-default-soft); color: var(--vp-c-text-2); }
.table { overflow-x: auto; }
.table table { display: table; width: 100%; margin: 8px 0 0; }
.table td:nth-child(2) { word-break: break-all; }
tr.unknown td { color: var(--vp-c-warning-1); }
</style>
