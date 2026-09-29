// The default VitePress theme with hero text sizing (custom.css), the
// filterable model list (ModelIndex.vue, used on /models/), the example
// playground on model pages (ExamplePlayground.vue), pan and zoom for the
// relationship graphs (GraphViewer.vue), the extension builder
// (ExtensionBuilder.vue, on /guide/builder) and a
// pre-release banner above the navigation on every page. Remove the banner
// (and --vp-layout-top-height in custom.css) at the official launch.
import DefaultTheme from 'vitepress/theme'
import { defineAsyncComponent, defineComponent, h, onMounted, onBeforeUnmount, ref } from 'vue'
import { useData } from 'vitepress'
import './custom.css'
import ModelIndex from './ModelIndex.vue'
import GraphViewer from './GraphViewer.vue'

const PrereleaseBanner = defineComponent({
  setup() {
    const { lang } = useData()
    // The text may wrap (narrow screens, larger text sizes): report the real
    // height to VitePress, which offsets the fixed navigation by this variable.
    const el = ref<HTMLElement | null>(null)
    let observer: ResizeObserver | undefined
    const publish = () => { if (el.value) document.documentElement.style.setProperty('--vp-layout-top-height', `${el.value.offsetHeight}px`) }
    onMounted(() => { publish(); observer = new ResizeObserver(publish); if (el.value) observer.observe(el.value) })
    onBeforeUnmount(() => observer?.disconnect())
    return () =>
      h('div', { ref: el, class: 'prerelease-banner', role: 'note' },
        lang.value === 'ja'
          ? 'プレリリース版です。正式公開までは、公開済みのファイルも含めて内容が変わることがあります。'
          : 'Pre-release. Until the official launch, content may change, including published files.')
  },
})

// The canonical URL and licence at the top of every page with prose, so a
// copied page still says where it came from (the licence decision in #83).
const SourceLine = defineComponent({
  setup() {
    const { page, lang } = useData()
    return () => {
      const path = page.value.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
      const url = `https://datamodels.jp/${path}`
      return h('p', { class: 'source-line' }, [
        lang.value === 'ja' ? '出典: ' : 'Source: ',
        h('a', { href: url }, url),
        lang.value === 'ja' ? ' · 文章は ' : ' · Text ',
        h('a', { href: lang.value === 'ja' ? '/LICENSE-CONTENT' : '/en/LICENSE-CONTENT' }, 'CC BY 4.0'),
      ])
    }
  },
})

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ModelIndex', ModelIndex)
    // Pan and zoom for the relationship graph on every model page.
    app.component('GraphViewer', GraphViewer)
    // Only model pages use it: its code stays out of the chunk every page loads.
    app.component('ExamplePlayground', defineAsyncComponent(() => import('./ExamplePlayground.vue')))
    // Only /guide/builder uses it: its code and model data stay out of the chunk every page loads.
    app.component('ExtensionBuilder', defineAsyncComponent(() => import('./ExtensionBuilder.vue')))
  },
  Layout() {
    return h(DefaultTheme.Layout, null, { 'layout-top': () => h(PrereleaseBanner), 'doc-before': () => h(SourceLine) })
  },
}
