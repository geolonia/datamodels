---
title: 表計算ソフトで使う
description: モデルの CSV テンプレートに入力し、Table Schema に照らして frictionless validate で検査し、NGSI-LD のエンティティに変換する
---

# 表計算ソフトで使う

エンティティのモデルのページの**ダウンロード**の行には、**CSV テンプレート**とその **Table Schema** があります（Geometry などの値型にはありません）。これを使うと、表計算ソフトで作業する人も、JSON を書かずにモデルの形のデータを作れます。このページでは、[指定緊急避難場所（EvacuationSite）](/models/disaster/EvacuationSite/)のテンプレートに入力して検査し、NGSI-LD のエンティティに変換します。

<svg class="flow-diagram" viewBox="0 0 460 398" role="img" aria-label="モデルのページから CSV テンプレートを取り、表計算ソフトで埋め、frictionless validate で検査し、datamodels convert で NGSI-LD のエンティティにします。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="csv-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="58" rx="10"/><text class="t" x="230" y="33">CSV テンプレート</text><text class="s" x="230" y="53">モデルのページの「ダウンロード」</text><line class="a" x1="230" y1="68" x2="230" y2="114" marker-end="url(#csv-ah)"/><text class="l" x="242" y="95">① 表計算ソフトで埋める</text><rect class="box" x="20" y="116" width="420" height="58" rx="10"/><text class="t m" x="230" y="141">sites.csv</text><text class="s" x="230" y="161">1 行に 1 か所</text><line class="a" x1="230" y1="176" x2="230" y2="222" marker-end="url(#csv-ah)"/><text class="l" x="242" y="203">② frictionless validate</text><rect class="box" x="20" y="224" width="420" height="58" rx="10"/><text class="t" x="230" y="249">検査した sites.csv</text><text class="s" x="230" y="269">Table Schema で各セルを確認</text><line class="a" x1="230" y1="284" x2="230" y2="330" marker-end="url(#csv-ah)"/><text class="l" x="242" y="311">③ datamodels convert</text><rect class="box main" x="20" y="332" width="420" height="58" rx="10"/><text class="t" x="230" y="357">NGSI-LD のエンティティ</text><text class="s" x="230" y="377">JSON Schema でも検査済み</text></svg>

[Node.js](https://nodejs.org/) 24 以降と、frictionless を動かす Python が必要です。

## 1. ファイルを取得する {#files}

どちらのファイルも、モデルのページのダウンロードの行にあります。コマンドで取得するなら、次のとおりです。

```bash
BASE=https://datamodels.jp/adapters
curl -sSfO "$BASE/csv/disaster/EvacuationSite.csv"
curl -sSfO "$BASE/table-schema/disaster/EvacuationSite.tableschema.json"
```

## 2. テンプレートに入力する {#fill}

`EvacuationSite.csv` を表計算ソフトで開きます。1 行目には、属性ごとに 1 つの列があります。各列の意味は、モデルのページの属性の表にあります。避難場所 1 か所につき 1 行を足し、分からないセルは空のままにします。`sites.csv` という名前で、UTF-8 で保存してください（Excel では「CSV UTF-8」）。次の行には、後の手順で見つけるために、わざと誤りを 2 つ入れています。

| 列 | 値 |
|---|---|
| `id` | `urn:ngsi-ld:EvacuationSite:0012` |
| `name` | 都立一橋高校 |
| `externalSiteId` | `13101-0012` |
| `localGovernmentCode` | `13101` |
| `address.addressText` | `東京都千代田区東神田1-12-13` |
| `longitude`、`latitude` | `139.7810002`、`35.6945488` |
| `hazardTypes` | `earthquake;fire` |
| `alsoDesignatedShelter` | `true` |

`hazardTypes` のような複数の値は `;` で区切ります。`longitude` と `latitude` から位置ができます。テンプレートの列は、空の列も含めてすべて残してください。Table Schema は、すべての列がこの順に並んでいることを前提にしています。

## 3. frictionless で検査する {#validate}

[frictionless](https://framework.frictionlessdata.io/) は、Table Schema に照らして各セルを確認します。型、パターン、使える値、必須のセルが埋まっているかを見ます。

```bash
pip install frictionless   # または pipx install frictionless
frictionless validate sites.csv --schema EvacuationSite.tableschema.json
```

結果の一部です。

```text
│ sites │ table │ sites.csv │ INVALID │
┃ Row ┃ Field ┃ Type             ┃ Message                                     ┃
│ 2   │ 7     │ constraint-error │ The cell "13101" in row at position "2" and │
│     │       │                  │ field "localGovernmentCode" at position "7" │
│     │       │                  │ does not conform to a constraint:           │
│     │       │                  │ constraint "pattern" is "\d{6}"             │
```

全国地方公共団体コードは、末尾の検査数字を含めて 6 桁です。セルを `131016` に直して保存し、同じコマンドをもう一度実行します。

```text
│ sites │ table │ sites.csv │ VALID  │
```

## 4. NGSI-LD のエンティティに変換する {#convert}

[datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) の `datamodels convert` は、各行をエンティティにして、モデルの JSON Schema で検査します。

```bash
npx github:geolonia/datamodels-toolkit#v0.3.5 convert \
  disaster/EvacuationSite csv-template sites.csv --out entities.json
```

```text
sites.csv: utf-8, 1 row(s), 0 valid EvacuationSite, 1 invalid
  line 2: data/hazardTypes/1 must be equal to one of the allowed values
```

JSON Schema は、Table Schema では確かめられないことも検査します。複数の値の中身と、「externalSiteId か nationalShelterId」のような複数の列にまたがる決まりです。`fire` はこのモデルの災害の種別にありません。種別の一覧は属性の表にあります。`inlandFlood` に直して、`convert` をもう一度実行します。

```text
sites.csv: utf-8, 1 row(s), 1 valid EvacuationSite, 0 invalid
```

`entities.json` にエンティティができました。空のセルの属性は入りません。

```json
[
  {
    "id": "urn:ngsi-ld:EvacuationSite:0012",
    "type": "EvacuationSite",
    "name": "都立一橋高校",
    "externalSiteId": "13101-0012",
    "localGovernmentCode": "131016",
    "address": { "addressText": "東京都千代田区東神田1-12-13" },
    "location": { "type": "Point", "coordinates": [139.7810002, 35.6945488] },
    "hazardTypes": ["earthquake", "inlandFlood"],
    "alsoDesignatedShelter": true
  }
]
```

これは key-values の形です。`--normalized` を付けると、NGSI-LD ブローカーが受け取る形で、@context 付きで書き出します（[NGSI-LD ブローカーに送る](/guide/use#broker)）。テンプレートの列について詳しくは、[データを変換する](/toolkit/convert#csv-template)を見てください。

## 自分のモデル {#own-models}

自分のサイトのモデルでも、`datamodels export` で同じ 2 つのファイルを作れます（[他のツールに書き出す](/toolkit/export)）。
