---
title: 検査とビルド
description: datamodels-toolkit の check と build でノードを検査してビルドし、GitHub Action で公開する
---

# 検査とビルド

```bash
npx @geolonia/datamodels@0.3.16 check
npx @geolonia/datamodels@0.3.16 build
```

`check` は、すべてのスキーマと例を検査します。GitHub では、Pull Request のたびにワークフローが同じ検査をします。

まだ公開していないノードでは、`check` は公開済みのファイルと比べられません。そのため、次のような注記を出します。問題ではないので、終了コードは 0 です。

```text
  note: https://models.example.org/context/road/v0.1.0.jsonld: not reachable (ENOTFOUND), not compared
  …
.: ok
```

`build` は、サイトを `_site/` に書き出します。`_site/index.html` をブラウザーで開くと、トップページを確かめられます。ただし、ページの間のリンクはベース URL で始まるアドレスです。そのため、手元で開けるのはトップページだけです。

## check の検査 {#checks}

- すべてのスキーマがコンパイルでき、すべての `examples/example.json` がスキーマに合っていること。例はモデルに 1 つで、`example.json` と、normalized の形の `example-normalized.jsonld` です。`examples/` のほかのファイルは、読まず、公開せず、検査もしません。そのことを `check` が知らせます。
- `schema.json` について。`type` の `const` がモデルのフォルダー名であること、`$id` がビルドでスキーマを公開する URL であること、`x-version`（あれば）が分野のバージョンであること。各 `x-ngsi.type` が `Property`、`Relationship`、`GeoProperty`、`JsonProperty`、`VocabProperty` のどれかであること。
- `example.json` は、`{"json": …}` と `{"vocab": …}` の包みを外して検証します。この包みは、key-values の形で `JsonProperty` と `VocabProperty` に付くもので、スキーマが表すのは包みの中の値です。エンティティの型の例は、`@context` を付けた形（別名の URL と、正確な URL に NGSI-LD のコアの context を足したもの）でも検証します。データに `@context` が付くこともあるので、スキーマはそれも受け付ける必要があります。どちらの例でも、Polygon の輪が閉じていること（RFC 7946）。
- `example-normalized.jsonld`（あれば）がスキーマに従うこと。各属性がスキーマの `x-ngsi.type`（無ければ `Property`）を持ち、複数の値は `x-ngsi.multi` のときだけです。日付と日時の値には `"@type": "Date"` か `"DateTime"` が付きます。`id` と `vocab` の値は `example.json` と同じで、key-values の形にしても有効です。`@context` は、分野のメジャーバージョンの別名の URL（`v1.jsonld` など）を含むリストです。
- JSON-LD のプロセッサーが `example-normalized.jsonld` を展開できること。各属性はその IRI に、型はモデルの型の IRI に、`vocab` の値は定義された IRI になります。もう一度コンパクトにしても、何も失われません。値の型の例は、属性の値として試します。語彙も展開できる必要があります。ノード自身の @context はビルドから取るので、オフラインでも検査できます。NGSI-LD のコアの context v1.8 は、ツールキットに入っています。それ以外の context はオンラインで読み、読めなければ知らせるだけです。
- エンティティの型と属性がすべて分野の `@context` の用語（または `location` などの NGSI-LD のコアの用語）で、スキーマの IRI（`x-iri`）に展開されること。そうでなければ、JSON-LD は属性を捨てるか、別の意味にします。URL で取り込んだ context の用語は、オンラインで検査します。オフラインでは知らせるだけです。
- 各対応表（`mapping/*.yaml`）が[対応表](/guide/mapping)の形であること。`standard` に `name`（任意で `url`、`license`、`note`）があり、項目ごとの行に `to`（標準に当たる項目が無ければ `null`）と、任意の `note` があります。文章はノードの言語で書きます。言語タグでないキーは、YAML がカンマで切った文章なので、引用符で囲みます。
- 対応表の[変換の規則](/guide/mapping#convert)を、`convert` と同じように検査します。`via` はノードの別の対応表（`<subject>/<Type>/<name>`）を指し、`via` でつながる対応表が輪になっていないこと。配列の位置の行（`coordinates[2]`）は、説明のためだけの行です。知らないキーは知らせるので、書き間違いに気づけます。
- 今のバージョンのリリースのスナップショットが、ソースから作るものと同じであること。今のバージョンのものも含めて、すべてのスナップショットをオンラインのファイルと比べ、`--base` では git の参照とも比べます。公開済みのバージョンが変わらずに配信されていることを確かめます（[公開したバージョンを守る仕組み](/toolkit/versions#never-changes)）。
- `extends` で土台にしたモデルの用語を、定義し直していないこと。同じ名前は、同じ IRI のままです。

問題があれば、終了コードは 1 です。ほかのノードに届かないときや、20 秒以内に応答が無いときは、知らせるだけです。止まっているノードのせいで、ほかの人の検査が失敗することはありません。`--offline` を付けると、公開済みのファイル、土台にしたモデル、ほかのサイトのスキーマを読みません。

`check` は、ほかのノードのファイルを、公開されたホストから https でだけ読みます。自分のノードに書いたアドレスがこの決まりで読めないときは問題になり、終了コードは 1 です。転送先が使えないアドレスのときや、ホスト名がプライベートなアドレスを指すときは、知らせるだけです。ほかのノードのファイルにあるアドレスも同じです。

## GitHub Action {#action}

`init` が書き出すワークフロー（`.github/workflows/publish.yml`）は、ツールキットの GitHub Action を使います。Action は `check` と `build` を実行し、ノードを GitHub Pages に公開します。Pull Request では検査とビルドだけを行い、`main` への push のたびに公開します（[GitHub Pages で公開する](/toolkit/start#publish)）。

```yaml
# .github/workflows/publish.yml
name: Publish
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions: {}

jobs:
  check:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@<SHA> # vX.Y.Z
        with:
          persist-credentials: false
      - uses: geolonia/datamodels-toolkit@<SHA> # vX.Y.Z
        with:
          deploy: 'false'

  publish:
    if: github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.node.outputs.page_url }}
    concurrency:
      group: pages
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@<SHA> # vX.Y.Z
        with:
          persist-credentials: false
      - id: node
        uses: geolonia/datamodels-toolkit@<SHA> # vX.Y.Z
```

ワークフローは、各 Action をリリースのコミットの SHA で固定し、タグをコメントに書きます（上の `<SHA> # vX.Y.Z`）。新しいツールキットには [`upgrade`](/toolkit/versions#upgrade) で移ります。Dependabot も新しいリリースを提案します。

Action の入力は次の 3 つです。

- `directory`：`node.yaml` と `models/` のあるフォルダーです。既定は `.` です。
- `deploy`：`'false'` なら、検査とビルドだけをします。既定は `'true'` です。
- `offline`：`'true'` なら、ネットワークを使わずに検査します。既定は `'false'` です。

出力は、`page_url`（公開したサイトのアドレス）と、`site`（ビルドしたファイルのフォルダー）です。`site` は、ほかのホストで公開するステップのためのもので、v0.3.7 からあります。
