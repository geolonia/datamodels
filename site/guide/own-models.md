---
title: 自分のデータモデル
description: このカタログに合わないデータモデルの公開先：自分のサイトか Smart Data Models
---

# 自分のデータモデル

このカタログに載せるのは、日本の多くの組織で共有するモデルです。良いモデルでも、次のようなものはこのカタログに向きません。

- 1 つのプロジェクトや組織だけで使うモデル
- まだ自信がなく、まず実際の業務で試したいモデル
- 日本や日本の標準とは関係のないモデル

それでも、`@context` の変わらない URL、JSON Schema、開くと説明が表示される IRI は必要です。このページでは、そうしたモデルをどこで公開するかを説明します。

## 公開先の選び方 {#where}

| | このカタログ | 自分のサイト | Smart Data Models |
|---|---|---|---|
| 向いているモデル | 日本の多くの組織で共有するモデル | 自分のプロジェクトや組織のモデル | 世界の FIWARE コミュニティ向けのモデル |
| 決める人 | 小さなグループ（Issue と Pull Request で。[貢献する](/guide/contribute)） | 自分 | Smart Data Models のメンテナー |
| 言語 | 日本語と英語 | 自由（1 つでよい） | 英語 |
| アドレス | datamodels.jp | 自分のドメイン | smartdatamodels.org |

迷ったら、自分のサイトから始めてください。あとからこのカタログに提案できます（[下の節](#later)）。

このカタログのモデルに属性がいくつか足りないだけなら、自分のモデルは要りません。[属性を足す](/guide/extend)を見てください。

## 自分のサイト {#own-site}

自分のサイトでも、このカタログと同じ種類のファイルを公開できます。`catalog.json`、バージョンごとの `@context`、JSON Schema、語彙、例、そして型と属性ごとの説明のページです。IRI を開くと、その説明が表示されます。こうしたサイトを「ノード」と呼びます。

ノードは静的なファイルだけでできているので、サーバーは要りません。GitHub Pages なら無料で公開できます。ファイルと、公開のためのワークフローは [datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) が作ります。

- 手順：[自分のサイトで公開する](/guide/own-site)
- 例：[models.geolonia.com](https://models.geolonia.com)（Geolonia のプロジェクトのモデル）

自分のサイトのモデルは、このカタログのモデルを土台にできます。土台にしたモデルを書いておくと、その名前と意味を変えていないかをツールキットが検査します。

## Smart Data Models {#smart-data-models}

[Smart Data Models](https://smartdatamodels.org/) は FIWARE コミュニティのカタログで、FIWARE、TM Forum、IUDX、OASC が運営しています。スマートシティ、農業、エネルギーなどの 900 以上のモデルがあり、英語で書かれていて、GitHub での独自の貢献の手順があります。日本に関係しないモデルなら、こちらが向いています。このカタログも Smart Data Models を土台にしています（[他のデータモデルカタログ](/guide/catalogs)）。

## あとからこのカタログへ {#later}

自分のサイトのモデルが日本のほかの組織にも役立つとわかったら、ほかのモデルと同じように提案してください（[貢献する](/guide/contribute)）。モデルをどう移すか、古い IRI をどう扱うかは、まだ決まっていません（[#200](https://github.com/geolonia/datamodels/issues/200)）。それまでも、自分のサイトはそのまま残るので、その IRI を使っているデータは動き続けます。
