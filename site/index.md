---
layout: home

hero:
  name: GeonicDB Data Models
  text: NGSI-LD データモデルカタログ
  tagline: Smart Data Models を日本向けに拡張し、@context と JSON Schema を安定した URL で提供します
  actions:
    - theme: brand
      text: データモデル一覧
      link: /models/
    - theme: alt
      text: catalog.json
      link: /catalog.json
    - theme: alt
      text: GitHub
      link: https://github.com/geolonia/geonicdb-models

features:
  - icon: 🔗
    title: 拡張する、複製しない
    details: Smart Data Models の型と属性はそのまま使い、日本向けの属性や日本固有のモデルだけを追加します。
  - icon: 🔒
    title: 変わらない URL
    details: 公開したバージョン付きの @context と JSON Schema は変更も削除もされません。破壊的変更は新しいバージョンになります。
  - icon: 🗂️
    title: GeonicDB でそのまま使える
    details: 各モデルの Custom Data Model 定義を配信しています。POST するだけで GeonicDB に登録できます。
---
