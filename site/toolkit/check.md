---
title: 検査とビルド
description: datamodels-toolkit の check と build でノードを検査してビルドし、GitHub Action で公開する
---

# 検査とビルド

```bash
npx github:geolonia/datamodels-toolkit#v0.3.4 check
npx github:geolonia/datamodels-toolkit#v0.3.4 build
```

`check` は、すべてのスキーマと例を検査します。`build` はサイトを `_site/` に書き出すので、`_site/index.html` を開いて確かめられます。GitHub では、Pull Request のたびにワークフローが同じ検査をします。

## GitHub Action {#action}

`init` が書き出すワークフロー（`.github/workflows/publish.yml`）は、ツールキットの GitHub Action を使います。Action は `check` と `build` を実行し、ノードを GitHub Pages に公開します。Pull Request では検査とビルドだけを行い、`main` への push のたびに公開します（[GitHub Pages で公開する](/toolkit/start#publish)）。

Action のリリースはワークフローに固定してあります。新しいリリースには [`upgrade`](/toolkit/versions#upgrade) で移ります。Dependabot も新しいリリースを提案します。
