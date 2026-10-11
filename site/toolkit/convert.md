---
title: データを変換する
description: datamodels-toolkit の convert で、CSV の一覧を、モデルの対応表を使ってカタログのモデルのエンティティに変換する
---

# データを変換する

`datamodels convert` は、CSV の一覧をこのカタログのモデルのエンティティに変換し、それぞれをモデルの JSON Schema で検証します。変換の規則は、モデルの対応表（マッピングファイル）に書いてあります。対応表の仕組みは[対応表](/guide/mapping)のガイドにあります。

```bash
npx github:geolonia/datamodels-toolkit#v0.3.3 convert \
  disaster/EvacuationSite jichitai-opendata-site \
  092011_evacuation_space.csv --out sites.json
```

この例は、市町村の指定緊急避難場所一覧（自治体標準オープンデータセット 03）を EvacuationSite のエンティティに変換します。引数は、モデル（`<subject>/<Type>`）、対応表の名前、CSV ファイルの順です。対応表の名前は、モデルのページの**参照している標準**と、`catalog.json` の `mappingUrls` にあります。

NGSI-LD の normalized 形式にするときは `--normalized` を付けます。`to` だけの行は、説明のための行です。その項目は、注記に沿って自分で変換してください。

対応表は datamodels.jp から読みます。公開前の対応表を試すときは、[geolonia/datamodels](https://github.com/geolonia/datamodels) をビルドして（`npm run build`）、`--site dist` を付けます。

実際のオープンデータを変換して地図に表示するまでは、[チュートリアル](/guide/tutorial)で試せます。
