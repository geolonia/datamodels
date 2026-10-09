---
title: 使い方
description: カタログのモデルで JSON を検証し、NGSI-LD ブローカーに送り、Linked Data として使う
---

# 使い方

各モデルのページには 3 つのものがあります。**@context**（各属性の意味）、**JSON Schema**（正しいデータの形）、**例**です。どれも普通の URL なので、特定の製品は要りません。データにはエイリアスの URL（`…/v1.jsonld`、`…/v1.json`）を使います。どの URL をいつ使うかは[URL とバージョン](/guide/urls)にあります。

使い方は 3 通りあり、1 つでも、組み合わせても使えます。

- [JSON を検証する](#validate): API、フォーム、CSV ファイルからのデータを JSON Schema で確認します。
- [NGSI-LD ブローカーに送る](#broker): 標準の NGSI-LD API を話すブローカーに保存し、検索します。
- [Linked Data として使う](#linked-data): @context を付けると、各属性が世界で一意の名前（IRI）を持ちます。

<svg class="flow-diagram" viewBox="0 0 460 292" role="group" aria-label="datamodels.jp の 1 つのモデル（@context、JSON Schema、例）は 3 通りに使えます。JSON を検証する、NGSI-LD ブローカーに送る、Linked Data として使う。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="use-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box main" x="20" y="8" width="420" height="58" rx="10"/><text class="t" x="230.0" y="33">datamodels.jp のモデル</text><text class="s" x="230.0" y="53">@context・JSON Schema・例</text><line class="a" x1="44" y1="66" x2="44" y2="256"/><line class="a" x1="44" y1="116" x2="76" y2="116" marker-end="url(#use-ah)"/><a href="#validate"><rect class="box" x="80" y="88" width="360" height="56" rx="10"/><text class="t" x="260.0" y="112">JSON を検証する</text><text class="s" x="260.0" y="132">JSON Schema で</text></a><line class="a" x1="44" y1="186" x2="76" y2="186" marker-end="url(#use-ah)"/><a href="#broker"><rect class="box" x="80" y="158" width="360" height="56" rx="10"/><text class="t" x="260.0" y="182">NGSI-LD ブローカーに送る</text><text class="s" x="260.0" y="202">@context 付きの normalized の形で</text></a><line class="a" x1="44" y1="256" x2="76" y2="256" marker-end="url(#use-ah)"/><a href="#linked-data"><rect class="box" x="80" y="228" width="360" height="56" rx="10"/><text class="t" x="260.0" y="252">Linked Data として使う</text><text class="s" x="260.0" y="272">@context で JSON を RDF に</text></a></svg>

以下の例は[通行規制（RoadRestriction）](/models/transportation/RoadRestriction/)で書いていますが、URL を替えればどのモデルでも同じです。

## JSON を検証する {#validate}

JSON Schema は、属性名と値だけのシンプルな形（*key-values* と呼びます）のデータを確認します。住所やジオメトリなど他のスキーマを参照している部分も、自動で取得して確認します。

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

値が許されていないときは、どの属性のどこが違うかが表示されます。

## NGSI-LD ブローカーに送る {#broker}

NGSI-LD のブローカーは、ふつう *normalized* の形を受け取ります。各属性が、値を持つ Property か、別のエンティティを指す Relationship かなど、自分の種類も示す形です。モデルのページには例が両方の形であるので、normalized の例はそのまま送れます。

```bash
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

body に @context を入れて `application/ld+json` で送るか、入れずに `application/json` と `Link` ヘッダー（モデルのページにあります）で送ります。複数のテナントを持つブローカーでは `NGSILD-Tenant` ヘッダーでテナントを指定します。認証の方法はブローカーごとに違います。

**自分のデータを normalized にする。** モデルのページの「試す」タブで、書いたものを 2 つの形の間で切り替えられます。CSV の一覧なら [datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) の `datamodels convert … --normalized` が変換します（[データを変換する](/guide/mapping)）。自分のコードで変換するときは、次の決まりに従ってください。

<details class="rules">
<summary>key-values から normalized への決まり</summary>

- `id` と `type` はそのまま。
- 各属性は、モデルのページの属性の表にある NGSI-LD の型で包みます。Property は `{ "type": "Property", "value": … }`、Relationship は `{ "type": "Relationship", "object": … }`、GeoProperty は `{ "type": "GeoProperty", "value": … }`、JsonProperty は `{ "type": "JsonProperty", "json": … }`、VocabProperty は `{ "type": "VocabProperty", "vocab": … }` です。key-values の形でも、JsonProperty と VocabProperty はメンバーを残します（`{ "json": … }`、`{ "vocab": … }`）。JSON Schema は中の値を表すので、key-values のデータをスキーマで検証するときは、このメンバーを外してから検証してください。この 2 つは NGSI-LD 1.8 の型なので、使うモデルの前に、ブローカーが対応しているかを確かめてください。
- 日時の Property（スキーマの `format: date-time`）の値は `{ "@type": "DateTime", "@value": … }` にします。
- 複数の値を持つ属性（属性の表で「複数可」と示すもの。Task の `assignee` など）は、値ごとに 1 つのインスタンスを並べた配列にし、それぞれに `datasetId` を付けます。カタログの例は `urn:ngsi-ld:dataset:<属性名>:<番号>` の形を使っています。
- `@context` にはサブジェクトのエイリアスと NGSI-LD のコアコンテキストを並べます。

たとえば、この key-values の Task は

```json
{
  "id": "urn:ngsi-ld:Task:1234",
  "type": "Task",
  "name": "靖国通りのアンダーパスの冠水を確認する",
  "progress": "in-process",
  "due": "2026-07-08T12:00:00+09:00",
  "assignee": ["urn:ngsi-ld:Team:field-team-a"]
}
```

normalized では次のようになります。

```json
{
  "@context": [
    "https://datamodels.jp/context/task/v1.jsonld",
    "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld"
  ],
  "id": "urn:ngsi-ld:Task:1234",
  "type": "Task",
  "name": { "type": "Property", "value": "靖国通りのアンダーパスの冠水を確認する" },
  "progress": { "type": "Property", "value": "in-process" },
  "due": { "type": "Property", "value": { "@type": "DateTime", "@value": "2026-07-08T12:00:00+09:00" } },
  "assignee": [
    { "type": "Relationship", "object": "urn:ngsi-ld:Team:field-team-a", "datasetId": "urn:ngsi-ld:dataset:assignee:1" }
  ]
}
```

</details>

### 試したブローカー

この手順は標準の NGSI-LD API だけを使うので、準拠したブローカーならどれでも動くはずです。これまでに試したのは [GeonicDB](/guide/geonicdb) の 1 つで、GeonicDB に固有のことはそのページにあります。Orion-LD、Scorpio、Stellio はまだ試していません。他のブローカーで試したら、うまく動かなかった場合も含めて [Issue](https://github.com/geolonia/datamodels/issues) でお知らせください。

## Linked Data として使う {#linked-data}

@context を付けると、普通の JSON が JSON-LD になります。各属性は世界で一意の名前（IRI）を持ちます。カタログ独自の IRI（`https://datamodels.jp/ns/...`）か、借りている標準（schema.org、Smart Data Models）の IRI です。JSON-LD は Linked Data のツールが使う RDF に変換できます。`id` と `type` を JSON-LD の `@id`・`@type` にするため、NGSI-LD の core context も並べます。

::: code-group

```js [Node.js]
// npm install jsonld
import jsonld from 'jsonld';

const entity = await (await fetch('https://datamodels.jp/examples/transportation/RoadRestriction/example.json')).json();
// 普通の JSON に context を付けると Linked Data になる。
entity['@context'] = [
  'https://datamodels.jp/context/transportation/v1.jsonld',
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
    "https://datamodels.jp/context/transportation/v1.jsonld",
    "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld",  # id と type の対応
]

print(jsonld.to_rdf(entity, {"format": "application/n-quads"}))
```

:::

結果の一部（N-Quads、1 行に 1 つの文）:

```text
<urn:ngsi-ld:RoadRestriction:0001> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://datamodels.jp/ns/transportation/RoadRestriction> .
<urn:ngsi-ld:RoadRestriction:0001> <https://datamodels.jp/ns/transportation/restrictionStatus> "closed" .
<urn:ngsi-ld:RoadRestriction:0001> <https://smartdatamodels.org/dataModel.Transportation/roadName> "靖国通り" .
```

各サブジェクトは語彙（`/vocab/<サブジェクト>/v1.0.0.jsonld`、RDFS）も公開しています。型と属性の名前と説明を日本語と英語で持ちます。他の語彙から借りた属性（schema.org の `address` など）は、それぞれの提供元が説明しています。
