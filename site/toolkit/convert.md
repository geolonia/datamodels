---
title: データを変換する
description: datamodels-toolkit の convert で、手元の CSV の一覧をカタログのモデルのエンティティに変換する。標準の対応表を使う、自分の対応表を作る、CSV テンプレートから始める、の 3 つの方法
---

# データを変換する

手元の一覧（CSV）を、このカタログのモデルのエンティティ（NGSI-LD）に変換できます。使うのは datamodels-toolkit の `convert` です。変換したエンティティは、1 件ずつモデルの JSON Schema で検証します。[Node.js](https://nodejs.org/) 24 以降が要ります（[ツールキット](/toolkit/#run)）。

一覧の形に合わせて、次の 3 つの方法があります。

| 一覧 | 方法 | 対応表 |
|---|---|---|
| 標準に従っている（自治体標準オープンデータセットなど） | [標準の対応表を使う](#standard) | カタログのもの |
| それ以外の CSV | [自分の対応表を作る](#your-own-list) | 自分で作る |
| これから作る | [CSV テンプレートに入力する](#csv-template) | 要らない |

<svg class="flow-diagram" viewBox="0 0 460 258" role="group" aria-label="一覧から NGSI-LD のエンティティへの 3 つの方法。標準に従う一覧はカタログの対応表で、それ以外の CSV は自分の対応表で、CSV テンプレートは対応表なしで、convert で変換し、1 件ずつ JSON Schema で検証します。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="cv-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><a href="#standard"><rect class="box" x="10" y="8" width="140" height="56" rx="10"/><text class="t" x="80" y="32">標準に従う一覧</text><text class="s" x="80" y="51">自治体標準など</text><line class="a" x1="80" y1="64" x2="80" y2="92" marker-end="url(#cv-ah)"/><rect class="box" x="10" y="94" width="140" height="56" rx="10"/><text class="t" x="80" y="118">カタログの対応表</text><text class="s" x="80" y="137">そのまま使う</text></a><a href="#your-own-list"><rect class="box" x="160" y="8" width="140" height="56" rx="10"/><text class="t" x="230" y="32">それ以外の CSV</text><text class="s" x="230" y="51">自分の一覧</text><line class="a" x1="230" y1="64" x2="230" y2="92" marker-end="url(#cv-ah)"/><rect class="box" x="160" y="94" width="140" height="56" rx="10"/><text class="t" x="230" y="118">自分の対応表</text><text class="s" x="230" y="137">mapping で作る</text></a><a href="#csv-template"><rect class="box" x="310" y="8" width="140" height="56" rx="10"/><text class="t" x="380" y="32">CSV テンプレート</text><text class="s" x="380" y="51">これから作る</text><line class="a" x1="380" y1="64" x2="380" y2="92" marker-end="url(#cv-ah)"/><rect class="box" x="310" y="94" width="140" height="56" rx="10"/><text class="t" x="380" y="118">対応表は不要</text><text class="s" x="380" y="137">列が属性になる</text></a><line class="a" x1="80" y1="150" x2="150" y2="190" marker-end="url(#cv-ah)"/><line class="a" x1="230" y1="150" x2="230" y2="190" marker-end="url(#cv-ah)"/><line class="a" x1="380" y1="150" x2="310" y2="190" marker-end="url(#cv-ah)"/><text class="l" x="240" y="176">convert</text><rect class="box main" x="10" y="192" width="440" height="58" rx="10"/><text class="t" x="230" y="216">NGSI-LD のエンティティ</text><text class="s" x="230" y="235">1 件ずつモデルの JSON Schema で検証</text></svg>

## 一覧が標準に従っているとき {#standard}

自治体標準オープンデータセットや国土地理院のデータなど、カタログに変換ルール付きの対応表がある標準に従った一覧は、その対応表でそのまま変換できます。変換ルールの無い対応表は標準との対応を説明するだけなので、その一覧には自分の対応表を作ります（次の節）。対応表の仕組みは[対応表](/guide/mapping)にあります。

```bash
npx github:geolonia/datamodels-toolkit#v0.3.8 convert \
  disaster/EvacuationSite jichitai-opendata-site \
  092011_evacuation_space.csv --out sites.json
```

この例は、市町村の指定緊急避難場所一覧（自治体標準オープンデータセット 03）を EvacuationSite のエンティティに変換します。CSV は宇都宮市の一覧で、[チュートリアル](/guide/tutorial#data)の手順 1 で取得するファイルです。引数は、モデル（`<subject>/<Type>`）、対応表の名前、CSV ファイルの順です。対応表の名前は、モデルのページの**参照している標準**と、`catalog.json` の `mappingUrls` にあります。

変換の規則（`column`、`transform`）があるのは、一部の対応表だけです。ほかの対応表は、モデルと標準の関係を説明するもので、そのままでは変換できません（[対応表を置く標準](/guide/rules#mapping)）。そのときは、[次の方法](#your-own-list)で自分の対応表を作ります。`to` だけの行も説明のための行です。その項目は、注記に沿って自分で変換してください。

一覧に無い値は `--set` で渡します。たとえば国土地理院のデータでは、市町村コードがファイル名にしかありません。次の例の `13101_2.csv` は、国土地理院が公開している千代田区の指定緊急避難場所のデータです（[ダウンロード](https://hinanmap.gsi.go.jp/hinanjocp/defaultFtpData/csv/13101_2.csv)）。

```bash
npx github:geolonia/datamodels-toolkit#v0.3.8 convert \
  disaster/EvacuationSite gsi-emergency-site \
  13101_2.csv --set localGovernmentCode=131016
```

全国地方公共団体コードは、末尾の検査数字を含めて 6 桁で渡します。5 桁の `13101` を渡すと、`convert` が検査数字を足して直し、そのことを知らせます。

## それ以外の CSV {#your-own-list}

標準に従っていない一覧には、自分の対応表（YAML）を作ります。どの列がどの属性になるかを書いたファイルです。書き方はカタログの[対応表](/guide/mapping)と同じで、`standard` は要りません。自分の対応表はカタログには載せず、手元に置きます。次に一覧が更新されたときも、同じ対応表で変換できます。

1. `mapping` で下書きを作ります。合う列は埋まり、列が見つからない属性には TODO が付きます。
2. TODO を埋めます。列名を書くか、一覧に無い項目なら行ごと消します。エンティティの ID の付け方（`convert.id`）も決めます。
3. `convert --check` で、最初の 20 行を検証します。直しては検証し、有効になったら、`--rows` に一覧の行数を指定して全体を検証します。
4. `--check` を外して変換します。それでも無効な行は出力から外れて一覧に示され、終了コードは 1 です。

```bash
# 1. 下書きを作る
npx github:geolonia/datamodels-toolkit#v0.3.8 mapping \
  disaster/EvacuationSite my-list.csv --out my-list.yaml
# 3. 最初の行を検証する
npx github:geolonia/datamodels-toolkit#v0.3.8 convert \
  disaster/EvacuationSite my-list.yaml my-list.csv --check
# 4. 変換する
npx github:geolonia/datamodels-toolkit#v0.3.8 convert \
  disaster/EvacuationSite my-list.yaml my-list.csv --out entities.json
```

`mapping` の下書きについて：

- 列名が属性の名前（英語や日本語）と合うと、その列が入ります。カタログの対応表が読む列も手がかりにします。経度と緯度の列は位置になります。
- 各行に 1 行の説明が付きます。CSV の見出しが日本語なら、説明も日本語です。一覧の値は下書きに入りません。
- 見出しがカタログの対応表の列とほぼ同じなら、`mapping` がそう知らせます。まずその対応表で変換を試してください。
- `--out` は既にあるファイルを上書きしません。

すべての行で同じ値は、`value` で書けます。一覧に無い値を推測で書くことはしないでください。`convert` は、TODO が残っている対応表や、モデルに無い属性を書いた対応表を受け付けません。

`--check` は最初の行（`--rows N`、既定は 20 行）だけを変換し、ファイルには何も書きません。標準エラー出力に、次のことを知らせます。

- 対応表の問題：残っている TODO、モデルに無い属性です。
- 対応表が読むのに、CSV に無い列です。
- どの行にも値が入らない必須の属性です。
- 無効な行と、その最初の 3 つのスキーマの誤り、重複する ID、指数で書かれた ID です。
- 直したところ（[変換の結果](#results)）です。

最後の行は「`18 of 20 rows valid`」のようなまとめです。検証した行がすべて有効で、対応表に問題がなければ、終了コードは 0 です。

### AI エージェントと埋める {#agent}

TODO を埋める作業は、AI エージェントにも頼めます。datamodels-toolkit の[エージェントスキル](https://github.com/geolonia/datamodels-toolkit/tree/v0.3.8/skills/datamodels)（`skills/datamodels`）が、手順と決まりをエージェントに教えます。一覧に無い値は書かない、意味のはっきりしない列は人に聞く、という決まりです。Claude Code では、このフォルダーをプロジェクトの `.claude/skills/` にコピーします。

依頼の例です。

> my-list.csv を datamodels.jp の disaster/EvacuationSite に変換したい。`datamodels mapping` で対応表を作り、CSV の先頭の行を見て TODO を埋めて、CSV の行数を `--rows` に指定した `--check` で、すべての行が有効になるまで直して。一覧に無い値は作らず、意味のはっきりしない列は私に聞いて。

できた対応表は、変換の記録として残しておきます。

## CSV テンプレートから始めるとき {#csv-template}

新しく一覧を作るなら、モデルの CSV テンプレートに、1 行に 1 件ずつ入力します。対応表は要りません。テンプレートは、モデルのページの**ダウンロード**の行にあります。`export` でも作れます（[他のツールに書き出す](/toolkit/export)）。

```bash
npx github:geolonia/datamodels-toolkit#v0.3.8 convert \
  disaster/EvacuationSite csv-template sites.csv --out entities.json
```

各列は、同じ名前の属性になります。

- `id` は、エンティティの ID そのものです。
- `address.postalCode` のような列は、住所などの値の項目です。
- `longitude` と `latitude` は、点の位置です。点以外の形も許すモデルでは、`location` の列に GeoJSON を書けます。
- 一覧（リスト）の値は `;` で区切り、真偽値は `true` か `false` で書きます。

使わない列は消してもかまいません。`convert` は消した列を「not in the file, so left empty」と知らせ、その属性は空になります。ただし、frictionless で検証するなら、列はすべて残します（[表計算ソフト（CSV）で使う](/guide/csv#fill)）。

## 変換の結果 {#results}

どの方法でも、変換は同じように進みます。

- 文字コードは、UTF-8 と Shift_JIS を見分けます。
- 対応表の読む列が CSV に無いときは、「not in the file, so left empty」と知らせ、その属性を空にします。必須の属性の列が無いときは、その行は無効です。
- 確かめられる誤りだけを直します。たとえば、先頭の 0 が消えた全国地方公共団体コードや、検査数字の無いコードです（検査数字で確かめます）。直したところは、すべて標準エラー出力に出します。
- 無効な行は出力せず、行番号と一緒に知らせます。複数の行が同じ ID になるときと、`1.31E+11` のように指数で書かれた ID も無効です。指数の ID は、表計算ソフトが数を丸めて桁が失われたものです。
- 終了コードは、無効な行があるときと、ファイルを読めないときは 1、使い方の誤りは 2 です。

## オプション {#options}

- `--out file.json`：ファイルに書きます。省略すると標準出力に出します。
- `--normalized`：key-values の形ではなく、NGSI-LD の normalized の形にします。分野の `@context` と NGSI-LD のコアの context が付きます。
- `--set 属性=値`：一覧に無い値を渡します（[上の例](#standard)）。
- `--check`、`--rows N`：最初の行だけを検証します（[上の説明](#your-own-list)）。
- `--site`：対応表とモデルを読むサイトです。既定は datamodels.jp です。公開前の対応表を試すときは、[geolonia/datamodels](https://github.com/geolonia/datamodels) をビルドして（`npm run build`）、`--site dist` を付けます。

実際のオープンデータを変換して地図に表示するまでは、[チュートリアル](/guide/tutorial)で試せます。すべてのオプションは、ツールキットの [README](https://github.com/geolonia/datamodels-toolkit/tree/v0.3.8#convert)（英語）にあります。
