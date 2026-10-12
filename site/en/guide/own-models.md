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

- Steps: the [Toolkit](/en/toolkit/) section, starting with [Starting a site](/en/toolkit/start).
- An example: [models.gtt-project.org](https://models.gtt-project.org/), the models of the GTT plugin for Redmine.

A model on your site can build on a model of this catalog ([`extend`](/en/toolkit/models#extend)). It names the model it extends, and the toolkit checks that it keeps that model's names and meanings.

<svg class="flow-diagram" viewBox="0 0 460 216" role="img" aria-label="datamodels.jp publishes the catalog's models and the list of data model sites. Issue on models.gtt-project.org builds on the catalog's Task. A model on your own site can build on a catalog model too. Every site publishes a catalog.json." xmlns="http://www.w3.org/2000/svg"><defs><marker id="site-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box main" x="10" y="8" width="440" height="58" rx="10"/><text class="t" x="230" y="33">datamodels.jp</text><text class="s" x="230" y="53">Catalog models (Task and others) and the list of sites</text><rect class="box" x="10" y="150" width="210" height="58" rx="10"/><text class="t m" x="115" y="175">models.gtt-project.org</text><text class="s" x="115" y="194">Issue, catalog.json</text><rect class="box d" x="240" y="150" width="210" height="58" rx="10"/><text class="t" x="345" y="175">Your site</text><text class="s" x="345" y="194">Your models, catalog.json</text><line class="a" x1="115" y1="150" x2="115" y2="68" marker-end="url(#site-ah)"/><text class="l" x="125" y="104">Issue builds on Task</text><line class="a d" x1="345" y1="150" x2="345" y2="68" marker-end="url(#site-ah)"/><text class="l e" x="335" y="128">can build on it too</text></svg>

## Smart Data Models {#smart-data-models}

[Smart Data Models](https://smartdatamodels.org/) is the catalog of the FIWARE community, run by FIWARE, TM Forum, IUDX and OASC. It has over 900 models for smart cities, agriculture, energy and more, in English, and its own way to contribute on GitHub. It is a good place for a model that is not about Japan. This catalog builds on it ([Other data model catalogs](/en/guide/catalogs)).

## Later: from your site to this catalog {#later}

When a model on your site turns out useful to others in Japan, propose it here like any other model ([Contributing](/en/guide/contribute#model-proposal)). How such a model moves, and what happens to its old IRIs, is not decided yet ([#200](https://github.com/geolonia/datamodels/issues/200)). Until then, data that uses your site's IRIs keeps working: your site stays where it is.
