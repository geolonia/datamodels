---
title: コマンドリファレンス
description: datamodels-toolkit の datamodels コマンドのすべてのコマンドと、その引数、オプション、既定値、終了コード
---

# コマンドリファレンス

`datamodels` のすべてのコマンドについて、引数、オプション、既定値、終了コードをこのページにまとめます。使い方の手順は作業ごとのページにあり、各コマンドからリンクしています。

コマンドは `npx` で実行します（[実行する](/toolkit/#run)）。

```bash
npx @geolonia/datamodels@0.3.14 search 避難
```

## すべてのコマンドに共通すること {#general}

- `datamodels --help` で、コマンドの一覧を表示します。1 つのコマンドの引数とオプションは、`datamodels <command> --help` か `datamodels help <command>` で表示します。
- `[dir]` はノードのフォルダーで、`node.yaml` と `models/` があるところです（[ノードとビルド](/toolkit/node#layout)）。既定値は現在のフォルダーです。
- 結果は標準出力に出ます。`convert` のエンティティ、`mapping` の対応表、`search` と `nodes` の各行です。注記、修正、問題、まとめの行は標準エラー出力に出ます。
- 値をとるオプションには、値が要ります。空の値（`--out=`）や `-` で始まる値は、使い方の誤りです。

終了コードは次のとおりです。

| コード | 意味 |
|---|---|
| `0` | 完了しました。 |
| `1` | コマンドが問題を見つけたか、ファイルやサイトを読めませんでした。どんなときかは、下の各コマンドにあります。 |
| `2` | 使い方の誤りです。知らないコマンドやオプション、引数の不足、形の正しくないオプションの値などです。コマンドの使い方の行を表示します。あとで確かめる値もあり、そのときの終了コードは 1 です。どの値かは、下の各コマンドにあります。 |

## init {#init}

```text
datamodels init [dir] [options]
```

`dir` にノードを始めます。書き出すのは、`node.yaml`、最初の分野、README、`.gitignore`、ノードを公開するワークフロー、Dependabot の設定です。CC0-1.0 と CC-BY-4.0 なら `LICENSE` も書き出します。既にあるファイルはそのまま残します。手順は[サイトを始める](/toolkit/start#init)にあります。

| 引数・オプション | 既定値 | 内容 |
|---|---|---|
| `[dir]` | `.` | ファイルを書き出すところ |
| `--base-url <URL>` | （必須） | すべての IRI のもとになる URL。`https://models.example.org` など |
| `--iris <form>` | `hash` | `hash`（`/ns/<subject>#<Term>`）か `slash`（`/ns/<subject>/<Term>`） |
| `--languages <list>` | `en` | タイトルと説明の言語。カンマ区切りで、主な言語を先に書く |
| `--publisher <name>` | （必須） | ノードを公開する人や組織 |
| `--publisher-url <URL>` | （必須） | 公開する人や組織のウェブサイト |
| `--license <id>` | `CC0-1.0` | モデルのライセンス。SPDX の識別子 |
| `--subject <name>` | （必須） | 最初の分野。英小文字、数字、ハイフンで書く（`road` など） |
| `--github <owner/name>` | | `gh` で公開リポジトリも作り（既にリモートがあればそれを使い）、GitHub Pages を有効にする |
| `--yes` | | 何も尋ねず、オプションと既定値を使う |

端末で実行すると、`init` はオプションで渡していない項目を尋ねます。CI やスクリプトの中と `--yes` のときは尋ねません。必須のオプションが無ければ、使い方の誤り（終了コード 2）です。正しくない値があれば、何も書き出さずに止まります（終了コード 1）。

## search {#search}

```text
datamodels search <words...> [options]
```

型の名前、タイトル、属性、説明に言葉を含むモデルを、索引とそこからリンクしているノードから探します。手順は[先に既にあるモデルを探す](/toolkit/models#search)にあります。

| 引数・オプション | 既定値 | 内容 |
|---|---|---|
| `<words...>` | | 探す言葉。日本語でも英語でもよい。英字の語は 3 文字以上、日本語の語は漢字かカタカナを含む 2 文字以上 |
| `--index <URL>` | `https://datamodels.jp/catalog.json` | 探し始める `catalog.json`、またはノードのアドレス |
| `--depth <N>` | `1` | そこからたどるリンクの数（0～5）。0 なら索引だけを読む |
| `--limit <N>` | `10` | 出力するモデルの数 |
| `--json` | | 機械向けの出力。各モデルの型の IRI、バージョン、スキーマ、`@context`、索引を含む |

終了コードが 1 になるのは、探し始める索引を読めないときだけです。リンク先のノードを読めなければ、注記を出して飛ばします。探す言葉が 1 つも無ければ、使い方の誤りです。

## nodes {#nodes}

```text
datamodels nodes [options]
```

索引からたどれるノードを、名前、アドレス、ライセンス、モデルの数、リンク元のノードとともに並べます。手順は[先に既にあるモデルを探す](/toolkit/models#search)にあります。

| オプション | 既定値 | 内容 |
|---|---|---|
| `--index <URL>` | `https://datamodels.jp/catalog.json` | たどり始める `catalog.json`、またはノードのアドレス |
| `--depth <N>` | `1` | そこからたどるリンクの数（0～5）。0 なら索引だけを読む |
| `--json` | | 機械向けの出力 |

終了コードは `search` と同じです。

## add {#add}

```text
datamodels add <subject>/<Type> [dir] [--value]
```

ノードの分野にモデルを足します。書き出すのは、`schema.json`、`catalog.yaml`、例、`notes.yaml` です。分野の `@context` には型を足します。手順は[新しいモデル](/toolkit/models#add)にあります。

| 引数・オプション | 既定値 | 内容 |
|---|---|---|
| `<subject>/<Type>` | | 新しいモデル（`road/RoadPatrol` など）。分野は既にあるもの。型の名前は UpperCamelCase（英字と数字） |
| `[dir]` | `.` | ノード |
| `--value` | | エンティティの型ではなく、値型（住所のように、属性の中で使う構造）にする |

分野が無いとき、モデルが既にあるとき、型の名前が正しくないときなどは、終了コードが 1 です。

## extend {#extend}

```text
datamodels extend [model] [subject/Type] [dir] [options]
```

datamodels.jp などほかのノードのモデルをもとに、このノードのモデルを始めます。手順は[カタログのモデルから始める](/toolkit/models#extend)にあります。

| 引数・オプション | 既定値 | 内容 |
|---|---|---|
| `[model]` | （尋ねる） | もとにするモデル。ほかのノードの `catalog.json` にある `<subject>/<Type>`、または型の IRI |
| `[subject/Type]` | （尋ねる） | このノードの新しいモデル（`road/RoadTask` など） |
| `[dir]` | `.` | ノード |
| `--index <URL>` | `node.yaml` の最初のノード。無ければ `https://datamodels.jp/catalog.json` | ほかのノードの `catalog.json` |
| `--subclass` | | 同じ型に属性を足す（`x-alias-of`）のではなく、独自の型の IRI を持つ下位の型にする（`x-subclass-of`） |

端末で実行すると、`extend` は足りない引数を尋ねます。もとにするモデルは一覧から選びます。端末の外では、引数が足りなければ使い方の誤りです。

## check {#check}

```text
datamodels check [dir] [options]
```

ノードを公開する前に要る検査をします。スキーマ、例、公開済みのバージョン、拡張した用語を検査します。手順は[検査とビルド](/toolkit/check)にあります。

| 引数・オプション | 既定値 | 内容 |
|---|---|---|
| `[dir]` | `.` | ノード |
| `--offline` | | ネットワークが要る検査を飛ばす。公開済みのファイル、拡張したモデル、ほかのサイトのスキーマ |
| `--base <git ref>` | | リリースのスナップショットを git の参照（`origin/main` など、先に fetch しておく）と比べる。公開したバージョンは変えも消しもできない |
| `--all-released` | | すべての分野で、現在のバージョンのリリースのスナップショットを求める |

問題があれば、終了コードは 1 です。ほかのノードに届かないときや、20 秒以内に応答が無いときは、注記を出すだけです。どのバージョンを変えてよいかは[バージョン](/toolkit/versions)にあります。

## build {#build}

```text
datamodels build [dir] [--out <dir>]
```

ノードが公開するファイルを書き出します。書き出すものは[ノードとビルド](/toolkit/node#build)にあります。

| 引数・オプション | 既定値 | 内容 |
|---|---|---|
| `[dir]` | `.` | ノード |
| `--out <dir>` | `<dir>/_site` | ファイルを書き出すところ |

ノードが正しくないときは、終了コードが 1 です。たとえば、`node.yaml` の設定の誤りや、リリースしたバージョンの元ファイルの変更です。

## release {#release}

```text
datamodels release <subject> [dir] [--offline]
```

分野の現在のバージョンをサイトに残します。その `@context`、語彙、スキーマのスナップショットを `models/<subject>/releases/vX.Y.Z/` に保存します。手順は[バージョンを残すだけ](/toolkit/versions#release)にあります。

| 引数・オプション | 既定値 | 内容 |
|---|---|---|
| `<subject>` | | 分野（`road` など） |
| `[dir]` | `.` | ノード |
| `--offline` | | スナップショットを公開済みのファイルと比べない |

スナップショットが既にあれば、元ファイルをそれと比べるだけで、何も変えません。元ファイルがスナップショットや公開済みのファイルと違うときは、終了コードが 1 です。公開済みのファイルを読めないときも 1 です。404 は未公開とみなし、それ以外の HTTP エラーや読み取りの失敗で止まります。`--offline` を付けると、公開済みのファイルとの比較を飛ばします。

## bump {#bump}

```text
datamodels bump <subject> <level> [dir] [--offline]
```

分野に新しいバージョンを付けます。先に `release` を実行し、そのあと `subject.yaml` の `version` と、分野のスキーマの URL のバージョン（`$id` と、モデルの間の `$ref`）を上げます。手順は[公開した後でモデルを変える](/toolkit/versions#bump)にあります。

| 引数・オプション | 既定値 | 内容 |
|---|---|---|
| `<subject>` | | 分野（`road` など） |
| `<level>` | | `patch`、`minor`、`major` のどれか。Semantic Versioning のとおりで、既存のデータが使えなくなる変更は `major` |
| `[dir]` | `.` | ノード |
| `--offline` | | 公開済みのファイルと比べずにリリースする |

`release` と同じ理由でリリースできないときと、`<level>` が 3 つのどれでもないときは、終了コードが 1 です。

## upgrade {#upgrade}

```text
datamodels upgrade [dir] [--to <vX.Y.Z>]
```

ノードを、ツールキットのあるリリースに移します。`.github/workflows/` の Action は、リリースのコミットの SHA に固定し、タグをコメントに書きます。ノードの直下の Markdown ファイルでは、`npx` の行がそのリリースを使うよう書き換えます。v0.3.8 以降なら、古い書き方の `npx github:geolonia/datamodels-toolkit#vX.Y.Z` も、npm の書き方に変えます。それより古いリリースなら、GitHub の書き方にします。手順は[新しいツールキットに移る](/toolkit/versions#upgrade)で説明しています。

| 引数・オプション | 既定値 | 内容 |
|---|---|---|
| `[dir]` | `.` | ノード |
| `--to <vX.Y.Z>` | 最新のリリース | リリースのタグ（`v0.3.9` など） |

リリースは GitHub の API から読みます。読めないときと、タグがリリースでないときは、終了コードが 1 です。

## convert {#convert}

```text
datamodels convert <subject>/<Type> <mapping> <file.csv> [options]
```

一覧（CSV）を、カタログのモデルのエンティティに変換します。各エンティティは、モデルの JSON Schema で検証します。手順は[データを変換する](/toolkit/convert)にあります。

| 引数・オプション | 既定値 | 内容 |
|---|---|---|
| `<subject>/<Type>` | | モデル。ページにあるとおりに書く（`disaster/EvacuationSite` など） |
| `<mapping>` | | モデルの対応表の名前、自分の対応表（パス、または `.yaml` か `.yml` で終わる名前）、またはモデルの CSV テンプレートの列を持つ CSV のための `csv-template` |
| `<file.csv>` | | 一覧。UTF-8 か Shift_JIS |
| `--set <attribute=value>` | | 一覧に無い値。複数あれば繰り返す。対応表が値を入れる項目だけに使える |
| `--normalized` | key-values の形 | key-values ではなく、NGSI-LD の normalized の形にする |
| `--out <file.json>` | 標準出力 | エンティティをファイルに書き出す |
| `--check` | | 最初の何行か（`--rows`）だけを変換し、何も書き出さずに、直すところを示す |
| `--rows <N>` | `20` | `--check` で変換する行の数 |
| `--site <URL\|dir>` | `https://datamodels.jp` | カタログを読むところ。サイトと同じ構成のフォルダーでもよい |

次のときは、使い方の誤りです。`--check` 無しの `--rows`、`--out` や `--normalized` と一緒の `--check`、`=` の無い `--set`、対応表が値を入れない名前への `--set` です。

無効な行があるとき、ファイルを読めないとき、対応表を使えないときは、終了コードが 1 です。対応表を使えないのは、変換できない規則があるときと、自分の対応表に TODO やモデルに無い属性が残っているときです。`--check` では、検査したすべての行が有効で、対応表に問題が無いときだけ、終了コードが 0 です。

## mapping {#mapping}

```text
datamodels mapping <subject>/<Type> <file.csv> [options]
```

手元の一覧（CSV）とカタログのモデルから、対応表の下書きを作ります。属性ごとに 1 行で、合う列か TODO が入ります。手順は[それ以外の CSV](/toolkit/convert#your-own-list)にあります。

| 引数・オプション | 既定値 | 内容 |
|---|---|---|
| `<subject>/<Type>` | | モデル。ページにあるとおりに書く（`disaster/EvacuationSite` など） |
| `<file.csv>` | | 一覧。UTF-8 か Shift_JIS |
| `--out <file.yaml>` | 標準出力 | 新しいファイルに書き出す。既にあるファイルには書き込まない |
| `--site <URL\|dir>` | `https://datamodels.jp` | カタログを読むところ。サイトと同じ構成のフォルダーでもよい |

ファイルやカタログを読めないとき、モデルが値型のとき、`--out` のファイルが既にあるときは、終了コードが 1 です。

## export {#export}

```text
datamodels export <subject>/<Type> [dir] --to <adapters> [options]
```

エンティティのモデル 1 つから、ほかのツール向けのファイルを書き出します。使い方は[他のツールに書き出す](/toolkit/export)で説明しています。

| 引数・オプション | 既定値 | 内容 |
|---|---|---|
| `<subject>/<Type>` | | モデル（`disaster/EvacuationSite` など）、またはその型の IRI |
| `[dir]` | `.` | ノード。`--index` が無く、ノードにそのモデルがあれば、それを使う |
| `--to <adapters>` | （必須） | `csv`、`table-schema`、`ai`、`postgis` の 1 つ以上。カンマ区切り |
| `--out <dir>` | `.` | ファイルを書き出すところ。ファイル名は `<Type>.<ext>` |
| `--index <URL>` | `node.yaml` の最初のノード。無ければ `https://datamodels.jp/catalog.json` | モデルを読む `catalog.json`。指定すると、ノードは読まない。指定しなければ、ノードにモデルが無いときだけ既定のものを読む |

`--to` が無いときや知らない名前のときは、使い方の誤りです。モデルを読めないとき、モデルが値型のとき、ファイルを書き出せないときは、終了コードが 1 です。
