<script setup lang="ts">
// Pan and zoom for a relationship graph (scripts/lib/graph.mjs), which is
// wider than the page column as soon as a model has a few neighbours. The
// graph comes in the slot: an SVG with HTML anchors laid over it, so moving
// and scaling one element keeps the links on their nodes. Without JavaScript
// (and before hydration) the graph scrolls sideways as before.
//
// Drag (mouse, pen, one finger sideways) pans; pinch, or Ctrl/⌘ + wheel,
// zooms at the pointer; a trackpad's sideways swipe pans; a plain vertical
// wheel still scrolls the page. The buttons zoom, fit the column and show
// 100 %. A drag never counts as a click on a node.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{ width: number; height: number }>()
const { lang } = useData()
const t = computed(() => lang.value === 'ja'
  ? { label: '型と関係の図の表示', zoomIn: '拡大', zoomOut: '縮小', fit: '全体を表示', actual: '100%', hint: 'ドラッグで移動、ピンチまたは Ctrl/⌘ + スクロールで拡大・縮小' }
  : { label: 'Graph view', zoomIn: 'Zoom in', zoomOut: 'Zoom out', fit: 'Fit to width', actual: '100%', hint: 'Drag to move; pinch or Ctrl/⌘ + scroll to zoom' })

const MAX = 2
const viewport = ref<HTMLElement | null>(null)
const ready = ref(false)
const vw = ref(0)
const scale = ref(1)
const tx = ref(0)
const ty = ref(0)
// Until the reader zooms or pans, the graph follows the column width.
let touched = false

const fitScale = computed(() => (vw.value ? Math.min(1, vw.value / props.width) : 1))
const min = computed(() => Math.min(fitScale.value, 1))
// The viewport is as tall as the graph at its fitted size, but not so flat that a very wide graph becomes a strip.
const vh = computed(() => Math.round(Math.max(props.height * fitScale.value, Math.min(props.height, 200))))
const zoomable = computed(() => props.width > vw.value + 1)
const percent = computed(() => `${Math.round(scale.value * 100)}%`)

// Keep the graph in view: at the left edge (as the page's text) or vertically centred where it is smaller than the viewport, else no gap at either edge.
function clamp() {
  const w = props.width * scale.value, h = props.height * scale.value
  tx.value = w <= vw.value ? 0 : Math.min(0, Math.max(vw.value - w, tx.value))
  ty.value = h <= vh.value ? (vh.value - h) / 2 : Math.min(0, Math.max(vh.value - h, ty.value))
}
function zoomAt(next: number, cx = vw.value / 2, cy = vh.value / 2) {
  const s = Math.min(MAX, Math.max(min.value, next))
  tx.value = cx - ((cx - tx.value) * s) / scale.value
  ty.value = cy - ((cy - ty.value) * s) / scale.value
  scale.value = s
  clamp()
}
function fit() { touched = false; scale.value = fitScale.value; tx.value = 0; ty.value = 0; clamp() }
function actual() { touched = true; zoomAt(1) }
function step(f: number) { touched = true; zoomAt(scale.value * f) }

