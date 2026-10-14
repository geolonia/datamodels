---
title: Your site's models
description: Look for an existing model with the search command of datamodels-toolkit, add models to your own site with add and extend, and write their attributes
---

# Your site's models

This page adds models to a subject of your node and writes their attributes. No node yet? Start with [Starting a site](/en/toolkit/start).

## Look for an existing model first {#search}

Before you make a new model, check whether one already exists that you can use as it is or build on. `search` looks through the models of datamodels.jp and of the sites it links to, for words in the type name, title, attributes and description. It finds Japanese and English words.

```bash
npx @geolonia/datamodels@0.3.16 search 避難
npx @geolonia/datamodels@0.3.16 search road closure --json
```

The result of the first command, shortened:

```text
disaster/DesignatedShelter  指定避難所 / Designated shelter  datamodels.jp  https://datamodels.jp/models/disaster/DesignatedShelter/
disaster/EvacuationShelter  避難所の運用状況 / Evacuation shelter operation  datamodels.jp  https://datamodels.jp/models/disaster/EvacuationShelter/
…
4 of 18 models in 3 node(s) match
```

Each line is one model: its subject and type, its titles, the site (its title, else the name of its publisher), and its page. The best 10 are listed; `--limit` changes the number. With `--json`, the output also has the type IRI, version, schema, `@context` and index (`catalog.json`) of each model; use it from scripts and AI agents. `extend` and `export` take that index as `--index`: for them it must be the URL of the `catalog.json` itself, not the address of a node.

A word counts most in the type name, then in the title, the attribute names and the descriptions, and a rare word counts more than a common one. English words need 3 letters or more, and common words such as `data`, `model` or `type` are skipped. Japanese is matched by pairs of characters that contain a kanji or katakana, so `避難` finds 指定避難所; a word in hiragana only, such as `ひなん`, is not searched for. When nothing is left to search for, such as with only such words or common words, it is a usage error (exit code 2, "nothing to search for"). Value types, such as an address, are listed too.

`nodes` lists the sites it can reach, with their name, address, licence, number of models, and the site that links to them:

```bash
npx @geolonia/datamodels@0.3.16 nodes
```

```text
datamodels.jp  https://datamodels.jp/  CC0-1.0  16 models
GTT Project  https://models.gtt-project.org/  CC0-1.0  1 model  (linked from datamodels.jp)
Geolonia Inc.  https://models.geolonia.com/  CC0-1.0  1 model  (linked from datamodels.jp)
3 node(s) within 1 link(s) of https://datamodels.jp/catalog.json
```

Both commands start at an index. `--index` takes a `catalog.json` or the address of a node (default: datamodels.jp). From there they follow links: the nodes that its `catalog.json` lists under `nodes`, and the indexes that its models name in `extends`. `--depth` sets how many links away (default 1, at most 5; `0` reads only the first index). Each index is read once, so a link back is not followed again, and at most 50 indexes are read. `nodes --json` gives the list for scripts.

Indexes are read only over https, from public addresses. A node that cannot be read is noted on standard error and skipped. The exit code is 1 only when the first index cannot be read.

