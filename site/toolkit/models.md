---
title: サイトのモデル
description: datamodels-toolkit の search で既にあるモデルを探し、add と extend で自分のサイトにモデルを足し、属性を書く手順
---

# サイトのモデル

ノードの分野にモデルを足し、属性を書きます。ノードがまだ無いときは、[サイトを始める](/toolkit/start)から始めてください。

## 先に既にあるモデルを探す {#search}

新しいモデルを作る前に、そのまま使えるモデルや、土台にできるモデルが既にないかを探します。`search` は、datamodels.jp と、datamodels.jp がリンクしているサイトのモデルから、型の名前、タイトル、属性、説明に言葉を含むものを探します。日本語でも英語でも探せます。

```bash
npx @geolonia/datamodels@0.3.15 search 避難
npx @geolonia/datamodels@0.3.15 search road closure --json
```

1 つ目のコマンドの結果の一部です。

```text
disaster/DesignatedShelter  指定避難所 / Designated shelter  datamodels.jp  https://datamodels.jp/models/disaster/DesignatedShelter/
disaster/EvacuationShelter  避難所の運用状況 / Evacuation shelter operation  datamodels.jp  https://datamodels.jp/models/disaster/EvacuationShelter/
…
4 of 18 models in 3 node(s) match
```

1 行に 1 つのモデルが、分野と型、タイトル、サイト（そのタイトル。無ければ公開している人や組織の名前）、ページの URL の順に並びます。上位の 10 件を出力します。件数は `--limit` で変えられます。`--json` を付けると、型の IRI、バージョン、スキーマ、`@context`、索引（`catalog.json`）も出力します。スクリプトや AI エージェントから使うときは、こちらを使います。この索引は、`extend` と `export` の `--index` に渡せます。この 2 つでは、ノードのアドレスではなく、`catalog.json` そのものの URL を渡します。

言葉は、型の名前に含まれるときがいちばん重く、タイトル、属性の名前、説明の順に軽くなります。めったに出ない言葉ほど重く数えます。英語の言葉は 3 文字以上が対象で、`data`、`model`、`type` のようなよく使う言葉は除きます。日本語は、漢字かカタカナを含む 2 文字ずつの組で比べます。`避難` で指定避難所が見つかります。`ひなん` のようにひらがなだけの言葉は、検索に使いません。このような言葉やよく使う言葉だけで、探す言葉が残らなければ、使い方の誤りです（終了コード 2、「nothing to search for」）。住所などの値の型も結果に入ります。

`nodes` は、たどれるサイトを、名前、アドレス、ライセンス、モデルの数、リンク元のサイトとともに並べます。

```bash
npx @geolonia/datamodels@0.3.15 nodes
```

```text
datamodels.jp  https://datamodels.jp/  CC0-1.0  16 models
GTT Project  https://models.gtt-project.org/  CC0-1.0  1 model  (linked from datamodels.jp)
Geolonia Inc.  https://models.geolonia.com/  CC0-1.0  1 model  (linked from datamodels.jp)
3 node(s) within 1 link(s) of https://datamodels.jp/catalog.json
```

どちらのコマンドも、索引から始めます。`--index` には、`catalog.json` かノードのアドレスを指定します（既定は datamodels.jp）。そこからリンクをたどります。たどるのは、`catalog.json` の `nodes` にあるノードと、モデルの `extends` にある索引です。`--depth` は、たどるリンクの数です（既定は 1、最大 5。`0` なら最初の索引だけを読みます）。どの索引も 1 回だけ読むので、戻るリンクは二度たどりません。読む索引は 50 までです。`nodes --json` は、一覧をスクリプト向けの形で出力します。

索引は、https で公開のアドレスからだけ読みます。読めないノードは標準エラー出力で知らせ、飛ばします。終了コードが 1 になるのは、最初の索引を読めないときだけです。

