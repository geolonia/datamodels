---
layout: home

hero:
  name: datamodels.jp
  text: NGSI-LD データモデルカタログ
  tagline: 日本の現場で使えるデータモデルを、@context・JSON Schema・語彙として変わらない URL で提供します。既存の標準は複製せず拡張します
  actions:
    - theme: brand
      text: データモデル一覧
      link: /models/
    - theme: alt
      text: catalog.json
      link: /catalog.json
    - theme: alt
      text: GitHub
      link: https://github.com/geolonia/datamodels

features:
  - title: 拡張する、複製しない
    details: Smart Data Models の型と属性はそのまま使い、日本向けの属性や日本固有のモデルだけを追加します。やり方と貢献の仕方はガイドへ。
    link: /guide/extend
    linkText: 拡張する・貢献する
  - title: 変わらない URL
    details: 公開したバージョン付きの @context と JSON Schema は変更も削除もされません。どの URL を使うべきかはガイドへ。
    link: /guide/urls
    linkText: URL の約束
  - title: 検証済みの例、どのブローカーでも
    details: すべての例は CI で検証されます。標準の NGSI-LD API で送れるので、特定の製品は要りません。検証と送信の手順はガイドへ。
    link: /guide/use
    linkText: 使い方
  - title: 他のカタログとの関係
    details: Smart Data Models、デジタル庁の GIF や自治体標準オープンデータセットなど、世界と日本のデータモデルの一覧と、このカタログとの関係。
    link: /guide/catalogs
    linkText: 他のデータモデルカタログ
---
