---
title: 他のデータモデルカタログ
description: 世界と日本で使われているデータモデル・語彙のカタログ。このカタログが拡張・参照する上流
---

# 他のデータモデルカタログ

このカタログは、他所にあるものを複製せず、参照して拡張します。ここでは、その「他所」をまとめます。NGSI-LD でそのまま使えるものと、対応付けが必要なものがあります。

## 世界

| カタログ | 内容 | NGSI-LD での使い方 |
|---|---|---|
| [Smart Data Models](https://smartdatamodels.org/) | FIWARE・TM Forum・IUDX・OASC が運営。スマートシティ、農業、エネルギーなど 900 以上のモデル。JSON Schema、`@context`、例、多言語仕様（日本語は機械翻訳） | そのまま使える。このカタログの上流 |
| [ETSI NGSI-LD 仕様（GS CIM 009 V1.8.1）](https://www.etsi.org/deliver/etsi_gs/CIM/001_099/009/01.08.01_60/gs_cim009v010801p.pdf) | NGSI-LD API の仕様書（PDF）。予約語（`location`, `observedAt`, `status` など）を定める core context は [uri.etsi.org](https://uri.etsi.org/ngsi-ld/v1/) にバージョン付きで公開 | 常に暗黙に適用される |
| [schema.org](https://schema.org/) | Web 全般の語彙。住所（PostalAddress）、組織、イベントなど | 属性の IRI として再利用（Smart Data Models も同様） |
| [SAREF](https://saref.etsi.org/) | ETSI のスマート機器・エネルギー・建物のオントロジー | NGSI-LD と組み合わせて使われる |
| [W3C SOSA/SSN](https://www.w3.org/TR/vocab-ssn/) | センサー・観測のオントロジー | 観測系モデルの参照元 |

## 日本

どの標準にどのモデルが対応するかは[対応している標準](/guide/standards)にあります。

| カタログ | 内容 | NGSI-LD での使い方 |
|---|---|---|
| [デジタル庁 GIF（政府相互運用性フレームワーク）](https://www.digital.go.jp/policies/data_strategy_government_interoperability_framework) | コアデータモデル（個人、法人、住所、施設、建物 など）と分野別の実装データモデル。XSD と Excel で公開。[GitHub](https://github.com/JDA-DM/GIF) | 対応付けが必要。[JapaneseAddress](/models/common/JapaneseAddress/) は GIF の住所に対応 |
| [自治体標準オープンデータセット](https://www.digital.go.jp/resources/open_data/municipal-standard-data-set-test)（旧 推奨データセット） | 自治体オープンデータの標準フォーマット（公共施設、指定緊急避難場所、AED、子育て施設、イベント など）。CSV の項目定義書。指定避難所のデータセットは無い | 対応付けが必要（対応表あり）。「03 指定緊急避難場所一覧」は [EvacuationSite](/models/disaster/EvacuationSite/)、所在地と緯度・経度の列は JapaneseAddress と Geometry。一覧は[対応している標準](/guide/standards) |
| [災害対応基本共有情報（EEI）](https://www.bousai.go.jp/kaigirep/kentokai/dataplatform/pdf/jitsumu/r7/dai2kai/siryo1.pdf) | 内閣府（防災担当）。新総合防災情報システム（SOBO-WEB）で国・自治体・指定公共機関が共有する災害情報の項目とデータ属性の一覧。型やコード表は無い | 対応付けが必要（対応表あり）。避難場所は EvacuationSite、避難所は DesignatedShelter（平時）と EvacuationShelter（災害時）、通行止めは RoadRestriction |
| [国土地理院 指定緊急避難場所・指定避難所データ](https://hinanmap.gsi.go.jp/hinanjocp/hinanbasho/koukaidate.html) | 市町村が登録した指定緊急避難場所と指定避難所を国土地理院が全国分公開するデータ（市町村別の CSV） | 対応付けが必要（対応表あり）。指定緊急避難場所は [EvacuationSite](/models/disaster/EvacuationSite/)、指定避難所は [DesignatedShelter](/models/disaster/DesignatedShelter/) |
| [全国共通避難所・避難場所ID](https://www.bousai.go.jp/taisaku/hinanjo/r6_setsumeikai/pdf/shiryo10.pdf) | 内閣府の新総合防災情報システムと国土地理院の避難所等データ整備ウェブシステムで採番する 14 桁の ID。国土地理院のデータでは「共通ID」列 | 避難所・避難場所のモデルの `nationalShelterId` |
| [交通規制情報（拡張版標準フォーマット）](https://www.jartic.or.jp/d/opendata/typeD_kisei_73_k_2.1.pdf) | 警察庁が策定し、日本道路交通情報センター（JARTIC）が公開する、都道府県警察の交通規制データの全国共通フォーマット。規制の位置を点・線・面で表す | 対応付けが必要（対応表あり）。[RoadRestriction](/models/transportation/RoadRestriction/) |
| [アドレス・ベース・レジストリ](https://www.digital.go.jp/policies/base_registry_address) | 町字ID を含む住所の基盤データ | JapaneseAddress の `abrMachiazaId` が参照 |
| [空間ID（4次元時空間情報利活用のための空間IDガイドライン）](https://www.ipa.go.jp/digital/architecture/guidelines/4dspatio-temporal-guideline.html) | 経産省・国交省・国土地理院・NEDO・IPA。3 次元空間を一意に識別する共通 ID と、時間軸を加えた 4 次元時空間情報の利活用指針 | NGSI-LD の標準には含まれない。ブローカーによっては独自に対応している |

## Smart Data Models にあるモデルを探すには

Smart Data Models のサイトの [検索](https://smartdatamodels.org/index.php/list-of-data-models-3/) か、GitHub の [smart-data-models](https://github.com/smart-data-models) 組織で `dataModel.<Subject>` リポジトリを探してください。

見つかったモデルを日本向けに拡張したい場合は [属性を足す](/guide/extend) を、このカタログに載せてほしい場合は [Issue](https://github.com/geolonia/datamodels/issues) を開いてください。
