// The default VitePress theme with hero text sizing (custom.css) and a
// pre-release banner above the navigation on every page. Remove the banner
// (and --vp-layout-top-height in custom.css) at the official launch.
import DefaultTheme from 'vitepress/theme'
import { defineComponent, h } from 'vue'
import { useData } from 'vitepress'
import './custom.css'

const PrereleaseBanner = defineComponent({
  setup() {
    const { lang } = useData()
    return () =>
      h('div', { class: 'prerelease-banner', role: 'note' },
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
