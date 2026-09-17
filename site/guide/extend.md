---
title: 拡張する・貢献する
description: 既存のデータモデルを日本向けに拡張する方法、独自モデルを追加する方法、カタログへの貢献の仕方
---

# 拡張する・貢献する

このカタログの方針は「拡張する、複製しない」です。世界で使われている [Smart Data Models](https://smartdatamodels.org/) の型と属性はそのまま使い、日本で必要な属性や日本固有のモデルだけを足します。このページでは、実際にどうやるかを説明します。

## 3 つのやり方

| やりたいこと | 方法 | 例 |
|---|---|---|
| 既存のグローバルモデルをそのまま使う | 上流の `@context` と型をそのまま使う。カタログは日本語の説明と例を提供する | `WeatherObserved` |
| 既存モデルに日本向けの属性を足す | **プロファイル**: 上流の context を URL で取り込み、追加属性だけを定義した context を公開する | `Building` に住居表示を足す |
| 日本にしかないモデルを作る | **独自サブジェクト**: 型と属性の IRI を `https://models.geonicdb.com/ns/<subject>/` 配下に発行する | [災害対応](/models/disaster/) |

### プロファイルの書き方

上流の context は複製せず、`@context` の配列に URL で並べます。上流の属性はそのままの IRI で展開され、追加した属性だけがカタログの IRI になります。

```json
{
  "@context": [
    "https://raw.githubusercontent.com/smart-data-models/dataModel.Building/<commit>/context.jsonld",
    "https://models.geonicdb.com/context/common/v1.jsonld",
    {
      "gb": "https://models.geonicdb.com/ns/Building/",
      "residentialIndication": "gb:residentialIndication"
    }
  ]
}
```

上流の URL は `master` ではなくコミット固定の URL を使います。上流が変わっても、保存済みデータの意味が変わらないようにするためです。

### 守ること

- 上流の属性の意味や型を変えない。必要なら新しい属性を足す。
- NGSI-LD core context の予約語（`status`, `description`, `location`, `createdAt`, `modifiedAt`, `observedAt` など）を再定義しない。カタログの CI が弾きます。`status` が要るときは `incidentStatus` のように名前を変えます。
- 名前空間はサブジェクト（分野）で分け、地域名・顧客名・案件名は入れない。
- 住所など共通の構造は [common](/models/common/) サブジェクトの値型を使う。

## 貢献する

このカタログは公開リポジトリ [geolonia/geonicdb-models](https://github.com/geolonia/geonicdb-models) で管理しています。日本語でも英語でも構いません。

- **モデルの追加・修正**: [Smart Data Models と同じフォルダ構成](https://github.com/geolonia/geonicdb-models#repository-layout)（`schema.json`, `catalog.yaml`, `examples/`, `notes.yaml`）で Pull Request を送ってください。CI がスキーマ、例、`@context` の展開、予約語、バージョンを検証します。
- **質問・提案・報告**: [Issue](https://github.com/geolonia/geonicdb-models/issues) を開いてください。「このモデルが欲しい」「この属性の意味が分からない」も歓迎です。
- **上流への提案**: 日本以外でも使えるモデルになったら、Smart Data Models の [incubated](https://github.com/smart-data-models/incubated) に提案します。フォルダ構成を揃えているのはこのためです。

公開したモデルの内容は [CC BY 4.0](/LICENSE-CONTENT)、ツールのコードは Apache-2.0 です。
