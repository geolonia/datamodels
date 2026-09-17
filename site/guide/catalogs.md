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
| [ETSI NGSI-LD 仕様（GS CIM 009 V1.8.1）](https://www.etsi.org/deliver/etsi_gs/CIM/001_099/009/01.08.01_60/gs_cim009v010801p.pdf) | NGSI-LD API の仕様書（PDF）。予約語（`location`, `observedAt`, `status` など）を定める core context は [uri.etsi.org](https://uri.etsi.org/ngsi-ld/v1/) にバージョン付きで公開 | 常に暗黙に適用される |
| [schema.org](https://schema.org/) | Web 全般の語彙。住所（PostalAddress）、組織、イベントなど | 属性の IRI として再利用（Smart Data Models も同様） |
| [SAREF](https://saref.etsi.org/) | ETSI のスマート機器・エネルギー・建物のオントロジー | NGSI-LD と組み合わせて使われる |
| [W3C SOSA/SSN](https://www.w3.org/TR/vocab-ssn/) | センサー・観測のオントロジー | 観測系モデルの参照元 |

## 日本

| カタログ | 内容 | NGSI-LD |
|---|---|---|
| [デジタル庁 GIF（政府相互運用性フレームワーク）](https://www.digital.go.jp/policies/data_strategy_government_interoperability_framework) | コアデータモデル（個人、法人、住所、施設、建物 など）と分野別の実装データモデル。XSD と Excel で公開。[GitHub](https://github.com/JDA-DM/GIF) | 対応付けが必要。[JapaneseAddress](/models/common/JapaneseAddress/) は GIF の住所に対応 |
| [推奨データセット](https://www.digital.go.jp/resources/data_dataset/) | 自治体オープンデータの標準フォーマット（避難所、AED、公共施設、イベント など）。CSV の項目定義書 | 対応付けが必要。このカタログで NGSI-LD 版を提供していく予定 |
| [アドレス・ベース・レジストリ](https://www.digital.go.jp/policies/base_registry_address) | 町字ID を含む住所の基盤データ | JapaneseAddress の `abrMachiazaId` が参照 |
| [空間ID（4次元時空間情報利活用のための空間IDガイドライン）](https://www.ipa.go.jp/digital/architecture/guidelines/4dspatio-temporal-guideline.html) | 経産省・国交省・国土地理院・NEDO・IPA。3 次元空間の共通 ID とその運用指針 | GeonicDB がネイティブ対応 |

## Smart Data Models にあるモデルを探すには

Smart Data Models のサイトの [検索](https://smartdatamodels.org/index.php/list-of-data-models-3/) か、GitHub の [smart-data-models](https://github.com/smart-data-models) 組織で `dataModel.<Subject>` リポジトリを探してください。GeonicDB の MCP ツール `data_models` でも一覧と検索ができます。

見つかったモデルを日本向けに拡張したい場合は [拡張する・貢献する](/guide/extend) を、このカタログに載せてほしい場合は [Issue](https://github.com/geolonia/geonicdb-models/issues) を開いてください。
