---
title: Use with GeonicDB
description: Register a catalog data model in GeonicDB, then create and query entities
---

# Use with GeonicDB

Every model page links to a GeonicDB Custom Data Model definition, the request body for `POST /custom-data-models`. It already contains `contextUrl`, so registering it is enough to make GeonicDB use the catalog vocabulary.

## Prerequisites

- A GeonicDB tenant and API key ([GeonicDB documentation](https://docs.geonicdb.com/en/saas/api-key))
- Environment variables: `GEONICDB_BASE_URL` (for example `https://<your-deployment>.geonicdb.jp`), `GEONICDB_TENANT`, `GEONICDB_API_KEY`

## What registering does

Registration is optional. GeonicDB accepts entities of any type without a model. Registering a Custom Data Model attaches rules to that type name within your tenant.

- Every create, replace and partial update is validated: required attributes, `valueType` (datetimes strictly RFC 3339), and `enum`, `pattern`, `minimum`, `maximum` and length rules.
- Attributes with a `defaultValue` are filled in when missing.
- Unique constraints, if declared, are enforced with a database index.
- With `additionalProperties: false`, an attribute the model does not know is rejected with 400. With `true`, it passes unvalidated.
- `contextUrl` tells GeonicDB which context the type's attribute names belong to, so names still match when entities arrive with a `@context` or `Link` header. Without it, GeonicDB generates a tenant-specific context and IRIs of its own.
- Registered models feed the generated JSON Schema, the console, and the MCP and A2A tooling.

Existing entities are not re-validated when a model is registered or changed (a conformance report is available separately). Responses do not change either: GeonicDB injects no `@context`, clients pass the context themselves.

## 1. Register the Custom Data Model

```bash
curl -sSf https://datamodels.jp/geonicdb/disaster/RoadClosure.json -o RoadClosure.json

curl -X POST "$GEONICDB_BASE_URL/custom-data-models" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $GEONICDB_API_KEY" \
  -H "Fiware-Service: $GEONICDB_TENANT" \
  --data @RoadClosure.json
```

`201 Created` means it is registered; `409` means a model of that type already exists. With the `geonic` CLI: `geonic models create RoadClosure.json`.

The registered definition validates attribute types, required attributes and enums (models with `additionalProperties: false` reject undefined attributes) and uses the context at `contextUrl` as the vocabulary of the type.

## 2. Create an entity

The "Example (normalized)" on each model page is JSON-LD with its `@context` inside, so it can be posted as it is with `Content-Type: application/ld+json`.

```bash
curl -sSf https://datamodels.jp/examples/disaster/RoadClosure/example-normalized.jsonld -o entity.jsonld

curl -X POST "$GEONICDB_BASE_URL/ngsi-ld/v1/entities" \
  -H "Content-Type: application/ld+json" \
  -H "x-api-key: $GEONICDB_API_KEY" \
  -H "NGSILD-Tenant: $GEONICDB_TENANT" \
  --data @entity.jsonld
```

For your own data, either put `@context` in the body and send `application/ld+json`, or leave it out and send `Content-Type: application/json` with a `Link` header (see the query below). Never both at once. The alias (`v1.jsonld`) is the normal choice.

## 3. Query

```bash
curl "$GEONICDB_BASE_URL/ngsi-ld/v1/entities?type=RoadClosure&q=closureStatus==%22通行止め中%22" \
  -H "Accept: application/ld+json" \
  -H 'Link: <https://datamodels.jp/context/disaster/v1.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  -H "x-api-key: $GEONICDB_API_KEY" \
  -H "NGSILD-Tenant: $GEONICDB_TENANT"
```

## The model fits, but you need a few attributes of your own

Three ways, in increasing order of rigour.

1. **Allow unknown attributes.** Export with `--allow-additional` to get `additionalProperties: true`. Your attributes are accepted but not validated, and in JSON-LD they expand to whatever IRI your request context defines, or to GeonicDB's default vocabulary if none does.
2. **Extend the definition.** Register the catalog attributes plus your own, and point `contextUrl` at a context of yours that imports the catalog context and defines only your terms. Your attributes are validated like the others and carry IRIs you control. It is the same profile pattern the catalog applies to Smart Data Models, one level down.

   ```json
   {
     "@context": [
       "https://datamodels.jp/context/disaster/v1.jsonld",
       { "acme": "https://example.com/ns/acme/", "patrolRoute": "acme:patrolRoute" }
     ]
   }
   ```

   Write an extension file keyed by type and export with it. Redefining a catalog attribute is an error.

   ```json
   {
     "RoadClosure": {
       "contextUrl": "https://example.com/context/acme-disaster.jsonld",
       "propertyDetails": {
         "patrolRoute": { "ngsiType": "Property", "valueType": "string", "example": "A-3", "description": "Patrol route", "@context": "https://example.com/ns/acme/patrolRoute" }
       }
     }
   }
   ```

   ```bash
   node scripts/export-geonicdb.mjs disaster --type RoadClosure --extend ./acme.json --out ./out
   ```

3. **Propose it to the catalog.** If the attribute is useful beyond your project, open an [issue](https://github.com/geolonia/geonicdb-models/issues) or a pull request. Once it lands in the next minor version, the extension is no longer needed.

## Different type names

A tenant that needs a prefix on its type names, for example because several projects share the tenant and authorisation policies match on the type name, can export prefixed definitions from the repository. The vocabulary (IRIs) stays the catalog's.

```bash
git clone https://github.com/geolonia/geonicdb-models && cd geonicdb-models && npm ci
node scripts/export-geonicdb.mjs disaster --type-prefix Saitai --out ./out
```

## Notes

- `catalog.json` lists every model with its `contextUrl`, `schemaUrl` and GeonicDB definition URL, for automation.
- Letting GeonicDB read the catalog directly and offer "create from model" is planned.
