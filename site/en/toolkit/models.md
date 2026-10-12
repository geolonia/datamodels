---
title: Your site's models
description: Look for an existing model with the search command of datamodels-toolkit, add models to your own site with add and extend, and write their attributes
---

# Your site's models

This page adds models to a subject of your node and writes their attributes. No node yet? Start with [Starting a site](/en/toolkit/start).

## Look for an existing model first {#search}

Before you make a new model, check whether one already exists that you can use as it is or build on. `search` looks through the models of datamodels.jp and of the sites it links to, for words in the type name, title, attributes and description. It finds Japanese and English words.

```bash
npx @geolonia/datamodels@0.3.10 search 避難
npx @geolonia/datamodels@0.3.10 search road closure --json
```

The result of the first command, shortened:

```text
disaster/DesignatedShelter  指定避難所 / Designated shelter  Geolonia Inc.  https://datamodels.jp/models/disaster/DesignatedShelter/
disaster/EvacuationShelter  避難所の運用状況 / Evacuation shelter operation  Geolonia Inc.  https://datamodels.jp/models/disaster/EvacuationShelter/
…
4 of 18 models in 3 node(s) match
```

Each line is one model: its subject and type, its titles, the site (the name of its publisher), and its page. The best 10 are listed; `--limit` changes the number. With `--json`, the output also has the type IRI, version, schema, `@context` and index (`catalog.json`) of each model; use it from scripts and AI agents. `extend` and `export` take that index as `--index`.

A word counts most in the type name, then in the title, the attribute names and the descriptions, and a rare word counts more than a common one. English words need 3 letters or more. Japanese is matched by pairs of characters that contain a kanji or katakana, so `避難` finds 指定避難所; a word in hiragana only, such as `ひなん`, finds nothing. Value types, such as an address, are listed too.

`nodes` lists the sites it can reach, with their name, address, licence, number of models, and the site that links to them:

```bash
npx @geolonia/datamodels@0.3.10 nodes
```

```text
Geolonia Inc.  https://datamodels.jp/  CC0-1.0  16 models
GTT Project  https://models.gtt-project.org/  CC0-1.0  1 model  (linked from Geolonia Inc.)
Geolonia Inc.  https://models.geolonia.com/  CC0-1.0  1 model  (linked from Geolonia Inc.)
3 node(s) within 1 link(s) of https://datamodels.jp/catalog.json
```

Both commands start at an index. `--index` takes a `catalog.json` or the address of a node (default: datamodels.jp). From there they follow links: the nodes that its `catalog.json` lists under `nodes`, and the indexes that its models name in `extends`. `--depth` sets how many links away (default 1, at most 5; `0` reads only the first index). Each index is read once, so a link back is not followed again, and at most 50 indexes are read. `nodes --json` gives the list for scripts.

Indexes are read only over https, from public addresses. A node that cannot be read is noted on standard error and skipped. The exit code is 1 only when the first index cannot be read.

To build on a model you found, use [extend](#extend).

## A new model {#add}

```bash
npx @geolonia/datamodels@0.3.10 add road/RoadPatrol
```

This adds `models/road/RoadPatrol/` with `schema.json`, `catalog.yaml`, `examples/example.json` and `notes.yaml` (the notes: sources, decisions and their reasons), and the type `RoadPatrol` to the subject's `@context`. The schema of an entity type has `id` and `type`, and `catalog.yaml` has a title and a description in each language of the node. The new model builds and passes `check` at once. Then [write its attributes](#attributes).

For a value type, a structure used inside attributes (like an address), add `--value`:

```bash
npx @geolonia/datamodels@0.3.10 add road/Segment --value
```

## Starting from a catalog model {#extend}

To start from a model of this catalog instead, use `extend`. Despite its name, it is not an [extension](/en/guide/extend): it makes a new model on your own site. Then add your attributes as [below](#attributes).

```bash
npx @geolonia/datamodels@0.3.10 extend task/Task road/RoadTask
```

The first argument is the model to start from: `<subject>/<Type>` as the other site's `catalog.json` lists it, or its type IRI. `--index` names that `catalog.json` (default: the first node in `node.yaml`, else datamodels.jp). In a terminal, `extend` without arguments lets you pick the model from a list and asks for the new name.

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

Add each attribute in three places; the example is the `RoadPatrol` made with `add`. In `models/road/RoadPatrol/schema.json`, under `properties`, with its IRI in `x-iri`:

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
