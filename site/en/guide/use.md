---
title: Using the models
description: Validate JSON with the catalog models, send it to an NGSI-LD broker, and use it as linked data
---

# Using the models

Every model page gives three things: the **@context** (what each attribute means), the **JSON Schema** (what valid data looks like) and **examples**. They are plain URLs, so no particular product is needed. Use the alias URLs (`…/v1.jsonld`, `…/v1.json`) in your data; which URL to use when is in [URLs and versions](/en/guide/urls).

There are three ways to use a model, and you can use one, two or all three:

- [Validate JSON](#validate): check data from an API, a form or a CSV file against the JSON Schema.
- [Send it to an NGSI-LD broker](#broker): store and query the data in any broker that speaks the standard NGSI-LD API.
- [Use it as linked data](#linked-data): add the @context and every attribute gets a globally unique name (an IRI).

<svg class="flow-diagram" viewBox="0 0 460 292" role="img" aria-label="One model on datamodels.jp (its @context, JSON Schema and examples) can be used in three ways: validate JSON, send it to an NGSI-LD broker, use it as linked data." xmlns="http://www.w3.org/2000/svg"><defs><marker id="use-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box main" x="20" y="8" width="420" height="58" rx="10"/><text class="t" x="230.0" y="33">A model on datamodels.jp</text><text class="s" x="230.0" y="53">@context · JSON Schema · examples</text><line class="a" x1="44" y1="66" x2="44" y2="256"/><line class="a" x1="44" y1="116" x2="76" y2="116" marker-end="url(#use-ah)"/><a href="#validate"><rect class="box" x="80" y="88" width="360" height="56" rx="10"/><text class="t" x="260.0" y="112">Validate JSON</text><text class="s" x="260.0" y="132">with the JSON Schema</text></a><line class="a" x1="44" y1="186" x2="76" y2="186" marker-end="url(#use-ah)"/><a href="#broker"><rect class="box" x="80" y="158" width="360" height="56" rx="10"/><text class="t" x="260.0" y="182">Send it to an NGSI-LD broker</text><text class="s" x="260.0" y="202">in the normalized form, with the @context</text></a><line class="a" x1="44" y1="256" x2="76" y2="256" marker-end="url(#use-ah)"/><a href="#linked-data"><rect class="box" x="80" y="228" width="360" height="56" rx="10"/><text class="t" x="260.0" y="252">Use it as linked data</text><text class="s" x="260.0" y="272">the @context turns JSON into RDF</text></a></svg>

The examples use [road restriction (RoadRestriction)](/en/models/transportation/RoadRestriction/); swap the URLs for any other model.

## Validate JSON {#validate}

The JSON Schema checks data in the simple form: attribute names with plain values (called *key-values*). Parts that refer to other schemas, such as the address or the geometry, are fetched and checked too.

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

// strict: false accepts the catalog's x-* annotations.
// loadSchema fetches the schemas this one refers to.
const ajv = new Ajv2020({ strict: false, loadSchema: getJson });
addFormats(ajv);
const validate = await ajv.compileAsync(schema);
console.log(validate(entity) ? 'valid' : validate.errors);
```

```python [Python]
# pip install "jsonschema[format]" requests
# ([format] is needed to check URIs and dates)
import requests
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

BASE = "https://datamodels.jp"
MODEL = "transportation/RoadRestriction"

def get(url):
    return requests.get(url, timeout=30).json()

schema = get(f"{BASE}/schema/{MODEL}/v1.0.0.json")
entity = get(f"{BASE}/examples/{MODEL}/example.json")

# The registry fetches referenced schemas (address, geometry)
# when they are first used.
registry = Registry(retrieve=lambda url: Resource.from_contents(get(url)))
validator = Draft202012Validator(
    schema,
    registry=registry,
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
errors = [e.message for e in validator.iter_errors(entity)]
print(errors or "valid")
```

```bash [Command line]
# pipx install check-jsonschema (or uvx check-jsonschema ...)
BASE=https://datamodels.jp
MODEL=transportation/RoadRestriction
curl -sSf "$BASE/examples/$MODEL/example.json" -o entity.json
check-jsonschema --schemafile "$BASE/schema/$MODEL/v1.0.0.json" entity.json
```

:::

When a value is not allowed, the output names the attribute and what is wrong.

## Send it to an NGSI-LD broker {#broker}

NGSI-LD brokers usually take the *normalized* form, in which each attribute also says what kind it is (a Property with a value, a Relationship pointing to another entity, and so on). Every model page has the example in both forms, so the normalized example can be sent as it is:

```bash
BROKER=http://localhost:1026   # your broker's URL
BASE=https://datamodels.jp
MODEL=transportation/RoadRestriction
curl -sSf "$BASE/examples/$MODEL/example-normalized.jsonld" -o entity.jsonld

# Create
curl -X POST "$BROKER/ngsi-ld/v1/entities" \
  -H "Content-Type: application/ld+json" \
  --data @entity.jsonld

# Query: closed roads only
CONTEXT="$BASE/context/transportation/v1.jsonld"
REL='rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'
curl -G "$BROKER/ngsi-ld/v1/entities" \
  --data-urlencode 'type=RoadRestriction' \
  --data-urlencode 'q=restrictionStatus=="closed"' \
  -H "Accept: application/ld+json" \
  -H "Link: <$CONTEXT>; $REL"
```

Put the @context in the body and send `application/ld+json`, or leave it out and send `application/json` with a `Link` header (the model page shows it). Brokers with several tenants take the tenant in the `NGSILD-Tenant` header; authentication differs from broker to broker.

**Your own data in the normalized form.** The "Try it" tab on a model page switches what you write between the two forms, and for a CSV list `datamodels convert … --normalized` from [datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) does it ([Converting data](/en/guide/mapping)). To do it in your own code, follow the rules below.

<details class="rules">
<summary>The rules, from key-values to normalized</summary>

- `id` and `type` stay as they are.
- Wrap each attribute in the NGSI-LD type that the attribute table on the model page gives: a Property is `{ "type": "Property", "value": … }`, a Relationship `{ "type": "Relationship", "object": … }`, a GeoProperty `{ "type": "GeoProperty", "value": … }`, a JsonProperty `{ "type": "JsonProperty", "json": … }`, a VocabProperty `{ "type": "VocabProperty", "vocab": … }`. In key-values form, a JsonProperty and a VocabProperty keep their member: `{ "json": … }`, `{ "vocab": … }`. The JSON Schema describes the value inside, so remove that member before you validate key-values data against the schema. Both are NGSI-LD 1.8 types: check that your broker supports them before you use a model that has them.
- The value of a date-time Property (`format: date-time` in the schema) becomes `{ "@type": "DateTime", "@value": … }`.
- A multi-valued attribute (marked "(multiple)" in the attribute table; for example `assignee` on Task) becomes an array with one instance per value, each with a `datasetId`. The catalog's examples use the form `urn:ngsi-ld:dataset:<attribute>:<n>`.
- The `@context` lists the subject's alias and the NGSI-LD core context.

For example, this key-values Task

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

is, in normalized form:

```json
{
  "@context": [
    "https://datamodels.jp/context/task/v1.jsonld",
    "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld"
  ],
  "id": "urn:ngsi-ld:Task:1234",
  "type": "Task",
  "name": {
    "type": "Property",
    "value": "靖国通りのアンダーパスの冠水を確認する"
  },
  "progress": { "type": "Property", "value": "in-process" },
  "due": {
    "type": "Property",
    "value": { "@type": "DateTime", "@value": "2026-07-08T12:00:00+09:00" }
  },
  "assignee": [
    {
      "type": "Relationship",
      "object": "urn:ngsi-ld:Team:field-team-a",
      "datasetId": "urn:ngsi-ld:dataset:assignee:1"
    }
  ]
}
```

</details>

### Brokers tried

These steps use only the standard NGSI-LD API, so they should work with any compliant broker. So far they have been tried with one, [GeonicDB](/en/guide/geonicdb), which has its own page for what is specific to it. Orion-LD, Scorpio and Stellio have not been tried yet. If you try another broker, please tell us the result in an [issue](https://github.com/geolonia/datamodels/issues), also when something does not work.

## Use it as linked data {#linked-data}

Adding the @context turns plain JSON into JSON-LD. Every attribute then has a globally unique name, an IRI: the catalog's own (`https://datamodels.jp/ns/...`) or those of the standards it borrows from (schema.org, Smart Data Models). JSON-LD converts to RDF, the format of linked data tools. The NGSI-LD core context is listed too, so that `id` and `type` become JSON-LD's `@id` and `@type`.

::: code-group

```js [Node.js]
// npm install jsonld
import jsonld from 'jsonld';

const base = 'https://datamodels.jp';
const getJson = async (url) => (await fetch(url)).json();
const entity = await getJson(
  `${base}/examples/transportation/RoadRestriction/example.json`,
);
// Plain JSON becomes linked data by adding the catalog context.
entity['@context'] = [
  `${base}/context/transportation/v1.jsonld`,
  // maps id and type:
  'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld',
];

// fetch replaces the default document loader, so this runs anywhere.
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
# Plain JSON becomes linked data by adding the catalog context.
entity["@context"] = [
    f"{BASE}/context/transportation/v1.jsonld",
    # maps id and type:
    "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld",
]

print(jsonld.to_rdf(entity, {"format": "application/n-quads"}))
```

:::

Part of the output (N-Quads, one statement per line):

```text
<urn:ngsi-ld:RoadRestriction:0001> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://datamodels.jp/ns/transportation/RoadRestriction> .
<urn:ngsi-ld:RoadRestriction:0001> <https://datamodels.jp/ns/transportation/restrictionStatus> "closed" .
<urn:ngsi-ld:RoadRestriction:0001> <https://smartdatamodels.org/dataModel.Transportation/roadName> "靖国通り" .
```

Each subject also publishes a vocabulary (`/vocab/<subject>/v1.0.0.jsonld`, RDFS) with the Japanese and English names and descriptions of its types and attributes. Attributes borrowed from other vocabularies, such as schema.org's `address`, are described by their own publishers.
