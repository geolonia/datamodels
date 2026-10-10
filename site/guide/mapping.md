---
title: データを変換する
description: 標準に沿ったデータを、モデルの対応表（マッピングファイル）を使ってモデルに変換する方法
---

# データを変換する

多くのモデルは、日本でデータがすでに沿っている標準（自治体標準オープンデータセット、EEI、国土地理院の避難所データなど）に対応しています。**対応表**（マッピングファイル）は、1 つのモデルと 1 つの標準について、標準のどの項目がモデルのどの属性に当たるかを示します。これを使うと、手元のデータをモデルに変換できます。

## どこにあるか

- モデルのページの**参照している標準**: 標準ごとに 1 行で、開くと対応表が見られます。YAML のファイルは表の下にリンクがあります。
- 標準ごとの一覧：[対応している標準](/guide/standards)。
- ファイル：`https://datamodels.jp/mapping/<subject>/<Type>/<name>.yaml`。モデルごとに `catalog.json`（`mappingUrls`）にも載っています。

対応表にはバージョンがありません。URL は変わらず、内容は現在のモデルに合わせます。

## 対応表に書いてあること

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

- `standard`: 標準の名前、リンク、ライセンス、短い説明。
- `fields`: モデルの属性ごとに 1 行。`to` は標準の対応する項目、`note` は補足です。`to: null` は標準に当たる項目が無いことを示します。

## 一覧を変換する

行には変換の仕方も書けます。`column`（CSV の列）、`transform`（`integer`、`flag`、`split` など）、固定の値 `value`、`via`（住所など入れ子の値を別の対応表で作る）です。`convert.id` はエンティティの ID の付け方です。

[datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) の `datamodels convert` がこの規則を読みます。CSV の一覧をモデルのエンティティに変換し、それぞれをモデルの JSON Schema で検証します。

```bash
npx github:geolonia/datamodels-toolkit convert \
  disaster/EvacuationSite jichitai-opendata-site \
  092011_evacuation_space.csv --out sites.json
```

NGSI-LD の normalized 形式にするときは `--normalized` を付けます。`to` だけの行は説明です。その項目は注記に従って自分で変換してください。

## 対応表を足す

対応表がまだ無い標準を見つけたら、提案してください。[モデルのルール](/guide/rules#mapping)を見てください。
