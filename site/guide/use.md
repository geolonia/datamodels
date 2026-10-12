---
title: 使い方
description: カタログのモデルで JSON を検証し、NGSI-LD ブローカーに送り、Linked Data として使う
---

# 使い方

各モデルのページには、**@context**（各属性の意味）、**JSON Schema**（正しいデータの形）、**例**の 3 つがあります。どれも普通の URL で公開しているので、特定の製品がなくても使えます。モデルは**分野**ごとにまとまっています。分野は、関係するモデルのまとまりで、名前空間とバージョンを持ちます（`disaster`、`transportation` など）。データの中では、**バージョンの別名**の URL（`…/v1.jsonld`、`…/v1.json`）を使います。互換性のある最新のバージョンを指す URL です。使い分けは[URL とバージョン](/guide/urls)で、言葉の意味は[用語](/guide/#terms)で説明しています。

使い方は 3 通りです。どれか 1 つだけでも、組み合わせても使えます。

- [JSON を検証する](#validate)：API やフォーム、CSV ファイルから来たデータを、JSON Schema で確認します。
- [NGSI-LD ブローカーに送る](#broker)：標準の NGSI-LD API を備えたブローカーで、保存と検索をします。
- [Linked Data として使う](#linked-data)：@context を付けると、各属性が世界で一意の名前（IRI）で表されます。

NGSI-LD を読まないツール（表計算ソフト、AI、PostgreSQL）向けのファイルもあります。[他のツールに書き出す](/toolkit/export)を見てください。

<svg class="flow-diagram" viewBox="0 0 460 292" role="group" aria-label="datamodels.jp の 1 つのモデル（@context、JSON Schema、例）は 3 通りに使えます。JSON を検証する、NGSI-LD ブローカーに送る、Linked Data として使う。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="use-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box main" x="20" y="8" width="420" height="58" rx="10"/><text class="t" x="230.0" y="33">datamodels.jp のモデル</text><text class="s" x="230.0" y="53">@context・JSON Schema・例</text><line class="a" x1="44" y1="66" x2="44" y2="256"/><line class="a" x1="44" y1="116" x2="76" y2="116" marker-end="url(#use-ah)"/><a href="#validate"><rect class="box" x="80" y="88" width="360" height="56" rx="10"/><text class="t" x="260.0" y="112">JSON を検証する</text><text class="s" x="260.0" y="132">JSON Schema で</text></a><line class="a" x1="44" y1="186" x2="76" y2="186" marker-end="url(#use-ah)"/><a href="#broker"><rect class="box" x="80" y="158" width="360" height="56" rx="10"/><text class="t" x="260.0" y="182">NGSI-LD ブローカーに送る</text><text class="s" x="260.0" y="202">@context 付きの normalized の形で</text></a><line class="a" x1="44" y1="256" x2="76" y2="256" marker-end="url(#use-ah)"/><a href="#linked-data"><rect class="box" x="80" y="228" width="360" height="56" rx="10"/><text class="t" x="260.0" y="252">Linked Data として使う</text><text class="s" x="260.0" y="272">@context で JSON を RDF に</text></a></svg>

以下では[通行規制（RoadRestriction）](/models/transportation/RoadRestriction/)を例にしていますが、URL を替えれば、どのモデルでも同じように使えます。

## JSON を検証する {#validate}

JSON Schema で確認するのは、属性名と値だけの単純な形のデータです。この形を *key-values の形*と呼びます。住所やジオメトリなど、ほかのスキーマを参照している部分も、自動で取得して確認します。

::: code-group

```js [Node.js]
// npm install ajv ajv-formats
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const base = 'https://datamodels.jp';
const model = 'transportation/RoadRestriction';
const getJson = async (url) => (await fetch(url)).json();

const schema = await getJson(`${base}/schema/${model}/v1.0.0.json`);
const entity = await getJson(`${base}/examples/${model}/example.json`);

// strict: false はカタログの x-* 注釈を受け入れる。
// loadSchema は参照先のスキーマを取得する。
const ajv = new Ajv2020({ strict: false, loadSchema: getJson });
addFormats(ajv);
const validate = await ajv.compileAsync(schema);
console.log(validate(entity) ? 'valid' : validate.errors);
```

```python [Python]
# pip install "jsonschema[format]" requests
# （[format] がないと URI と日時の形式を検証しない）
import requests
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

BASE = "https://datamodels.jp"
MODEL = "transportation/RoadRestriction"

def get(url):
    return requests.get(url, timeout=30).json()

schema = get(f"{BASE}/schema/{MODEL}/v1.0.0.json")
entity = get(f"{BASE}/examples/{MODEL}/example.json")

# 参照先のスキーマ（住所、ジオメトリ）は、
# 使われたときに取得する。
registry = Registry(retrieve=lambda url: Resource.from_contents(get(url)))
validator = Draft202012Validator(
    schema,
    registry=registry,
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
errors = [e.message for e in validator.iter_errors(entity)]
print(errors or "valid")
```

```bash [コマンドライン]
# pipx install check-jsonschema（または uvx check-jsonschema ...）
BASE=https://datamodels.jp
MODEL=transportation/RoadRestriction
curl -sSf "$BASE/examples/$MODEL/example.json" -o entity.json
check-jsonschema --schemafile "$BASE/schema/$MODEL/v1.0.0.json" entity.json
```

:::

許されていない値があると、どの属性のどこが違うかが表示されます。

## NGSI-LD ブローカーに送る {#broker}

NGSI-LD のブローカーには、通常は *normalized の形*で送ります。この形では、各属性が自分の種類も示します。値を持つ Property なのか、別のエンティティを指す Relationship なのか、といった種類です。モデルのページには両方の形の例があるので、normalized の例はそのまま送れます。

```bash
BROKER=http://localhost:1026   # ブローカーの URL
BASE=https://datamodels.jp
MODEL=transportation/RoadRestriction
curl -sSf "$BASE/examples/$MODEL/example-normalized.jsonld" -o entity.jsonld

# 作成
curl -X POST "$BROKER/ngsi-ld/v1/entities" \
  -H "Content-Type: application/ld+json" \
  --data @entity.jsonld

# 検索: 通行止め中のものだけ
CONTEXT="$BASE/context/transportation/v1.jsonld"
REL='rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'
curl -G "$BROKER/ngsi-ld/v1/entities" \
  --data-urlencode 'type=RoadRestriction' \
  --data-urlencode 'q=restrictionStatus=="closed"' \
  -H "Accept: application/ld+json" \
  -H "Link: <$CONTEXT>; $REL"
```

@context の渡し方は 2 通りです。ボディに入れて `application/ld+json` で送るか、ボディには入れずに `application/json` と `Link` ヘッダーで送ります。ヘッダーはモデルのページにあります。複数のテナントを持つブローカーでは `NGSILD-Tenant` ヘッダーでテナントを指定します。認証の方法はブローカーごとに違います。

自分のデータを normalized の形にする決まりと例は、[normalized の形](/guide/normalized)にあります。

## Linked Data として使う {#linked-data}

@context を付けると、普通の JSON が JSON-LD になり、Linked Data のツールが使う RDF に変換できます。各属性には世界で一意の名前（IRI）が付くので、名前が違っても IRI が同じなら意味は同じです（[独自の名前で使う](/guide/names)）。

::: code-group

```js [Node.js]
// npm install jsonld
import jsonld from 'jsonld';

const base = 'https://datamodels.jp';
const getJson = async (url) => (await fetch(url)).json();
const entity = await getJson(
  `${base}/examples/transportation/RoadRestriction/example.json`,
);
// 普通の JSON に context を付けると Linked Data になる。
entity['@context'] = [
  `${base}/context/transportation/v1.jsonld`,
  // id と type の対応:
  'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld',
];

// 既定のローダーの代わりに fetch を使う（どの環境でも動く）。
const documentLoader = async (url) => ({
  documentUrl: url,
  document: await getJson(url),
});
const nquads = await jsonld.toRDF(entity, {
  format: 'application/n-quads',
  documentLoader,
});
console.log(nquads);
```

```python [Python]
# pip install pyld requests
import requests
from pyld import jsonld

BASE = "https://datamodels.jp"
url = f"{BASE}/examples/transportation/RoadRestriction/example.json"
entity = requests.get(url, timeout=30).json()
# 普通の JSON に context を付けると Linked Data になる。
entity["@context"] = [
    f"{BASE}/context/transportation/v1.jsonld",
    # id と type の対応:
    "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld",
]

print(jsonld.to_rdf(entity, {"format": "application/n-quads"}))
```

:::

結果の一部です。N-Quads は、RDF をテキストで書く形式です。1 行が 1 つの文です。どの行も「エンティティ（1 つ目）が、属性（2 つ目、IRI）として、値（3 つ目）を持つ」と読みます。

```text
<urn:ngsi-ld:RoadRestriction:0001> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://datamodels.jp/ns/transportation/RoadRestriction> .
<urn:ngsi-ld:RoadRestriction:0001> <https://datamodels.jp/ns/transportation/restrictionStatus> "closed" .
<urn:ngsi-ld:RoadRestriction:0001> <https://smartdatamodels.org/dataModel.Transportation/roadName> "靖国通り" .
```

各分野は、語彙（`/vocab/<subject>/v1.0.0.jsonld`、RDFS）も公開しています。語彙には、型と属性の名前と説明が日本語と英語で入っています。ほかの語彙から取り入れた属性（schema.org の `address` など）の説明は、それぞれの提供元にあります。

## 他のツールで使う {#other-tools}

NGSI-LD を読まないツール向けのファイルも、エンティティのモデルのページ（Geometry などの値型を除く）の**ダウンロード**の行にあります。それぞれの手順を、1 つの例で示しています。

- [表計算ソフト（CSV）で使う](/guide/csv)：CSV テンプレートに入力し、`frictionless validate` で検証して、エンティティに変換します。
- [PostgreSQL / PostGIS で使う](/guide/postgis)：制約付きのテーブルを作り、行を入れて、距離で検索します。
- [AI でデータを取り出す](/guide/ai-extraction)：AI 用のスキーマを AI モデルに渡し、メールや PDF からエンティティを取り出します。

自分のサイトのモデルでこれらのファイルを作るには、[他のツールに書き出す](/toolkit/export)を見てください。
