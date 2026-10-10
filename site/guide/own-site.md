---
title: 自分のサイトで公開する
description: datamodels-toolkit で、自分のデータモデルを変わらない URL で GitHub Pages に公開する手順
---

# 自分のサイトで公開する

自分のデータモデルを、自分のサイト（ノード）で公開する手順です。最初のコマンドから、自分のドメインで公開するまでを順に説明します。そもそも自分のサイトが要るかどうかは、[自分のデータモデル](/guide/own-models)で確かめてください。

できあがるのは [models.geolonia.com](https://models.geolonia.com) のようなサイトです。`catalog.json`、`@context`、JSON Schema、語彙、例、型と属性ごとの説明のページがそろいます。

## 用意するもの {#before}

- [Node.js](https://nodejs.org/) 24 以降。コマンドは `npx` で実行するので、インストールは要りません。
- GitHub のアカウント（GitHub Pages で公開するため）。
- 自分で管理できるドメインかサブドメイン（`models.example.org` など。推奨。[手順 5](#domain)）。

## 1. ノードを作る {#init}

```bash
npx github:geolonia/datamodels-toolkit#v0.1.0 init my-models
cd my-models
```

`init` がいくつか質問します。

- **ベース URL：** ノードを置く場所です（例：`https://models.example.org`）。ノードが公開するすべての IRI に入るので、**公開した後は変えられません**。`https://<アカウント>.github.io/<リポジトリ>` も使えますが、IRI が GitHub のアカウント名に依存します。
- **言語：** `ja,en` など。1 つでも構いません。
- **公開者：** 組織の名前とウェブサイトです。
- **ライセンス：** `CC0-1.0` なら、だれでも条件なしにモデルを使えます（このカタログと同じです）。
- **最初のサブジェクト：** 1 つの `@context` を共有するモデルのまとまりです（例：`road`）。この名前も IRI に入ります。

`init` は、設定の `node.yaml`、サブジェクトの `models/road/`、README、公開用のワークフローを書き出します。既存のリポジトリで実行すると、足りないファイルだけを足します。

[GitHub CLI](https://cli.github.com/)（`gh`）があれば、`--github my-org/my-models` を付けて実行できます。`init` がその名前で公開リポジトリを作り、ファイルを push して GitHub Pages を有効にします（[手順 4](#publish)）。

## 2. モデルを足す {#add}

```bash
npx github:geolonia/datamodels-toolkit#v0.1.0 add road/RoadPatrol
```

`models/road/RoadPatrol/` に `schema.json`、`catalog.yaml`、`examples/example.json` ができます。サブジェクトの `@context` には型 `RoadPatrol` が入ります。属性は、1 つにつき 3 か所に書きます。まず `models/road/RoadPatrol/schema.json` の `properties` に書き、IRI は `x-iri` に入れます。

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

## 3. 検査してビルドする {#check}

```bash
npx github:geolonia/datamodels-toolkit#v0.1.0 check
npx github:geolonia/datamodels-toolkit#v0.1.0 build
```

`check` は、すべてのスキーマと例を検査します。`build` はサイトを `_site/` に書き出すので、`_site/index.html` を開いて確かめられます。GitHub では、Pull Request のたびにワークフローが同じ検査をします。

## 4. GitHub Pages で公開する {#publish}

`--github` を付けて始めた場合は、リポジトリができています。モデルをコミットして push してください。

そうでない場合は、GitHub で空のリポジトリを作り、フォルダーをその `main` ブランチに push します。そのうえで、リポジトリの **Settings → Pages** で、**Source** を **GitHub Actions** にします。

これで、`main` への push のたびにノードがビルドされ、公開されます。ドメインを設定するまでは、`https://<アカウント>.github.io/<リポジトリ>/` で表示されます。

## 5. 自分のドメインで公開する {#domain}

1. DNS で、サブドメインから `<アカウント>.github.io` への CNAME レコードを追加します（例：`models` → `my-org.github.io`）。
2. **Settings → Pages** の **Custom domain** にドメインを入力します。GitHub が証明書を用意したら（数分から 1 時間ほど）、**Enforce HTTPS** を有効にします。

アカウントか組織で[ドメインを確認](https://docs.github.com/ja/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)しておくと、ほかの人がそのドメインでサイトを公開できなくなります。

## 公開した後でモデルを変える {#versions}

公開したバージョンは変えられません。`@context` を指定したデータは、その内容を前提にしているからです。`check` は公開済みのファイルと比べ、変わるファイルがあれば失敗します。そのときは、`subject.yaml` の `version` を上げてください（[URL とバージョン](/guide/urls#versions)）。

::: warning 古いバージョン
今のところ、サイトには各サブジェクトの最新のバージョンしかありません。バージョンを上げると、古いバージョンのファイルはサイトから消えます。残すためのコマンドを準備しています（[datamodels-toolkit#27](https://github.com/geolonia/datamodels-toolkit/issues/27)）。
:::

すべてのコマンドとオプション：[datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit#readme)（英語）
