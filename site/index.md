---
layout: home

hero:
  # The headline carries the page; the mark and name are in the navigation (docs/brand.md).
  name: ''
  text: 日本で使えるデータモデルを、変わらない URL で。
  tagline: JSON Schema・JSON-LD の @context・語彙として公開します。NGSI-LD ならそのまま使えます。既存の標準は複製せず拡張します。
  actions:
    - theme: brand
      text: データモデル一覧
      link: /models/
    - theme: alt
      text: 使い方ガイド
      link: /guide/use
    - theme: alt
      text: catalog.json
      link: /catalog.json

features:
  - title: 拡張する、複製しない
    details: Smart Data Models、NGSI-LD、schema.org の型や属性で合うものがあれば、それを使います。合うものがなければ独自の型を公開し、その理由を記録します。やり方はガイドにあります。
    link: /guide/extend
    linkText: 拡張する
  - title: 変わらない URL
    details: 公開したバージョン付きの @context と JSON Schema は変更も削除もされません。どの URL を使うべきかはガイドにあります。
    link: /guide/urls
    linkText: URL の約束
  - title: どのシステムでも
    details: すべての例は CI で検証されます。JSON Schema で JSON を検証でき、JSON-LD で Linked Data（RDF）になり、NGSI-LD ブローカーにはそのまま送れます。特定の製品は要りません。
    link: /guide/use
    linkText: 使い方
  - title: 他のカタログとの関係
    details: Smart Data Models、デジタル庁の GIF や自治体標準オープンデータセットなど、世界と日本のデータモデルの一覧と、このカタログとの関係をまとめています。
    link: /guide/catalogs
    linkText: 他のデータモデルカタログ
---

自団体のデータが沿っている標準（自治体標準オープンデータセット、EEI、国土地理院の避難所等データなど）がわかっていれば、[対応する標準](/models/standards/)から対応するモデルを探せます。
