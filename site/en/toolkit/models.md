---
title: Adding models
description: Add models to your own site with the add and extend commands of datamodels-toolkit, and write their attributes
---

# Adding models

This page adds models to a subject of your node and writes their attributes. No node yet? Start with [Starting a site](/en/toolkit/start).

## A new model {#add}

```bash
npx github:geolonia/datamodels-toolkit#v0.3.3 add road/RoadPatrol
```

This adds `models/road/RoadPatrol/` with `schema.json`, `catalog.yaml` and `examples/example.json`, and the type `RoadPatrol` to the subject's `@context`. Then [write its attributes](#attributes).

## Starting from a catalog model {#extend}

To start from a model of this catalog instead, use `extend`. It copies the catalog model's schema, imports its `@context` and records the model it builds on, so `check` keeps its names and meanings. Then add your attributes as [below](#attributes). With `--subclass`, the new model is a subtype with its own IRI.

```bash
npx github:geolonia/datamodels-toolkit#v0.3.3 extend task/Task road/RoadTask
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
