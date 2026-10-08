---
layout: home

hero:
  # The headline carries the page; the mark and name are in the navigation (docs/brand.md).
  name: ''
  # HTML: the break and the unbreakable phrase keep 「変わらない URL で」 on one line; 「データモデル」 and the full stop (the mark's dot) are red.
  text: 日本で使える<br><span class="accent">データモデル</span>を、<span class="nowrap">変わらない URL で<span class="dot">。</span></span>
  tagline: JSON Schema・JSON-LD の @context・語彙として公開しています。JSON のままでも、Linked Data でも、どの NGSI-LD ブローカーでも使えます。
  actions:
    - theme: brand
      text: データモデル一覧
      link: /models/
    - theme: alt
      text: 使い方ガイド
      link: /guide/use
    - theme: alt
      text: 貢献する
      link: /guide/contribute

features:
  - title: 日本向け
    details: 自治体標準オープンデータセット、EEI、国土地理院の避難所データなど、すでに使っている標準があれば、対応するモデルを探せます。
    link: /models/standards/
    linkText: 対応する標準
  - title: 拡張する、複製しない
    details: Smart Data Models、NGSI-LD、schema.org の型や属性で合うものはそのまま使います。独自の属性はその上に足せます。
    link: /guide/extend
    linkText: 拡張する
  - title: 変わらない URL
    details: バージョン付きで公開した @context・JSON Schema・語彙は変更も削除もしません。リンクはずっと使えます。
    link: /guide/urls
    linkText: URL とバージョン
  - title: みんなで育てる
    details: よくある用途のモデルを、使う人と一緒に改善していきます。提案を歓迎します。
    link: /guide/contribute
    linkText: 貢献する
---
