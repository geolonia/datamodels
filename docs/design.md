# Design: datamodels.jp

| | |
|---|---|
| Status | Pre-release on datamodels.jp since 2026-09-24; official launch pending ([launch plan #30](https://github.com/geolonia/datamodels/issues/30)) |
| Author | Daniel Kastl |
| Decisions | Domain `datamodels.jp` (2026-09-18); Cloudflare Workers static assets; repository `geolonia/datamodels`; Apache-2.0 code, CC BY 4.0 content (licence under review); every subject restarts at 1.0.0 at launch |
| History | Started 2026-09-17 as `geonicdb-docs/design/ngsi-ld-data-models-catalog.md` for a GeonicDB catalog at `models.geonicdb.com`; moved here and rewritten for the product-neutral catalog on 2026-09-24 |

## Summary

A public, versioned, bilingual catalog of NGSI-LD data models that work in practice in Japan, run as a digital commons rather than a product feature. Machine-readable files (JSON-LD `@context`, JSON Schema, RDFS vocabularies, examples) are served from URLs that never change, so anyone can reference them from stored entities. The catalog extends and maps existing standards (Smart Data Models, the Digital Agency's GIF and 自治体標準オープンデータセット, RFC 8984) instead of copying them. It is generated from a public repository that accepts contributions in Japanese and English. Broker-specific files, such as GeonicDB Custom Data Model definitions, are produced by adapters outside the catalog core.

## Problem

- NGSI-LD only pays off when entity types and attributes are shared vocabulary. Implementers who invent their own types lose interoperability with tools and with each other.
- Global Smart Data Models are documented in English, follow Western address and identifier conventions and are hard to discover from Japan. Most of them stay drafts, and their canonical URLs point at a mutable branch, so a version cannot be pinned.
- Japanese government data standards (GIF, 自治体標準オープンデータセット) are published as XSD, Excel and CSV, not as JSON-LD or JSON Schema. Nobody bridges them to NGSI-LD.
- Referencing third-party `@context` URLs makes stored data depend on infrastructure the implementer does not control; a moved or edited context silently changes the meaning of stored data.

## Goals

1. Stable URLs for contexts, schemas, vocabularies and type IRIs, with a written immutability policy enforced by CI.
2. A searchable catalog, Japanese first and English second, that helps people find, understand and adopt a model.
3. Extend the global ecosystem, never fork it: reuse upstream IRIs where a model fits, follow the Smart Data Models file layout so models can go upstream.
4. Japanese coverage: shared building blocks such as the address, and mappings to the Japanese standards municipalities already procure against.
5. A machine-readable index (`catalog.json`) for brokers, tools and agents.
6. Product neutrality: no product in any IRI, schema or core script; products are served by adapters.
7. An open repository with a clear contribution path.

## Non-goals

- Replacing Smart Data Models or running a general ontology registry.
- Runtime services (validation API, SPARQL, content negotiation) in 1.0.0. The site is static.
- Breadth for its own sake. Models come from real implementations.

## Decision 1: Domain name

**Decision (2026-09-18, Slack thread with Hal Seki and 宮内さん): `datamodels.jp`, the permanent IRI base for every subject.** `datamodel.jp` is available as a typo guard.

The first choice, `models.geonicdb.com` (morning of 2026-09-18), tied a commons to one product. Once the catalog was framed as a digital commons usable by other brokers and by Japanese standard datasets, a product domain would have been wrong in every IRI. "smart" was avoided: `smartdatamodels.org` is the name of the FIWARE / TM Forum initiative, and a `.jp` variant would read as its Japan branch. `datamodels.org` is taken. `.jp` states who operates the catalog, requires a Japanese registrant (Geolonia) and says nothing about the protocol, so the name survives a move away from NGSI-LD.

The domain is permanent: every IRI under `datamodels.jp` that someone stores must resolve for the lifetime of their data. That obligation is accepted knowingly; it is smaller than pointing people at third-party URLs nobody here can keep alive.

- Registration: Route 53 in the GeonicDB AWS account (decided 2026-09-24), name servers delegated to Cloudflare.
- Zone and Worker: Geolonia's Cloudflare account, the same as `status.geonicdb.com`.
- `models.geonicdb.com`, the pre-launch preview, was retired at the launch. Nothing ever consumed it, so it neither redirects nor keeps serving.

## Decision 2: Extend, do not duplicate

Three kinds of entries, in decreasing order of preference:

| Kind | Type IRI | Example | What the catalog adds |
|---|---|---|---|
| **Curated global model** | upstream (`https://smartdatamodels.org/dataModel.X/Type`) | `WeatherObserved` | Japanese description, Japanese example values, guidance. No copy. *Planned.* |
| **Profile of a global model** | upstream for the base type; `https://datamodels.jp/ns/<subject>/...` for added attributes | `Building` with 住居表示 | A context that imports the upstream context by commit-pinned URL and adds terms. *Planned.* |
| **Model minted here** | `https://datamodels.jp/ns/<subject>/Type` | `task`, `disaster`, `common` | The full model, with mapping tables to every standard it corresponds to. |

Rules:

- Never redefine an upstream attribute with a different meaning or type. Add attributes instead.
- Never redefine a protected term of the NGSI-LD core context (`status`, `description`, `location`, ...). The validator rejects it.
- Namespaces are organised by subject (`task`, `disaster`, `common`), never by region, language, customer or project. There is no `/jp/` segment: whether a model is Japan-specific is catalog metadata, not part of a permanent identifier.
- Shared building blocks (the address, codes) live once in `common`, are referenced from schemas with `$ref` and composed into contexts by listing the context URL.
- **Alias** (`x-alias-of`): another name for a type the catalog already defines, with the same IRI, attributes and required fields. An alias owns no IRI and no class; use it when a domain names an existing type differently.
- **Subclass** (`x-subclass-of`): an own type IRI whose attributes of the same name keep the parent's IRIs and NGSI type, with the parent's required attributes still required. Use it when a domain needs its own type, for example for its own access rules or extra attributes. The relation is published as `rdfs:subClassOf` in the subject's vocabulary, so tools other than this validator see it.
- Record the upstream candidates considered, and why they did not fit, in each model's `notes.yaml`.

## Conventions borrowed

Researched 2026-09-17 and 2026-09-18.

- **Smart Data Models**: per-model folder (`schema.json`, `examples/`, `notes.yaml`, `ADOPTERS.yaml`, `README.md`, `LICENSE.md`), one context per subject, key-values schemas with `x-ngsi` annotations, and promotion by real adoption. Adopted verbatim so a folder can move upstream unchanged.
- **ETSI NGSI-LD core context**: versioned, immutable file names with an alias for the latest.
- **schema.org**: every term IRI resolves to a human page; pinnable releases.
- **Digital Agency GIF** (repository CC0 1.0; core data model schema CC BY 4.0) and **自治体標準オープンデータセット** (公共データ利用規約 PDL1.0, the successor of the 推奨データセット since 2023-03-31): the Japanese source of truth for addresses and municipal datasets. Mapped field by field, never copied as a competing model. The IMI 共通語彙基盤, which GIF succeeded, is not a mapping target.

## URL scheme and hosting contract

```text
https://datamodels.jp/                                   catalog (ja at the root, English under /en/)
https://datamodels.jp/models/<subject>/<Type>/            model page
https://datamodels.jp/context/<subject>/vX.Y.Z.jsonld     context, exact version, immutable
https://datamodels.jp/context/<subject>/vX.jsonld         alias: latest X.y.z
https://datamodels.jp/schema/<subject>/<Type>/vX.Y.Z.json JSON Schema, exact version, immutable
https://datamodels.jp/schema/<subject>/<Type>/vX.json     alias
https://datamodels.jp/vocab/<subject>/vX.Y.Z.jsonld       RDFS vocabulary, exact version, immutable
https://datamodels.jp/examples/<subject>/<Type>/          examples
https://datamodels.jp/ns/<subject>/<Term>                 type and attribute IRIs, redirect to the page
https://datamodels.jp/catalog.json                        machine-readable index (catalog.schema.json)
https://datamodels.jp/adapters/<name>/<subject>/<Type>.json  adapter output
```

Contract:

1. **Immutability.** A published exact-version file never changes and is never removed. `published-manifest.json` records its SHA-256; CI fails on any change, and `npm run check:live` compares the served bytes after every deploy.
2. **Headers.** `.jsonld` as `application/ld+json`, schemas as `application/schema+json`, CORS open, `Cache-Control: public, max-age=31536000, immutable` for exact versions and a short max-age for aliases.
3. **Term IRIs resolve** to the documenting page, and the namespace IRI to the subject page. No content negotiation in 1.0.0.
4. **Term IRIs never change meaning.** A breaking change mints a new IRI; the old one stays published and documented.
5. **Upstream IRIs are never re-minted.**

## External definitions: reference, do not copy

A profile context is an array that mixes a commit-pinned upstream context URL, the `common` context and inline terms, so nothing upstream is copied and the referenced meaning cannot drift:

```json
{
  "@context": [
    "https://raw.githubusercontent.com/smart-data-models/dataModel.Building/<commit>/context.jsonld",
    "https://datamodels.jp/context/common/v1.0.0.jsonld",
    { "bldg": "https://datamodels.jp/ns/building/", "residentialIndication": "bldg:residentialIndication" },
    "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld"
  ]
}
```

A byte-identical pinned mirror under `/context/mirror/<subject>/<commit>.jsonld` is possible for users who cannot depend on GitHub availability; it is covered by the immutability manifest but not needed for 1.0.0.

## Repository layout

```text
models/<subject>/
  subject.yaml  context.jsonld
  releases/vX.Y.Z/          context.jsonld, vocab.jsonld, schema/<Type>.json (snapshots of published versions)
  <Type>/
    schema.json  catalog.yaml  notes.yaml  ADOPTERS.yaml  README.md  LICENSE.md
    examples/               example.json (key-values), example-normalized.jsonld
    mapping/*.yaml          correspondence to external standards, rendered on the page
adapters/<name>/            broker- or tool-specific output; the core never imports it
scripts/                    validate, build, publish, vocabulary, immutability, live check
site/                       VitePress; model pages are generated
docs/design.md              this document
```

CI on every pull request validates:

- key-values examples against the schema, and the key-values projection of the normalized example;
- NGSI-LD representation rules, including multi-valued attributes with `datasetId`;
- JSON-LD expansion and compaction of every example with the subject context and the ETSI core context, failing on any term that does not expand or any key lost on the round trip;
- context coverage of every attribute, no redefinition of core terms, unique type IRIs, alias equality and subclass consistency;
- the vocabulary's subclass relations;
- no product-specific keys in schemas;
- immutability of every published file; then a dry-run deploy.

Every validator rule has a test proving that it fires.

## Versioning and lifecycle

- One semantic version per subject, shared by its context, vocabulary and schemas. Adding attributes is a minor version; renaming or removing is a major version. Superseded attributes are marked `x-deprecated` for at least one minor version.
- `npm run manifest:record` snapshots the version into `releases/` and records its hashes; every published version keeps being served.
- Every model carries a status: `draft`, `stable` or `deprecated`. A model becomes `stable` once two independent implementations are recorded in its `ADOPTERS.yaml`: two organisations or genuinely separate systems, not two tenants of one product.
- Pre-release history on models.geonicdb.com (2026-09-17 to 2026-09-24) was dropped: every subject restarted at 1.0.0 on `datamodels.jp`, with all models as drafts.
- The catalog stays in pre-release until the official launch: the site shows a banner, and published files, `v1.0.0` included, may still be corrected in place under the README's documented procedure. At the official launch the banner and the exception are removed, and CI additionally compares `published-manifest.json` with main's so that a pull request cannot rewrite recorded entries.
- Decided 2026-09-24, under the pre-release exception: `DisasterEvent`, `IncidentReport`, `IncidentResponseAction`, `IncidentHandoverNote` and `IncidentPhoto` were removed from `disaster` 1.0.0 in place, without a version bump, because none of them had an external standard behind it. The catalog publishes models built on an existing standard or guideline; `RoadClosure` and `EvacuationShelter` stay and are rebuilt on national guidelines.

## Adapters

An adapter turns catalog models into files a particular broker or tool consumes, under `/adapters/<name>/`, listed per model in `catalog.json`. The core discovers adapters at build time and never imports them; an adapter may add files but cannot change a context, schema or IRI. Adapter output is regenerated on every build and is not covered by the immutability manifest. The first adapter is GeonicDB (Custom Data Model request bodies, plus a CLI for tenant-specific variants with prefixes, aliases and extra attributes). Other brokers can follow in the same place.

Brokers integrate from the other side: GeonicDB, for example, can read `catalog.json` at startup with a bundled fallback, pre-warm its context cache from the listed URLs and offer the models in its console and CLI. That work belongs to each broker's roadmap, not to the catalog.

## Hosting

Cloudflare Workers static assets, deployed by Cloudflare Workers Builds from `main`; no deploy credential is stored in GitHub, and CI only runs a dry-run deploy. `_headers` and `_redirects` carry the URL contract: one `*` per rule, headers from several matching rules are joined unless detached with `! Header`, so the immutable cache rules are generated per file. A Worker script would stop `_headers` and `_redirects` from applying, so any host-level redirect belongs in a Redirect Rule on the zone instead. Cloudflare Pages was not chosen because Cloudflare directs new projects to Workers; GitHub Pages cannot set response headers.

## Licensing and contribution

- Code: Apache-2.0. Model content: CC BY 4.0, which anything derived from Smart Data Models requires. GIF content (repository CC0 1.0; the core data model schema declares CC BY 4.0) is licensed under CC BY 4.0 and credits GIF; 自治体標準オープンデータセット material is used under the 公共データ利用規約 (PDL1.0, compatible with CC BY 4.0) and credited to its source.
- Under review (Hal): CC0 for schemas and contexts so governments can reuse them without an attribution obligation, keeping CC BY 4.0 for prose. Anything copied from CC BY sources cannot become CC0; reused IRIs are unaffected.
- Planned (launch plan Phase 2): a contributing guide in both languages, a schema proposal form asking what real data exists, which standard it extends and who the second implementer is, DCO sign-off instead of a contributor agreement, per-subject editors in CODEOWNERS and a small steering group for new subjects and major versions.

## Internationalisation

Japanese is the default language, English the second; both are mandatory for every title, description and attribute, enforced by the validator. There is no machine translation of model semantics: attribute descriptions are normative. Type and attribute names stay ASCII camelCase; Japanese appears in descriptions, labels, mappings and examples.

## Open questions

1. Licence of schemas and contexts (CC0 or CC BY 4.0).
2. Takamatsu application: running on these models or an experiment, and whether the city needs types of its own (launch plan #30).
3. Which curated global models and profiles come first, and from which implementations.
4. Whether the pinned mirror of upstream contexts is needed.

## References

- Smart Data Models: https://smartdatamodels.org/ and https://github.com/smart-data-models
- ETSI NGSI-LD core context files: https://uri.etsi.org/ngsi-ld/v1/
- RFC 8984, JSCalendar: https://www.rfc-editor.org/rfc/rfc8984.html
- Digital Agency GIF: https://www.digital.go.jp/policies/data_strategy_government_interoperability_framework and https://github.com/JDA-DM/GIF
- 自治体標準オープンデータセット: https://www.digital.go.jp/resources/open_data/municipal-standard-data-set-test
- Cloudflare Workers static assets, headers and redirects: https://developers.cloudflare.com/workers/static-assets/
