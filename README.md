# datamodels

Bilingual catalog of NGSI-LD data models, published at **https://datamodels.jp**. It serves JSON-LD `@context` files, JSON Schemas and RDFS vocabularies at URLs that never change, for data models that work in practice in Japan. Existing standards such as [Smart Data Models](https://smartdatamodels.org/), the Digital Agency's GIF and [RFC 8984](https://www.rfc-editor.org/rfc/rfc8984.html) are extended and mapped, not copied.

The site explains how to use and extend the models: [拡張する・貢献する](https://datamodels.jp/guide/extend) · [URL の約束](https://datamodels.jp/guide/urls) · [English](https://datamodels.jp/en/). Design background: [docs/design.md](docs/design.md).

## Layout

```text
models/<subject>/
  subject.yaml            name, version, ja/en title and description
  context.jsonld          the subject's JSON-LD context (may import other catalog contexts by URL)
  releases/vX.Y.Z/        snapshots of published versions (context, vocabulary, schemas), written by `npm run manifest:record`
  <Type>/
    schema.json           JSON Schema 2020-12 (key-values), with x-ngsi / x-iri, optional x-personal-data;
                          x-kind: value for value types, x-alias-of (same type under another name)
                          or x-subclass-of (own type, parent attribute IRIs)
    catalog.yaml          ja/en title, description, attribute descriptions, status
    examples/             example.json (key-values), example-normalized.jsonld
    mapping/*.yaml        optional correspondence to an external standard
    notes.yaml  ADOPTERS.yaml  README.md  LICENSE.md
adapters/<name>/          files for a particular broker or tool, published under /adapters/<name>/ (see adapters/README.md)
site/                     VitePress site; site/models and site/en/models are generated
scripts/                  validate, build, publish, vocabulary, live check
public/                   _headers and _redirects (the build appends the generated per-file rules to both)
catalog.schema.json       wire format of /catalog.json
published-manifest.json   SHA-256 of every published immutable file
docs/design.md            design decisions
```

Model folders follow the Smart Data Models layout so a model can be proposed upstream unchanged. Schemas carry no product-specific keys; the validator rejects them.

## Commands

```bash
npm ci
npm run check            # validate models, build dist/, check immutability, dry-run the deploy
npm test                 # validator, vocabulary and adapter tests
npm run site:dev         # local site with generated model pages
npm run check:live       # verify the deployed site against the URL contract and the manifest
npm run manifest:record  # snapshot the current version and record its hashes (last step of a PR)
node adapters/geonicdb/export.mjs <subject> [--type T] [--type-prefix P | --type-name N] [--rename a=b] [--context-url URL] [--alias-context] [--allow-additional] [--extend FILE] [--out DIR]
```

## Adding or changing a model

1. Edit or add files under `models/<subject>/`. Every attribute needs a context term (or a core-context term) and ja/en descriptions; never redefine a core-context term such as `status`.
2. `npm run check` and `npm test` must pass. CI runs both on every pull request.
3. Bump the subject version for anything that changes a published file, mark superseded attributes `x-deprecated`, then run `npm run manifest:record` as the last step. It snapshots the new version into `releases/` and records its hashes in `published-manifest.json`; `npm run check` fails if a recorded file changed or disappeared. Published files are never corrected in place.

Every model starts as `status: draft`. It becomes `stable` once two independent implementations are recorded in its `ADOPTERS.yaml`.

Contributions in Japanese or English are welcome as issues or pull requests.

## Deployment

Cloudflare Workers Builds watches this repository and deploys `main`; no credential lives in GitHub. Dashboard settings on the `datamodels` Worker, connected to `geolonia/datamodels`: build command `npm ci && npm run build:deploy`, deploy command `npx wrangler deploy`, root `/`, non-production builds off. The custom domain is declared in `wrangler.jsonc`. After a deploy, run `npm run check:live`.

`models.geonicdb.com`, the pre-launch preview, is retired and must not answer. `wrangler deploy` does not detach a custom domain that disappears from `wrangler.jsonc`, so if it still responds, remove it under the Worker's Settings → Domains & Routes; that also deletes its DNS record.


## Licences

| Path | Licence |
|---|---|
| `models/**` | [CC BY 4.0](LICENSE-CONTENT.md) |
| everything else | [Apache-2.0](LICENSE) |

Content derived from Smart Data Models keeps its upstream attribution; content derived from the Digital Agency's GIF or 自治体標準オープンデータセット (CC0 1.0) is re-licensed under CC BY 4.0.
