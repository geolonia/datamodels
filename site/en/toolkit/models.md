---
title: Your site's models
description: Look for an existing model with the search command of datamodels-toolkit, add models to your own site with add and extend, and write their attributes
---

# Your site's models

This page adds models to a subject of your node and writes their attributes. No node yet? Start with [Starting a site](/en/toolkit/start).

## Look for an existing model first {#search}

Before you make a new model, check whether one already exists that you can use as it is or extend. `search` looks through the models of datamodels.jp and of the sites it links to, for words in the type name, title, attributes and description. It finds Japanese and English words.

```bash
npx github:geolonia/datamodels-toolkit#v0.3.7 search 避難
npx github:geolonia/datamodels-toolkit#v0.3.7 search road closure --json
```

The result of the first command, shortened:

```text
disaster/DesignatedShelter  指定避難所 / Designated shelter  Geolonia Inc.  https://datamodels.jp/models/disaster/DesignatedShelter/
disaster/EvacuationShelter  避難所の運用状況 / Evacuation shelter operation  Geolonia Inc.  https://datamodels.jp/models/disaster/EvacuationShelter/
…
4 of 18 models in 3 node(s) match
```

Each line is one model: its subject and type, its titles, the site (the name of its publisher), and its page. The best 10 are listed; `--limit` changes the number. With `--json`, the output also has the type IRI, version, schema, `@context` and index (`catalog.json`) of each model; use it from scripts and AI agents.

`nodes` lists the sites it can reach, with their name, address, licence, number of models, and the site that links to them:

```bash
npx github:geolonia/datamodels-toolkit#v0.3.7 nodes
```

```text
Geolonia Inc.  https://datamodels.jp/  CC0-1.0  16 models
GTT Project  https://models.gtt-project.org/  CC0-1.0  1 model  (linked from Geolonia Inc.)
Geolonia  https://models.geolonia.com/  CC0-1.0  1 model  (linked from Geolonia Inc.)
3 node(s) within 1 link(s) of https://datamodels.jp/catalog.json
```

Both commands can start at another site's `catalog.json` with `--index`, and follow more or fewer links with `--depth` (default 1).

To build on a model you found, use [extend](#extend).

## A new model {#add}

```bash
npx github:geolonia/datamodels-toolkit#v0.3.7 add road/RoadPatrol
```

This adds `models/road/RoadPatrol/` with `schema.json`, `catalog.yaml` and `examples/example.json`, and the type `RoadPatrol` to the subject's `@context`. Then [write its attributes](#attributes).

## Starting from a catalog model {#extend}

To start from a model of this catalog instead, use `extend`. It copies the catalog model's schema, imports its `@context` and records the model it builds on, so `check` keeps its names and meanings. Then add your attributes as [below](#attributes). With `--subclass`, the new model is a subtype with its own IRI.

```bash
npx github:geolonia/datamodels-toolkit#v0.3.7 extend task/Task road/RoadTask
```

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
