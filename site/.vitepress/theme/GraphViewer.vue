<script setup lang="ts">
// The relationship graph of a model page (scripts/lib/graph.mjs) as a card
// under the page's own heading: zoom on top, the graph, then the legend and a
// download button. `title` (the model) names the download.
// The graph comes in the slot: an SVG with HTML anchors laid over it, so moving
// and scaling one element keeps the links on their nodes. Panning, pinching
// and zooming at a point are @panzoom/panzoom's; this component fits the graph
// to the column, adds the controls and keeps a drag from opening a node.
// Without JavaScript (and before hydration) the graph scrolls sideways as before.
//
// Drag, or one finger on the graph, pans; pinch, or Ctrl/⌘ + wheel, zooms at
// the pointer; a trackpad's sideways swipe pans; a plain vertical wheel still
// scrolls the page. A graph that fits the column gets no zoom.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import type { PanzoomObject } from '@panzoom/panzoom'

const props = defineProps<{ width: number; height: number; title?: string }>()
const { lang } = useData()
const t = computed(() => lang.value === 'ja'
  ? { label: '型と関係の図', hint: 'ドラッグで移動、ピンチまたは Ctrl/⌘ + スクロールで拡大・縮小', zoomIn: '拡大', zoomOut: '縮小', full: '全画面で表示', exitFull: '全画面を終了', actual: '100% で表示', download: 'SVG でダウンロード' }
  : { label: 'Types and relationships', hint: 'Drag to move; pinch or Ctrl/⌘ + scroll to zoom', zoomIn: 'Zoom in', zoomOut: 'Zoom out', full: 'Full screen', exitFull: 'Exit full screen', actual: 'Show at 100%', download: 'Download as SVG' })

const MAX = 2
const viewport = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const ready = ref(false)
const vw = ref(0)
const scale = ref(1)

// Full screen: the card fills the screen (the Fullscreen API where the browser has it for any element,
// otherwise the window), the graph fits both its width and height and can always be zoomed.
const full = ref(false)
const fullHeight = ref(0)
const zoomable = computed(() => ready.value && (full.value || props.width > vw.value + 1))
const fit = computed(() => {
  if (!vw.value) return 1
  if (full.value && fullHeight.value) return Math.min(1, vw.value / props.width, fullHeight.value / props.height)
  return Math.min(1, vw.value / props.width)
})
// The viewport is as tall as the graph at its fitted size, but not so flat that a very wide graph becomes a strip;
// in full screen it takes the height left by the toolbar and the legend.
const vh = computed(() => full.value && fullHeight.value ? fullHeight.value : Math.round(Math.max(props.height * fit.value, Math.min(props.height, 200))))
// The stage has the viewport's proportions at the fitted scale (the graph centred in it), so containment
// ('outside': no gap at any edge) holds from the fitted view up to the largest zoom.
const stageWidth = computed(() => Math.max(props.width, vw.value / fit.value))
const stageHeight = computed(() => vh.value / fit.value)
const percent = computed(() => `${Math.round(scale.value * 100)}%`)

let pz: PanzoomObject | null = null
let touched = false
const options = () => ({ minScale: fit.value, maxScale: MAX, contain: 'outside' as const, step: 0.25, cursor: 'grab' })
// Panzoom measures the element to contain it and applies the transform on the next frame, so a second
// zoom in the same frame measures the old transform with the new scale and misplaces the graph (as do
// its startScale and reset(), which set the scale before measuring). Zooms made here wait for the
// previous one to be applied. At the fitted scale the stage covers the viewport exactly, so
// containment leaves one position: fitting is a zoom to that scale.
// Panzoom applies it in a frame callback, so two frames later it is in place (in a background tab
// frames wait until the tab is shown, and so does the queue).
let queue: Promise<unknown> = Promise.resolve()
const applied = (fn: () => void) => new Promise<void>((resolve) => {
  fn()
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
})
const run = (fn: () => void) => { queue = queue.then(() => applied(fn)); return queue }

async function setup() {
  // resetStyle() gives the viewport and stage back their styles, touch-action among them, so the page scrolls again.
  if (!zoomable.value) { pz?.resetStyle(); pz?.destroy(); pz = null; stage.value?.style.removeProperty('transform'); scale.value = 1; return }
  if (!pz) {
    const { default: Panzoom } = await import('@panzoom/panzoom')
    // The width may have changed while the library loaded: the latest call fits to it.
    if (!stage.value || !zoomable.value) return
    if (!pz) {
      pz = Panzoom(stage.value, options())
      stage.value.addEventListener('panzoomchange', (e) => { scale.value = (e as CustomEvent).detail.scale })
      // Panzoom pans to its start position in a timeout after creation; the first fit comes after it.
      queue = queue.then(() => applied(() => {})).then(() => new Promise((r) => setTimeout(r))).then(() => applied(() => {}))
    }
  }
  pz.setOptions(options())
  await run(() => pz?.zoom(touched ? Math.max(pz.getScale(), fit.value) : fit.value, { animate: false }))
}

