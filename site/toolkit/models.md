---
title: サイトのモデル
description: datamodels-toolkit の search で既にあるモデルを探し、add と extend で自分のサイトにモデルを足し、属性を書く手順
---

# サイトのモデル

ノードのサブジェクトにモデルを足し、属性を書きます。ノードがまだ無いときは、[サイトを始める](/toolkit/start)から始めてください。

## 先に既にあるモデルを探す {#search}

新しいモデルを作る前に、そのまま使えるモデルや拡張できるモデルが既にないかを探します。`search` は、datamodels.jp と、datamodels.jp がリンクしているサイトのモデルから、型の名前、タイトル、属性、説明に言葉を含むものを探します。日本語でも英語でも探せます。

```bash
npx github:geolonia/datamodels-toolkit#v0.3.6 search 避難
npx github:geolonia/datamodels-toolkit#v0.3.6 search road closure --json
```

1 行に 1 つのモデルが、サブジェクトと型、タイトル、サイト、ページの URL の順に並びます。`--json` を付けると、型の IRI、スキーマ、`@context`、索引（`catalog.json`）も出力します。スクリプトや AI エージェントから使うときは、こちらを使います。

`nodes` は、たどれるサイトを、名前、アドレス、ライセンス、モデルの数とともに並べます。どちらのコマンドも、`--index` で別のサイトの `catalog.json` から始められ、`--depth` でたどるリンクの数を変えられます。

見つかったモデルを土台にするときは、[extend](#extend) を使います。

## 新しいモデル {#add}

```bash
npx github:geolonia/datamodels-toolkit#v0.3.6 add road/RoadPatrol
```

`models/road/RoadPatrol/` に `schema.json`、`catalog.yaml`、`examples/example.json` ができます。サブジェクトの `@context` には型 `RoadPatrol` が入ります。続けて、[属性を書きます](#attributes)。

## カタログのモデルから始める {#extend}

このカタログのモデルから始めるときは、`extend` を使います。カタログのモデルのスキーマをコピーし、その `@context` を取り込み、土台にしたモデルを記録します。そのため、`check` が名前と意味を変えていないかを検査できます。そのうえで、[下のように](#attributes)自分の属性を足します。`--subclass` を付けると、独自の IRI を持つサブタイプになります。

```bash
npx github:geolonia/datamodels-toolkit#v0.3.6 extend task/Task road/RoadTask
```

## 属性を書く {#attributes}

属性は、1 つにつき 3 か所に書きます（例は `add` で作った `RoadPatrol` です）。まず `models/road/RoadPatrol/schema.json` の `properties` に書き、IRI は `x-iri` に入れます。

```json
"route": {
  "type": "string",
  "description": "The route patrolled",
  "x-iri": "https://models.example.org/ns/road#route"
}
```

次に `models/road/context.jsonld` の `@context` に、同じ IRI で書きます。

```json
"route": "road:route"
```

最後に、`models/road/RoadPatrol/catalog.yaml` へノードの言語ごとの説明を書きます。

```yaml
attributes:
  route: { ja: 巡回したルート, en: The route patrolled }
```

`examples/example.json` にも値を入れてください（`"route": "A-3"`）。`catalog.yaml` と `models/road/subject.yaml` のタイトルと説明も、自分の言葉に書き換えます。名前や説明の付け方は、このカタログの[モデルのルール](/guide/rules)が参考になります。

モデルができたら、[検査とビルド](/toolkit/check)に進みます。
