---
title: Your own data models
description: Where to publish a data model that does not belong in this catalog, on your own site or in Smart Data Models
---

# Your own data models

This catalog is for models that many organisations in Japan share. Many good models are not like that:

- The model is only for one project or one organisation.
- You are not sure yet, and want to try the model in real work first.
- The model has nothing to do with Japan or Japanese standards.

Such a model still needs what the catalog gives its models: a fixed URL for the `@context`, a JSON Schema, and IRIs that open a description. This page shows where to put it.

## Which place fits {#where}

| | This catalog | Your own site | Smart Data Models |
|---|---|---|---|
| For | Models many organisations in Japan share | Your project or organisation | The FIWARE community worldwide |
| Who decides | A small group, in issues and pull requests ([Contributing](/en/guide/contribute)) | You | The Smart Data Models maintainers |
| Languages | Japanese and English | Your choice; one is enough | English |
| Address | datamodels.jp | Your domain | smartdatamodels.org |

Not sure? Start on your own site. You can propose a model to this catalog later ([below](#later)).

Only missing a few attributes in a model of this catalog? Then you need no model of your own: see [Adding attributes](/en/guide/extend).

## Your own site {#own-site}

Your own site publishes the same kinds of files as this catalog: `catalog.json`, the `@context` of each version, JSON Schemas, a vocabulary, examples, and a page for every type and attribute, so every IRI opens its description. Such a site is called a node.

A node is static files. GitHub Pages hosts it for free, and you need no server. The [datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) makes the files and the workflow that publishes them.

- Steps: [Publishing on your own site](/en/guide/own-site).
- An example: [models.geolonia.com](https://models.geolonia.com), the models of Geolonia projects.

A model on your site can build on a model of this catalog ([`extend`](/en/guide/own-site#add)). It names the model it extends, and the toolkit checks that it keeps that model's names and meanings.

## Smart Data Models {#smart-data-models}

[Smart Data Models](https://smartdatamodels.org/) is the catalog of the FIWARE community, run by FIWARE, TM Forum, IUDX and OASC. It has over 900 models for smart cities, agriculture, energy and more, in English, and its own way to contribute on GitHub. It is a good place for a model that is not about Japan. This catalog builds on it ([Other data model catalogs](/en/guide/catalogs)).

## Later: from your site to this catalog {#later}

When a model on your site turns out useful to others in Japan, propose it here like any other model ([Contributing](/en/guide/contribute)). How such a model moves, and what happens to its old IRIs, is not decided yet ([#200](https://github.com/geolonia/datamodels/issues/200)). Until then, data that uses your site's IRIs keeps working: your site stays where it is.
