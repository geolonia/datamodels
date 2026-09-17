---
title: Use with GeonicDB
description: Register a catalog data model in GeonicDB, then create and query entities
---

# Use with GeonicDB

Every model page links to a GeonicDB Custom Data Model definition, the request body for `POST /custom-data-models`. It already contains `contextUrl`, so registering it is enough to make GeonicDB use the catalog vocabulary.

## Prerequisites

- A GeonicDB tenant and API key ([GeonicDB documentation](https://docs.geonicdb.com/en/saas/api-key))
- Environment variables: `GEONICDB_BASE_URL` (for example `https://<your-deployment>.geonicdb.jp`), `GEONICDB_TENANT`, `GEONICDB_API_KEY`

## 1. Register the Custom Data Model

```bash
curl -sSf https://models.geonicdb.com/geonicdb/disaster/RoadClosure.json -o RoadClosure.json

curl -X POST "$GEONICDB_BASE_URL/custom-data-models" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $GEONICDB_API_KEY" \
  -H "Fiware-Service: $GEONICDB_TENANT" \
  --data @RoadClosure.json
```

`201 Created` means it is registered; `409` means a model of that type already exists. With the `geonic` CLI: `geonic models create RoadClosure.json`.

The registered definition validates attribute types, required attributes and enums (models with `additionalProperties: false` reject undefined attributes) and uses the context at `contextUrl` as the vocabulary of the type.

## 2. Create an entity

With the NGSI-LD API the catalog context is passed in the `Link` header. The alias (`v1.jsonld`) is the normal choice.

```bash
curl -X POST "$GEONICDB_BASE_URL/ngsi-ld/v1/entities" \
  -H "Content-Type: application/json" \
  -H 'Link: <https://models.geonicdb.com/context/disaster/v1.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  -H "x-api-key: $GEONICDB_API_KEY" \
  -H "NGSILD-Tenant: $GEONICDB_TENANT" \
  --data @example-normalized.json
```

The "Example (normalized)" on each model page works as the body; remove its `@context` since the `Link` header carries it.

## 3. Query

```bash
curl "$GEONICDB_BASE_URL/ngsi-ld/v1/entities?type=RoadClosure&q=closureStatus==%22通行止め中%22" \
  -H "Accept: application/ld+json" \
  -H 'Link: <https://models.geonicdb.com/context/disaster/v1.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  -H "x-api-key: $GEONICDB_API_KEY" \
  -H "NGSILD-Tenant: $GEONICDB_TENANT"
```

## Different type names

A tenant that needs a prefix on its type names, for example because several projects share the tenant and authorisation policies match on the type name, can export prefixed definitions from the repository. The vocabulary (IRIs) stays the catalog's.

```bash
git clone https://github.com/geolonia/geonicdb-models && cd geonicdb-models && npm ci
node scripts/export-geonicdb.mjs disaster --type-prefix Saitai --out ./out
```

## Notes

- `catalog.json` lists every model with its `contextUrl`, `schemaUrl` and GeonicDB definition URL, for automation.
- Letting GeonicDB read the catalog directly and offer "create from model" is planned.
