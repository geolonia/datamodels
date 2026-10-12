---
title: 他のツールに書き出す
description: datamodels-toolkit の export で、モデルから CSV テンプレート、Table Schema、AI の構造化出力、PostgreSQL / PostGIS のテーブルを作る
---

# 他のツールに書き出す

データモデルは NGSI-LD のブローカーがなくても使えます。datamodels-toolkit の `export` は、1 つのモデルから次のファイルを作ります。

```bash
npx @geolonia/datamodels@0.3.10 export \
  disaster/EvacuationSite --to csv,table-schema,ai,postgis
```

| `--to` | ファイル | 使い方 |
|---|---|---|
| `csv` | `EvacuationSite.csv` | CSV テンプレートです。表計算ソフトで 1 行に 1 件ずつ入力し、[変換](/toolkit/convert#csv-template)します。 |
| `table-schema` | `EvacuationSite.tableschema.json` | CSV の列の [Table Schema](https://datapackage.org/standard/table-schema/) です。入力した CSV ファイルを `frictionless validate` で検証できます。 |
| `ai` | `EvacuationSite.ai.json` | AI の構造化出力（strict な JSON Schema）です。PDF やメールから、モデルの形のままエンティティを取り出せます。 |
| `postgis` | `EvacuationSite.sql` | PostgreSQL / PostGIS の `CREATE TABLE` です。制約と空間インデックス付きのテーブルができます。 |

どのファイルもモデルの属性名と IRI をそのまま使うので、NGSI-LD の形との間でデータを変換できます。ファイルは `<Type>.<拡張子>` の名前で、`--out` のフォルダー（省略すると今のフォルダー）に書きます。

自分のサイトのモデルも、サイトのフォルダーを指定すると書き出せます（省略すると今のフォルダー）。サイトにそのモデルが無ければ、別のサイトの `catalog.json` から読みます。読むのは `--index` の `catalog.json` で、既定は `node.yaml` の最初のノード、無ければ datamodels.jp です。`<subject>/<Type>` の代わりに、型の IRI も使えます。

```bash
npx @geolonia/datamodels@0.3.10 export road/RoadPatrol my-models --to postgis
```

## モデルから列を作る規則 {#columns}

CSV テンプレート、その Table Schema、SQL のテーブルは、モデルを同じように列に分けます。

- 属性ごとに 1 列で、列名は属性の名前です（`hazardTypes`）。SQL ではスネークケースです（`hazard_types`）。`id` が最初の列で、SQL では主キーです。`type` の列はありません。どの行も、そのモデルのエンティティです。
- 位置は、CSV では `longitude` と `latitude`（WGS 84）の 2 列です。点以外の形も許すモデルには、GeoJSON のジオメトリを書く `location` の列もあります。SQL では `geometry(<type>, 4326)` で、型はモデルが許すものです（`Point`、どの形でもよければ `Geometry`）。
- 住所（`address`、JapaneseAddress）のように単純な項目からなる値は、項目ごとに 1 列です。CSV では `address.postalCode`、SQL では `address_postal_code` で、項目ごとに規則が付きます。そのため、表計算ソフトで項目ごとに入力でき、SQL で項目ごとに検査やインデックスができます。
- 単純な値のリストは 1 列で、値を `;` で区切ります（Table Schema の `list`）。SQL では `text[]` などの配列で、各値を検査します。
- それ以外の値（Decision の回答など）は、1 列の JSON です。属性の JSON Schema で検査します（Table Schema の `jsonSchema` の制約、SQL の `jsonb`）。
- 「externalSiteId と nationalShelterId の少なくとも一方」のように複数の属性にまたがる規則は、SQL では `CHECK` です。Table Schema と AI 用スキーマでは、説明の文になります。if/then などのほかの規則は JSON Schema にだけあり、各ファイルにそう書いてあります。

Table Schema は、規格のバージョン 2 に従います。タイトルと説明はカタログの最初の言語（datamodels.jp では日本語）で、ほかの言語は `x-translations` にあります。各列の IRI は `x-iri` にあります。`x-typeIri`、`x-schema`、`x-context` は、モデルを示します。カタログには短い見出しが無いので、説明が短ければ、その書き出しをタイトルにします。

## datamodels.jp からダウンロードする {#download}

コマンドを使わなくても、datamodels.jp の各モデルのページの**ダウンロード**の行から、これらのファイルを取れます。例は[指定緊急避難場所（EvacuationSite）](/models/disaster/EvacuationSite/)です。ファイルごとの説明は[アダプター](/adapters/#downloads)にあります。

これらのファイルはサイトと一緒に作り直されます。「公開したファイルは変えない」という約束の対象ではありません。あとで同じファイルが要るときは、ファイルを保存し、作ったときの分野のバージョンも記録してください。

## AI の構造化出力 {#ai}

AI のファイルは、strict な形にできるモデルにだけあります。たとえば Decision には形の決まっていない属性（`answers`）があるので、AI のファイルはありません。

AI 用スキーマは、OpenAI と Anthropic の両方の構造化出力が受け付ける範囲で書きます。範囲は、2026-10-11 時点の各社のドキュメントに従います（[OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas)、[Anthropic](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)）。

- どのオブジェクトも `additionalProperties: false` で、すべてのプロパティを `required` に並べます。省略できる属性は、代わりに `null` を許します。
- `$ref` は使いません。値の型は展開して書きます。
- `oneOf` の代わりに `anyOf` を使います。
- 形式（`format`）は、`date-time`、`date`、`time`、`duration`、`email`、`hostname`、`ipv4`、`ipv6`、`uuid` だけです。
- パターンには先読みと後読みを使いません。
- `minimum`、`maximum`、`minLength`、`maxLength`、`maxItems`、`uniqueItems` は使いません。`minItems` は 0 か 1 だけです。

書けなかった規則は、「(minimum 0; maximum 9)」のように説明に入れます。`id` と `type` はスキーマに入りません。アプリケーションで付けます（[AI でデータを取り出す](/guide/ai-extraction#entity)）。説明は英語です。

Claude の strict モードでは、union 型（`anyOf` や、`null` を含む型）のパラメーターは 1 回のリクエストで 16 個までです。省略できる属性は 1 つずつ数えます。geometry のように複数の形をとれる値も、ほかの値の中にあるものを含めて数えます。それより多いモデルでは、`export` がそう知らせます。属性の多いモデルは、strict を付けずに tool の `input_schema` として使うか、要らない属性を除いてください。OpenAI の strict モードでは、そのまま使えます。
