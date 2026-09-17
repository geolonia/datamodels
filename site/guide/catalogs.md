---
title: 他のデータモデルカタログ
description: 世界と日本で使われているデータモデル・語彙のカタログ。このカタログが拡張・参照する上流
---

# 他のデータモデルカタログ

このカタログは、他所にあるものを複製せず、参照して拡張します。ここでは、その「他所」をまとめます。NGSI-LD でそのまま使えるものと、対応付けが必要なものがあります。

## 世界

| カタログ | 内容 | NGSI-LD |
|---|---|---|
| [Smart Data Models](https://smartdatamodels.org/) | FIWARE・TM Forum・IUDX・OASC が運営。スマートシティ、農業、エネルギーなど 900 以上のモデル。JSON Schema、`@context`、例、多言語仕様（日本語は機械翻訳） | そのまま使える。このカタログの上流 |
| [ETSI NGSI-LD core context](https://uri.etsi.org/ngsi-ld/v1/) | NGSI-LD の予約語（`location`, `observedAt`, `status` など）。バージョン付きで不変 | 常に暗黙に適用される |
| [schema.org](https://schema.org/) | Web 全般の語彙。住所（PostalAddress）、組織、イベントなど | 属性の IRI として再利用（Smart Data Models も同様） |
| [SAREF](https://saref.etsi.org/) | ETSI のスマート機器・エネルギー・建物のオントロジー | NGSI-LD と組み合わせて使われる |
| [W3C SOSA/SSN](https://www.w3.org/TR/vocab-ssn/) | センサー・観測のオントロジー | 観測系モデルの参照元 |
| [DTDL (Azure Digital Twins)](https://github.com/Azure/opendigitaltwins-dtdl) | Microsoft のデジタルツイン定義言語。Smart Data Models は DTDL 版も生成 | 変換が必要 |
| [GBFS](https://gbfs.org/) | シェアサイクルのフィード仕様 | Smart Data Models に NGSI-LD 版あり |

## 日本

| カタログ | 内容 | NGSI-LD |
|---|---|---|
| [デジタル庁 GIF（政府相互運用性フレームワーク）](https://www.digital.go.jp/policies/data_strategy_government_interoperability_framework) | コアデータモデル（個人、法人、住所、施設、建物 など）と分野別の実装データモデル。XSD と Excel で公開。[GitHub](https://github.com/JDA-DM/GIF) | 対応付けが必要。[JapaneseAddress](/models/common/JapaneseAddress/) は GIF の住所に対応 |
| [推奨データセット](https://www.digital.go.jp/resources/data_dataset/) | 自治体オープンデータの標準フォーマット（避難所、AED、公共施設、イベント など）。CSV の項目定義書 | 対応付けが必要。このカタログで NGSI-LD 版を提供していく予定 |
| [アドレス・ベース・レジストリ](https://www.digital.go.jp/policies/base_registry_address) | 町字ID を含む住所の基盤データ | JapaneseAddress の `abrMachiazaId` が参照 |
| [IMI 共通語彙基盤](https://imi.go.jp/) | 行政データの語彙（コア語彙）。GIF の前身 | 語彙の参照元 |
| [PLATEAU（3D 都市モデル）](https://www.mlit.go.jp/plateau/) | 国土交通省。CityGML と i-UR による建物・都市設備のモデル | 変換が必要 |
| [空間ID（ZFXY）](https://www.ipa.go.jp/digital/architecture/project/autonomous-mobile-robot/3d-spatial-information.html) | デジタル庁・IPA。3 次元空間の共通 ID | GeonicDB がネイティブ対応 |
| [国土数値情報](https://nlftp.mlit.go.jp/ksj/) | 国土交通省。行政区域、施設、土地利用などの GIS データ | 変換が必要 |

## Smart Data Models にあるモデルを探すには

Smart Data Models のサイトの [検索](https://smartdatamodels.org/index.php/list-of-data-models-3/) か、GitHub の [smart-data-models](https://github.com/smart-data-models) 組織で `dataModel.<Subject>` リポジトリを探してください。GeonicDB の MCP ツール `data_models` でも一覧と検索ができます。

見つかったモデルを日本向けに拡張したい場合は [拡張する・貢献する](/guide/extend) を、このカタログに載せてほしい場合は [Issue](https://github.com/geolonia/geonicdb-models/issues) を開いてください。
