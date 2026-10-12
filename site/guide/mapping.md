---
title: 対応表
description: 標準のどの項目がモデルのどの属性に当たるかを示す対応表（マッピングファイル）のある場所と、書いてあること
---

# 対応表

多くのモデルは、日本のデータがすでに従っている標準（自治体標準オープンデータセット、災害対応基本共有情報（EEI）、国土地理院の避難所データなど）に対応しています。**対応表**（マッピングファイル）は、1 つのモデルと 1 つの標準について、標準のどの項目がモデルのどの属性に当たるかを示します。標準に従うデータを、モデルに合わせて使えます。

<svg class="flow-diagram" viewBox="0 0 460 104" role="img" aria-label="標準の列「想定収容人数」は、対応表の 1 行（column と transform）を通って、モデルの属性 maxCapacity になります。文字列の &quot;120&quot; は整数の 120 になります。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="mp-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="10" y="8" width="130" height="58" rx="10"/><text class="t" x="75" y="32">想定収容人数</text><text class="s" x="75" y="51">標準の列</text><line class="a" x1="140" y1="37" x2="163" y2="37" marker-end="url(#mp-ah)"/><rect class="box main" x="165" y="8" width="130" height="58" rx="10"/><text class="t" x="230" y="32">対応表の 1 行</text><text class="s" x="230" y="51">column、transform</text><line class="a" x1="295" y1="37" x2="318" y2="37" marker-end="url(#mp-ah)"/><rect class="box" x="320" y="8" width="130" height="58" rx="10"/><text class="t m" x="385" y="32">maxCapacity</text><text class="s" x="385" y="51">モデルの属性</text><text class="s" x="75" y="92">"120"（文字列）</text><text class="s" x="230" y="92">transform: integer</text><text class="s" x="385" y="92">120（整数）</text></svg>

## どこにあるか

- モデルのページの**参照している標準**：標準ごとに 1 行で、開くと対応表が見られます。YAML のファイルは表の下にリンクがあります。
- 標準ごとの一覧：[対応している標準](/guide/standards)。
- ファイル：`https://datamodels.jp/mapping/<subject>/<Type>/<name>.yaml`。モデルごとに `catalog.json`（`mappingUrls`）にも載っています。

対応表にはバージョンがありません。URL は変わらず、内容はその時点のモデルに合わせて更新します。

## 対応表に書いてあること

<!-- languages: own code -->
```yaml
standard:
  name: { ja: "自治体標準オープンデータセット … シート「03.…」", en: … }
  url: https://www.digital.go.jp/resources/open_data/municipal-standard-data-set-test
  license: { ja: "公共データ利用規約（第1.0版）（PDL1.0、CC BY 4.0 と互換）", en: … }
fields:
  name: { to: 名称 (name), column: 名称 }
  maxCapacity:
    to: 想定収容人数 (maxCapacity)
    column: 想定収容人数
    transform: integer
  nationalShelterId:
    to: null
    note: { ja: このデータセットには無い, en: not in this dataset }
```

- `standard`：標準の名前、リンク、ライセンス、短い説明。
- `fields`：モデルの属性ごとに 1 行。`to` は標準の対応する項目、`note` は補足です。`to: null` は標準に当たる項目が無いことを示します。

## 変換の規則 {#convert}

行には変換の仕方も書けます。`column`（CSV の列）、`transform`（`integer`、`flag`、`split` など）、固定の値 `value`、`via`（住所など入れ子の値を別の対応表で作る）です。`transform` のすべての種類は、ツールキットの [README](https://github.com/geolonia/datamodels-toolkit/tree/v0.3.7#convert)（英語）にあります。`convert.id` はエンティティの ID の付け方です。`to` だけの行は、説明のための行です。変換の規則があるのは、一部の対応表だけです。ほとんどの対応表は、モデルと標準の関係を説明するだけです。

[datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) の `datamodels convert` がこの規則を読み、CSV の一覧をモデルのエンティティに変換します。使い方は[データを変換する](/toolkit/convert)にあります。

## 対応表を足す

カタログに対応表を置くのは、多くの一覧が従っている公開の標準だけです。1 つの組織だけの一覧には、カタログの対応表を作りません。自分の対応表を手元に置いて変換します（[データを変換する](/toolkit/convert#your-own-list)）。

対応表がまだ無い標準を見つけたら、[Issue](https://github.com/geolonia/datamodels/issues/new) で提案してください（[貢献する](/guide/contribute)）。どの標準に対応表を置くかは、[モデルのルール](/guide/rules#mapping)にあります。
