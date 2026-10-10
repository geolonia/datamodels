---
title: Use with GeonicDB
description: Register a catalog data model in GeonicDB, then create and query entities
---

# Use with GeonicDB

GeonicDB is an NGSI-LD broker made by Geolonia, the company that runs this catalog. The steps for any broker are in [Using the models](/en/guide/use); this page covers what GeonicDB adds: you can **register a model**, and GeonicDB then checks every entity of that type against it.

<svg class="flow-diagram" viewBox="0 0 460 300" role="img" aria-label="Register the model's definition from datamodels.jp in GeonicDB; your application then creates entities, which GeonicDB checks against the model, and queries them." xmlns="http://www.w3.org/2000/svg"><defs><marker id="gdb-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="58" rx="10"/><text class="t" x="230.0" y="33">datamodels.jp</text><text class="s" x="230.0" y="53">the model's definition (.json) and @context</text><rect class="box main" x="20" y="121" width="420" height="58" rx="10"/><text class="t" x="230.0" y="146">GeonicDB (your tenant)</text><text class="s" x="230.0" y="166">the registered model: rules for the type</text><rect class="box" x="20" y="234" width="420" height="58" rx="10"/><text class="t" x="230.0" y="259">Your application</text><text class="s" x="230.0" y="279">creates and queries entities</text><line class="a" x1="110" y1="68" x2="110" y2="119" marker-end="url(#gdb-ah)"/><text class="l" x="120" y="98">① register</text><line class="a d" x1="350" y1="119" x2="350" y2="68" marker-end="url(#gdb-ah)"/><text class="l e" x="340" y="98">reads the @context</text><line class="a" x1="110" y1="232" x2="110" y2="181" marker-end="url(#gdb-ah)"/><text class="l" x="120" y="211">② create: checked, stored</text><line class="a" x1="350" y1="181" x2="350" y2="232" marker-end="url(#gdb-ah)"/><text class="l e" x="340" y="211">③ query</text></svg>

For every model, a ready-made definition is published at `https://datamodels.jp/adapters/geonicdb/<subject>/<Type>.json` ([list by model](/en/adapters/geonicdb/)). It names the model's @context (`contextUrl`), so registering it is enough for GeonicDB to use the catalog's attribute names.

Registration is optional. What a registered model checks, and what it does not, is [below](#checks).

## Steps

You need a tenant and an API key whose policy allows these requests ([API keys](https://docs.geonicdb.com/en/saas/api-key), [policy binding](https://docs.geonicdb.com/en/reference/auth#policy-binding-policyid)), and three environment variables: `GEONICDB_BASE_URL` (for example `https://<your-deployment>.geonicdb.jp`), `GEONICDB_TENANT`, `GEONICDB_API_KEY`.

::: code-group

```bash [curl]
BASE=https://datamodels.jp
MODEL=transportation/RoadRestriction
KEY="x-api-key: $GEONICDB_API_KEY"
TENANT="NGSILD-Tenant: $GEONICDB_TENANT"

# 1. Register the model (once per tenant). The tenant comes from the API key.
curl -sSf "$BASE/adapters/geonicdb/$MODEL.json" -o model.json
curl -X POST "$GEONICDB_BASE_URL/custom-data-models" \
  -H "Content-Type: application/json" -H "$KEY" \
  --data @model.json

# 2. Create an entity: the model page's normalized example, with typed
#    dates turned into strings (see the note below).
curl -sSf "$BASE/examples/$MODEL/example-normalized.jsonld" \
  | jq 'walk(if type == "object" and has("@value") then .["@value"] else . end)' \
  > entity.jsonld
curl -X POST "$GEONICDB_BASE_URL/ngsi-ld/v1/entities" \
  -H "Content-Type: application/ld+json" -H "$KEY" -H "$TENANT" \
  --data @entity.jsonld

# 3. Query: closed roads only.
CONTEXT="$BASE/context/transportation/v1.jsonld"
REL='rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'
curl -G "$GEONICDB_BASE_URL/ngsi-ld/v1/entities" \
  --data-urlencode 'type=RoadRestriction' \
  --data-urlencode 'q=restrictionStatus=="closed"' \
  -H "Accept: application/ld+json" -H "Link: <$CONTEXT>; $REL" \
  -H "$KEY" -H "$TENANT"
```

```bash [GeonicDB CLI]
BASE=https://datamodels.jp
MODEL=transportation/RoadRestriction
# Once: where to send requests. With an API key, also export GDB_API_KEY.
geonic config set url "$GEONICDB_BASE_URL"
geonic config set service "$GEONICDB_TENANT"
export GDB_API_KEY="$GEONICDB_API_KEY"

# 1. Register the model (once per tenant).
curl -sSf "$BASE/adapters/geonicdb/$MODEL.json" | geonic models create

# 2. Create an entity: the model page's normalized example, with typed
#    dates turned into strings (see the note below).
curl -sSf "$BASE/examples/$MODEL/example-normalized.jsonld" \
  | jq 'walk(if type == "object" and has("@value") then .["@value"] else . end)' \
  | geonic entities create

# 3. Query: closed roads only.
geonic entities list --type RoadRestriction \
  --query 'restrictionStatus=="closed"' \
  --context "$BASE/context/transportation/v1.jsonld"
```

:::

- Registering returns `201 Created`, or `409` if a model of that type already exists. To change a registered model, use `PATCH /custom-data-models/<Type>` or `geonic models update <Type> @model.json`.
- **Typed dates:** the normalized example writes date-times as `{"@type": "DateTime", "@value": "…"}`. GeonicDB's model check accepts only the plain string for now, so step 2 turns them into strings with [jq](https://jqlang.org/) ([#185](https://github.com/geolonia/datamodels/issues/185)). Your own data can send the plain string, as in `"validFrom": {"type": "Property", "value": "2026-07-08T09:00:00+09:00"}`.
- **GeonicDB CLI:** [geonicdb-cli](https://github.com/geolonia/geonicdb-cli) (`npm install -g @geolonia/geonicdb-cli`). Logged in as a tenant admin with `geonic auth login`, it needs no API key or policy. A saved login is used before `--api-key`, so run `geonic auth logout` first when you use an API key. Add `--dry-run` to any command to see the request without sending it.
- For your own data, put the @context in the body (`application/ld+json`) or send `application/json` with the `Link` header, never both. The tenant header is `NGSILD-Tenant` ([multi-tenancy](https://docs.geonicdb.com/en/core-concepts/multi-tenancy)).

## What a registered model checks {#checks}

GeonicDB checks every entity of the type when it is created or changed, also in batches and through NGSIv2:

- the required attributes are there;
- each value has the right type (text, number, whole number, true or false, list, object, GeoJSON, URI, date-time in RFC 3339) and follows the rules: length, minimum and maximum, pattern, allowed values;
- there are no attributes the model does not know (the catalog's definitions do not allow them);
- combinations that must be unique are unique, if the definition declares them.

It does not check:

- the values inside a list, such as allowed values or a minimum number of items: only that the value is a list (the catalog's JSON Schema checks them, for example during `datamodels convert`);
- whether an attribute is sent as a Property or a Relationship, or which type a Relationship points to;
- entities of a type that has no registered model: they are stored as they are;
- the other types of an entity with several types: only the first type is checked;
- entities that existed before the model was registered or changed. To see how a change would affect them, send it with `PATCH /custom-data-models/<Type>?dryRun=true` (GeonicDB v0.17.0 or later) or `geonic models update <Type> @model.json --api-dry-run` (geonicdb-cli 0.25.0 or later): nothing changes, and the answer says how many entities would break the model, with examples.

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
      "patrolRoute": {
        "ngsiType": "Property",
        "valueType": "string",
        "example": "A-3",
        "description": "Patrol route",
        "@context": "https://example.com/ns/acme/patrolRoute"
      }
    }
  }
}
```

```bash
node adapters/geonicdb/export.mjs transportation \
  --type RoadRestriction --extend ./acme.json --out ./out
```

To accept unknown attributes without checking them instead, export with `--allow-additional`.

</details>

<details class="rules">
<summary>Different type or attribute names in your tenant</summary>

A tenant that needs a prefix on its type names (for example when several projects share it and policies match on the type name) can export prefixed definitions. The attribute names and their meaning stay the catalog's.

```bash
git clone https://github.com/geolonia/datamodels && cd datamodels && npm ci
node adapters/geonicdb/export.mjs transportation \
  --type-prefix Acme --out ./out
```

With your own names for a type or an attribute ([Your own names](/en/guide/names)), register the model under your names and point `contextUrl` at your @context. The export script renames in one go; each attribute keeps the catalog's meaning:

```bash
CONTEXT=https://example.com/context/city-disaster.jsonld
node adapters/geonicdb/export.mjs task --type Project --type-name Saigai \
  --context-url "$CONTEXT" --out ./out
node adapters/geonicdb/export.mjs task --type Task \
  --rename assignee=responsibleTeam \
  --context-url "$CONTEXT" --out ./out
```

</details>