見つかったモデルを土台にするときは、[extend](#extend) を使います。

## 新しいモデル {#add}

```bash
npx @geolonia/datamodels@0.3.15 add road/RoadPatrol
```

`models/road/RoadPatrol/` に `schema.json`、`catalog.yaml`、`examples/example.json`、`notes.yaml` ができます。`notes.yaml` は、出典や決めたことと、その理由を書く注記です。分野の `@context` には型 `RoadPatrol` が入ります。エンティティの型のスキーマには `id` と `type` があり、`catalog.yaml` にはノードの言語ごとのタイトルと説明があります。できたモデルは、そのままビルドでき、`check` も通ります。分野の今のバージョンがリリース済みなら、`add` の前に [`bump`](/toolkit/versions#bump) を実行します。`add` がそのバージョンのソースを変え、`build` と `check` が止まるからです。続けて、[属性を書きます](#attributes)。

住所のように属性の中で使う値の型は、`--value` を付けて作ります。

```bash
npx @geolonia/datamodels@0.3.15 add road/Segment --value
```

## カタログのモデルから始める {#extend}

このカタログのモデルから始めるときは、`extend` を使います。名前は似ていますが、[拡張](/guide/extend)とは別のもので、自分のサイトに新しいモデルを作ります。そのうえで、[下のように](#attributes)自分の属性を足します。

```bash
npx @geolonia/datamodels@0.3.15 extend task/Task road/RoadTask
```

最初の引数は、土台にするモデルです。相手のサイトの `catalog.json` にある `<subject>/<Type>` か、型の IRI で指定します。`--index` は、その `catalog.json` です。指定しなければ、型 IRI のときは、その IRI を作ったノードの索引を使います（モデルが載っていれば）。それ以外は `node.yaml` の最初のノード、無ければ datamodels.jp です。詳しくは[型 IRI で指定したモデル](/toolkit/reference#type-iri)にあります。ターミナルで引数なしに実行すると、一覧からモデルを選び、新しいモデルの名前を入力できます。

`extend` は次のことをします。

- 相手のモデルの今のバージョンのスキーマをコピーし、そのバージョンの `@context` を分野の `@context` に取り込みます。
- 相手のカタログから属性の説明を取り、例を新しいモデルに合わせて書き換えます。既定の形では、モデルのタイトルと説明も取ります。`--subclass` では、新しい型の名前から作るので（"A subtype of …"）、自分で書き直します。
- 土台にしたモデルを `catalog.yaml` の `extends` に記録します。そのため、`check` が名前と意味を変えていないかを検査できます。
- 相手のサイトが `node.yaml` の `nodes` に無ければ、足します。

作り方は 2 通りです。

- **既定：** 同じ型に属性を足します。型は相手のモデルの IRI のままです（`x-alias-of`）。
- **`--subclass`：** 自分の名前空間に独自の型を作り、相手のモデルを親にします（`x-subclass-of`）。

`extend` も、`add` と同じ 4 つのファイルを書き出します。分野の `context.jsonld` の `@context` は、取り込んだ @context の URL と、このノードの用語を並べたリストになります。

## 属性を書く {#attributes}

属性は、1 つにつき 3 か所に書きます（例は `add` で作った `RoadPatrol` です）。

<svg class="flow-diagram" viewBox="0 0 460 280" role="img" aria-label="1 つの属性を 3 つのファイルに書きます。schema.json では、x-iri が route に IRI https://models.example.org/ns/road#route を与えます。context.jsonld では、route が road:route になり、同じ IRI に展開されます。catalog.yaml は、名前で結び付けて route に日本語と英語の説明を与えます。語彙は、その説明で IRI を説明します。check は、x-iri が @context で展開した IRI と同じかを検査します。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="at-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="10" y="8" width="210" height="56" rx="10"/><text class="t m" x="115" y="32">schema.json</text><text class="s" x="115" y="52">"x-iri": "…/ns/road#route"</text><rect class="box" x="240" y="8" width="210" height="56" rx="10"/><text class="t m" x="345" y="32">context.jsonld</text><text class="s" x="345" y="52">"route": "road:route"</text><line class="a" x1="115" y1="64" x2="196" y2="94" marker-end="url(#at-ah)"/><line class="a" x1="345" y1="64" x2="264" y2="94" marker-end="url(#at-ah)"/><rect class="box main" x="10" y="96" width="440" height="58" rx="10"/><text class="t" x="230" y="120">1 つの IRI</text><text class="s" x="230" y="139">https://models.example.org/ns/road#route</text><rect class="box" x="10" y="184" width="180" height="56" rx="10"/><text class="t m" x="100" y="208">catalog.yaml</text><text class="s" x="100" y="228">route の説明（ja、en）</text><rect class="box" x="270" y="184" width="180" height="56" rx="10"/><text class="t" x="360" y="208">語彙</text><text class="s" x="360" y="228">IRI とその説明</text><line class="a" x1="360" y1="154" x2="360" y2="182" marker-end="url(#at-ah)"/><line class="a" x1="190" y1="212" x2="268" y2="212" marker-end="url(#at-ah)"/><text class="s" x="229" y="204">名前で</text><text class="s" x="230" y="268">check は、x-iri が @context で展開した IRI と同じかを検査</text></svg>

まず `models/road/RoadPatrol/schema.json` の `properties` に書き、IRI は `x-iri` に入れます。

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
