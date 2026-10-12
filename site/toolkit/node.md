---
title: ノードとビルド
description: datamodels-toolkit のノードの中身（node.yaml と models/）と、build コマンドがそこから書き出すファイルとページ
---

# ノードとビルド

ノードは、`node.yaml`（設定）と `models/`（モデル）を持つフォルダーです。`build` は、これをサイトのファイルとページにします。このページでは、フォルダーに置くものと、書き出されるものを説明します。ファイルを書くコマンドは作業ごとのページにあります。まずは[サイトを始める](/toolkit/start)から読んでください。

## フォルダー {#layout}

```text
my-models/
  node.yaml
  models/
    road/
      subject.yaml
      context.jsonld
      releases/
        v0.1.0/
      RoadPatrol/
        schema.json
        catalog.yaml
        notes.yaml
        examples/
          example.json
          example-normalized.jsonld
        mapping/
          <name>.yaml
```

`models/` の構成は [geolonia/datamodels](https://github.com/geolonia/datamodels/tree/main/models) と同じです。

- 分野（`road`）ごとに 1 つのフォルダーがあり、`subject.yaml` と `context.jsonld` を置きます。`subject.yaml` には、名前、バージョン、`source`、ノードの各言語のタイトルと説明を書きます。最初の分野は `init` が書き出します。
- モデル（`RoadPatrol`）ごとに 1 つのフォルダーがあり、`schema.json`、`catalog.yaml`、`examples/example.json` を置きます。`catalog.yaml` には、タイトル、説明、`status`、属性の説明を書きます。これらは `add` と `extend` が書き出します（[サイトのモデル](/toolkit/models)）。
- 次のファイルは、なくても構いません。`notes.yaml` は出典、決めたこととその理由で、モデルのページに出ます。`examples/example-normalized.jsonld` は normalized の形の例です。`mapping/` には対応表を置きます（[対応表](/guide/mapping)）。`examples/` のほかのファイルは公開せず、`check` が注記を出します。
- `releases/` には、公開したバージョンのスナップショットを置きます。書き出すのは `release` と `bump` です（[バージョン](/toolkit/versions)）。

このカタログと違い、ノードの言語は 1 つで足ります。`ADOPTERS.yaml` もありません。

ほかのノードのモデルをもとにしたモデルは、`catalog.yaml` の `extends` にもとのモデルを書きます。書くのは `typeIri`、`version`（X.Y.Z）、`index`（そのノードの `catalog.json`）です。[`extend`](/toolkit/models#extend) が書き出します。

## node.yaml {#node-yaml}

```yaml
baseUrl: https://models.example.org
iris: hash
languages: [en]
publisher: { name: { en: Example Inc. }, url: https://example.org/ }
license: CC0-1.0
nodes:
  - { url: https://datamodels.jp/, index: https://datamodels.jp/catalog.json }
prerelease: true
```

| キー | 既定値 | 内容 |
|---|---|---|
| `baseUrl` | （必須） | ノードのアドレス。http(s) の URL。すべての IRI に入るので、一度だけ決める（[サイトを始める](/toolkit/start#init)） |
| `iris` | `hash` | `hash` は `/ns/<subject>#<Term>` で、分野ごとに 1 ページ、用語ごとにアンカーを置く。どの静的ホストでも使える。`slash` は `/ns/<subject>/<Term>` で、転送が要る（[GitHub Pages 以外のホスト](/toolkit/hosts)）。GitHub Pages は転送できない |
| `languages` | `[en]` | ノードの言語。主な言語を先に書く。`subject.yaml` には、言語ごとのタイトルと説明が要る |
| `publisher` | （必須） | ノードを運営する人や組織。1 つ以上の言語の `name` と、`url` |
| `license` | （必須） | モデルのライセンス。`CC0-1.0` などの SPDX の識別子 |
| `licenseUrl` | | ライセンスの本文がある URL。無ければ、ページは `license` の SPDX のページにリンクする |
| `nodes` | | このノードが知っているほかのノード。それぞれに `url` と `index` を書く。`@context` はその `@context` を取り込める。`build` はスキーマをそこからだけ読む。`extend` は読んだノードを足す |
| `prerelease` | | 正式公開の前は `true`。公開したバージョンをまだ直せる（[バージョン](/toolkit/versions)） |

`build` と `check` は、`node.yaml` の問題をすべてまとめて示します。

## build が書き出すもの {#build}

```bash
npx @geolonia/datamodels@0.3.10 build
npx @geolonia/datamodels@0.3.10 build my-models --out public
```

ファイルは、ノードのフォルダーの `_site/` か、`--out` に書き出します。次のパスは、ベース URL の下の URL でもあります。

- `catalog.json`：ノードの索引です。[datamodels.jp のもの](/catalog.json)と同じ形式で、`publisher`、`license`、`nodes` と、各モデルの URL、`extends`、`adapters` を含みます。
- `context/<subject>/vX.Y.Z.jsonld` と、メジャーバージョンの別名 `vX.jsonld` です（[URL とバージョン](/guide/urls)）。
- `vocab/<subject>/vX.Y.Z.jsonld` と `vX.jsonld`：語彙です。
- `schema/<subject>/<Type>/vX.Y.Z.json` と `vX.json`：JSON Schema です。
- `examples/<subject>/<Type>/`：例です。
- `mapping/<subject>/<Type>/<name>.yaml`：対応表を、元のファイルのまま書き出します。
- `adapters/<name>/<subject>/<Type>.<ext>`：ほかのツール向けのファイルです（[下](#adapters)）。
- `releases/` にある、リリースしたすべてのバージョンです。現在のバージョンと並べて置きます。
- `llms.txt`：AI ツール向けの索引です。
- ページ（[下](#pages)）と `404.html` です。
- `_headers` と、スラッシュ IRI のときの `_redirects` です。GitHub Pages 以外のホストが読みます（[GitHub Pages 以外のホスト](/toolkit/hosts)）。

`build` は、書き出し先のフォルダーを空にしません。ただし、古いファイルを 2 種類消します。v0.3.7 より前のツールキットが書いた `adapters/index.html`（`/<lang>/` の下も）と、ハッシュ IRI のときに以前のビルドが残した `_redirects` です。

リリースしたバージョンの元ファイルがスナップショットと違えば、`build` は止まります。終了コードは[コマンドリファレンス](/toolkit/reference#build)にあります。

### ほかのツール向けのファイル {#adapters}

`build` は、エンティティのモデルごとに [`export`](/toolkit/export) と同じファイルを書き出します。CSV テンプレート、その Table Schema、AI 用のスキーマ、PostgreSQL / PostGIS のテーブルです。`catalog.json` では、datamodels.jp と同じく、モデルの項目の `adapters` に載ります。モデルのページには**ダウンロード**の行があり、ファイルごとのボタンと、datamodels.jp の[アダプター](/adapters/#downloads)への「これらのファイルについて」のリンクが並びます。

- モデルが、ほかのノードのスキーマを参照することがあります。datamodels.jp の JapaneseAddress などです。`build` はこれをオンラインで読みますが、`nodes` にあるノードの `schema/` フォルダーからだけです。ほかの場所にあるときや読めないときは、そのモデルのファイルを書き出さず、`build` がそう知らせます。
- これらのファイルは毎回作り直します。公開したファイルは変えない、という約束には含まれません。

## ページ {#pages}

ページは、等幅フォントのプレーンな HTML で、JavaScript を使いません。`curl` でも読めます。

- `/`：分野とそのモデルの一覧です。
- 分野ごとのページです。ハッシュ IRI では、名前空間の文書 `/ns/<subject>`（ファイルは `ns/<subject>.html`）で、型と属性ごとにアンカーがあります。そのため、どの IRI もこのページで開きます。スラッシュ IRI では `/models/<subject>/` です。
- モデルごとのページ `/models/<subject>/<Type>/` です。属性ごとのアンカー、対応している標準（`mapping/` から）、注記（`notes.yaml` から）、ダウンロードの行があります。
- リリースしたバージョンにあり、現在のバージョンに無いモデル（名前を変えたか消したもの）は、元のアドレスにページが残ります。そのページは、モデルがあったバージョンを示し、最後のスキーマと `@context` にリンクします。同じ型の IRI を持つ現在のモデルがあれば、その名前も示します。分野のページには、以前のバージョンが作った用語のアンカーがすべて残ります。
- `404.html`：ページの無いアドレスに、GitHub Pages や多くの静的ホストが返すページです。主な言語で 1 ページだけ作り、ほかの言語の文も載せます。

どのページも、`catalog.json` へのリンク（`<link rel="alternate" type="application/json">`）を持ちます。説明、リンクのプレビューのための Open Graph のタグ、`<meta name="generator">` も持ちます。`404.html` 以外のページは、正規の URL と、ほかの言語のページへのリンク（`hreflang`）も持ちます。`404.html` は、検索エンジンに載せないよう求めます。ページは、端末のライトとダークの設定に従います。

### 言語 {#languages}

- 主な言語のページは、IRI が開くベース URL に置きます。ほかの言語は `/en/` のように `/<lang>/` の下に置き、ヘッダーに切り替えのリンクを付けます。
- 各ページは、ノードの文をそのページの言語で示します。その言語の文が無ければ、`languages` の順に、文がある最初の言語のものを使います。
- ページに決まって出る文は、日本語と英語です。ほかの言語のページでは英語を使います。
- 英語が主な言語でないときは、datamodels.jp と同じく、`catalog.json` に英語のページを `pageUrlEn` として載せます。

## コードから使う {#library}

`@geolonia/datamodels/build` は、機械が読むファイルを作るコードです。datamodels.jp もノードも、このコードを使います。自分のスクリプトから使うときは、次のようにします。

```js
import { catalogUrls, loadSubjects, publishCatalog }
  from '@geolonia/datamodels/build';

const urls = catalogUrls('https://models.example.org', { iris: 'hash' });
const subjects = await loadSubjects('models', {
  urls, languages: ['en'], subjectFields: ['title', 'description'],
});
await publishCatalog(subjects, {
  urls, outDir: 'dist', languages: ['en'], head: { license: 'CC0-1.0' },
});
```

`catalogUrls` は、`iris: 'hash'` を渡さなければスラッシュ IRI を使います。
