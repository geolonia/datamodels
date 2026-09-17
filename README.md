# geonicdb-models

Curated bilingual catalog of NGSI-LD data models for [GeonicDB](https://docs.geonicdb.com/), served at `https://models.geonicdb.com`. It extends [Smart Data Models](https://smartdatamodels.org/) with Japanese profiles and Japan-only models, and provides stable, versioned URLs for `@context` files, JSON Schemas and type IRIs.

**Status:** bootstrap. Nothing is served yet. The design is in [geonicdb-docs `design/ngsi-ld-data-models-catalog.md`](https://github.com/geolonia/geonicdb-docs/blob/main/design/ngsi-ld-data-models-catalog.md).

## Principles

- **Extend, never duplicate.** Global Smart Data Models keep their upstream IRIs. Japanese profiles reference the upstream context by URL and add terms. Only Japan-only models mint new IRIs under `https://models.geonicdb.com/ns/jp/`.
- **Upstream-compatible layout.** Each model folder follows the Smart Data Models file set (`schema.json`, `model.yaml`, `notes.yaml`, `ADOPTERS.yaml`, `examples/`, `doc/`), so a model can be proposed upstream unchanged.
- **Published files are immutable.** A versioned `@context` or schema never changes once published. Breaking changes get a new version. Nothing is deleted.

## Repository layout (planned)

```text
models/      data models; Japan-only models and profiles under models/jp/
site/        the public website (VitePress, Japanese and English)
scripts/     build catalog.json, generate specs, validate examples and contexts
dist/        published tree deployed to models.geonicdb.com
```

## Contributing

Issues and pull requests are welcome in Japanese or English. Every model change is validated in CI: examples against schemas, contexts through a JSON-LD processor, IRI uniqueness, and immutability of published versions. A contributing guide will be published with the site.

## Licences

| Path | Licence |
|---|---|
| `models/**` (schemas, contexts, examples, descriptions) | [CC BY 4.0](LICENSE-CONTENT.md) |
| everything else (site, scripts, CI) | [Apache-2.0](LICENSE) |

Content derived from Smart Data Models keeps its upstream attribution. Content derived from the Digital Agency's GIF or 推奨データセット (CC0 1.0) is re-licensed under CC BY 4.0.
