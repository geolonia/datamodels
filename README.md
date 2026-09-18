# geonicdb-models

Curated bilingual catalog of NGSI-LD data models for [GeonicDB](https://docs.geonicdb.com/), published at **https://models.geonicdb.com**. It extends [Smart Data Models](https://smartdatamodels.org/) for Japan and serves `@context` files, JSON Schemas and GeonicDB model definitions from stable URLs.

The site explains how to use and extend the models: [拡張する・貢献する](https://models.geonicdb.com/guide/extend) · [URL の約束](https://models.geonicdb.com/guide/urls) · [GeonicDB で使う](https://models.geonicdb.com/guide/geonicdb) · [English](https://models.geonicdb.com/en/). Design background: [geonicdb-docs `design/ngsi-ld-data-models-catalog.md`](https://github.com/geolonia/geonicdb-docs/blob/main/design/ngsi-ld-data-models-catalog.md).

## Layout

```text
models/<subject>/
  subject.yaml            name, version, ja/en title and description
  context.jsonld          the subject's JSON-LD context (may import other catalog contexts by URL)
  releases/vX.Y.Z/        snapshots of published versions, written by `npm run manifest:record`
  <Type>/
    schema.json           JSON Schema 2020-12 (key-values), with x-ngsi / x-iri / x-geonicdb; x-kind: value for value types,
                          x-alias-of (same type under another name) or x-subclass-of (own type, parent attribute IRIs)
    catalog.yaml          ja/en title, description, attribute descriptions, status
    examples/             example.json (key-values), example-normalized.jsonld
    mapping/*.yaml        optional correspondence to an external standard
    notes.yaml  ADOPTERS.yaml  README.md  LICENSE.md
site/                     VitePress site; site/models and site/en/models are generated
scripts/                  validate, build, publish, live check, GeonicDB export
public/                   _headers and _redirects (the build appends the generated per-file rules to both)
catalog.schema.json       wire format of /catalog.json
published-manifest.json   SHA-256 of every published immutable file
```

Model folders follow the Smart Data Models layout so a model can be proposed upstream unchanged.

## Commands

```bash
npm ci
npm run check            # validate models, build dist/, check immutability, dry-run the deploy
npm test                 # validator tests
npm run site:dev         # local site with generated model pages
npm run check:live       # verify the deployed site against the URL contract and the manifest
npm run manifest:record  # snapshot the current version and record its hashes (last step of a PR)
node scripts/export-geonicdb.mjs <subject> [--type T] [--type-prefix P | --type-name N] [--rename a=b] [--context-url URL] [--alias-context] [--allow-additional] [--extend FILE] [--out DIR]
```

## Adding or changing a model

1. Edit or add files under `models/<subject>/`. Every attribute needs a context term (or a core-context term) and ja/en descriptions; never redefine a core-context term such as `status`.
2. `npm run check` and `npm test` must pass. CI runs both on every pull request.
3. Bump the subject version for anything that changes a published file, mark superseded attributes `x-deprecated`, then run `npm run manifest:record` as the last step. It snapshots the new version into `releases/` and records its hashes in `published-manifest.json`; `npm run check` fails if a recorded file changed or disappeared.

Exception while the catalog has no consumers (until the models are officially promoted): a published file may be corrected in place. To do so, empty `files` in `published-manifest.json`, apply the change to the source and to the matching `releases/` snapshot, and run `npm run manifest:record` again; say so in the pull request. `npm run check:live` then confirms the deployed bytes match the manifest.

Contributions in Japanese or English are welcome as issues or pull requests.

## Deployment

Cloudflare Workers Builds watches this repository and deploys `main`; no credential lives in GitHub. Dashboard settings on the `geonicdb-models` Worker: build command `npm ci && npm run build:deploy`, deploy command `npx wrangler deploy`, root `/`, non-production builds off. The custom domain is declared in `wrangler.jsonc`. After a deploy, run `npm run check:live`.

## Licences

| Path | Licence |
|---|---|
| `models/**` | [CC BY 4.0](LICENSE-CONTENT.md) |
| everything else | [Apache-2.0](LICENSE) |

Content derived from Smart Data Models keeps its upstream attribution; content derived from the Digital Agency's GIF or 推奨データセット (CC0 1.0) is re-licensed under CC BY 4.0.
