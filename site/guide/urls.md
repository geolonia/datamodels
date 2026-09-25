---
title: 変わらない URL
description: このカタログが公開する URL の約束。バージョン、エイリアス、キャッシュ、IRI の解決
---

# 変わらない URL

`@context` の URL はエンティティと一緒に保存され、何年も後に参照されます。このカタログは公開した URL について次を約束します。

::: warning プレリリース中
この約束は**正式公開から**適用されます。それまでは、公開済みのファイル（`v1.0.0` を含む）も直接修正されることがあります。本番のデータから参照するのは正式公開後にしてください。
:::

## 約束

1. **公開したバージョン付きファイルは変更も削除もしない。** `/context/<subject>/v1.0.0.jsonld` の中身は永久に同じです。CI はハッシュを記録し、変更や削除を含む変更は取り込めません。
2. **互換性のある変更は新しいマイナーバージョンになる。** 属性の追加は `v1.1.0` として公開され、`v1.jsonld` というエイリアスが最新の 1.x を指します。
3. **破壊的な変更は新しいメジャーバージョンか新しい語になる。** 属性の意味や型を変えることはありません。変えたいときは新しい IRI を発行し、古い IRI は非推奨として残します。
4. **型と属性の IRI はドキュメントに解決する。** `https://datamodels.jp/ns/transportation/RoadRestriction` をブラウザで開くと、その型のページに移動します。

## どの URL を使うか

| 用途 | URL | キャッシュ |
|---|---|---|
| 保存するデータの `@context`、`Link` ヘッダー | エイリアス `/context/<subject>/v1.jsonld` | 5 分 |
| 意味を固定したい、他のブローカーで再現したい | 正確なバージョン `/context/<subject>/v1.0.0.jsonld` | 1 年、不変 |
| バリデーション | `/schema/<subject>/<Type>/v1.json`（エイリアス）または `v1.0.0.json` | 同上 |

エイリアスは互換性のある範囲でしか進まないので、通常はエイリアスで十分です。監査や再現性が要る場合は正確なバージョンを使ってください。

## URL の一覧

```text
/context/<subject>/vX.Y.Z.jsonld        @context（不変）
/context/<subject>/vX.jsonld            エイリアス（最新の X.y.z）
/schema/<subject>/<Type>/vX.Y.Z.json    JSON Schema（不変）
/schema/<subject>/<Type>/vX.json        エイリアス
/vocab/<subject>/vX.Y.Z.jsonld          語彙（RDFS: クラス、サブクラス関係、日英ラベル。不変）
/examples/<subject>/<Type>/             例
/ns/<subject>/<Term>                    型・属性の IRI（ページにリダイレクト）
/adapters/<name>/<subject>/<Type>.json  アダプターの出力（例: GeonicDB の Custom Data Model 定義）
/catalog.json                           機械可読な一覧（/catalog.schema.json に準拠）
```

すべてのファイルは `Access-Control-Allow-Origin: *` で配信され、`.jsonld` は `application/ld+json`、スキーマは `application/schema+json` です。

## 上流のモデルについて

Smart Data Models の context は上流の GitHub リポジトリの `master` ブランチにあり、バージョンが付いていません。このカタログのプロファイルはコミット固定の URL で上流を参照します。上流の可用性に依存できない場合のために、同じ内容をこのドメインから配信するミラーを用意する計画があります（未提供）。
