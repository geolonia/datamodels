---
title: Using the models
description: From a catalog model to validated data in an NGSI-LD broker
---

# Using the models

Every model page lists its `@context`, JSON Schema and example URLs. They are plain URLs, so no particular product is needed: any broker that speaks the standard NGSI-LD API works.

Copy a code block with the button at its top right.

## 1. Choose the URLs

- Use the **versioned** `@context` URL (for example `https://datamodels.jp/context/transportation/v1.0.0.jsonld`) so its content never changes. Use `v1.jsonld` to follow the latest compatible version instead. See [URLs that never change](/en/guide/urls).
- JSON Schemas work the same way: `/schema/<subject>/<Type>/v1.0.0.json`.

The examples below use [road restriction (RoadRestriction)](/en/models/transportation/RoadRestriction/); swap the URLs for any other model.

## 2. Validate before sending

The JSON Schema validates the key-values form (attribute names and plain values). Parts that reference other schemas, such as the address or the geometry, are fetched and validated too.

::: code-group

```js [Node.js]
// npm install ajv ajv-formats
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const schemaUrl = 'https://datamodels.jp/schema/transportation/RoadRestriction/v1.0.0.json';
const entity = await (await fetch('https://datamodels.jp/examples/transportation/RoadRestriction/example.json')).json();

// strict: false accepts the catalog's x-* annotations; loadSchema fetches referenced schemas.
const ajv = new Ajv2020({ strict: false, loadSchema: async (url) => (await fetch(url)).json() });
addFormats(ajv);
const validate = await ajv.compileAsync(await (await fetch(schemaUrl)).json());
console.log(validate(entity) ? 'valid' : validate.errors);
```

```python [Python]
# pip install "jsonschema[format]" requests  ([format] is needed to check URIs and dates)
import requests
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

def get(url):
    return requests.get(url, timeout=30).json()

schema = get("https://datamodels.jp/schema/transportation/RoadRestriction/v1.0.0.json")
entity = get("https://datamodels.jp/examples/transportation/RoadRestriction/example.json")

# The registry fetches referenced schemas (address, geometry) when they are first used.
registry = Registry(retrieve=lambda url: Resource.from_contents(get(url)))
validator = Draft202012Validator(schema, registry=registry, format_checker=Draft202012Validator.FORMAT_CHECKER)
errors = [e.message for e in validator.iter_errors(entity)]
print(errors or "valid")
```

```bash [Command line]
# pipx install check-jsonschema (or uvx check-jsonschema ...)
curl -sSf https://datamodels.jp/examples/transportation/RoadRestriction/example.json -o entity.json
check-jsonschema --schemafile https://datamodels.jp/schema/transportation/RoadRestriction/v1.0.0.json entity.json
```

:::

When a value is outside its allowed values, or similar, the output names the attribute and what is wrong.

## 3. Send to a broker

Each model's normalized example is NGSI-LD with its `@context`, so it can be sent as it is. For your own data, either put the `@context` in the body and send `application/ld+json`, or leave it out and send `application/json` with a `Link` header.

::: code-group

```bash [NGSI-LD (standard API)]
# BROKER: the broker's URL, for example http://localhost:1026
curl -sSf https://datamodels.jp/examples/transportation/RoadRestriction/example-normalized.jsonld -o entity.jsonld

# Create
curl -X POST "$BROKER/ngsi-ld/v1/entities" \
  -H "Content-Type: application/ld+json" \
  --data @entity.jsonld

# Query: closed roads only
curl "$BROKER/ngsi-ld/v1/entities?type=RoadRestriction&q=restrictionStatus==%22closed%22" \
  -H "Accept: application/ld+json" \
  -H 'Link: <https://datamodels.jp/context/transportation/v1.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'
```

```bash [GeonicDB]
# GEONICDB_BASE_URL, GEONICDB_TENANT, GEONICDB_API_KEY: your GeonicDB tenant's values
curl -sSf https://datamodels.jp/examples/transportation/RoadRestriction/example-normalized.jsonld -o entity.jsonld

# Create
curl -X POST "$GEONICDB_BASE_URL/ngsi-ld/v1/entities" \
  -H "Content-Type: application/ld+json" \
  -H "x-api-key: $GEONICDB_API_KEY" \
  -H "NGSILD-Tenant: $GEONICDB_TENANT" \
  --data @entity.jsonld

# Query: closed roads only
curl "$GEONICDB_BASE_URL/ngsi-ld/v1/entities?type=RoadRestriction&q=restrictionStatus==%22closed%22" \
  -H "Accept: application/ld+json" \
  -H 'Link: <https://datamodels.jp/context/transportation/v1.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  -H "x-api-key: $GEONICDB_API_KEY" \
  -H "NGSILD-Tenant: $GEONICDB_TENANT"
```

:::

Brokers with several tenants take the tenant in the standard `NGSILD-Tenant` header. Authentication differs from broker to broker.

## Works with

The steps above use only the standard NGSI-LD API, so they are the same for any NGSI-LD compliant broker. Some products add features on top, such as registering a model so the server validates entities.

- [GeonicDB](/en/guide/geonicdb): register a model and the server validates every create and update. A ready-made definition is published for each model.

If you have tried another product, add its steps with an [issue or pull request](https://github.com/geolonia/datamodels).
