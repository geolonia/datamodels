---
title: GeonicDB で使う
description: カタログのデータモデルを GeonicDB に登録し、エンティティを作成・検索するまでの手順
---

# GeonicDB で使う

各モデルのページには GeonicDB の Custom Data Model 定義（`POST /custom-data-models` の request body）へのリンクがあります。定義には `contextUrl` が入っているので、登録するだけでカタログの語彙が使われます。

## 前提

- GeonicDB のテナントと API キー（[GeonicDB ドキュメント](https://docs.geonicdb.com/ja/saas/api-key)）
- 環境変数: `GEONICDB_BASE_URL`（例: `https://<your-deployment>.geonicdb.jp`）、`GEONICDB_TENANT`、`GEONICDB_API_KEY`

## 1. Custom Data Model を登録する

```bash
curl -sSf https://models.geonicdb.com/geonicdb/disaster/RoadClosure.json -o RoadClosure.json

curl -X POST "$GEONICDB_BASE_URL/custom-data-models" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $GEONICDB_API_KEY" \
  -H "Fiware-Service: $GEONICDB_TENANT" \
  --data @RoadClosure.json
```

`201 Created` が返れば登録完了です。同じ型名が既にあると `409` になります。`geonic` CLI なら `geonic models create RoadClosure.json` です。

登録された定義は属性の型・必須・enum を検証し（`additionalProperties: false` のモデルでは未定義の属性を拒否）、`contextUrl` の context をこの型の語彙として使います。

## 2. エンティティを作成する

NGSI-LD API では `Link` ヘッダーでカタログの context を渡します。エイリアス（`v1.jsonld`）を使うのが通常です。

```bash
curl -X POST "$GEONICDB_BASE_URL/ngsi-ld/v1/entities" \
  -H "Content-Type: application/json" \
  -H 'Link: <https://models.geonicdb.com/context/disaster/v1.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  -H "x-api-key: $GEONICDB_API_KEY" \
  -H "NGSILD-Tenant: $GEONICDB_TENANT" \
  --data @example-normalized.json
```

各モデルページの「例（normalized）」がそのまま使えます（`@context` は `Link` ヘッダーで渡すので body から外してください）。

## 3. 検索する

```bash
curl "$GEONICDB_BASE_URL/ngsi-ld/v1/entities?type=RoadClosure&q=closureStatus==%22通行止め中%22" \
  -H "Accept: application/ld+json" \
  -H 'Link: <https://models.geonicdb.com/context/disaster/v1.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  -H "x-api-key: $GEONICDB_API_KEY" \
  -H "NGSILD-Tenant: $GEONICDB_TENANT"
```

## 型名を変えたいとき

テナント内で型名に接頭辞を付けたい場合（複数案件が同じテナントを共有し、認可ポリシーを型名で分けているときなど）は、リポジトリのスクリプトで接頭辞付きの定義を書き出せます。語彙（IRI）はカタログのままです。

```bash
git clone https://github.com/geolonia/geonicdb-models && cd geonicdb-models && npm ci
node scripts/export-geonicdb.mjs disaster --type-prefix Saitai --out ./out
```

## 補足

- `catalog.json` にはすべてのモデルの `contextUrl`、`schemaUrl`、GeonicDB 用定義の URL が入っています。自動化に使えます。
- GeonicDB がカタログを直接読み込んで「モデルから作成」できるようにする機能は計画中です。
