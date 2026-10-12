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
| 決める人 | 小さなグループ（Issue と Pull Request で。[決め方](https://github.com/geolonia/datamodels/blob/main/CONTRIBUTING.md#段階と決め方)） | 自分 | Smart Data Models のメンテナー |
| 言語 | 日本語と英語 | 自由（1 つでよい） | 英語 |
| アドレス | datamodels.jp | 自分のドメイン | smartdatamodels.org |

迷ったら、自分のサイトから始めてください。あとからこのカタログに提案できます（[下の節](#later)）。

このカタログのモデルを少し合わせれば足りるなら、自分のモデルは要りません（[どのページを読むか](/guide/#which)）。

## 自分のサイト {#own-site}

自分のサイトでも、このカタログと同じ種類のファイルを公開できます。`catalog.json`、バージョンごとの `@context`、JSON Schema、語彙、例、そして型と属性ごとの説明のページです。IRI を開くと、その説明が表示されます。こうしたサイトを「ノード」と呼びます。

ノードは静的なファイルだけでできているので、サーバーは要りません。GitHub Pages なら無料で公開できます。ファイルと、公開のためのワークフローは [datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) が作ります。

- 手順：[ツールキット](/toolkit/)のセクション（最初は[サイトを始める](/toolkit/start)）
- 例：[models.gtt-project.org](https://models.gtt-project.org/)（Redmine の GTT プラグインのモデル）

自分のサイトのモデルは、このカタログのモデルを土台にできます（[`extend`](/toolkit/models#extend)）。名前は似ていますが、`extend` は[拡張](/guide/extend)とは別のもので、自分のサイトに新しいモデルを作ります。土台にしたモデルを書いておくと、その名前と意味を変えていないかをツールキットが検査します。

<svg class="flow-diagram" viewBox="0 0 460 216" role="img" aria-label="datamodels.jp はカタログのモデルと、データモデルのサイトの一覧を公開します。models.gtt-project.org の Issue は、カタログの Task をもとにしています。自分のサイトのモデルも、カタログのモデルをもとにできます。どのサイトも catalog.json を公開します。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="site-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box main" x="10" y="8" width="440" height="58" rx="10"/><text class="t" x="230" y="33">datamodels.jp</text><text class="s" x="230" y="53">カタログのモデル（Task など）と、サイトの一覧</text><rect class="box" x="10" y="150" width="210" height="58" rx="10"/><text class="t m" x="115" y="175">models.gtt-project.org</text><text class="s" x="115" y="194">Issue、catalog.json</text><rect class="box d" x="240" y="150" width="210" height="58" rx="10"/><text class="t" x="345" y="175">自分のサイト</text><text class="s" x="345" y="194">自分のモデル、catalog.json</text><line class="a" x1="115" y1="150" x2="115" y2="68" marker-end="url(#site-ah)"/><text class="l" x="125" y="104">Issue は Task をもとにする</text><line class="a d" x1="345" y1="150" x2="345" y2="68" marker-end="url(#site-ah)"/><text class="l e" x="335" y="128">もとにできる</text></svg>

## Smart Data Models {#smart-data-models}

[Smart Data Models](https://smartdatamodels.org/) は FIWARE コミュニティのカタログです。FIWARE、TM Forum、IUDX（India Urban Data Exchange）、OASC（Open & Agile Smart Cities）が運営しています。スマートシティ、農業、エネルギーなどの 900 以上のモデルがあり、英語で書かれていて、GitHub での独自の貢献の手順があります。日本に関係しないモデルなら、こちらが向いています。このカタログも Smart Data Models を土台にしています（[他のデータモデルカタログ](/guide/catalogs)）。

## あとからこのカタログへ {#later}

自分のサイトのモデルが日本のほかの組織にも役立つとわかったら、ほかのモデルと同じように提案してください（[貢献する](/guide/contribute#model-proposal)）。モデルをどう移すか、古い IRI をどう扱うかは、まだ決まっていません（[#200](https://github.com/geolonia/datamodels/issues/200)）。それまでも、自分のサイトはそのまま残るので、その IRI を使っているデータは動き続けます。
