// The default VitePress theme with hero text sizing (custom.css) and a
// pre-release banner above the navigation on every page. Remove the banner
// (and --vp-layout-top-height in custom.css) at the official launch.
import DefaultTheme from 'vitepress/theme'
import { defineComponent, h, onMounted, onBeforeUnmount, ref } from 'vue'
import { useData } from 'vitepress'
import './custom.css'

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

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, { 'layout-top': () => h(PrereleaseBanner) })
  },
}
