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
npx github:geolonia/datamodels-toolkit#v0.3.1 init my-models
cd my-models
```

`init` がいくつか質問します。

- **ベース URL：** ノードを置く場所です（例：`https://models.example.org`）。ノードが公開するすべての IRI に入るので、**公開した後は変えられません**。`https://<アカウント>.github.io/<リポジトリ>` も使えますが、IRI が GitHub のアカウント名に依存します。ドメインより長く使う IRI にするなら、[w3id.org のアドレス](#w3id)を使います。
- **言語：** `ja,en` など。1 つでも構いません。
- **公開者：** 組織の名前とウェブサイトです。
- **ライセンス：** `CC0-1.0` なら、だれでも条件なしにモデルを使えます（このカタログと同じです）。
- **最初のサブジェクト：** 1 つの `@context` を共有するモデルのまとまりです（例：`road`）。この名前も IRI に入ります。

`init` は、設定の `node.yaml`、サブジェクトの `models/road/`、README、`LICENSE`、公開用のワークフローを書き出します。`LICENSE` に条文が入るのは CC0-1.0 と CC-BY-4.0 で、ほかのライセンスでは自分で条文を置きます。ツールキットの新しいリリースを提案する Dependabot の設定も書き出します。既存のリポジトリで実行すると、足りないファイルだけを足します。

[GitHub CLI](https://cli.github.com/)（`gh`）があれば、`--github my-org/my-models` を付けて実行できます。`init` がその名前で公開リポジトリを作り、ファイルを push して GitHub Pages を有効にします（[手順 4](#publish)）。

## 2. モデルを足す {#add}

```bash
npx github:geolonia/datamodels-toolkit#v0.3.1 add road/RoadPatrol
```

このカタログのモデルから始めるときは、`extend` を使います。カタログのモデルのスキーマをコピーし、その `@context` を取り込み、土台にしたモデルを記録します。そのため、`check` が名前と意味を変えていないかを検査できます。そのうえで、下のように自分の属性を足します。`--subclass` を付けると、独自の IRI を持つサブタイプになります。

```bash
npx github:geolonia/datamodels-toolkit#v0.3.1 extend task/Task road/RoadTask
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
npx github:geolonia/datamodels-toolkit#v0.3.1 check
npx github:geolonia/datamodels-toolkit#v0.3.1 build
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

## 6. 変わらないアドレス（任意） {#w3id}

IRI には自分のドメインが入るので、IRI が使えるのはドメインを持ち続ける間です。モデルがドメインより長く使われそうなとき（いずれ終わるプロジェクトや、移る予定のあるチームなど）は、[w3id.org](https://w3id.org/) のアドレスを使います。W3C の Permanent Identifier Community Group が運営する、無料の転送サービスです。`https://w3id.org/<名前>/` が、ノードのある場所へ転送します。ノードを移すときは、転送先だけを変えます。

公開する前に決めてください。ベース URL は、すべての IRI に入ります。

1. 名前を決めます。小文字の英字、数字、ハイフンで、一般的な単語は避けます（例：`my-org-models`）。[`ids/`](https://github.com/perma-id/w3id.org/tree/master/ids) で、その名前が使われていないか確かめてください。大文字と小文字の違いも確かめます（`ids/Foo/` と `ids/foo/` を両方置くことはできません）。個人のノードは、自分の名前の代わりに共用の [`/people/`](https://github.com/perma-id/w3id.org/tree/master/ids/people) の下に置きます（`https://w3id.org/people/<名前>/`）。
2. [手順 1](#init) で、ベース URL に `https://w3id.org/my-org-models` を指定し、ノードを自分のドメインで公開します（[手順 4](#publish)、[手順 5](#domain)）。サイト自体はそこに置いたままです。ノードが公開するリンクと IRI はすべて w3id.org を通るので、転送ができた時点で使えるようになります。
3. [perma-id/w3id.org](https://github.com/perma-id/w3id.org) に、`ids/my-org-models/.htaccess` を足す Pull Request を開きます。連絡先と転送の規則を書きます。

   ```apache
   # # /my-org-models/
   #
   # https://w3id.org/my-org-models/ redirects to https://models.example.org/
   #
   # ## Contact
   # This space is administered by:
   #
   # Your Name
   # you@example.org
   # GitHub username: your-account

   RewriteEngine on
   RewriteRule ^(.*)$ https://models.example.org/$1 [R=302,L]
   ```

   この規則はパスをそのまま渡します。たとえば `https://w3id.org/my-org-models/ns/road` は `https://models.example.org/ns/road` を開きます。ノードのすべての IRI とファイルが、転送を通して使えます。301 ではなく 302 を使ってください。ブラウザーは 301 をずっと覚えるので、あとでノードを移せなくなります。レビューでは転送先が公開されているかを確かめるので、ノードを先に公開しておきます。Pull Request を開く前に、[Creating an identifier](https://w3id.org/docs/guides/create-an-id)（英語）を読んでください。

ハッシュ IRI も転送を通して使えます。`#` から後ろはブラウザーに残るので、`https://w3id.org/my-org-models/ns/road#RoadPatrol` は、ページの該当する行を開きます。

## 公開した後でモデルを変える {#versions}

公開したバージョンは変えられません。`@context` を指定したデータは、その内容を前提にしているからです。`check` は公開済みのファイルと比べ、変わるファイルがあれば失敗します。

変える前に、`bump` で次のバージョンを始めます。`bump` は、公開したバージョンをサイトに残します（その `@context`、語彙、スキーマを `models/road/releases/` に保存します）。そのうえで、`subject.yaml` の `version` とスキーマの URL のバージョンを上げます。公開済みのファイルと違えば止まります。結果をコミットしてください。

```bash
npx github:geolonia/datamodels-toolkit#v0.3.1 bump road minor
```

そのうえでモデルを変えます。サイトには両方のバージョンが残ります。変更にどのレベル（`patch`、`minor`、`major`）が合うかは、[URL とバージョン](/guide/urls#versions)を見てください。

ノードを新しいツールキットに移すには、`upgrade` を実行してコミットします。ワークフローと README のバージョンが変わります。Dependabot も新しいリリースを提案します。

すべてのコマンドとオプション：[datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit#readme)（英語）
