# What a node publishes

| | |
|---|---|
| Status | Draft for discussion ([#200](https://github.com/geolonia/datamodels/issues/200)); nothing here is implemented yet |
| Scope | The minimum a data model site ("node") publishes, so that machines can use its models and other nodes can find them |
| Format version | 1 (draft) |

## 日本語まとめ

- **ノード**は、データモデルを公開する静的なサイトです（GitHub Pages など）。datamodels.jp もノードの 1 つです。
- 必ず公開するもの：サイトの一覧 `catalog.json`、モデルごとの @context・JSON Schema・語彙、IRI を開いたときの人向けのページ。公開した版のファイルは変えない。
- `catalog.json` は datamodels.jp と同じ形の一部で、足すのは 3 つ：公開者（`publisher`）、ほかのノードのモデルを拡張していること（`extends`）、知っているほかのノード（`nodes`）。
- 段階は `draft`、`experimental`、`stable`、`deprecated`。
- DCAT にそのまま対応させられるので、ネットワーク全体をブローカーのエンティティとしても扱える。
- 決めたこと（2026-10-10）：サブジェクトの単位は datamodels.jp と同じ。GitHub Pages では `#` 付きの IRI が既定。ライセンスは必須（ひな形は CC0 を提案）。`extends` は RDF では `prov:wasDerivedFrom`。段階は 4 つで、`experimental` は datamodels.jp でも選べる（使うことは少ない）。
- 残る問い：合意したあと、この文書をどこに置くか。

## Words

- **Node:** a site that publishes data models at a base URL it controls, for example `https://models.geolonia.com/`. datamodels.jp is a node; so is gtt-project.org.
- **Model:** one entity or value type with its attributes, as on datamodels.jp: a JSON Schema, the terms in an @context, and the classes and properties in a vocabulary.
- **Index:** the node's `catalog.json`, the one file a machine reads to learn everything the node publishes.

## 1. What every node publishes

All paths are relative to the node's base URL. A node may use other paths for the files; the index says where they are.

| What | Suggested path | Required |
|---|---|---|
| Index | `/catalog.json` | yes, at exactly this path |
| @context per subject, each version | `/context/<subject>/vX.Y.Z.jsonld` | yes |
| @context alias (latest compatible) | `/context/<subject>/vX.jsonld` | recommended |
| JSON Schema per model, each version | `/schema/<subject>/<Type>/vX.Y.Z.json` | yes |
| Vocabulary (RDFS classes and properties, labels) | `/vocab/<subject>/vX.Y.Z.jsonld` | yes |
| A page per model, for people | any, listed in the index as `pageUrl` | yes |
| Examples | `/examples/<subject>/<Type>/example.json` | recommended |
| `llms.txt` (an index for AI tools) | `/llms.txt` | recommended |
| DCAT form of the index | `/catalog.dcat.jsonld` | optional (section 6) |

A **subject** groups models that share one @context and one vocabulary, as on datamodels.jp; nodes keep this level so every tool reads them the same way. A small node simply has one subject.

**Rules for the files**

1. **A published versioned file never changes and is never removed.** Fix a mistake with a new version. Aliases (`vX.jsonld`) move to the latest compatible version.
2. **Content types:** `application/ld+json` for @contexts and vocabularies, `application/schema+json` (or `application/json`) for schemas, `application/json` for the index.
3. **CORS open** (`Access-Control-Allow-Origin: *`): brokers and browsers fetch @contexts from other origins. GitHub Pages does this by default.

## 2. IRIs

Every type and attribute a node defines has an IRI under the node's own domain, and opening it in a browser leads to a page that explains it. Two forms work on a static host:

- **Hash IRIs**, `https://example.org/ns/<subject>#<Term>`: the part before `#` is one page (or the vocabulary) that has an anchor per term. Works on any static host without redirects. gtt-project.org uses this form.
- **Slash IRIs**, `https://example.org/ns/<subject>/<Term>`: needs a page per term, or a redirect to the model page. datamodels.jp uses this form, and answers JSON-LD clients with the vocabulary (content negotiation, #196); a static host cannot do that, but [w3id.org](https://w3id.org/) in front can.

**Default: hash IRIs** for nodes on GitHub Pages and other static hosts; slash IRIs are an option for nodes behind w3id.org or on a server that can redirect. A node chooses one form per subject and keeps it: an IRI is a name, and published data uses it forever.

Terms a node reuses (from datamodels.jp, another node, NGSI-LD, schema.org) keep their original IRIs. A node only mints IRIs for what is new.

## 3. The index (`catalog.json`)

The same format as [datamodels.jp's catalog.json](https://datamodels.jp/catalog.json) ([schema](https://datamodels.jp/catalog.schema.json)), with fewer required fields and three additions. A tool written for the node format can also read datamodels.jp's `catalog.json`, which carries every field a node requires (except `publisher`, which it will add). The other way round does not work yet: `catalog.schema.json` requires more fields and knows neither the additions nor `experimental`. Adopting this format means extending that schema, with the toolkit library (geolonia/datamodels-toolkit#10).

```json
{
  "formatVersion": 1,
  "generatedAt": "2026-10-10T00:00:00Z",
  "publisher": {
    "name": { "ja": "株式会社 Geolonia", "en": "Geolonia Inc." },
    "url": "https://geolonia.com/"
  },
  "license": "CC0-1.0",
  "licenseUrl": "https://models.geolonia.com/LICENSE",
  "nodes": [
    { "url": "https://datamodels.jp/", "index": "https://datamodels.jp/catalog.json" }
  ],
  "models": [
    {
      "type": "RoadPatrol",
      "typeIri": "https://models.geolonia.com/ns/road#RoadPatrol",
      "subject": "road",
      "version": "0.1.0",
      "status": "experimental",
      "title": { "ja": "道路パトロール", "en": "Road patrol" },
      "description": { "ja": "…", "en": "…" },
      "contextUrl": "https://models.geolonia.com/context/road/v0.1.0.jsonld",
      "schemaUrl": "https://models.geolonia.com/schema/road/RoadPatrol/v0.1.0.json",
      "vocabularyUrl": "https://models.geolonia.com/vocab/road/v0.1.0.jsonld",
      "pageUrl": "https://models.geolonia.com/road/RoadPatrol/",
      "extends": [
        {
          "typeIri": "https://datamodels.jp/ns/task/Task",
          "version": "1.0.0",
          "index": "https://datamodels.jp/catalog.json"
        }
      ]
    }
  ]
}
```

`RoadPatrol` is an invented example.

**Required at the top:** `formatVersion`, `generatedAt`, `publisher`, `license` (the publisher decides; the template suggests CC0, as datamodels.jp uses), `models`.

**Required for every model:** `type`, `typeIri`, `subject`, `version`, `status`, `title`, `description`, `contextUrl`, `schemaUrl`, `vocabularyUrl`, `pageUrl`. `title` and `description` have at least one language (`ja`, `en` or another BCP 47 tag).

**Optional, as on datamodels.jp:** `contextAliasUrl`, `pageUrlEn`, `exampleUrls`, `attributes`, `kind`, `subClassOf`, `aliasOf`, `supersededBy`, `mappingUrls`, `adapters`, `extensions`.

**New in a node index:**

- `publisher` (required at the top): who runs the node. Name in at least one language, and a URL.
- `extends` (per model, optional): the models of other nodes this model builds on, by type IRI and version, with the index where they are listed. A model that only adds attributes to another node's model has the same `typeIri` as that model and lists it here; a new subtype has its own `typeIri` and lists its parent in `subClassOf` and `extends`.
- `nodes` (at the top, optional): other nodes this node knows, by base URL and index URL. This is how the network is found: start at any node and follow `nodes` and `extends`.

## 4. Stages

| Stage | Meaning |
|---|---|
| `draft` | Being worked on; may still change. |
| `experimental` | In use, to learn from; may be replaced. |
| `stable` | Relied on; changes only by new versions that keep compatibility. |
| `deprecated` | Not for new data; still published, with `supersededBy` when there is a replacement. |

`experimental` is new: for models published while they are tried out. Nodes and datamodels.jp both accept it; on datamodels.jp it is an option that will be rare, since its models go through review first.

## 5. How the network is found

- A node's index is always at `/catalog.json`.
- Every page of a node links to it: `<link rel="alternate" type="application/json" href="/catalog.json">`.
- `nodes` and `extends` link indexes to each other. datamodels.jp keeps a list of the nodes it knows and reads their indexes to show "Extended by" and other catalogs.
- A node that is down or gone is skipped; nobody's build fails because of it.

## 6. DCAT

The index maps onto W3C [DCAT](https://www.w3.org/TR/vocab-dcat-3/), so the network can also be described with an existing standard and loaded into an NGSI-LD broker with the Smart Data Models DCAT-AP models (`Catalogue`, `Dataset`, `Distribution`).

| Index | DCAT |
|---|---|
| the node (`catalog.json`) | `dcat:Catalog` |
| `publisher` | `dct:publisher` |
| a model | `dcat:Dataset`, with `dct:identifier` = `typeIri`, `dct:title`, `dct:description`, `dcat:version` |
| its @context, JSON Schema, vocabulary | `dcat:Distribution` each, with `dcat:downloadURL` and `dcat:mediaType` |
| `pageUrl` | `dcat:landingPage` |
| `license`, `licenseUrl` | `dct:license`: the `licenseUrl` when present, otherwise the SPDX page of the identifier (`https://spdx.org/licenses/CC0-1.0.html`); on the catalog, and on each distribution |
| `nodes` | `dcat:catalog` (a catalog listing other catalogs) |
| `extends` | `prov:wasDerivedFrom` (W3C PROV) |

## 7. What a node does not need

Mapping files, adapters, ADOPTERS files, a second language, a review process, search, or a large site. These are what a shared catalog needs; a node can add any of them later.

## Decided (2026-10-10)

1. **Subjects:** nodes keep the `<subject>` level of datamodels.jp.
2. **IRIs:** hash IRIs by default on static hosts; slash IRIs as an option with w3id.org or a server that redirects.
3. **Licence:** required in every index; the template suggests CC0.
4. **`extends`:** expressed as `prov:wasDerivedFrom` in RDF and DCAT.
5. **Stages:** the four stages are the same everywhere: datamodels.jp adds `experimental` as an option, even if it is used rarely there.

## Open question

- **Where this text lives once agreed:** a guide on datamodels.jp, the toolkit's README, or both.
