---
title: URLs that never change
description: The URL contract of this catalog. Versions, aliases, caching and IRI resolution
---

# URLs that never change

A `@context` URL is stored with every entity and referenced years later. This catalog makes the following promises about the URLs it publishes.

::: warning Pre-release
These promises apply **from the official launch**. Until then, published files, `v1.0.0` included, may still be corrected in place. Do not reference them from production data before the launch.
:::

## The contract

1. **A published versioned file is never modified or removed.** The content of `/context/<subject>/v1.0.0.jsonld` stays the same forever. CI records the hashes and rejects any change that modifies or removes one.
2. **A compatible change is a new minor version.** Added attributes are published as `v1.1.0`, and the alias `v1.jsonld` points at the latest 1.x.
3. **A breaking change is a new major version or a new term.** The meaning or type of an attribute never changes. When it must, a new IRI is minted and the old one stays, marked deprecated.
4. **Type and attribute IRIs resolve to documentation.** Opening `https://datamodels.jp/ns/disaster/RoadClosure` in a browser takes you to the type's page.

## Which URL to use

| Purpose | URL | Cache |
|---|---|---|
| `@context` of stored data, `Link` header | alias `/context/<subject>/v1.jsonld` | 5 minutes |
| Pin the meaning, reproduce on another broker | exact version `/context/<subject>/v1.0.0.jsonld` | 1 year, immutable |
| Validation | `/schema/<subject>/<Type>/v1.json` (alias) or `v1.0.0.json` | same |

The alias only advances within compatible changes, so it is the right default. Use the exact version when you need auditability or reproducibility.

## All URLs

```text
/context/<subject>/vX.Y.Z.jsonld        @context (immutable)
/context/<subject>/vX.jsonld            alias (latest X.y.z)
/schema/<subject>/<Type>/vX.Y.Z.json    JSON Schema (immutable)
/schema/<subject>/<Type>/vX.json        alias
/vocab/<subject>/vX.Y.Z.jsonld          vocabulary (RDFS: classes, subclass relations, ja/en labels; immutable)
/examples/<subject>/<Type>/             examples
/ns/<subject>/<Term>                    type and attribute IRIs (redirect to the page)
/adapters/<name>/<subject>/<Type>.json  adapter output (for example a GeonicDB Custom Data Model definition)
/catalog.json                           machine-readable index (conforms to /catalog.schema.json)
```

Everything is served with `Access-Control-Allow-Origin: *`; `.jsonld` files as `application/ld+json`, schemas as `application/schema+json`.

## About upstream models

Smart Data Models contexts live on the `master` branch of the upstream GitHub repositories and carry no version. Profiles in this catalog reference upstream at commit-pinned URLs. For users who cannot depend on upstream availability, a mirror of the same bytes served from this domain is planned (not yet available).
