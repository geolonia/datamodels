// JSON highlighting for code the site generates in the browser (the "Try it"
// editor, the extension builder), in the colours of the site's code blocks
// (--json-* in custom.css). The text may be invalid while someone types, so this
// colours tokens, it does not parse. Everything is escaped: the result is safe for v-html.
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const TOKEN = /("(?:[^"\\\n]|\\.)*"?)(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g

export function highlightJson(text: string): string {
  let out = ''; let last = 0
  for (const m of text.matchAll(TOKEN)) {
    out += esc(text.slice(last, m.index))
    if (m[1] !== undefined) out += `<span class="${m[2] ? 'key' : 'str'}">${esc(m[1])}</span>${m[2] ? esc(m[2]) : ''}`
    else out += `<span class="lit">${esc(m[0])}</span>`
    last = m.index! + m[0].length
  }
  return out + esc(text.slice(last))
}
