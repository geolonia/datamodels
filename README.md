# geonicdb-models

Curated bilingual catalog of NGSI-LD data models for [GeonicDB](https://docs.geonicdb.com/), served at `https://models.geonicdb.com`. It extends [Smart Data Models](https://smartdatamodels.org/) with Japanese profiles and Japan-only models, and provides stable, versioned URLs for `@context` files, JSON Schemas and type IRIs.

**Status:** two subjects published, `disaster` (seven entity types) and `common` (the `JapaneseAddress` value type). All draft. The design is in [geonicdb-docs `design/ngsi-ld-data-models-catalog.md`](https://github.com/geolonia/geonicdb-docs/blob/main/design/ngsi-ld-data-models-catalog.md).

## Principles

- **Extend, never duplicate.** Global Smart Data Models keep their upstream IRIs. Japanese profiles reference the upstream context by URL and add terms. New IRIs are minted under `https://models.geonicdb.com/ns/<Subject>/`, organised by subject as upstream, never by region, customer or project.
- **Upstream-compatible layout.** Each model folder follows the Smart Data Models file set (`schema.json`, `model.yaml`, `notes.yaml`, `ADOPTERS.yaml`, `examples/`, `doc/`), so a model can be proposed upstream unchanged.
- **Published files are immutable.** A versioned `@context` or schema never changes once published. Breaking changes get a new version. Nothing is deleted.

## Repository layout

```text
models/<subject>/
  subject.yaml            name, version (of the context and all schemas), ja/en title and description, source
  context.jsonld          the subject's JSON-LD context, published as /context/<subject>/vX.Y.Z.jsonld and vX.jsonld;
                          may be an array that imports other catalog contexts by URL, e.g. the common subject
  releases/vX.Y.Z/        snapshot of every published version (context and schemas), written by manifest:record;
                          the build serves all of them so a published URL never disappears
  <Type>/
    schema.json           JSON Schema of the key-values representation, with x-ngsi, x-iri and x-geonicdb annotations;
                          x-kind: value marks a reusable value structure (e.g. common/JapaneseAddress) instead of an entity type
    catalog.yaml          ja/en title, description, per-attribute descriptions, status, tags
    examples/example.json                 key-values
    examples/example-normalized.jsonld    NGSI-LD normalized, with @context
    notes.yaml  ADOPTERS.yaml  README.md  LICENSE.md
site/                     VitePress site (theme and config as docs.geonicdb.com); site/models and site/en/models are generated at build time
scripts/                  build, validate, publish, export for GeonicDB
public/                   static source: _headers and the _redirects header
test/                     validator tests and the vendored core context fixture
dist/                     published tree deployed to models.geonicdb.com (built, not committed)
catalog.schema.json       wire format of /catalog.json
published-manifest.json   hashes of every immutable file ever published; append-only
```

The model folder follows the Smart Data Models layout so a model can be proposed upstream unchanged. `model.yaml` and `doc/spec*.md` are not yet generated; the published pages under `/models/<subject>/<Type>/` serve as the specification for now.

## Website

The pages are a VitePress site with the same theme, local search and light/dark toggle as [docs.geonicdb.com](https://docs.geonicdb.com/). Japanese is the root locale (`/models/...`) and English lives under `/en/models/...`; the navbar language menu switches between the two. Model and subject pages are generated from `models/` by `scripts/lib/site.mjs` at build time and are not committed; hand-written pages (homepages, guides) live in `site/`. Every attribute is a heading with an explicit id, so `/ns/<subject>/<term>` redirects to `/models/<subject>/<Type>/#<term>` keep resolving.

```bash
npm run site:dev   # generate the model pages and start the VitePress dev server
```

## Subjects

| Subject | Content |
|---|---|
| `disaster` | Municipal disaster-response operations: `Project`, `IncidentReport`, `IncidentResponseAction`, `IncidentHandoverNote`, `IncidentPhoto`, `RoadClosure`, `EvacuationShelter` |
| `common` | Shared value types: `JapaneseAddress` (schema.org PostalAddress fields plus 町字, 丁目, 番地, 号, JIS and local-government codes, the Address Base Registry town id and the residential-indication flag) |

An entity schema uses a value type with `allOf: [{ $ref }]` on the attribute and its subject context imports the value type's context by URL. See the [JapaneseAddress page](https://models.geonicdb.com/models/common/JapaneseAddress/) for the snippet.

## What is published for a subject

| URL | Content |
|---|---|
| `/context/<subject>/vX.Y.Z.jsonld` | the context, immutable |
| `/context/<subject>/vX.jsonld` | alias of the latest compatible version |
| `/schema/<subject>/<Type>/vX.Y.Z.json`, `vX.json` | JSON Schema, same rules |
| `/examples/<subject>/<Type>/` | the examples |
| `/geonicdb/<subject>/<Type>.json` | a GeonicDB Custom Data Model request body with `contextUrl` set to the exact context |
| `/models/<subject>/`, `/models/<subject>/<Type>/` | documentation pages (Japanese); `/en/models/...` in English |
| `/ns/<subject>/<Term>` | type and attribute IRIs, redirecting to the page that documents them |
| `/catalog.json` | machine-readable index, validated against `/catalog.schema.json` |

## Using a model in GeonicDB

Register the Custom Data Model with the published body, which already carries `contextUrl`:

```bash
curl -sSf https://models.geonicdb.com/geonicdb/disaster/RoadClosure.json -o RoadClosure.json
curl -X POST "$GEONICDB/custom-data-models" -H "Content-Type: application/json" -H "X-Api-Key: $KEY" --data @RoadClosure.json
```

A tenant that needs its own type names can export bodies with a prefix and keep the catalog vocabulary:

```bash
node scripts/export-geonicdb.mjs disaster --type-prefix Saitai --out ./out
```

## Validation

`npm run check` runs on every pull request; `npm run build:deploy` (steps 1 to 3) runs in Cloudflare Workers Builds before every deploy:

1. `build` starts with `validate:models`: key-values examples against `schema.json`; normalized examples against the NGSI-LD representation rules and, projected to key-values, against `schema.json`; JSON-LD expansion of every normalized example with the subject context and the core context, failing on any attribute that does not expand to its IRI or does not survive an expand/compact round-trip; every attribute has a context term unless the core context defines it; no core term is redefined; type names match folders; versions match the subject.
2. `build` then generates the site pages, builds the VitePress site into `dist/`, publishes the machine files on top and validates `catalog.json` against `catalog.schema.json`. Nothing reaches `dist/` if validation fails, whichever script called the build.
3. `check:immutability`: no published versioned file changed or disappeared.
4. `wrangler deploy --dry-run`.

`npm test` runs the validator against deliberately broken copies of `models/` to make sure each rule fires.

## Adding or changing a model

- New attribute or new model in a subject: add it, bump the subject's minor version in `subject.yaml`, every schema `$id` and `x-version`, and the `@context` URLs in the normalized examples. Attributes that the new version supersedes get `x-deprecated: true` and stay until the next major version. As the last step of the pull request, once review is done, run `npm run manifest:record`: it snapshots the new version into `releases/` and records its hashes. A recorded hash is a promise the moment the PR merges. The alias advances; every previous exact version keeps being served from its snapshot.
- Changing the meaning or type of an existing attribute is a breaking change: new term name or new subject major version. Never edit a published file.
- `status`, `description`, `location`, `createdAt`, `modifiedAt`, `observedAt` and the other core context terms cannot be redefined; the validator rejects it.

## Contributing

Issues and pull requests are welcome in Japanese or English. Every model change is validated in CI: examples against schemas, contexts through a JSON-LD processor, IRI uniqueness, and immutability of published versions. A contributing guide will be published with the site.

## Hosting and deployment

The site is a Cloudflare Worker with static assets, in the same Cloudflare account as the GeonicDB status page (`geonicdb-status` in [geonicdb-operations](https://github.com/geolonia/geonicdb-operations)). `wrangler.jsonc` describes it; `public/` is the static source, `npm run build` writes the published tree to `dist/`.

**Publishing needs no credential in GitHub.** Cloudflare Workers Builds watches this repository and redeploys on every merge to `main`. Its build command runs the same gate as CI (`build:deploy` = validate models, build, check immutability), so an invalid model or a modified immutable file fails the Cloudflare build instead of being published. CI additionally runs the tests and a dry-run deploy.

Workers Builds settings, on the `geonicdb-models` Worker under Settings → Builds:

| Setting | Value |
|---|---|
| Repository | `geolonia/geonicdb-models` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm ci && npm run build:deploy` |
| Deploy command | `npx wrangler deploy` |
| Builds for non-production branches | off |

The custom domain `models.geonicdb.com` is declared in `wrangler.jsonc`; the first deploy creates the DNS record and certificate in the `geonicdb.com` zone.

The URL contract (content types, CORS, caching, IRI redirects) lives in `public/_headers` and `public/_redirects`, plus per-file rules generated at build time for immutable exact versions and for IRI redirects. Cloudflare allows one `*` per rule and joins duplicate headers from several matching rules with commas, so exact versions get a literal rule that first detaches the inherited `Cache-Control` with `! Cache-Control`. After every deploy, `npm run check:live` verifies the live site.

**Immutability is enforced, not promised.** `published-manifest.json` records the SHA-256 of every immutable file ever published: exact versions under `/context/` and `/schema/` (for example `v1.0.0.jsonld`) and everything under `/context/mirror/`. `npm run check` rebuilds `dist/` and fails if a recorded file is missing or changed, or if a new immutable file is not yet recorded. New files are recorded with `npm run manifest:record`, and the manifest change is reviewed in the pull request. Aliases such as `v1.jsonld` are mutable by design and not recorded.

Local commands:

```bash
npm ci
npm run check    # validate models, build dist/, verify immutability, dry-run the deploy; no Cloudflare access needed
npm test         # validator tests
npm run check:live   # verify the deployed site against the URL contract (headers, redirects, live JSON-LD expansion)
npm run manifest:record   # record newly added immutable files in published-manifest.json
npm run dev      # serve locally with wrangler
```

## Licences

| Path | Licence |
|---|---|
| `models/**` (schemas, contexts, examples, descriptions) | [CC BY 4.0](LICENSE-CONTENT.md) |
| everything else (site, scripts, CI) | [Apache-2.0](LICENSE) |

Content derived from Smart Data Models keeps its upstream attribution. Content derived from the Digital Agency's GIF or 推奨データセット (CC0 1.0) is re-licensed under CC BY 4.0.
