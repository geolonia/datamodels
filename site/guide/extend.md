---
title: 拡張する
description: 既存のデータモデルを日本向けに拡張する方法、独自モデルを追加する方法、守るルール、例の書き方
---

# 拡張する

このカタログの方針は「拡張する、複製しない」です。[Smart Data Models](https://smartdatamodels.org/)、NGSI-LD、[schema.org](https://schema.org/) の型や属性で合うものがあれば、複製せずにそれを使います。合うものがなければ独自の型を公開し、その理由を記録します。このページでは、実際にどうやるかを説明します。

## 3 つのやり方

| やりたいこと | 方法 | 例 |
|---|---|---|
| 上流のモデルをそのまま使う | 上流の `@context` と型をそのまま使う。カタログは日本語の説明と例を提供する | カタログにはまだありません |
| 既存のモデルに属性を足す | **プロファイル**: 元のモデルの context を URL で取り込み、足した属性だけを定義した context を公開する | [拡張ビルダー](/guide/builder)で作る @context |
| 合う型がないモデルを作る | **独自の型**: 型と属性の IRI を新しく発行する（カタログの型は `https://datamodels.jp/ns/<subject>/` 配下）。合う上流の属性があれば、その IRI を使う | [RoadRestriction](/models/transportation/RoadRestriction/)（`roadName`・`validFrom`・`validTo` は Smart Data Models の IRI） |

### プロファイルの書き方

元のモデルの context は複製せず、`@context` の配列に URL で並べます。元の属性はそのままの IRI で展開され、足した属性だけが新しい IRI になります。次の例は、カタログの [RoadRestriction](/models/transportation/RoadRestriction/) に巡回ルートの属性 `patrolRoute` を足すものです。

```json
{
  "@context": [
    "https://datamodels.jp/context/transportation/v1.jsonld",
    {
      "acme": "https://example.com/ns/acme/",
      "patrolRoute": "acme:patrolRoute"
    }
  ]
}
```

足した属性の IRI は、あなたが管理するドメインの下に発行します（この例では `example.com`）。`datamodels.jp` の名前空間はカタログのものなので使わないでください。[拡張ビルダー](/guide/builder)で、この @context と JSON Schema をブラウザで作れます。

@context と JSON Schema では、カタログの更新への追従の仕方が違います。@context はカタログの context をエイリアス（`v1.jsonld`）で取り込むので、1.x の新しい属性もそのまま使えます。JSON Schema はそうはいきません。カタログのエンティティのスキーマは閉じている（`additionalProperties: false`）ので、`$ref` で参照して属性を足すことができず、拡張したスキーマはカタログのスキーマを丸ごと写したものになります。写したのはその時点のバージョン（スキーマの `x-extends` に記録される）なので、カタログに新しいマイナーバージョンが出ても、拡張したスキーマには入りません。新しい属性を検証したくなったら、拡張ビルダーで作り直すか、自分の属性を新しいスキーマに足し直してください。

### 拡張した @context の置き場所 {#host-context}

拡張した @context は、あなたが管理する、変わらない HTTPS の URL に置きます（自分のドメイン、GitHub Pages、アドレスが固定のオブジェクトストレージなど）。データは `@context` か `Link` ヘッダーでこの URL を示し、ブローカーや JSON-LD のプロセッサーがそれを読みに行きます。GeonicDB の Custom Data Model では `contextUrl` に指定します。カタログの URL と同じように扱ってください。バージョンごとに別の URL で公開し、公開したファイルは変えず、消さないでください。`Content-Type: application/ld+json` と `Access-Control-Allow-Origin: *` で配信します。いまのカタログは拡張を預かりません。datamodels.jp に組織ごとの名前空間を設ける案は [#56](https://github.com/geolonia/datamodels/issues/56) で検討しています。

Smart Data Models のモデルを元にするときも書き方は同じです。上流の context は `master` ではなく、コミットを固定した URL（`https://raw.githubusercontent.com/smart-data-models/dataModel.<分野>/<commit>/context.jsonld`）で読み込みます。上流が変わっても、保存済みデータの意味が変わらないようにするためです。

### 上流を採用しないと判断するとき

「拡張する、複製しない」は、上流に合うものがあれば使うという意味で、何でも合わせるという意味ではありません。上流のモデルは、誰かの特定の用途のために先に公開されただけで一般性がないことも、北米の事情を前提にしていて日本に合わないことも、十分な検討やフィードバックを経ずに固まってしまったこともあります。次のような場合は、独自の型を発行して構いません。

- 上流の型の意味や必須属性が、日本の運用と食い違う。
- 上流の型が特定の製品や地域の事情に依存している。
- 属性を足すだけでは足りず、意味を変えないと使えない（意味の変更は禁止なので、独自の型にする）。

ただし、検討した上流の型と、採用しなかった理由をモデルの `notes.yaml` に書いてください。後から見た人が同じ検討を繰り返さないためです。

### 現状について

今のところ、カタログのモデルはすべてカタログ独自の型です。上流の IRI を使っているのは一部の属性だけです。通行規制の `roadName`・`validFrom`・`validTo`（Smart Data Models）、`name`（NGSI-LD）、住所や添付ファイルなどに使う schema.org の語彙がこれに当たります。

最初のサブジェクト（分野ごとのモデルのまとまり）である[災害対応](/models/disaster/)は、高松市の水防アプリのデータモデルを基にしたもので、[タスク管理](/models/task/)の上に組み立てています（共通の属性はタスク管理の IRI を使う）。当初あった `DisasterEvent`（`Project` の**エイリアス**）と通報・対応業務・申し送り・現地写真（`Task`・`Comment`・`Attachment` の**サブクラス**）は、外部の基準・仕様に基づかないテナント固有の型だったため 2026-09-24 に廃止しました（詳細は [docs/design.md](https://github.com/geolonia/datamodels/blob/main/docs/design.md) の「Versioning and lifecycle」）。通行止めと避難所は上流（Smart Data Models の `RoadSegment`・`Alert`、デジタル庁の自治体標準オープンデータセット）と比較した結果、型としては合うものがなく独自のままですが、属性の IRI と状態の値域は借りています。通行止めはその後、国の基準（警察庁・国土交通省）に基づく通行規制として作り直し、災害に限らないため[交通](/models/transportation/)サブジェクトの `RoadRestriction` に移しました（2026-09-25）。検討の経過は各モデルの注記と [Issue #16](https://github.com/geolonia/datamodels/issues/16) にあります。エイリアス・サブクラスの書き方自体は [Tips & Tricks](/guide/tips) を参照してください。

### 守ること

- 上流の属性の意味や型は変えません。必要なら新しい属性を足します。
- 状態の属性（`progress`、`openingStatus`、`restrictionStatus` など）の値域は閉じています。合う値がないときは状態の属性を省き、`statusLabel` に元の呼び方を書きます（そのとき `statusLabel` は必須）。近い値に無理に当てはめないでください。
- NGSI-LD core context の予約語（`status`, `description`, `location`, `createdAt`, `modifiedAt`, `observedAt` など）は再定義しません。カタログの CI が弾きます。`status` が要るときは `incidentStatus` のように名前を変えます。
- 名前空間はサブジェクト（分野）で分け、地域名・顧客名・案件名は入れません。
- 共通の構造は [common](/models/common/) サブジェクトの値型を使います。住所は [JapaneseAddress](/models/common/JapaneseAddress/)、`location` などの GeoProperty は [Geometry](/models/common/Geometry/)。使えるジオメトリを絞るときは `$ref` の横で制約します（Attachment は点だけ）。
- モデルに当たるデータセットがデジタル庁の[自治体標準オープンデータセット](https://www.digital.go.jp/resources/open_data/municipal-standard-data-set-test)にあれば、対応表（`mapping/jichitai-opendata-*.yaml`）を書きます。自治体が自分のデータをそのままモデルに当てはめられるようにするためです。例は [EvacuationSite](/models/disaster/EvacuationSite/#mapping-jichitai-opendata-site)、所在地の列は [JapaneseAddress](/models/common/JapaneseAddress/#mapping-jichitai-opendata-address) と [Geometry](/models/common/Geometry/#mapping-jichitai-opendata-location) が対応済みです。当たるデータセットがあるかはレビューで確認します（CI では検査しません）。
- 既にある型に名前だけ合わせたいならエイリアス（`x-alias-of`、属性も必須項目も同じ）、属性を足す・型を分けたいならサブクラス（`x-subclass-of`、同名の属性は親の IRI、親の必須項目は維持）を使います。CI が両方を検査します。

## 例の書き方 {#examples}

各モデルには例が 2 つ（key-values と normalized）あり、モデルのページに載り、CI が検証します。クライアントを書く人が真似をするので、全サブジェクトで 1 つのシナリオにそろえています。

- **シナリオ**: 架空の出来事として、東京都千代田区の大雨対応（令和8年7月）を使います。区が災害対応のプロジェクトを立ち上げ、靖国通りのアンダーパスの冠水を確認するタスクがあり、道路が通行止めになり、避難所が開設されます。
- **実在と架空**: 地名、住所、各種コード（全国地方公共団体コード、アドレス・ベース・レジストリの町字 ID など）、座標は実在のものを使います。出来事、人、チーム、システムの番号は架空です。個人名は使わず、`staff-0012` や `field-team-a` のような識別子にします。
- **ID**: `urn:ngsi-ld:<型名>:<ローカル ID>`。ローカル ID は元のシステムの番号がある場合はそれを使います（`urn:ngsi-ld:Task:1234`）。複数の組織が 1 つのブローカーを共有するときは、`urn:ngsi-ld:<型名>:<組織>:<ローカル ID>` のように組織を入れます。
- **参照**: 他のカタログの型への参照は、その型の例の ID を指します（Task の `project` は Project の例）。同じ型への参照（`parent`、`relatedTo`）と、カタログが定義しない型（`Person`、`Team`）への参照は自由です。CI がこれを検査します。
- **URL**: 元のシステムの URL は `tracker.example.jp` のような例示用のドメインにします。
- **日時**: 日本時間の場合は `+09:00` を付けます。

## 貢献する

提案の仕方、段階と決め方、Pull Request の手順、署名（DCO）は[貢献する](/guide/contribute)にまとめています。
