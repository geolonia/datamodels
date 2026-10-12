---
title: 検査とビルド
description: datamodels-toolkit の check と build でノードを検査してビルドし、GitHub Action で公開する
---

# 検査とビルド

```bash
npx github:geolonia/datamodels-toolkit#v0.3.8 check
npx github:geolonia/datamodels-toolkit#v0.3.8 build
```

`check` は、すべてのスキーマと例を検査します。GitHub では、Pull Request のたびにワークフローが同じ検査をします。

まだ公開していないノードでは、`check` は公開済みのファイルと比べられません。そのため、次のような注記を出します。問題ではないので、終了コードは 0 です。

```text
  note: https://models.example.org/context/road/v0.1.0.jsonld: not reachable (ENOTFOUND), not compared
  …
.: ok
```

`build` は、サイトを `_site/` に書き出します。`_site/index.html` をブラウザーで開くと、トップページを確かめられます。ただし、ページの間のリンクはベース URL で始まるアドレスです。そのため、手元で開けるのはトップページだけです。

## GitHub Action {#action}

`init` が書き出すワークフロー（`.github/workflows/publish.yml`）は、ツールキットの GitHub Action を使います。Action は `check` と `build` を実行し、ノードを GitHub Pages に公開します。Pull Request では検査とビルドだけを行い、`main` への push のたびに公開します（[GitHub Pages で公開する](/toolkit/start#publish)）。

Action のリリースはワークフローに固定してあります。新しいリリースには [`upgrade`](/toolkit/versions#upgrade) で移ります。Dependabot も新しいリリースを提案します。
