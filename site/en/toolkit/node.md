---
title: The node and build
description: What a node of datamodels-toolkit is made of (node.yaml and models/), and the files and pages the build command writes from it
---

# The node and build

A node is a folder with `node.yaml` (the settings) and `models/` (the models). `build` turns it into the files and pages of a site. This page says what goes into the folder and what comes out. The commands that write the files are on the task pages, starting with [Starting a site](/en/toolkit/start).

## The folder {#layout}

```text
my-models/
  node.yaml
  models/
    road/
      subject.yaml
      context.jsonld
      releases/
        v0.1.0/
      RoadPatrol/
        schema.json
        catalog.yaml
        notes.yaml
        examples/
          example.json
          example-normalized.jsonld
        mapping/
          <name>.yaml
```

`models/` is laid out as in [geolonia/datamodels](https://github.com/geolonia/datamodels/tree/main/models):

- One folder per subject (`road`), with `subject.yaml` (its name, version, `source`, and a title and description in each language of the node) and `context.jsonld`. `init` writes the first subject.
- One folder per model (`RoadPatrol`), with `schema.json`, `catalog.yaml` (titles, descriptions, `status`, the descriptions of the attributes) and `examples/example.json`. `add` and `extend` write them ([Your site's models](/en/toolkit/models)).
- Optional: `notes.yaml` (the sources, decisions and their reasons, shown on the model page), `examples/example-normalized.jsonld` (the example in the normalized form), and mapping files in `mapping/` ([Mapping files](/en/guide/mapping)). Other files in `examples/` are not published; `check` notes them.
- `releases/` holds the snapshots of published versions. `release` and `bump` write them ([Versions](/en/toolkit/versions)).

Unlike this catalog, a node needs only one language and has no `ADOPTERS.yaml` files.

A model that builds on a model of another node lists it in its `catalog.yaml` under `extends`, with `typeIri`, `version` (X.Y.Z) and `index` (that node's `catalog.json`). [`extend`](/en/toolkit/models#extend) writes it.

## node.yaml {#node-yaml}

```yaml
baseUrl: https://models.example.org
iris: hash
languages: [en]
title: { en: Road models }
description: { en: Models for road maintenance. }
publisher: { name: { en: Example Inc. }, url: https://example.org/ }
license: CC0-1.0
nodes:
  - { url: https://datamodels.jp/, index: https://datamodels.jp/catalog.json }
prerelease: true
```

| Key | Default | What it is |
|---|---|---|
| `baseUrl` | (required) | The address of the node, an http(s) URL. It is part of every IRI, so choose it once ([Starting a site](/en/toolkit/start#init)) |
| `iris` | `hash` | `hash`: `/ns/<subject>#<Term>`, one page per subject with an anchor per term, for any static host. `slash`: `/ns/<subject>/<Term>`, which needs redirects ([Other hosts](/en/toolkit/hosts)); GitHub Pages cannot redirect |
| `languages` | `[en]` | The languages of the node, the main one first. `subject.yaml` needs a title and description in each |
| `title` | | The name of the node, a text in each language of the node. `catalog.json` lists it, and the pages use it as the site's name. Without it, the pages say "Data models by &lt;publisher&gt;" |
| `description` | | What the node publishes, in a sentence or two, a text in each language of the node. `catalog.json` lists it, and the home page shows it |
| `publisher` | (required) | Who runs the node: `name` in at least one language, and `url` |
| `license` | (required) | The licence of the models, an SPDX identifier such as `CC0-1.0` |
| `licenseUrl` | | Where the licence text is. Without it, the pages link the SPDX page of `license` |
| `nodes` | | Other nodes this node knows, each with `url` and `index`. A `@context` may import theirs, and `build` reads schemas only from them. `extend` adds the node it reads from |
| `prerelease` | | `true` before an official launch: published versions may still be corrected ([Versions](/en/toolkit/versions)) |

`build` and `check` list every problem of `node.yaml` at once.

The toolkit reads other nodes only over https. So `nodes[].url` and `nodes[].index` here, and `extends[].index` in `catalog.yaml`, must be https URLs. For an `http://` address, the error says to change it to `https://`.

## What build writes {#build}

```bash
npx @geolonia/datamodels@0.3.15 build
npx @geolonia/datamodels@0.3.15 build my-models --out public
```

The files go into `_site/` in the node's folder, or into `--out`. The paths below are also their URLs under the base URL:

- `catalog.json`: the index of the node, in the same format as [datamodels.jp's](/catalog.json), with `title` and `description` (when node.yaml has them), `publisher`, `license`, `nodes`, and each model's URLs, `extends` and `adapters`.
- `context/<subject>/vX.Y.Z.jsonld`, and the alias of the major version `vX.jsonld` ([URLs and versions](/en/guide/urls)).
- `vocab/<subject>/vX.Y.Z.jsonld` and `vX.jsonld`: the vocabulary.
- `schema/<subject>/<Type>/vX.Y.Z.json` and `vX.json`: the JSON Schemas.
- `examples/<subject>/<Type>/`: the examples.
- `mapping/<subject>/<Type>/<name>.yaml`: the mapping files, byte for byte.
- `adapters/<name>/<subject>/<Type>.<ext>`: the files for other tools ([below](#adapters)).
- Every released version in `releases/`, next to the current one.
- `llms.txt`: an index for AI tools.
- The pages ([below](#pages)), and `404.html`.
- `_headers`, and with slash IRIs `_redirects`, for hosts other than GitHub Pages ([Other hosts](/en/toolkit/hosts)).

`build` does not empty the output folder. It removes two kinds of old file, though: an `adapters/index.html` (also under `/<lang>/`) that the toolkit wrote before v0.3.7, and, with hash IRIs, a `_redirects` that an earlier build left.

`build` stops when the sources of a released version differ from its snapshot. Exit codes: [Command reference](/en/toolkit/reference#build).

### Files for other tools {#adapters}

For each entity model, `build` writes the files of [`export`](/en/toolkit/export): a CSV template, its Table Schema, a schema for AI and a PostgreSQL / PostGIS table. `catalog.json` lists them under `adapters` in the model's entry, as on datamodels.jp. The model page has a **Download** row with a button per file, and an "About these files" link to [Adapters](/en/adapters/#downloads) on datamodels.jp.

- A model may refer to a schema on another node, such as datamodels.jp's JapaneseAddress. `build` reads it online, only from the `schema/` folder of a node in `nodes`. When the schema is elsewhere, or cannot be read, the model gets no adapter files, and `build` says so.
- These files are rebuilt every time. They are not covered by the promise that published files never change.

## The pages {#pages}

The pages are plain HTML in a monospace font, without JavaScript, so they read well with `curl` too.

- `/`: the node's title and description, then the subjects and their models.
- One page per subject. With hash IRIs it is the namespace document, `/ns/<subject>` (the file `ns/<subject>.html`), with an anchor for every type and attribute, so every IRI opens on it. With slash IRIs it is `/models/<subject>/`.
- One page per model, `/models/<subject>/<Type>/`, with an anchor per attribute, the standards it maps (from `mapping/`), its notes (from `notes.yaml`) and the Download row.
- A model that a released version had and the current one does not (renamed or removed) keeps a page at its old address. It says which versions had the model, links its last schema and `@context`, and names the current model with the same type IRI, if there is one. The subject page keeps an anchor for every term that earlier versions minted.
- `404.html`: what GitHub Pages and most static hosts show for an address without a page. One page, in the main language with the other languages' texts.

Every page links to `catalog.json` (`<link rel="alternate" type="application/json">`), and has a description, Open Graph tags for link previews and `<meta name="generator">`. Every page but `404.html` also has a canonical URL and links to its other languages (`hreflang`); `404.html` asks not to be indexed. The pages follow the light or dark setting of the device.

### Languages {#languages}

- The pages of the main language are at the base URL, where the IRIs open. Each other language is under `/<lang>/`, for example `/en/`, with a link to switch in the header.
- Each page shows the node's texts in its language. A text missing in that language falls back to the first language of `languages` that has it.
- The fixed texts of the pages are in Japanese and English; other languages get English.
- When English is not the main language, `catalog.json` lists the English pages as `pageUrlEn`, as datamodels.jp does.

## From code {#library}

`@geolonia/datamodels/build` is the code that builds the machine-readable files, for datamodels.jp and for every node. To use it from your own script:

```js
import { catalogUrls, loadSubjects, publishCatalog }
  from '@geolonia/datamodels/build';

const urls = catalogUrls('https://models.example.org', { iris: 'hash' });
const subjects = await loadSubjects('models', {
  urls, languages: ['en'], subjectFields: ['title', 'description'],
});
await publishCatalog(subjects, {
  urls, outDir: 'dist', languages: ['en'], head: { license: 'CC0-1.0' },
});
```

`catalogUrls` uses slash IRIs unless you pass `iris: 'hash'`.
