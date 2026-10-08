---
title: URLs and versions
description: Which URL to use, what never changes, and how versions and deprecation work
---

# URLs and versions

A `@context` URL is stored with every entity and read years later. This page says which URL to use, what the catalog promises about it, and how models change without breaking it.

::: warning Pre-release
These promises apply **from the official launch**. Until then, published files, `v1.0.0` included, may still be corrected in place, and exact versions are cached for 5 minutes instead of a year. Do not reference them from production data before the launch.
:::

## Which URL to use

| Purpose | URL | Cache |
|---|---|---|
| `@context` of stored data, `Link` header | alias `/context/<subject>/v1.jsonld` | 5 minutes |
| Audits, reproducing a result on another broker | exact version `/context/<subject>/v1.0.0.jsonld` | 1 year, immutable |
| Validation | `/schema/<subject>/<Type>/v1.json` (alias) or `v1.0.0.json` | same |

The alias moves only to compatible versions, so it is the right default. Use the exact version when you need to audit or reproduce a result.

## The promises

1. **A published versioned file is never changed or removed.** `/context/<subject>/v1.0.0.jsonld` stays the same forever. CI records a hash of every file and rejects a change to one.
2. **The meaning of an attribute never changes.** When it must, the catalog adds a new attribute and marks the old one deprecated.
3. **Type and attribute IRIs lead to documentation.** Opening `https://datamodels.jp/ns/transportation/RoadRestriction` in a browser shows the type's page.

## Versions {#versions}

Each subject has one version number, shared by its `@context`, vocabulary and JSON Schemas (for example `transportation` 1.0.0). Numbers follow [Semantic Versioning](https://semver.org/):

| Change | Number | Example |
|---|---|---|
| A fix that changes neither meaning nor validation | patch (1.0.**1**) | a typo in a schema description |
| A compatible addition | minor (1.**1**.0) | a new optional attribute or model, a new allowed value |
| An incompatible change | major (**2**.0.0) | renaming an attribute or changing its type, removing an attribute or a value, making an optional attribute required |

A new version does not replace the old one: `v1.0.0` stays at its URL, and the alias `v1` points to the latest 1.x. A new allowed value is a minor version, but code that handles every value needs to learn it, so the pull request and the model's notes say so.

## Deprecation {#deprecation}

- **An attribute** that is being replaced is marked deprecated in the schema and on the model page. It stays at least until the next minor version and is removed only in a major version.
- **A model** that should not be used for new work is marked deprecated. It stays published at the same URLs; its page and `catalog.json` name the replacement (`supersededBy`).

## All URLs

```text
/context/<subject>/vX.Y.Z.jsonld        @context (immutable)
/context/<subject>/vX.jsonld            alias (latest X.y.z)
/schema/<subject>/<Type>/vX.Y.Z.json    JSON Schema (immutable)
/schema/<subject>/<Type>/vX.json        alias
/vocab/<subject>/vX.Y.Z.jsonld          vocabulary (RDFS: classes, subclass relations, ja/en labels; immutable)
/examples/<subject>/<Type>/example.json               example (key-values)
/examples/<subject>/<Type>/example-normalized.jsonld  example (NGSI-LD normalized; not for value types)
/ns/<subject>/<Term>                    type and attribute IRIs (redirect to the page)
/mapping/<subject>/<Type>/<name>.yaml   mapping file (correspondence to another standard and conversion rules; not versioned: the URL stays, the content follows the current model)
/adapters/<name>/<subject>/<Type>.json  adapter output (for example a GeonicDB Custom Data Model definition)
/catalog.json                           list of all models for programs (conforms to /catalog.schema.json)
```

Everything is served with `Access-Control-Allow-Origin: *`; `.jsonld` files as `application/ld+json`, schemas as `application/schema+json`, mapping files as `application/yaml`.

## About upstream models

Smart Data Models contexts live on the `master` branch of the upstream GitHub repositories and have no version. Reference them at URLs pinned to a commit ([Adding attributes](/en/guide/extend)). A copy of the same files served from this domain, for users who cannot depend on upstream, is planned (not yet available).