function zoomIn() { touched = true; run(() => pz?.zoomIn()) }
function zoomOut() { touched = true; run(() => pz?.zoomOut()) }
const root = ref<HTMLElement | null>(null)
const fsElement = () => document.fullscreenElement ?? (document as any).webkitFullscreenElement
async function toggleFull() {
  touched = false
  if (full.value) {
    if (fsElement()) await (document.exitFullscreen?.() ?? (document as any).webkitExitFullscreen?.())
    full.value = false
    return
  }
  full.value = true
  const el = root.value as any
  // No element full screen (iPhone): the card covers the window instead (CSS .full).
  try { await (el?.requestFullscreen?.() ?? el?.webkitRequestFullscreen?.()) } catch {}
}
// Leaving the browser's full screen (Esc) ends ours; without the API, Esc ends the window cover.
const onFsChange = () => { if (!fsElement() && full.value) { full.value = false; touched = false } }
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && full.value && !fsElement()) { full.value = false; touched = false } }
function actual() { touched = true; run(() => pz?.zoom(1, { animate: true })) }
// Wheel zooms go through the queue too. A trackpad pinch sends many events a frame, so they add up
// while a zoom is pending and are applied as one, at the latest pointer position.
let wheelZoom: { dy: number; clientX: number; clientY: number } | null = null
function wheel(e: WheelEvent) {
  if (!pz) return
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    touched = true
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
    if (wheelZoom) { wheelZoom.dy += dy; wheelZoom.clientX = e.clientX; wheelZoom.clientY = e.clientY; return }
    wheelZoom = { dy, clientX: e.clientX, clientY: e.clientY }
    run(() => {
      const w = wheelZoom!
      wheelZoom = null
      pz?.zoomToPoint(Math.min(MAX, Math.max(fit.value, pz.getScale() * Math.exp(-w.dy * 0.01))), w, { animate: false })
    })
    return
  }
  // A sideways swipe pans; a vertical wheel is left to the page.
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); touched = true; pz.pan(-e.deltaX / pz.getScale(), 0, { relative: true }) }
}

// A drag must not open the node it started on: a click after the pointer moved is dropped.
let start: { x: number; y: number } | null = null
function down(e: PointerEvent) { start = { x: e.clientX, y: e.clientY }; if (pz) touched = true }
function click(e: MouseEvent) {
  if (pz && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 4) { e.preventDefault(); e.stopPropagation() }
  start = null
}
// A node reached with Tab is brought into view (the viewport itself never scrolls).
function focusin(e: FocusEvent) {
  const a = e.target as HTMLElement
  const v = viewport.value
  if (!pz || !v || !(a instanceof HTMLAnchorElement)) return
  v.scrollLeft = 0; v.scrollTop = 0
  const r = a.getBoundingClientRect(), box = v.getBoundingClientRect()
  let dx = 0, dy = 0
  if (r.left < box.left) dx = box.left - r.left + 8; else if (r.right > box.right) dx = box.right - r.right - 8
  if (r.top < box.top) dy = box.top - r.top + 8; else if (r.bottom > box.bottom) dy = box.bottom - r.bottom - 8
  if (dx || dy) { touched = true; run(() => pz?.pan(dx / pz.getScale(), dy / pz.getScale(), { relative: true })) }
}

