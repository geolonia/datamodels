---
title: GitHub Pages 以外のホスト
description: datamodels-toolkit のノードを、GitHub Pages ではなく Cloudflare Pages、Netlify などの静的ホストで公開する
---

# GitHub Pages 以外のホスト

`init` が書き出すワークフローは、ノードを GitHub Pages で公開します（[GitHub Pages で公開する](/toolkit/start#publish)）。ただ、`build` が書き出すのは静的なファイルなので、ノードはどの静的ホストにも置けます。このページでは、ホストに要ること、`build` がそのために書き出すファイル、Cloudflare Pages と Netlify で公開する方法を説明します。

## ホストに要ること {#rules}

GitHub Pages は、次のことを自分で行います。ほかのホストでも、同じことが要ります。

- ファイルごとに、その Content-Type を送ります（下の表）。
- `Access-Control-Allow-Origin: *` を送ります。ほかのサイトのブラウザーや JSON-LD のプロセッサーが、`@context` とスキーマを読めるようにするためです。
- ページの無いアドレスには、`404.html` をステータス 404 で返します。
- スラッシュ IRI のときは、各 IRI をそのページに転送します。

| ファイル | Content-Type |
|---|---|
| `context/`、`vocab/`、`example-normalized.jsonld` | `application/ld+json` |
| `schema/` | `application/schema+json` |
| `catalog.json`、`example.json`、Table Schema と AI 用のファイル | `application/json` |
| `mapping/` | `application/yaml` |
| `adapters/csv/` | `text/csv` |
| `adapters/postgis/` | `application/sql` |
| `llms.txt` | `text/plain` |

## build が書き出すファイル {#files}

`build` は、これらの規則を 2 つのファイルにしてサイトに書き出します。

- `_headers`：いつも書き出します。すべてのファイルの CORS、`X-Content-Type-Options: nosniff`、上の Content-Type です。
- `_redirects`：スラッシュ IRI のときだけ書き出します。IRI ごとに 1 つの転送（302）です。301 ではなく 302 なので、IRI の転送先を後から変えられます。

Cloudflare Pages、Cloudflare Workers の静的アセット、Netlify は、公開するフォルダーからこの 2 つのファイルを読みます。`404.html` も自分で返します。Workers では `"not_found_handling": "404-page"` が要ります。Worker のスクリプトは、この 2 つのファイルを読みません。

Cloudflare が読む転送は 2,000 件までです。ノードは、作った型と属性ごとに 1 件の転送を持ちます。これを超えると、`build` が注記を出します。残りを Cloudflare の Bulk Redirects に足すか、ハッシュ IRI を使ってください。

GitHub Pages は、どちらのファイルも読みません。Web サーバーや、CDN の後ろのオブジェクトストレージなど、ほかのホストでは、同じ規則をホストの設定に書きます。規則は 2 つのファイルにあります。

Cloudflare が返すとおりのサイトを、手元で確かめられます。

```bash
npx wrangler pages dev _site
```

## ワークフローの中で {#workflow}

`init` が書き出したワークフロー（`.github/workflows/publish.yml`）から始めます。`check` のジョブは残し、`publish` のジョブを下のどれかに置き換えます。このジョブでは、Action は検査とビルドだけを行います（`deploy: 'false'`）。次のステップが、Action の出力 `site` のフォルダーを公開します（v0.3.7 以降）。

リポジトリに要るシークレットは、ホストのトークン 1 つです。ワークフローは、ほかに秘密の値を渡しません。

### Cloudflare Pages {#cloudflare-pages}

最初に一度だけ、次のことをします。

1. プロジェクトを作ります。`npx wrangler pages project create my-models --production-branch main` を実行します。
2. **Cloudflare Pages: Edit** の権限を持つ API トークンを作り、リポジトリのシークレット `CLOUDFLARE_API_TOKEN` に入れます。
3. Cloudflare のアカウント ID を、リポジトリの変数 `CLOUDFLARE_ACCOUNT_ID` に入れます。
4. 自分のドメインは、プロジェクトの **Custom domains** で足します。

公開のジョブです。

```yaml
  publish:
    # main だけ。手動の実行（workflow_dispatch）では、ほかのブランチも選べるため。
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
    concurrency:
      group: publish
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - id: node
        # check のジョブと同じ固定。init が書き、upgrade が更新する。
        uses: geolonia/datamodels-toolkit@<commit SHA> # vX.Y.Z
        with:
          deploy: 'false'
      - uses: cloudflare/wrangler-action@953926a2e2182532811c01a25e53647d93bf07c0 # v4.1.3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}
          command: >-
            pages deploy ${{ steps.node.outputs.site }}
            --project-name=my-models --branch=main
```

### Netlify {#netlify}

最初に一度だけ、次のことをします。

1. Netlify でサイトを作ります。
2. 個人のアクセストークンを、リポジトリのシークレット `NETLIFY_AUTH_TOKEN` に入れます。
3. サイトの ID（**Site configuration → Site details**）を、リポジトリの変数 `NETLIFY_SITE_ID` に入れます。

公開のジョブは [Cloudflare Pages](#cloudflare-pages) のものと同じです。`wrangler-action` のステップの代わりに、次のステップを使います。

```yaml
      - name: Deploy to Netlify
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ vars.NETLIFY_SITE_ID }}
          SITE: ${{ steps.node.outputs.site }}
        run: >-
          npx --yes netlify-cli@27.10.2 deploy --dir "$SITE"
          --site "$NETLIFY_SITE_ID" --prod --no-build
```
