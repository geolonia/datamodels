---
title: 使い方
description: カタログのモデルで JSON を検証し、NGSI-LD ブローカーに送り、Linked Data として使う
---

# 使い方

各モデルのページには、`@context`、JSON Schema、例の URL があります。どれも普通の URL なので、特定の製品は要りません。使い方は 3 通りあります。

- **JSON として**: JSON Schema で、API のリクエスト、フォームの入力、CSV から変換したデータなどを検証する（手順 2）。
- **NGSI-LD で**: 標準の NGSI-LD API を話すブローカーに、そのまま送る（手順 3）。モデルの形（`id`・`type`、属性の種類、normalized の例）は NGSI-LD の約束に従っています。
- **Linked Data として**: `@context` を付けると RDF になり、各属性の意味を IRI で指せる（手順 4）。

コードブロックは右上のボタンでコピーできます。

## 1. URL を決める

- `@context` は**バージョン付きの URL**（例 `https://datamodels.jp/context/transportation/v1.0.0.jsonld`）を使うと、中身が変わりません。互換性のある最新版に追従したいときは `v1.jsonld` を使います。詳しくは[変わらない URL](/guide/urls)。
- JSON Schema も同じで、`/schema/<サブジェクト>/<型>/v1.0.0.json` です。

以下の例は[通行規制（RoadRestriction）](/models/transportation/RoadRestriction/)で書いていますが、URL を替えればどのモデルでも同じです。

## 2. 送る前に検証する

JSON Schema は key-values 形式（属性名と値だけの形）を検証します。住所やジオメトリなど他のスキーマを参照している部分も、自動で取得して検証します。

::: code-group

```js [Node.js]
// npm install ajv ajv-formats
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const schemaUrl = 'https://datamodels.jp/schema/transportation/RoadRestriction/v1.0.0.json';
const entity = await (await fetch('https://datamodels.jp/examples/transportation/RoadRestriction/example.json')).json();

// strict: false はカタログの x-* 注釈を受け入れる。loadSchema は参照先のスキーマを取得する。
const ajv = new Ajv2020({ strict: false, loadSchema: async (url) => (await fetch(url)).json() });
addFormats(ajv);
const validate = await ajv.compileAsync(await (await fetch(schemaUrl)).json());
console.log(validate(entity) ? 'valid' : validate.errors);
```

```python [Python]
# pip install "jsonschema[format]" requests（[format] がないと URI と日時の形式を検査しない）
import requests
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

def get(url):
    return requests.get(url, timeout=30).json()

schema = get("https://datamodels.jp/schema/transportation/RoadRestriction/v1.0.0.json")
entity = get("https://datamodels.jp/examples/transportation/RoadRestriction/example.json")

# 参照先のスキーマ（住所、ジオメトリ）は、使われたときに取得する。
registry = Registry(retrieve=lambda url: Resource.from_contents(get(url)))
validator = Draft202012Validator(schema, registry=registry, format_checker=Draft202012Validator.FORMAT_CHECKER)
errors = [e.message for e in validator.iter_errors(entity)]
print(errors or "valid")
```

```bash [コマンドライン]
# pipx install check-jsonschema（または uvx check-jsonschema ...）
curl -sSf https://datamodels.jp/examples/transportation/RoadRestriction/example.json -o entity.json
check-jsonschema --schemafile https://datamodels.jp/schema/transportation/RoadRestriction/v1.0.0.json entity.json
```

:::

値が決められた値域にない場合などは、どの属性のどこが違うかが表示されます。

## 3. ブローカーに送る

各モデルの「例（normalized）」は `@context` を含む NGSI-LD の形なので、そのまま送れます。自分のデータを送るときは、body に `@context` を入れて `application/ld+json` で送るか、`@context` を入れずに `application/json` と `Link` ヘッダーで送ります。

::: code-group

```bash [NGSI-LD（標準 API）]
# BROKER: ブローカーの URL（例 http://localhost:1026）
curl -sSf https://datamodels.jp/examples/transportation/RoadRestriction/example-normalized.jsonld -o entity.jsonld

# 作成
curl -X POST "$BROKER/ngsi-ld/v1/entities" \
  -H "Content-Type: application/ld+json" \
  --data @entity.jsonld

# 検索: 通行止め中のものだけ
curl "$BROKER/ngsi-ld/v1/entities?type=RoadRestriction&q=restrictionStatus==%22closed%22" \
  -H "Accept: application/ld+json" \
  -H 'Link: <https://datamodels.jp/context/transportation/v1.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'
```