To build on a model you found, use [extend](#extend).

## A new model {#add}

```bash
npx @geolonia/datamodels@0.3.16 add road/RoadPatrol
```

This adds `models/road/RoadPatrol/` with `schema.json`, `catalog.yaml`, `examples/example.json` and `notes.yaml` (the notes: sources, decisions and their reasons), and the type `RoadPatrol` to the subject's `@context`. The schema of an entity type has `id` and `type`, and `catalog.yaml` has a title and a description in each language of the node. The new model builds and passes `check` at once. On a subject whose current version is already released, run [`bump`](/en/toolkit/versions#bump) before `add`: `add` changes that version's sources, and `build` and `check` then stop. Then [write its attributes](#attributes).

For a value type, a structure used inside attributes (like an address), add `--value`:

```bash
npx @geolonia/datamodels@0.3.16 add road/Segment --value
```

## Starting from a catalog model {#extend}

To start from a model of this catalog instead, use `extend`. Despite its name, it is not an [extension](/en/guide/extend): it makes a new model on your own site. Then add your attributes as [below](#attributes).

```bash
npx @geolonia/datamodels@0.3.16 extend task/Task road/RoadTask
```

The first argument is the model to start from: `<subject>/<Type>` as the other site's `catalog.json` lists it, or its type IRI. `--index` names that `catalog.json` (default: for a type IRI, its own node's index when that lists it; else the first node in `node.yaml`, else datamodels.jp; see [A model given by its type IRI](/en/toolkit/reference#type-iri)). In a terminal, `extend` without arguments lets you pick the model from a list and asks for the new name.

`extend`:

- copies the other model's schema at its current version, and imports its `@context` at that exact version into the subject's;
- takes the attribute descriptions from the other catalog, and adapts its example. The default form also takes the model's title and description; with `--subclass`, they start from the new type's name ("A subtype of …"), for you to write;
- records the model in `extends` in `catalog.yaml`, so `check` keeps its names and meanings;
- adds the other site to `nodes` in `node.yaml` when it is not there yet.

There are two kinds:

- **Default:** the same type with more attributes. The type keeps the other model's IRI (`x-alias-of`).
- **`--subclass`:** a type of its own in your namespace, with the other model as its parent (`x-subclass-of`).

`extend` writes the same four files as `add`. The `@context` in the subject's `context.jsonld` becomes a list: the URL of the imported @context, then this node's terms.

## Writing the attributes {#attributes}

Add each attribute in three places; the example is the `RoadPatrol` made with `add`.

<svg class="flow-diagram" viewBox="0 0 460 280" role="img" aria-label="One attribute in three files. In schema.json, x-iri gives route the IRI https://models.example.org/ns/road#route. In context.jsonld, route maps to road:route, which expands to the same IRI. catalog.yaml gives route its Japanese and English text, joined by the name, and the vocabulary describes the IRI with that text. check verifies that x-iri equals what the @context expands the name to." xmlns="http://www.w3.org/2000/svg"><defs><marker id="at-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="10" y="8" width="210" height="56" rx="10"/><text class="t m" x="115" y="32">schema.json</text><text class="s" x="115" y="52">"x-iri": "…/ns/road#route"</text><rect class="box" x="240" y="8" width="210" height="56" rx="10"/><text class="t m" x="345" y="32">context.jsonld</text><text class="s" x="345" y="52">"route": "road:route"</text><line class="a" x1="115" y1="64" x2="196" y2="94" marker-end="url(#at-ah)"/><line class="a" x1="345" y1="64" x2="264" y2="94" marker-end="url(#at-ah)"/><rect class="box main" x="10" y="96" width="440" height="58" rx="10"/><text class="t" x="230" y="120">One IRI</text><text class="s" x="230" y="139">https://models.example.org/ns/road#route</text><rect class="box" x="10" y="184" width="180" height="56" rx="10"/><text class="t m" x="100" y="208">catalog.yaml</text><text class="s" x="100" y="228">route: ja and en text</text><rect class="box" x="270" y="184" width="180" height="56" rx="10"/><text class="t" x="360" y="208">The vocabulary</text><text class="s" x="360" y="228">the IRI, with that text</text><line class="a" x1="360" y1="154" x2="360" y2="182" marker-end="url(#at-ah)"/><line class="a" x1="190" y1="212" x2="268" y2="212" marker-end="url(#at-ah)"/><text class="s" x="229" y="204">by name</text><text class="s" x="230" y="268">check: x-iri must equal what the @context expands route to</text></svg>

In `models/road/RoadPatrol/schema.json`, under `properties`, with its IRI in `x-iri`:

```json
"route": {
  "type": "string",
  "description": "The route patrolled",
  "x-iri": "https://models.example.org/ns/road#route"
}
```

In `models/road/context.jsonld`, under `@context`, mapped to the same IRI:

```json
"route": "road:route"
```

In `models/road/RoadPatrol/catalog.yaml`, a description in each language of the node:

```yaml
attributes:
  route: { ja: 巡回したルート, en: The route patrolled }
```

Put a value in `examples/example.json` too (`"route": "A-3"`), and replace the titles and descriptions in `catalog.yaml` and `models/road/subject.yaml` with your own. The [rules for models](/en/guide/rules) of this catalog are a good guide for names and descriptions.

Once the model is there, go on with [Checking and building](/en/toolkit/check).
