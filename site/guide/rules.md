---
title: モデルのルール
description: このカタログのモデルが守るルール、独自の型を作るとき、標準との対応表、例の書き方
---

# モデルのルール

このページは、カタログにモデルを足したり変えたりする人向けです。提案の仕方と決め方は[貢献する](/guide/contribute)にあります。

## まず使い回し、足りないものだけ定義する

このカタログの方針は「拡張する、複製しない」です。[Smart Data Models](https://smartdatamodels.org/)、NGSI-LD、[schema.org](https://schema.org/) の型や属性で合うものがあれば、そのまま使います。合うものがなければ `https://datamodels.jp/ns/<subject>/` の下に独自の型を定義し、それでも合う上流の属性は使います。例えば [RoadRestriction](/models/transportation/RoadRestriction/) はカタログ独自の型ですが、`roadName`・`validFrom`・`validTo` は Smart Data Models のものです。

### 上流の型を使わないとき

合うなら上流を使うというのは、何でも合わせるという意味ではありません。上流のモデルには、1 つの案件のために公開されただけのもの、北米の事情を前提にしたもの、十分なフィードバックの前に固まったものもあります。次のような場合は独自の型を定義します。

- 上流の型の意味や必須属性が、日本の運用と食い違う。
- 上流の型が特定の製品や地域の事情に依存している。
- 属性を足すだけでは足りず、意味を変えないと使えない（意味の変更は禁止なので、独自の型にする）。

検討した上流の型と、使わなかった理由をモデルの `notes.yaml` に書いてください。後から見た人が同じ検討を繰り返さないためです。

今のところ、カタログのモデルはすべて独自の型で、一部の属性に上流の名前を使っています。理由は各モデルの注記と [Issue #16](https://github.com/geolonia/datamodels/issues/16) にあります。

## 守ること

- 上流の属性の意味や型は変えません。必要なら新しい属性を足します。
- 状態の属性（`progress`、`openingStatus`、`restrictionStatus` など）の値の一覧は決まっています。合う値がないときは状態の属性を省き、`statusLabel` に元の呼び方を書きます（そのとき `statusLabel` は必須）。近い値に無理に当てはめないでください。
- NGSI-LD core context の予約語（`status`, `description`, `location`, `createdAt`, `modifiedAt`, `observedAt` など）は再定義しません。CI が弾きます。`status` が要るときは `incidentStatus` のように名前を変えます。
- モデルはサブジェクト（分野）でまとめ、地域名・顧客名・案件名ではまとめません。
- 共通の構造は [common](/models/common/) の値型を使います。住所は [JapaneseAddress](/models/common/JapaneseAddress/)、`location` などの位置は [Geometry](/models/common/Geometry/)。使えるジオメトリを絞るときは `$ref` の横で制約します（Attachment は点だけ）。
- 既にある型に名前だけ合わせたいならエイリアス（`x-alias-of`、属性も必須項目も同じ）、属性を足す・型を分けたいならサブクラス（`x-subclass-of`、同名の属性は親と同じ意味、親の必須項目は維持）を使います。CI が両方を検査します。

## 日本の標準との対応表 {#mapping}

モデルに当たるデータが日本の標準にあるとき（例えばデジタル庁の[自治体標準オープンデータセット](https://www.digital.go.jp/resources/open_data/municipal-standard-data-set-test)のデータセット）は、対応表（`mapping/*.yaml`）を書きます。自治体が自分のデータをそのままモデルに当てはめられるようにするためです。例は [EvacuationSite](/models/disaster/EvacuationSite/#mapping-jichitai-opendata-site) です。当たるデータセットがあるかはレビューで確認します（CI では検査しません）。

### 標準の新しい版 {#standard-revisions}

対応表には、対応する標準の版を書きます（例 自治体標準オープンデータセットの 20260801版、EEI 第1.1版）。新しい版が出たら、メンテナーが対応表を合わせます。それだけではバージョンは上がりません。モデルも変える必要があれば、[バージョンの決まり](/guide/urls#versions)のとおりです。追従の期限は決めていません。

## 例の書き方 {#examples}

各モデルには例が 2 つ（key-values と normalized）あり、モデルのページに載り、CI が検証します。クライアントを書く人が真似をするので、全サブジェクトで 1 つのシナリオにそろえています。

- **シナリオ**: 架空の出来事として、東京都千代田区の大雨対応（令和8年7月）を使います。区が災害対応のプロジェクトを立ち上げ、靖国通りのアンダーパスの冠水を確認するタスクがあり、道路が通行止めになり、避難所が開設されます。
- **実在と架空**: 地名、住所、各種コード（全国地方公共団体コード、アドレス・ベース・レジストリの町字 ID など）、座標は実在のものを使います。出来事、人、チーム、システムの番号は架空です。個人名は使わず、`staff-0012` や `field-team-a` のような識別子にします。
- **ID**: `urn:ngsi-ld:<型名>:<ローカル ID>`。ローカル ID は元のシステムの番号がある場合はそれを使います（`urn:ngsi-ld:Task:1234`）。複数の組織が 1 つのブローカーを共有するときは、`urn:ngsi-ld:<型名>:<組織>:<ローカル ID>` のように組織を入れます。
- **参照**: 他のカタログの型への参照は、その型の例の ID を指します（Task の `project` は Project の例）。同じ型への参照（`parent`、`relatedTo`）と、カタログが定義しない型（`Person`、`Team`）への参照は自由です。CI がこれを検査します。
- **URL**: 元のシステムの URL は `tracker.example.jp` のような例示用のドメインにします。
- **日時**: 日本時間の場合は `+09:00` を付けます。
