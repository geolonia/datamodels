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
| 日本にしかないモデルを作る | **独自サブジェクト**: 型と属性の IRI を `https://datamodels.jp/ns/<subject>/` 配下に発行する | [災害対応](/models/disaster/) |

### プロファイルの書き方

上流の context は複製せず、`@context` の配列に URL で並べます。上流の属性はそのままの IRI で展開され、追加した属性だけがカタログの IRI になります。

```json
{
  "@context": [
    "https://raw.githubusercontent.com/smart-data-models/dataModel.Building/<commit>/context.jsonld",
    "https://datamodels.jp/context/common/v1.jsonld",
    {
      "gb": "https://datamodels.jp/ns/Building/",
      "residentialIndication": "gb:residentialIndication"
    }
  ]
}
```

上流の URL は `master` ではなくコミット固定の URL を使います。上流が変わっても、保存済みデータの意味が変わらないようにするためです。

### 上流を採用しないと判断するとき

「拡張する、複製しない」は、上流に合うものがあれば使うという意味で、何でも合わせるという意味ではありません。上流のモデルは、誰かの特定の用途のために先に公開されただけで一般性がないことも、北米の事情を前提にしていて日本に合わないことも、十分な検討やフィードバックを経ずに固まってしまったこともあります。次のような場合は、独自の型を発行して構いません。

- 上流の型の意味や必須属性が、日本の運用と食い違う。
- 上流の型が特定の製品や地域の事情に依存している。
- 属性を足すだけでは足りず、意味を変えないと使えない（意味の変更は禁止なので、独自の型にする）。

ただし、検討した上流の型と、採用しなかった理由をモデルの `notes.yaml` に書いてください。後から見た人が同じ検討を繰り返さないためです。

### 現状について

最初のサブジェクト [災害対応](/models/disaster/) は、高松市の水防アプリのデータモデルを基にしたもので、[タスク管理](/models/task/)の上に組み立てています（共通の属性はタスク管理の IRI を使う）。当初あった `DisasterEvent`（`Project` の**エイリアス**）と通報・対応業務・申し送り・現地写真（`Task`・`Comment`・`Attachment` の**サブクラス**）は、外部の基準・仕様に基づかないテナント固有の型だったため 2026-09-24 に廃止しました（詳細は [docs/design.md](https://github.com/geolonia/datamodels/blob/main/docs/design.md) の「Versioning and lifecycle」）。通行止めと避難所は上流（Smart Data Models の `RoadSegment`・`Alert`、デジタル庁の自治体標準オープンデータセット）と比較した結果、型としては合うものがなく独自のままですが、属性の IRI と状態の値域は借りています。通行止めはその後、国の基準（警察庁・国土交通省）に基づく通行規制として作り直し、災害に限らないため[交通](/models/transportation/)サブジェクトの `RoadRestriction` に移しました（2026-09-25）。検討の経過は各モデルの注記と [Issue #16](https://github.com/geolonia/datamodels/issues/16) にあります。エイリアス・サブクラスの書き方自体は [Tips & Tricks](/guide/tips) を参照してください。

### 守ること

- 上流の属性の意味や型を変えない。必要なら新しい属性を足す。
- NGSI-LD core context の予約語（`status`, `description`, `location`, `createdAt`, `modifiedAt`, `observedAt` など）を再定義しない。カタログの CI が弾きます。`status` が要るときは `incidentStatus` のように名前を変えます。
- 名前空間はサブジェクト（分野）で分け、地域名・顧客名・案件名は入れない。
- 共通の構造は [common](/models/common/) サブジェクトの値型を使う。住所は [JapaneseAddress](/models/common/JapaneseAddress/)、`location` などの GeoProperty は [Geometry](/models/common/Geometry/)。使えるジオメトリを絞るときは `$ref` の横で制約する（Attachment は点だけ）。
- 既にある型に名前だけ合わせたいならエイリアス（`x-alias-of`、属性も必須項目も同じ）、属性を足す・型を分けたいならサブクラス（`x-subclass-of`、同名の属性は親の IRI、親の必須項目は維持）。CI が両方を検査します。

## 例の書き方 {#examples}

各モデルには例が 2 つ（key-values と normalized）あり、モデルのページに載り、CI が検証します。クライアントを書く人が真似をするので、全サブジェクトで 1 つのシナリオにそろえています。

- **シナリオ**: 架空の出来事として、東京都千代田区の大雨対応（令和8年7月）を使います。区が災害対応のプロジェクトを立ち上げ、靖国通りのアンダーパスの冠水を確認するタスクがあり、道路が通行止めになり、避難所が開設されます。
- **実在と架空**: 地名、住所、各種コード（全国地方公共団体コード、アドレス・ベース・レジストリの町字 ID など）、座標は実在のものを使います。出来事、人、チーム、システムの番号は架空です。個人名は使わず、`staff-0012` や `field-team-a` のような識別子にします。
- **ID**: `urn:ngsi-ld:<型名>:<ローカル ID>`。ローカル ID は元のシステムの番号がある場合はそれを使います（`urn:ngsi-ld:Task:1234`）。複数の組織が 1 つのブローカーを共有するときは、`urn:ngsi-ld:<型名>:<組織>:<ローカル ID>` のように組織を入れます。
- **参照**: 他のカタログの型への参照は、その型の例の ID を指します（Task の `project` は Project の例）。同じ型への参照（`parent`、`relatedTo`）と、カタログが定義しない型（`Person`、`Team`）への参照は自由です。CI がこれを検査します。
- **URL**: 元のシステムの URL は `tracker.example.jp` のような例示用のドメインにします。
- **日時**: 日本時間の場合は `+09:00` を付けます。

## 貢献する

このカタログは公開リポジトリ [geolonia/datamodels](https://github.com/geolonia/datamodels) で管理しています。日本語でも英語でも構いません。

- **モデルの追加・修正**: [Smart Data Models と同じフォルダ構成](https://github.com/geolonia/datamodels#repository-layout)（`schema.json`, `catalog.yaml`, `examples/`, `notes.yaml`）で Pull Request を送ってください。CI がスキーマ、例、`@context` の展開、予約語、バージョンを検証します。
- **質問・提案・報告**: [Issue](https://github.com/geolonia/datamodels/issues) を開いてください。「このモデルが欲しい」「この属性の意味が分からない」も歓迎です。
- **上流への提案**: 日本以外でも使えるモデルになったら、Smart Data Models の [incubated](https://github.com/smart-data-models/incubated) に提案します。フォルダ構成を揃えているのはこのためです。

公開したモデルの内容は [CC BY 4.0](/LICENSE-CONTENT)、ツールのコードは Apache-2.0 です。
