---
title: Use with GeonicDB
description: Register a catalog data model in GeonicDB, then create and query entities
---

# Use with GeonicDB

GeonicDB is an NGSI-LD broker made by Geolonia, the company that runs this catalog. The steps for any broker are in [Using the models](/en/guide/use); this page covers what GeonicDB adds: you can **register a model**, and GeonicDB then checks every entity of that type against it.

<svg class="flow-diagram" viewBox="0 0 460 300" role="img" aria-label="Register the model's definition from datamodels.jp in GeonicDB; your application then creates entities, which GeonicDB checks against the model, and queries them." xmlns="http://www.w3.org/2000/svg"><defs><marker id="gdb-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="58" rx="10"/><text class="t" x="230.0" y="33">datamodels.jp</text><text class="s" x="230.0" y="53">the model's definition (.json) and @context</text><rect class="box main" x="20" y="121" width="420" height="58" rx="10"/><text class="t" x="230.0" y="146">GeonicDB (your tenant)</text><text class="s" x="230.0" y="166">the registered model: rules for the type</text><rect class="box" x="20" y="234" width="420" height="58" rx="10"/><text class="t" x="230.0" y="259">Your application</text><text class="s" x="230.0" y="279">creates and queries entities</text><line class="a" x1="110" y1="68" x2="110" y2="119" marker-end="url(#gdb-ah)"/><text class="l" x="120" y="98">① register</text><line class="a d" x1="350" y1="119" x2="350" y2="68" marker-end="url(#gdb-ah)"/><text class="l e" x="340" y="98">reads the @context</text><line class="a" x1="110" y1="232" x2="110" y2="181" marker-end="url(#gdb-ah)"/><text class="l" x="120" y="211">② create: checked, stored</text><line class="a" x1="350" y1="181" x2="350" y2="232" marker-end="url(#gdb-ah)"/><text class="l e" x="340" y="211">③ query</text></svg>

For every model, a ready-made definition is published at `https://datamodels.jp/adapters/geonicdb/<subject>/<Type>.json` ([list by model](/en/adapters/geonicdb/)). It names the model's @context (`contextUrl`), so registering it is enough for GeonicDB to use the catalog's attribute names.

**What a registered model checks** when an entity is created or updated: required attributes, value types (date-times strictly RFC 3339), allowed values, patterns, minimum and maximum. Attributes the model does not know are rejected (models with `additionalProperties: false`, the catalog's default). Registration is optional, and existing entities are not checked again when a model is registered or changed.

## Steps

You need a tenant and an API key whose policy allows these requests ([API keys](https://docs.geonicdb.com/en/saas/api-key), [policy binding](https://docs.geonicdb.com/en/reference/auth#policy-binding-policyid)), and three environment variables: `GEONICDB_BASE_URL` (for example `https://<your-deployment>.geonicdb.jp`), `GEONICDB_TENANT`, `GEONICDB_API_KEY`.

```bash
# 1. Register the model (once per tenant). The tenant comes from the API key.
curl -sSf https://datamodels.jp/adapters/geonicdb/transportation/RoadRestriction.json -o RoadRestriction.json
curl -X POST "$GEONICDB_BASE_URL/custom-data-models" \
  -H "Content-Type: application/json" -H "x-api-key: $GEONICDB_API_KEY" \
  --data @RoadRestriction.json

# 2. Create an entity: the model page's normalized example, as it is.
curl -sSf https://datamodels.jp/examples/transportation/RoadRestriction/example-normalized.jsonld -o entity.jsonld
curl -X POST "$GEONICDB_BASE_URL/ngsi-ld/v1/entities" \
  -H "Content-Type: application/ld+json" \
  -H "x-api-key: $GEONICDB_API_KEY" -H "NGSILD-Tenant: $GEONICDB_TENANT" \
  --data @entity.jsonld

# 3. Query: closed roads only.
curl "$GEONICDB_BASE_URL/ngsi-ld/v1/entities?type=RoadRestriction&q=restrictionStatus==%22closed%22" \
  -H "Accept: application/ld+json" \
  -H 'Link: <https://datamodels.jp/context/transportation/v1.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  -H "x-api-key: $GEONICDB_API_KEY" -H "NGSILD-Tenant: $GEONICDB_TENANT"
```

- Registering returns `201 Created`, or `409` if a model of that type already exists. With the `geonic` CLI logged in as a tenant admin, no policy is needed: `geonic models create @RoadRestriction.json`.
- For your own data, put the @context in the body (`application/ld+json`) or send `application/json` with the `Link` header, never both. The tenant header is `NGSILD-Tenant` ([multi-tenancy](https://docs.geonicdb.com/en/core-concepts/multi-tenancy)).

## Your own attributes

If the model fits but you need a few attributes of your own, write a profile @context that adds them ([Adding attributes](/en/guide/extend)), host it, and register a definition that has the catalog's attributes and yours. Your attributes are then checked like the others. If they are useful beyond your project, [propose them](https://github.com/geolonia/datamodels/issues) to the catalog.

<details class="rules">
<summary>Exporting a definition with your attributes</summary>

Write an extension file keyed by type and export with it. Redefining a catalog attribute is an error.

```json
{
  "RoadRestriction": {
    "contextUrl": "https://example.com/context/acme-transportation.jsonld",
    "propertyDetails": {
      "patrolRoute": { "ngsiType": "Property", "valueType": "string", "example": "A-3", "description": "Patrol route", "@context": "https://example.com/ns/acme/patrolRoute" }
    }
  }
}
```

```bash
node adapters/geonicdb/export.mjs transportation --type RoadRestriction --extend ./acme.json --out ./out
```

To accept unknown attributes without checking them instead, export with `--allow-additional`.

</details>

<details class="rules">
<summary>Different type names in your tenant</summary>

A tenant that needs a prefix on its type names (for example when several projects share it and policies match on the type name) can export prefixed definitions. The attribute names and their meaning stay the catalog's.

```bash
git clone https://github.com/geolonia/datamodels && cd datamodels && npm ci
node adapters/geonicdb/export.mjs transportation --type-prefix Acme --out ./out
```

</details>