// The graph as a standalone SVG: the theme's colours and fonts written into each element (they come
// from the site's CSS), on the page's background, named after the model.
const STYLE = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor']
function download() {
  const svg = viewport.value?.querySelector('svg')
  if (!svg) return
  const copy = svg.cloneNode(true) as SVGSVGElement
  const from = [svg, ...svg.querySelectorAll('*')], to = [copy, ...copy.querySelectorAll('*')]
  from.forEach((el, i) => {
    const cs = getComputedStyle(el), target = to[i] as SVGElement
    target.removeAttribute('class')
    target.setAttribute('style', STYLE.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';'))
  })
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', getComputedStyle(document.body).backgroundColor)
  copy.insertBefore(bg, copy.querySelector('defs')?.nextSibling ?? copy.firstChild)
  const url = URL.createObjectURL(new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(copy)}`], { type: 'image/svg+xml' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `${props.title ?? 'graph'}-relationships.svg` })
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

let observer: ResizeObserver | undefined
onMounted(() => {
  vw.value = viewport.value?.clientWidth ?? 0
  ready.value = true
  observer = new ResizeObserver(() => {
    vw.value = viewport.value?.clientWidth ?? 0
    // In full screen the viewport is sized by the card (flex); measure the height it gets.
    if (full.value) fullHeight.value = viewport.value?.clientHeight ?? 0
  })
  if (viewport.value) observer.observe(viewport.value)
  document.addEventListener('fullscreenchange', onFsChange)
  document.addEventListener('webkitfullscreenchange', onFsChange)
  document.addEventListener('keydown', onKey)
})
watch(full, () => { if (!full.value) fullHeight.value = 0 })
// After the stage has its size for the new width (or the full screen's size).
watch([vw, vh, ready, full], setup, { flush: 'post' })
onBeforeUnmount(() => {
  observer?.disconnect(); pz?.destroy()
  document.removeEventListener('fullscreenchange', onFsChange)
  document.removeEventListener('webkitfullscreenchange', onFsChange)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <figure ref="root" class="graph-viewer" :class="{ ready, zoomable, full }" :aria-label="t.label">
    <div v-if="ready" class="head">
      <div class="zoom" role="group" :title="t.hint">
        <template v-if="zoomable">
        <button type="button" class="icon" :aria-label="t.zoomOut" :title="t.zoomOut" :disabled="scale <= fit + 0.001" @click="zoomOut">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>
        </button>
        <button type="button" class="percent" :aria-label="t.actual" :title="t.actual" @click="actual">{{ percent }}</button>
        <button type="button" class="icon" :aria-label="t.zoomIn" :title="t.zoomIn" :disabled="scale >= MAX - 0.001" @click="zoomIn">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3v10" /></svg>
        </button>
        </template>
        <button type="button" class="icon" :aria-label="full ? t.exitFull : t.full" :title="full ? t.exitFull : t.full" :aria-pressed="full" @click="toggleFull">
          <svg v-if="!full" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" /></svg>
          <svg v-else viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4" /></svg>
        </button>
      </div>
    </div>
    <div
      ref="viewport"
      class="viewport"
      :style="zoomable && !full ? { height: `${vh}px` } : undefined"
      @pointerdown.capture="down"
      @click.capture="click"
      @wheel="wheel"
      @focusin="focusin"
    >
      <div ref="stage" class="stage" :style="zoomable ? { width: `${stageWidth}px`, height: `${stageHeight}px` } : undefined"><slot /></div>
    </div>
    <div class="foot">
      <slot name="legend" />
      <button v-if="ready" type="button" class="icon download" :aria-label="t.download" :title="t.download" @click="download">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 11v2.5h11V11" /></svg>
      </button>
    </div>
  </figure>
</template>

<style scoped>
.graph-viewer { margin: 16px 0; padding: 14px 16px 12px; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg); }
.head { display: flex; justify-content: flex-end; margin: -6px -6px 6px 0; }
.zoom { display: flex; align-items: center; gap: 2px; flex: none; }
.foot { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: 10px; }
.foot :deep(.model-graph-legend) { margin: 0; }
button { display: inline-flex; align-items: center; justify-content: center; height: 30px; border: 0; border-radius: 6px; background: none; color: var(--vp-c-text-2); font-size: 13px; }
button:hover:not(:disabled) { background: var(--vp-c-default-soft); color: var(--vp-c-text-1); }
button:disabled { opacity: 0.35; cursor: default; }
button:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 1px; }
.icon { width: 30px; }
.icon svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.percent { min-width: 3.6em; padding: 0 4px; font-variant-numeric: tabular-nums; color: var(--vp-c-text-1); }
.download { flex: none; border: 1px solid var(--vp-c-divider); }
.graph-viewer :deep(.model-graph) { margin: 0; }
.graph-viewer.zoomable .viewport { overflow: hidden; position: relative; border-radius: 6px; }
/* The stage is moved, not the scroll position; the graph's own sideways scroll is off. */
.graph-viewer.zoomable .stage { display: flex; align-items: center; justify-content: center; }
/* Full screen: the card fills the screen, the graph takes what the toolbar and the legend leave. */
.graph-viewer.full { position: fixed; inset: 0; z-index: 200; margin: 0; border-radius: 0; display: flex; flex-direction: column; }
.graph-viewer.full .viewport { flex: 1; min-height: 0; }
.graph-viewer:fullscreen { background: var(--vp-c-bg); }
.graph-viewer.zoomable :deep(.model-graph) { overflow: visible; }
</style>
