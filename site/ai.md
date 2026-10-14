---
title: AI とエージェント
description: datamodels.jp の作成での AI の使い方と、AI エージェントやツールが使えるもの
---

# AI とエージェント

## このサイトの作り方

モデル、注記、ページの多くは AI の支援を受けて下書きしています。カタログに何を入れるかは人が決めます。新しい分野、メジャーバージョン、モデルの安定への昇格は、小さなグループが該当する Issue や Pull Request で決めます（[決め方](https://github.com/geolonia/datamodels/blob/main/CONTRIBUTING.md#段階と決め方)）。公開の前に、CI がすべてのモデルと例をスキーマとカタログのルールで検査します。サイト内のリンクの先にページが無ければ、ビルドは失敗します。ページの中の位置（`#` から後ろ）までは検査しません。

間違いを見つけたら、[Issue で知らせてください](https://github.com/geolonia/datamodels/issues)。

## AI エージェントやツールへ

このサイトは、人にも AI アシスタントにも使ってもらうことを想定しています。検索、AI の回答、AI の学習のいずれに使っても構いません。`robots.txt` でも、[Content Signals](https://contentsignals.org) の形式でそう示しています。

- **入口:** [/llms.txt](/llms.txt)。ガイドとすべてのモデルの短い一覧（英語）です。
- **ウェブを読めないとき:** [MCP サーバー](#mcp-server)を使えます。
- **すべてのモデルとその URL:** [catalog.json](/catalog.json)。
- **作ったデータの確認:** モデルの JSON Schema（`/schema/<subject>/<Type>/v1.json`）で検証できます。例（`/examples/…`）は、そのまま使える正しいデータです。
- **意味:** `https://datamodels.jp/ns/` の下にある型と属性の IRI を開くと、それぞれの説明のページが表示されます。
- **変わらない URL:** 公開したバージョンは変わりません（[URL とバージョン](/guide/urls)）。引用した URL は、ずっと同じ内容を指します。ただし正式公開までのプレリリース中は、公開済みのバージョンも直接修正することがあります。

機械が読むファイル（スキーマ、@context、語彙、例）は、条件なしで使えます。文章とコードのライセンスは、[ライセンス](/LICENSE-CONTENT)にあります。

## MCP サーバー {#mcp-server}

ウェブページもこのリポジトリも開けないエージェントでも、MCP（Model Context Protocol）でカタログを使えます。サーバーは `https://datamodels.jp/mcp` にあります。ログインは不要です。読み取りだけを行い、このサイトのファイルをもとに答えます。

- `search_models`: 日本語か英語の言葉で、モデルを探します。
- `get_model`: 1 つのモデルを返します。参照先のスキーマを含む JSON Schema、@context の URL、例、IRI 付きのすべての属性、関連ファイルの URL です。
- `find_attribute`: 再利用できる既存の属性を、名前か意味で探します。
- `validate`: 1 つのエンティティを、モデルで検証します。key-values の形の JSON でも、NGSI-LD の normalized の形でも構いません。

使うには、MCP クライアントの設定に追加します。リモートのサーバー（Streamable HTTP）を扱えるクライアントが対象です。Claude Code（`.mcp.json`）と Cursor（`.cursor/mcp.json`）では、次のように書きます。

```json
{
  "mcpServers": {
    "datamodels": {
      "type": "http",
      "url": "https://datamodels.jp/mcp"
    }
  }
}
```

VS Code（`.vscode/mcp.json`）では、同じ内容を `"mcpServers"` ではなく `"servers"` の下に書きます。Claude Code では、`claude mcp add --transport http datamodels https://datamodels.jp/mcp` でも追加できます。Claude Desktop と claude.ai では、コネクタの設定でカスタムコネクタとして追加します。URL は `https://datamodels.jp/mcp` です。