```bash [GeonicDB]
# GEONICDB_BASE_URL, GEONICDB_TENANT, GEONICDB_API_KEY は GeonicDB のテナントの値
curl -sSf https://datamodels.jp/examples/transportation/RoadRestriction/example-normalized.jsonld -o entity.jsonld

# 作成
curl -X POST "$GEONICDB_BASE_URL/ngsi-ld/v1/entities" \
  -H "Content-Type: application/ld+json" \
  -H "x-api-key: $GEONICDB_API_KEY" \
  -H "NGSILD-Tenant: $GEONICDB_TENANT" \
  --data @entity.jsonld

# 検索: 通行止め中のものだけ
curl "$GEONICDB_BASE_URL/ngsi-ld/v1/entities?type=RoadRestriction&q=restrictionStatus==%22closed%22" \
  -H "Accept: application/ld+json" \
  -H 'Link: <https://datamodels.jp/context/transportation/v1.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  -H "x-api-key: $GEONICDB_API_KEY" \
  -H "NGSILD-Tenant: $GEONICDB_TENANT"
```

:::

複数のテナントを持つブローカーでは、標準の `NGSILD-Tenant` ヘッダーでテナントを指定します。認証の方法はブローカーごとに違います。

## 4. Linked Data として使う

JSON に `@context` を付けると JSON-LD になり、RDF に変換できます。属性はカタログの IRI（`https://datamodels.jp/ns/...`）や、借りている標準の IRI（schema.org、Smart Data Models）になります。`id` と `type` を JSON-LD の `@id`・`@type` にするため、NGSI-LD の core context も並べます。

::: code-group

```js [Node.js]
// npm install jsonld
import jsonld from 'jsonld';

const entity = await (await fetch('https://datamodels.jp/examples/transportation/RoadRestriction/example.json')).json();
// 普通の JSON に context を付けると Linked Data になる。
entity['@context'] = [
  'https://datamodels.jp/context/transportation/v1.0.0.jsonld',
  'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld', // id と type の対応
];

// 既定のローダーの代わりに fetch を使う（どの環境でも動く）。
const documentLoader = async (url) => ({ documentUrl: url, document: await (await fetch(url)).json() });
console.log(await jsonld.toRDF(entity, { format: 'application/n-quads', documentLoader }));
```

```python [Python]
# pip install pyld requests
import requests
from pyld import jsonld

entity = requests.get("https://datamodels.jp/examples/transportation/RoadRestriction/example.json", timeout=30).json()
# 普通の JSON に context を付けると Linked Data になる。
entity["@context"] = [
    "https://datamodels.jp/context/transportation/v1.0.0.jsonld",
    "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld",  # id と type の対応
]

print(jsonld.to_rdf(entity, {"format": "application/n-quads"}))
```

:::

結果の一部:

```text
<urn:ngsi-ld:RoadRestriction:0001> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://datamodels.jp/ns/transportation/RoadRestriction> .
<urn:ngsi-ld:RoadRestriction:0001> <https://datamodels.jp/ns/transportation/restrictionStatus> "closed" .
<urn:ngsi-ld:RoadRestriction:0001> <https://smartdatamodels.org/dataModel.Transportation/roadName> "靖国通り" .
```

各サブジェクトの語彙（`/vocab/<サブジェクト>/v1.0.0.jsonld`）には、型と属性の日本語・英語のラベルと説明があります。GIF や自治体標準オープンデータセットなど他の標準との対応表は、各モデルのページにあり、データの変換に使えます。

## 対応ブローカー

上の手順は標準の NGSI-LD API だけを使うので、NGSI-LD に準拠したブローカーならどれでも同じです。製品ごとに、モデルをサーバー側に登録して検証させるなどの追加機能があります。

- [GeonicDB](/guide/geonicdb): モデルを登録すると、作成・更新時にサーバーがエンティティを検証します。登録用の定義はモデルごとに用意しています。ただし現在は、カタログの `@context` を付けたリクエスト（上の例のような送り方）では登録したモデルが見つからず、検証されずに受け付けられます。修正は GeonicDB 側で進んでいます（詳しくは GeonicDB のページの注意書き）。送る前の検証（手順 2）はこの制限と関係なく使えます。

他の製品で試した手順は、[Issue か Pull Request](https://github.com/geolonia/datamodels) で追加してください。
