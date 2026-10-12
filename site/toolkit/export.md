---
title: 他のツールに書き出す
description: datamodels-toolkit の export で、モデルから CSV テンプレート、Table Schema、AI の構造化出力、PostgreSQL / PostGIS のテーブルを作る
---

# 他のツールに書き出す

データモデルは NGSI-LD のブローカーがなくても使えます。datamodels-toolkit の `export` は、1 つのモデルから次のファイルを作ります。

```bash
npx github:geolonia/datamodels-toolkit#v0.3.7 export \
  disaster/EvacuationSite --to csv,table-schema,ai,postgis
```

| `--to` | ファイル | 使い方 |
|---|---|---|
| `csv` | `EvacuationSite.csv` | CSV テンプレートです。表計算ソフトで 1 行に 1 件ずつ入力し、[変換](/toolkit/convert#csv-template)します。 |
| `table-schema` | `EvacuationSite.tableschema.json` | CSV の列の [Table Schema](https://datapackage.org/standard/table-schema/) です。入力した CSV ファイルを `frictionless validate` で検査できます。 |
| `ai` | `EvacuationSite.ai.json` | AI の構造化出力（strict な JSON Schema）です。PDF やメールから、モデルの形のままエンティティを取り出せます。 |
| `postgis` | `EvacuationSite.sql` | PostgreSQL / PostGIS の `CREATE TABLE` です。制約と空間インデックス付きのテーブルができます。 |

どのファイルもモデルの属性名と IRI をそのまま使うので、NGSI-LD の形との間でデータを変換できます。ファイルは `--out` のフォルダー（省略すると今のフォルダー）に書きます。自分のサイトのモデルも、サイトのフォルダーを指定すると書き出せます。

## datamodels.jp からダウンロードする {#download}

コマンドを使わなくても、datamodels.jp の各モデルのページの**ダウンロード**の行から、これらのファイルを取れます。例は[指定緊急避難場所（EvacuationSite）](/models/disaster/EvacuationSite/)です。ファイルごとの説明は[アダプター](/adapters/#downloads)にあります。

これらのファイルはサイトと一緒に作り直されます。「公開したファイルは変えない」という約束の対象ではありません。あとで同じファイルが要るときは、ファイルを保存し、作ったときのサブジェクトのバージョンも記録してください。

## AI の構造化出力 {#ai}

AI のファイルは、strict な形にできるモデルにだけあります。たとえば Decision には形の決まっていない属性（`answers`）があるので、AI のファイルはありません。

Claude の strict モードでは、null を許すプロパティは 1 回のリクエストで 16 個までです。属性の多いモデルは、strict を付けずに tool の `input_schema` として使うか、要らない属性を除いてください。OpenAI の strict モードでは、そのまま使えます。