// Pointers: one pans, two pinch. A pointer that moved more than a few pixels turns its click off.
const pointers = new Map<number, { x: number; y: number }>()
let dragged = false
let pinch: { d: number; s: number } | null = null
const local = (e: { clientX: number; clientY: number }) => { const r = viewport.value!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
function down(e: PointerEvent) {
  if (e.button !== 0 || !zoomable.value) return
  pointers.set(e.pointerId, local(e))
  if (pointers.size === 1) dragged = false
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: scale.value } }
}
function move(e: PointerEvent) {
  const prev = pointers.get(e.pointerId)
  if (!prev) return
  const p = local(e)
  pointers.set(e.pointerId, p)
  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    touched = dragged = true
    zoomAt(pinch.s * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d), (a.x + b.x) / 2, (a.y + b.y) / 2)
    return
  }
  if (!dragged && Math.hypot(p.x - prev.x, p.y - prev.y) < 4 && pointers.size === 1) { pointers.set(e.pointerId, prev); return }
  if (!dragged) { dragged = true; viewport.value?.setPointerCapture(e.pointerId) }
  touched = true
  tx.value += p.x - prev.x
  ty.value += p.y - prev.y
  clamp()
}
function up(e: PointerEvent) {
  pointers.delete(e.pointerId)
  if (pointers.size < 2) pinch = null
}
function click(e: MouseEvent) { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false } }
function wheel(e: WheelEvent) {
  if (!zoomable.value) return
  const p = local(e)
  if (e.ctrlKey || e.metaKey) { e.preventDefault(); touched = true; zoomAt(scale.value * Math.exp(-e.deltaY * 0.01), p.x, p.y); return }
  // A sideways swipe pans; a vertical wheel is left to the page.
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); touched = true; tx.value -= e.deltaX; clamp() }
}
// A node reached with Tab is brought into view (the viewport itself never scrolls).
function focusin(e: FocusEvent) {
  const a = e.target as HTMLElement
  const v = viewport.value
  if (!v || !a.style.left) return
  v.scrollLeft = 0; v.scrollTop = 0
  const x = parseFloat(a.style.left) * scale.value + tx.value, y = parseFloat(a.style.top) * scale.value + ty.value
  const w = a.offsetWidth * scale.value, h = a.offsetHeight * scale.value
  if (x < 0) tx.value -= x - 8; else if (x + w > vw.value) tx.value -= x + w - vw.value + 8
  if (y < 0) ty.value -= y - 8; else if (y + h > vh.value) ty.value -= y + h - vh.value + 8
  clamp()
}

let observer: ResizeObserver | undefined
onMounted(() => {
  const measure = () => { vw.value = viewport.value?.clientWidth ?? 0; if (!touched) fit(); else { scale.value = Math.max(scale.value, min.value); clamp() } }
  measure()
  ready.value = true
  observer = new ResizeObserver(measure)
  if (viewport.value) observer.observe(viewport.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="graph-viewer" :class="{ ready, zoomable: ready && zoomable }" role="group" :aria-label="t.label">
    <div
      ref="viewport"
      class="viewport"
      :style="ready ? { height: `${vh}px` } : undefined"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="up"
      @click.capture="click"
      @wheel="wheel"
      @focusin="focusin"
    >
      <div class="stage" :style="ready ? { transform: `translate(${tx}px, ${ty}px) scale(${scale})` } : undefined"><slot /></div>
    </div>
    <div v-if="ready && zoomable" class="controls">
      <button type="button" :aria-label="t.zoomOut" :title="t.zoomOut" :disabled="scale <= min + 0.001" @click="step(1 / 1.25)">−</button>
      <span class="percent" aria-live="polite">{{ percent }}</span>
      <button type="button" :aria-label="t.zoomIn" :title="t.zoomIn" :disabled="scale >= MAX - 0.001" @click="step(1.25)">+</button>
      <button type="button" @click="fit">{{ t.fit }}</button>
      <button type="button" @click="actual">{{ t.actual }}</button>
      <span class="hint">{{ t.hint }}</span>
    </div>
  </div>
</template>

<style scoped>
.graph-viewer { margin: 16px 0 4px; }
.graph-viewer :deep(.model-graph) { margin: 0; }
.graph-viewer.ready .viewport { overflow: hidden; position: relative; }
.graph-viewer.zoomable .viewport { cursor: grab; touch-action: pan-y; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg); }
.graph-viewer.zoomable .viewport:active { cursor: grabbing; }
/* The stage is moved, not the scroll position; the graph's own sideways scroll is off. */
.graph-viewer.ready .stage { transform-origin: 0 0; width: max-content; will-change: transform; }
.graph-viewer.ready :deep(.model-graph) { overflow: visible; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 6px; font-size: 13px; color: var(--vp-c-text-2); }
.controls button { min-width: 28px; height: 28px; padding: 0 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); font-size: 13px; }
.controls button:hover:not(:disabled) { border-color: var(--vp-c-brand-1); }
.controls button:disabled { opacity: 0.4; cursor: default; }
.controls button:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 1px; }
.percent { min-width: 3.2em; text-align: center; font-variant-numeric: tabular-nums; }
.hint { margin-left: 4px; color: var(--vp-c-text-3); }
</style>
