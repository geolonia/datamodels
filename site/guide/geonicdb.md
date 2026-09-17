---
title: GeonicDB で使う
description: カタログのデータモデルを GeonicDB に登録し、エンティティを作成・検索するまでの手順
---

# GeonicDB で使う

各モデルのページには GeonicDB の Custom Data Model 定義（`POST /custom-data-models` の request body）へのリンクがあります。定義には `contextUrl` が入っているので、登録するだけでカタログの語彙が使われます。

## 前提

- GeonicDB のテナントと API キー（[GeonicDB ドキュメント](https://docs.geonicdb.com/ja/saas/api-key)）
- 環境変数: `GEONICDB_BASE_URL`（例: `https://<your-deployment>.geonicdb.jp`）、`GEONICDB_TENANT`、`GEONICDB_API_KEY`

## 登録すると何が起きるか

登録は任意です。GeonicDB はモデルの無い型のエンティティもそのまま受け付けます。Custom Data Model を登録すると、テナント内のその型名にルールが付きます。

- 作成・全置換・部分更新のたびに、属性が検証されます。必須属性の有無、`valueType`（日時は RFC 3339 を厳密に検査）、`enum`・`pattern`・`minimum`・`maximum`・長さの制約。
- `defaultValue` を持つ属性は、無ければ補完されます。
- 一意制約を宣言していれば、データベースのインデックスで強制されます。
- `additionalProperties: false` のモデルでは、モデルに無い属性は 400 で拒否されます。`true` なら未検証で通ります。
- `contextUrl` は、その型の属性名がどの context に属するかを GeonicDB に教えます。`@context` や `Link` ヘッダー付きで書かれたエンティティでも属性名が正しく照合されます。`contextUrl` が無いと GeonicDB はテナント固有の context と IRI を自動生成します。
- 登録済みモデルは、生成された JSON Schema、コンソール、MCP・A2A のツールから参照できます。

既存のエンティティは、モデルを登録・変更しても再検証されません（適合性レポートを別途取れます）。レスポンスも変わりません。GeonicDB は `@context` を注入しないので、クライアントが自分で context を渡します。

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

各モデルページの「例（normalized）」は `@context` を含む JSON-LD なので、`Content-Type: application/ld+json` でそのまま POST できます。

```bash
curl -sSf https://models.geonicdb.com/examples/disaster/RoadClosure/example-normalized.jsonld -o entity.jsonld

curl -X POST "$GEONICDB_BASE_URL/ngsi-ld/v1/entities" \
  -H "Content-Type: application/ld+json" \
  -H "x-api-key: $GEONICDB_API_KEY" \
  -H "NGSILD-Tenant: $GEONICDB_TENANT" \
  --data @entity.jsonld
```

自分のデータを送るときは、body に `@context` を入れて `application/ld+json` で送るか、`@context` を入れずに `Content-Type: application/json` と `Link` ヘッダー（次の検索の例を参照）で送ります。両方は同時に使いません。エイリアス（`v1.jsonld`）を使うのが通常です。

## 3. 検索する

```bash
curl "$GEONICDB_BASE_URL/ngsi-ld/v1/entities?type=RoadClosure&q=closureStatus==%22通行止め中%22" \
  -H "Accept: application/ld+json" \
  -H 'Link: <https://models.geonicdb.com/context/disaster/v1.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  -H "x-api-key: $GEONICDB_API_KEY" \
  -H "NGSILD-Tenant: $GEONICDB_TENANT"
```

## モデルはほぼ合うが、独自の属性を数個足したいとき

厳密さの順に 3 つのやり方があります。

1. **未知の属性を許す。** `--allow-additional` で `additionalProperties: true` の定義を書き出して登録します。独自の属性は受け付けられますが検証されず、JSON-LD ではリクエストの context が定める IRI（無ければ GeonicDB の既定語彙）に展開されます。
2. **定義を拡張する。** カタログの属性に自分の属性を足した定義を登録し、`contextUrl` にはカタログの context を取り込んで自分の語だけを定義した context を指定します。独自の属性も他と同じように検証され、IRI は自分の管理下に置けます。カタログが Smart Data Models に対して行っている「プロファイル」を、一段下で行う形です。

   ```json
   {
     "@context": [
       "https://models.geonicdb.com/context/disaster/v1.jsonld",
       { "acme": "https://example.com/ns/acme/", "patrolRoute": "acme:patrolRoute" }
     ]
   }
   ```

   拡張ファイル（型名をキーにする）を用意して書き出します。カタログの属性を再定義しようとするとエラーになります。

   ```json
   {
     "RoadClosure": {
       "contextUrl": "https://example.com/context/acme-disaster.jsonld",
       "propertyDetails": {
         "patrolRoute": { "ngsiType": "Property", "valueType": "string", "example": "A-3", "description": "巡回ルート", "@context": "https://example.com/ns/acme/patrolRoute" }
       }
     }
   }
   ```

   ```bash
   node scripts/export-geonicdb.mjs disaster --type RoadClosure --extend ./acme.json --out ./out
   ```

3. **カタログに提案する。** 自分の案件以外でも役に立つ属性なら、[Issue](https://github.com/geolonia/geonicdb-models/issues) か Pull Request で提案してください。次のマイナーバージョンで追加されれば、拡張は不要になります。

## 型名を変えたいとき

テナント内で型名に接頭辞を付けたい場合（複数案件が同じテナントを共有し、認可ポリシーを型名で分けているときなど）は、リポジトリのスクリプトで接頭辞付きの定義を書き出せます。語彙（IRI）はカタログのままです。

```bash
git clone https://github.com/geolonia/geonicdb-models && cd geonicdb-models && npm ci
node scripts/export-geonicdb.mjs disaster --type-prefix Saitai --out ./out
```

## 補足

- `catalog.json` にはすべてのモデルの `contextUrl`、`schemaUrl`、GeonicDB 用定義の URL が入っています。自動化に使えます。
- GeonicDB がカタログを直接読み込んで「モデルから作成」できるようにする機能は計画中です。
