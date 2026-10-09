---
title: AI とエージェント
description: datamodels.jp の作成での AI の使い方と、AI エージェントやツールが使えるもの
---

# AI とエージェント

## このサイトの作り方

モデル、注記、ページの多くは AI の支援を受けて下書きしています。カタログに何を入れるかは人が決めます。新しいサブジェクト、メジャーバージョン、モデルの安定への昇格は、小さなグループが該当する Issue や Pull Request で決めます（[貢献する](/guide/contribute)）。公開の前に、CI がすべてのモデルと例をスキーマとカタログのルールで検査し、サイトのリンクも確認します。

間違いを見つけたら、[Issue で知らせてください](https://github.com/geolonia/datamodels/issues)。

## AI エージェントやツールへ

このサイトは人にもアシスタントにも使ってもらうためのものです。検索、AI の回答、AI の学習のどれに使っても構いません。`robots.txt` が [Content Signals](https://contentsignals.org) でそう示しています。

- **入口:** [/llms.txt](/llms.txt)。ガイドとすべてのモデルの短い一覧（英語）です。
- **すべてのモデルとその URL:** [catalog.json](/catalog.json)
- **書いたデータの確認:** モデルの JSON Schema（`/schema/<subject>/<Type>/v1.json`）で検証できます。例（`/examples/…`）は、そのまま使える正しいデータです。
- **意味:** `https://datamodels.jp/ns/` の下の型と属性の IRI は、それぞれのドキュメントにつながります。
- **変わらない URL:** 公開したバージョンは変わりません（[URL とバージョン](/guide/urls)）。引用した URL はそのまま正しいままです。

機械が読むファイル（スキーマ、@context、語彙、例）は CC0 1.0、このサイトのページやモデルの注記などの文章は CC BY 4.0 です（[ライセンス](/LICENSE-CONTENT)）。
