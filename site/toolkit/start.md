---
title: サイトを始める
description: datamodels-toolkit の init で自分のデータモデルのサイト（ノード）を作り、GitHub Pages と自分のドメインで公開する手順
---

# サイトを始める

自分のデータモデルを公開するサイト（ノード）を作り、自分のドメインで公開するまでを順に説明します。そもそも自分のサイトが要るかどうかは、[自分のデータモデル](/guide/own-models)で確かめてください。

できあがるのは [models.gtt-project.org](https://models.gtt-project.org/) のようなサイトです。`catalog.json`、`@context`、JSON Schema、語彙、例、型と属性ごとの説明のページがそろいます。

## 用意するもの {#before}

- [Node.js](https://nodejs.org/) 24 以降。コマンドは `npx` で実行するので、インストールは要りません。
- GitHub のアカウント（GitHub Pages で公開するため）。
- 自分で管理できるドメインかサブドメイン（`models.example.org` など。推奨。[手順 3](#domain)）。

## 1. ノードを作る {#init}

```bash
npx github:geolonia/datamodels-toolkit#v0.3.6 init my-models
cd my-models
```

`init` がいくつか質問します。

- **ベース URL：** ノードを置く場所です（例：`https://models.example.org`）。ノードが公開するすべての IRI に入るので、**公開した後は変えられません**。`https://<アカウント>.github.io/<リポジトリ>` も使えますが、IRI が GitHub のアカウント名に依存します。ドメインより長く使う IRI にするなら、[w3id.org のアドレス](#w3id)を使います。
- **言語：** `ja,en` など。1 つでも構いません。
- **公開者：** 組織の名前とウェブサイトです。
- **ライセンス：** `CC0-1.0` なら、だれでも条件なしにモデルを使えます（このカタログと同じです）。
- **最初のサブジェクト：** 1 つの `@context` を共有するモデルのまとまりです（例：`road`）。この名前も IRI に入ります。

`init` は、設定の `node.yaml`、サブジェクトの `models/road/`、README、`LICENSE`、公開用のワークフローを書き出します。`LICENSE` に条文が入るのは CC0-1.0 と CC-BY-4.0 で、ほかのライセンスでは自分で条文を置きます。ツールキットの新しいリリースを提案する Dependabot の設定も書き出します。既存のリポジトリで実行すると、足りないファイルだけを足します。

[GitHub CLI](https://cli.github.com/)（`gh`）があれば、`--github my-org/my-models` を付けて実行できます。`init` がその名前で公開リポジトリを作り、ファイルを push して GitHub Pages を有効にします（[手順 2](#publish)）。

## 2. GitHub Pages で公開する {#publish}

`--github` を付けて始めた場合は、リポジトリができています。モデルなどの変更は、コミットして push してください。

そうでない場合は、GitHub で空のリポジトリを作り、フォルダーをその `main` ブランチに push します。そのうえで、リポジトリの **Settings → Pages** で、**Source** を **GitHub Actions** にします。

これで、`main` への push のたびにノードがビルドされ、公開されます。ドメインを設定するまでは、`https://<アカウント>.github.io/<リポジトリ>/` で表示されます。

## 3. 自分のドメインで公開する {#domain}

1. DNS で、サブドメインから `<アカウント>.github.io` への CNAME レコードを追加します（例：`models` → `my-org.github.io`）。
2. **Settings → Pages** の **Custom domain** にドメインを入力します。GitHub が証明書を用意したら（数分から 1 時間ほど）、**Enforce HTTPS** を有効にします。

アカウントか組織で[ドメインを確認](https://docs.github.com/ja/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)しておくと、ほかの人がそのドメインでサイトを公開できなくなります。

## 4. 変わらないアドレス（任意） {#w3id}

IRI には自分のドメインが入るので、IRI が使えるのはドメインを持ち続ける間です。モデルがドメインより長く使われそうなとき（いずれ終わるプロジェクトや、移る予定のあるチームなど）は、[w3id.org](https://w3id.org/) のアドレスを使います。W3C の Permanent Identifier Community Group が運営する、無料の転送サービスです。`https://w3id.org/<名前>/` が、ノードのある場所へ転送します。ノードを移すときは、転送先だけを変えます。

公開する前に決めてください。ベース URL は、すべての IRI に入ります。

1. 名前を決めます。小文字の英字、数字、ハイフンで、一般的な単語は避けます（例：`my-org-models`）。[`ids/`](https://github.com/perma-id/w3id.org/tree/master/ids) で、その名前が使われていないか確かめてください。大文字と小文字の違いも確かめます（`ids/Foo/` と `ids/foo/` を両方置くことはできません）。個人のノードは、自分の名前の代わりに共用の [`/people/`](https://github.com/perma-id/w3id.org/tree/master/ids/people) の下に置きます（`https://w3id.org/people/<名前>/`）。
2. [手順 1](#init) で、ベース URL に `https://w3id.org/my-org-models` を指定し、ノードを自分のドメインで公開します（[手順 2](#publish)、[手順 3](#domain)）。サイト自体はそこに置いたままです。ノードが公開するリンクと IRI はすべて w3id.org を通るので、転送ができた時点で使えるようになります。
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

## GitHub Pages 以外のホスト {#other-hosts}

ノードは静的なファイルなので、GitHub Pages 以外のホストにも置けます。`build` は、Cloudflare（Pages と Workers）と Netlify が読む 2 つのファイルも書き出します。`_headers` はファイルごとの Content-Type と CORS、`_redirects` はスラッシュ IRI の転送です。ワークフローの例と、ほかのホストで設定することは、[datamodels-toolkit の README](https://github.com/geolonia/datamodels-toolkit#other-hosts)（英語）にあります。

サイトができたら、[サイトのモデル](/toolkit/models)に進みます。
