// Word splitting for the site search (MiniSearch, VitePress local search).
// MiniSearch splits text on spaces and punctuation only, so Japanese, which
// has no spaces, became one "word" per clause, and a term inside a clause
// (滞在 in 一定期間滞在する) was never found. Parts with kanji or kana are split
// into words with Intl.Segmenter. A run of katakana stays one word, because
// the segmenter's dictionary cuts unknown loanwords into pieces (オートスケーリング
// → オー, トス, ケ, ー, リング); its pieces are added too when each has two
// characters or more (データモデル → データ, モデル), so a part of a compound is
// found. Everything else is split as before.
//
// VitePress sends this function to the browser as source text (toString), so
// it must not use anything from outside its own body. The same function
// splits the pages when the index is built and the query when a reader searches.
export function tokenize(text) {
  const words = []
  const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('ja', { granularity: 'word' }) : null
  for (const part of String(text).split(/[\n\r\p{Z}\p{P}]+/u)) {
    if (!part) continue
    if (segmenter && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(part)) {
      for (const run of part.match(/[\p{Script=Katakana}ー]+|[^\p{Script=Katakana}ー]+/gu)) {
        if (/^[\p{Script=Katakana}ー]+$/u.test(run)) {
          words.push(run)
          const pieces = [...segmenter.segment(run)].map((p) => p.segment)
          if (pieces.length > 1 && pieces.every((p) => p.length >= 2)) words.push(...pieces)
        }
        else for (const s of segmenter.segment(run)) if (s.isWordLike) words.push(s.segment)
      }
    } else {
      words.push(part)
    }
  }
  return words
}
