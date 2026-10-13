# datamodels

[![datamodels.jp](https://img.shields.io/website?url=https%3A%2F%2Fdatamodels.jp&label=datamodels.jp)](https://datamodels.jp)
[![Models](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdatamodels.jp%2Fcatalog.json&query=%24.models.length&label=models)](https://datamodels.jp/models/)
[![Models: CC0 1.0](https://img.shields.io/badge/models-CC0%201.0-blue)](#licences)
[![Text: CC BY 4.0](https://img.shields.io/badge/text-CC%20BY%204.0-blue)](#licences)
[![Code: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-blue)](#licences)

Bilingual catalog of data models that work in practice in Japan, published at **https://datamodels.jp**. It serves JSON Schemas, JSON-LD `@context` files and RDFS vocabularies at URLs that never change: usable as plain JSON, as linked data, and as they are with NGSI-LD brokers. Existing standards such as [Smart Data Models](https://smartdatamodels.org/), the Digital Agency's GIF and [RFC 8984](https://www.rfc-editor.org/rfc/rfc8984.html) are extended and mapped, not copied.

The site explains how to use and extend the models: [属性を足す](https://datamodels.jp/guide/extend) · [URL とバージョン](https://datamodels.jp/guide/urls) · [モデルのルール](https://datamodels.jp/guide/rules) · [English](https://datamodels.jp/en/). Design background: [docs/design.md](docs/design.md).

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
    mapping/*.yaml        optional correspondence to an external standard, published at /mapping/<subject>/<Type>/<name>.yaml
    notes.yaml  ADOPTERS.yaml  README.md  LICENSE.md
adapters/<name>/          files for a particular broker or tool, published under /adapters/<name>/ (see adapters/README.md)
site/                     VitePress site; site/models and site/en/models are generated
scripts/                  validate, build, publish, vocabulary, live check
public/                   _headers and _redirects (the build appends the generated per-file rules to both)
catalog.schema.json       wire format of /catalog.json
published-manifest.json   SHA-256 of every published immutable file
docs/design.md            design decisions
docs/deployment.md        how the site is built and served (Cloudflare)
```

Model folders follow the Smart Data Models layout so a model can be proposed upstream unchanged. Schemas carry no product-specific keys; the validator rejects them.

## Commands

```bash
npm ci
npm run check            # validate models, build dist/, check immutability, dry-run the deploy
npm test                 # validator, vocabulary and adapter tests
npm run site:dev         # local site with generated model pages
npm run check:live       # verify the deployed site against the URL contract and the manifest
npm run dist:diff        # build origin/main (or --base <ref>) and this tree, list what differs in dist/; CI shows it on every pull request
npm run manifest:record  # snapshot the current version and record its hashes (maintainers, last step before merging)
npm run new-model -- <subject> <Type> [--value]   # scaffold a model; the validator lists the TODOs left
npm run rerecord -- <subject> [...]               # pre-release only, maintainers: correct the current version in place
node adapters/geonicdb/export.mjs <subject> [--type T] [--type-prefix P | --type-name N] [--rename a=b] [--context-url URL] [--exact-context] [--allow-additional] [--extend FILE] [--out DIR]
```

## Adding or changing a model

1. Edit or add files under `models/<subject>/`. For a new model, start with `npm run new-model -- <subject> <Type>`: it creates every file with TODO markers and adds the type to the subject's context; `npm run validate:models` lists what is still missing. Every attribute needs a context term (or a core-context term) and ja/en descriptions; never redefine a core-context term such as `status`.
2. `npm run check` and `npm test` must pass. CI runs both on every pull request.
3. Bump the subject version for anything that changes a published file and mark superseded attributes `x-deprecated`. Recording is a maintainer step (see [CONTRIBUTING.md](CONTRIBUTING.md)): before merging, a maintainer runs `npm run manifest:record` as the last step. It snapshots the new version into `releases/` and records its hashes in `published-manifest.json`; `npm run check` fails if a recorded file changed or disappeared.

**Pre-release exception, until the official launch** (launch plan #30): the published files of a subject's **current** version, `v1.0.0` included, may be corrected in place. Change the source; a maintainer then runs `npm run rerecord -- <subject>` (it deletes that version's `releases/` snapshot and its entries in `published-manifest.json`, then records again), and the pull request says so. Recording writes only the current version's snapshot, so an older release is never corrected this way: its snapshot is the only copy, and deleting it would drop the release from the site. `npm run check:live` then confirms the deployed bytes. CI lists such corrections in the job summary (`npm run check:manifest-base` compares the manifest with main's). The exception, the pre-release banner on the site, and the 5-minute cache on exact versions (instead of one year, immutable) end at the official launch: `"prerelease"` in `published-manifest.json` is set to `false`, after which the same check fails on any changed or removed entry and `rerecord` refuses to run.

Every model starts as `status: draft`. The stages, and what a model needs to become `stable` (#38, #125, #200): [Stages](https://datamodels.jp/en/guide/rules#stages) on the site.

Contributions in Japanese or English are welcome as issues or pull requests; see [CONTRIBUTING.md](CONTRIBUTING.md) for the rules, the steps and the sign-off (DCO).

## Converting a published list

The converter is `datamodels convert` in [geolonia/datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) (moved there in #91). It turns a CSV list into entities of a catalog model and validates each one, for example a municipality's 指定緊急避難場所一覧 (自治体標準オープンデータセット 03), or GSI's data, into EvacuationSite:

```bash
npx github:geolonia/datamodels-toolkit convert disaster/EvacuationSite jichitai-opendata-site 092011_evacuation_space.csv --out sites.json
```

It reads the mapping files from datamodels.jp (`/mapping/<subject>/<Type>/<name>.yaml`). To try a mapping before it is published, build this repository and add `--site dist`. A list that follows no standard in the catalog is converted with its owner's own mapping file, which `datamodels mapping` starts ([Converting your data](https://datamodels.jp/en/toolkit/convert)).

Which standards get a mapping file, and which mapping files have conversion rules: [Rules for models](https://datamodels.jp/en/guide/rules#mapping).

The conversion rules in a mapping file are part of this catalog, and the validator checks their structure:
- A row with `column` (one column or a list), an optional `transform`, a constant `value`, or `via` (build a nested value with another mapping, such as `common/JapaneseAddress/jichitai-opendata-address`) is converted.
- The `convert.id` template names the entities.
- Rows with only `to` stay documentation.
- The transforms and what they do are listed in the toolkit's README; the converter refuses a name it does not know before reading any row.

## Deployment

Cloudflare Workers Builds deploys `main`; the dashboard settings, the Browser Integrity Check rule and the retired `models.geonicdb.com` are in [docs/deployment.md](docs/deployment.md).

## Licences

Machine-readable model files are CC0 1.0, prose is CC BY 4.0, and code (including the adapter code in `adapters/`) is [Apache-2.0](LICENSE). Which file falls under which, credit, and content from other sources: [LICENSE-CONTENT.md](LICENSE-CONTENT.md).
