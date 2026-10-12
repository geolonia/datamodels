---
title: バージョン
description: datamodels-toolkit で、公開したモデルを新しいバージョンで変え、古いバージョンを残し、新しいツールキットに移る手順
---

# バージョン

公開したバージョンは変えられません。`@context` を指定したデータは、その内容を前提にしているからです。`check` は公開済みのファイルと比べ、変わるファイルがあれば失敗します。

## 公開した後でモデルを変える {#bump}

変える前に、`bump` で次のバージョンを始めます。`bump` は、公開したバージョンをサイトに残します（その `@context`、語彙、スキーマを `models/road/releases/` に保存します）。そのうえで、`subject.yaml` の `version` とスキーマの URL のバージョンを上げます。公開済みのファイルと違えば止まります。結果をコミットしてください。

```bash
npx @geolonia/datamodels@0.3.10 bump road minor
```

まだ公開していないノードでは、比べるファイルが無いので、`bump` と `release` は止まります。

```text
road v0.1.0: nothing released, the published files could not be compared:
  https://models.example.org/context/road/v0.1.0.jsonld: ENOTFOUND
  …
Try again when the site answers, or release with --offline to skip the comparison.
```

そのときは `--offline` を付けて、比べずに保存します（`bump road minor --offline`）。

そのうえでモデルを変えます。サイトには両方のバージョンが残ります。変更にどのレベル（`patch`、`minor`、`major`）が合うかは、[URL とバージョン](/guide/urls#versions)を見てください。

## バージョンを残すだけ {#release}

`bump` が最初に行う保存は、`release` だけでも実行できます。今のバージョンを `models/road/releases/` に保存し、バージョンは上げません。公開した後、ソースを変える前に実行して、結果をコミットします。`check` は、まだ保存していない公開済みのバージョンを知らせます。

```bash
npx @geolonia/datamodels@0.3.10 release road
```

## 新しいツールキットに移る {#upgrade}

ノードを新しいツールキットに移すには、`upgrade` を実行してコミットします。ワークフローと、ノードの最上位にある Markdown ファイル（README など）のバージョンが、最新のリリース（`--to` で指定したときはそのリリース）に変わります。Dependabot も新しいリリースを提案します。

```bash
npx @geolonia/datamodels@0.3.10 upgrade
```
