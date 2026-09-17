# geonicdb-models

Curated bilingual catalog of NGSI-LD data models for [GeonicDB](https://docs.geonicdb.com/), served at `https://models.geonicdb.com`. It extends [Smart Data Models](https://smartdatamodels.org/) with Japanese profiles and Japan-only models, and provides stable, versioned URLs for `@context` files, JSON Schemas and type IRIs.

**Status:** bootstrap. Nothing is served yet. The design is in [geonicdb-docs `design/ngsi-ld-data-models-catalog.md`](https://github.com/geolonia/geonicdb-docs/blob/main/design/ngsi-ld-data-models-catalog.md).

## Principles

- **Extend, never duplicate.** Global Smart Data Models keep their upstream IRIs. Japanese profiles reference the upstream context by URL and add terms. New IRIs are minted under `https://models.geonicdb.com/ns/<Subject>/`, organised by subject as upstream, never by region, customer or project.
- **Upstream-compatible layout.** Each model folder follows the Smart Data Models file set (`schema.json`, `model.yaml`, `notes.yaml`, `ADOPTERS.yaml`, `examples/`, `doc/`), so a model can be proposed upstream unchanged.
- **Published files are immutable.** A versioned `@context` or schema never changes once published. Breaking changes get a new version. Nothing is deleted.

## Repository layout (planned)

```text
models/      data models, one folder per subject (disaster, common, Building, ...)
site/        the public website (VitePress, Japanese and English)
scripts/     build catalog.json, generate specs, validate examples and contexts
public/      static source (headers, redirects, placeholder pages)
dist/        published tree deployed to models.geonicdb.com (built, not committed)
published-manifest.json   hashes of every immutable file ever published; append-only
```

## Contributing

Issues and pull requests are welcome in Japanese or English. Every model change is validated in CI: examples against schemas, contexts through a JSON-LD processor, IRI uniqueness, and immutability of published versions. A contributing guide will be published with the site.

## Hosting and deployment

The site is a Cloudflare Worker with static assets, in the same Cloudflare account as the GeonicDB status page (`geonicdb-status` in [geonicdb-operations](https://github.com/geolonia/geonicdb-operations)). `wrangler.jsonc` describes it; `public/` is the static source, `npm run build` writes the published tree to `dist/`.

**Publishing needs no credential in GitHub.** Cloudflare Workers Builds watches this repository and redeploys on every merge to `main`. CI only builds and dry-runs the deploy.

Workers Builds settings, on the `geonicdb-models` Worker under Settings → Builds:

| Setting | Value |
|---|---|
| Repository | `geolonia/geonicdb-models` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm ci && npm run build` |
| Deploy command | `npx wrangler deploy` |
| Builds for non-production branches | off |

The custom domain `models.geonicdb.com` is declared in `wrangler.jsonc`; the first deploy creates the DNS record and certificate in the `geonicdb.com` zone.

The URL contract (content types, CORS, caching, IRI redirects) lives in `public/_headers` and `public/_redirects`.

**Immutability is enforced, not promised.** `published-manifest.json` records the SHA-256 of every immutable file ever published: exact versions under `/context/` and `/schema/` (for example `v1.0.0.jsonld`) and everything under `/context/mirror/`. `npm run check` rebuilds `dist/` and fails if a recorded file is missing or changed, or if a new immutable file is not yet recorded. New files are recorded with `npm run manifest:record`, and the manifest change is reviewed in the pull request. Aliases such as `v1.jsonld` are mutable by design and not recorded.

Local commands:

```bash
npm ci
npm run check    # build dist/, verify immutability, dry-run the deploy; no Cloudflare access needed
npm run manifest:record   # record newly added immutable files in published-manifest.json
npm run dev      # serve locally with wrangler
```

## Licences

| Path | Licence |
|---|---|
| `models/**` (schemas, contexts, examples, descriptions) | [CC BY 4.0](LICENSE-CONTENT.md) |
| everything else (site, scripts, CI) | [Apache-2.0](LICENSE) |

Content derived from Smart Data Models keeps its upstream attribution. Content derived from the Digital Agency's GIF or 推奨データセット (CC0 1.0) is re-licensed under CC BY 4.0.
