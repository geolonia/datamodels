---
title: URL とバージョン
description: どの URL を使うか、何が変わらないか、バージョンと非推奨の決まり
---

# URL とバージョン

`@context` の URL はエンティティと一緒に保存され、何年も後に読まれます。このページでは、どの URL を使うか、カタログがその URL について何を約束するか、そしてそれを壊さずにモデルをどう変えていくかを説明します。

::: warning プレリリース中
この約束は**正式公開から**適用されます。それまでは、公開済みのファイル（`v1.0.0` を含む）も直接修正されることがあり、正確なバージョンのファイルも 1 年ではなく 5 分だけキャッシュされます。本番のデータから参照するのは正式公開後にしてください。
:::

## どの URL を使うか

| 用途 | URL |
|---|---|
| 保存するデータの `@context`、`Link` ヘッダー | エイリアス `/context/<subject>/v1.jsonld` |
| 監査、他のブローカーでの結果の再現 | 正確なバージョン `/context/<subject>/v1.0.0.jsonld` |
| バリデーション | `/schema/<subject>/<Type>/v1.json`（エイリアス）または `v1.0.0.json` |

エイリアスは互換性のあるバージョンにしか進まないので、通常はエイリアスで十分です。監査や結果の再現が要るときは正確なバージョンを使ってください。

サーバーやブローカーは、取得したファイルの写しを使い回せます。エイリアスは 5 分なので、互換性のある新しいバージョンは 5 分以内に行き渡ります。正確なバージョンは変わらないので 1 年です。

<svg class="flow-diagram" viewBox="0 0 460 160" role="img" aria-label="エイリアス v1.jsonld は常に最新の 1.x（ここでは v1.2.0）を指します。v1.0.0、v1.1.0、v1.2.0 は公開されたまま変わりません。互換性のない変更は v2.0.0 になり、エイリアス v2.jsonld を持ちます。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="ver-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="10" y="92" width="100" height="44" rx="8"/><text class="t m" x="60" y="119">v1.0.0</text><rect class="box" x="120" y="92" width="100" height="44" rx="8"/><text class="t m" x="170" y="119">v1.1.0</text><rect class="box" x="230" y="92" width="100" height="44" rx="8"/><text class="t m" x="280" y="119">v1.2.0</text><rect class="box" x="350" y="92" width="100" height="44" rx="8"/><text class="t m" x="400" y="119">v2.0.0</text><text class="s" x="175" y="154">公開したバージョン: 変わらない</text><rect class="box main" x="190" y="8" width="120" height="40" rx="8"/><text class="t m" x="250" y="33">v1.jsonld</text><line class="a" x1="270" y1="48" x2="280" y2="90" marker-end="url(#ver-ah)"/><text class="l e" x="182" y="33">エイリアス: 最新の 1.x</text><rect class="box" x="350" y="8" width="100" height="40" rx="8"/><text class="t m" x="400" y="33">v2.jsonld</text><line class="a" x1="400" y1="48" x2="400" y2="90" marker-end="url(#ver-ah)"/><text class="s" x="400" y="154">互換性のない変更</text></svg>

## 約束

1. **公開したバージョン付きファイルは変更も削除もしない。** `/context/<subject>/v1.0.0.jsonld` の中身は永久に同じです。CI はすべてのファイルのハッシュを記録し、変更を取り込みません。
2. **属性の意味は変えない。** 変える必要があるときは新しい属性を足し、古い属性を非推奨にします。
3. **型と属性の IRI はドキュメントにつながる。** `https://datamodels.jp/ns/transportation/RoadRestriction` をブラウザで開くと、その型のページが表示されます。

## バージョン {#versions}

バージョンはサブジェクト（分野ごとのモデルのまとまり）ごとに 1 つで、`@context`、語彙、JSON Schema が同じ番号を持ちます（例 `transportation` の 1.0.0）。番号は [Semantic Versioning](https://semver.org/lang/ja/) に従います。

| 変更 | 上げる番号 | 例 |
|---|---|---|
| 意味も検証も変わらない修正 | パッチ（1.0.**1**） | スキーマの説明文の誤字 |
| 互換性のある追加 | マイナー（1.**1**.0） | 任意の属性やモデルを足す、値の一覧に値を足す |
| 互換性のない変更 | メジャー（**2**.0.0） | 属性の名前や型を変える、属性や値を消す、任意の属性を必須にする |

新しいバージョンを出しても古いものは残ります。`v1.0.0` は同じ URL のままで、エイリアス `v1` が最新の 1.x を指します。値の一覧に値を足すのはマイナーですが、すべての値を扱うコードは新しい値を知る必要があるので、Pull Request とモデルの注記に書きます。

## 非推奨 {#deprecation}

- **属性**を置き換えるときは、スキーマとモデルのページで「非推奨」と表示します。少なくとも次のマイナーバージョンまで残し、削除はメジャーバージョンでだけ行います。
- **モデル**を新しく使わないでほしいときは「非推奨」にします。公開は続き、URL も変わりません。後継があれば、ページと `catalog.json` に示します（`supersededBy`）。

## URL の一覧

<div class="url-list">

| URL | 内容 |
|---|---|
| `/context/<subject>/vX.Y.Z.jsonld` | @context（不変） |
| `/context/<subject>/vX.jsonld` | エイリアス（最新の X.y.z） |
| `/schema/<subject>/<Type>/vX.Y.Z.json` | JSON Schema（不変） |
| `/schema/<subject>/<Type>/vX.json` | エイリアス |
| `/vocab/<subject>/vX.Y.Z.jsonld` | 語彙（RDFS: クラス、サブクラス関係、日英ラベル。不変） |
| `/examples/<subject>/<Type>/example.json` | 例（key-values） |
| `/examples/<subject>/<Type>/example-normalized.jsonld` | 例（NGSI-LD normalized。値型には無い） |
| `/ns/<subject>/<Term>` | 型・属性の IRI（ページにリダイレクト） |
| `/mapping/<subject>/<Type>/<name>.yaml` | 対応表（他の標準との対応と変換の規則。バージョンなし: URL は変わらず、内容は現在のモデルに合わせる） |
| `/adapters/<name>/<subject>/<Type>.json` | アダプターの出力（例: GeonicDB の Custom Data Model 定義） |
| `/catalog.json` | プログラム向けの全モデルの一覧（/catalog.schema.json に準拠） |

</div>

すべてのファイルは `Access-Control-Allow-Origin: *` で配信され、`.jsonld` は `application/ld+json`、スキーマは `application/schema+json`、対応表は `application/yaml` です。

## 上流のモデルについて

Smart Data Models の context は上流の GitHub リポジトリの `master` ブランチにあり、バージョンが付いていません。コミットを固定した URL で参照してください（[属性を足す](/guide/extend)）。上流に依存できない人のために、同じファイルをこのドメインから配信する写しを用意する計画があります（未提供）。
