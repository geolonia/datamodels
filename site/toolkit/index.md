---
title: ツールキット
description: datamodels-toolkit で、自分のデータモデルを変わらない URL で自分のサイトに公開し、CSV の一覧をモデルに変換する
---

# ツールキット

[datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) は、オープンソースのコマンドラインツールと GitHub Action です。コマンドの名前は `datamodels` です。次のことができます。

- 自分のデータモデルを、自分のサイト（ノード）で変わらない URL で公開します。サイトには `catalog.json`、`@context`、JSON Schema、語彙、例、型と属性ごとの説明のページがそろいます。例は [models.geolonia.com](https://models.geolonia.com) です。
- CSV の一覧を、このカタログのモデルのエンティティに変換します。

自分のサイトが要るかどうかは、[自分のデータモデル](/guide/own-models)で確かめてください。

## 実行する {#run}

[Node.js](https://nodejs.org/) 24 以降が要ります。コマンドは `npx` で GitHub のリリースから実行するので、インストールは要りません。

```bash
npx github:geolonia/datamodels-toolkit#v0.3.3 --help
```

このセクションの例は、このリリースを使います。すべてのコマンドとオプションは、`--help` と [README](https://github.com/geolonia/datamodels-toolkit#readme)（英語）にあります。このセクションでは、作業ごとに使い方を説明します。

## ページ {#pages}

- [サイトを始める](/toolkit/start)：`init` でノードを作り、GitHub Pages と自分のドメインで公開します。
- [モデルを足す](/toolkit/models)：`add` と `extend` でモデルを足し、属性を書きます。
- [検査とビルド](/toolkit/check)：`check` と `build`、公開する GitHub Action です。
- [バージョン](/toolkit/versions)：公開したモデルを `bump` で変え、`upgrade` で新しいツールキットに移ります。
- [一覧を変換する](/toolkit/convert)：`convert` で、CSV の一覧をモデルのエンティティに変換します。
- [データモデルのサイト](/toolkit/sites)：datamodels.jp が知っているノードの一覧です。1 行に 1 つのサイトで、もとにしたカタログのモデルが分かります。
