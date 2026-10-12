---
title: Toolkit
description: With datamodels-toolkit, publish your own data models with fixed URLs on a site of your own, convert CSV lists into models, and export models for other tools
---

# Toolkit

[datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) is an open-source command-line tool and GitHub Action. The command is `datamodels`. With it you can:

- Publish your own data models with fixed URLs on a site of your own, a node. The site has `catalog.json`, the `@context`, JSON Schemas, a vocabulary, examples, and a page for every type and attribute. An example: [models.gtt-project.org](https://models.gtt-project.org/), the models of the GTT plugin for Redmine. Other sites: [Data model sites](/en/guide/sites).
- Convert a CSV list into entities of a model of this catalog.
- Export a model as files for a spreadsheet, an AI model or PostgreSQL.

Not sure yet whether you need a site of your own? See [Your own data models](/en/guide/own-models).

## Running it {#run}

You need [Node.js](https://nodejs.org/) 24 or later. The commands run a release of the npm package [`@geolonia/datamodels`](https://www.npmjs.com/package/@geolonia/datamodels) with `npx`; there is nothing to install. In a project of your own, `npm install --save-dev @geolonia/datamodels@0.3.10` adds it, and `npx datamodels …` runs it. Releases before 0.3.8 are not on npm and run from GitHub.

```bash
npx @geolonia/datamodels@0.3.10 --help
```

The first time, `npx` asks before it downloads the package (`Need to install the following packages: … Ok to proceed? (y)`): answer `y`.

The examples in this section use this release. All commands and options are in `--help` and the [README](https://github.com/geolonia/datamodels-toolkit/tree/v0.3.8#readme). This section explains them task by task.

## Pages {#pages}

### Publish your site {#publish}

- [Starting a site](/en/toolkit/start): start a node with `init`, and publish it on GitHub Pages and your own domain.
- [Your site's models](/en/toolkit/models): look for an existing model with `search`, add models with `add` and `extend`, and write their attributes.
- [Checking and building](/en/toolkit/check): `check`, `build`, and the GitHub Action that publishes.
- [Versions](/en/toolkit/versions): change a published model with `bump`, and move to a newer toolkit with `upgrade`.

### Your data {#data}

- [Converting your data](/en/toolkit/convert): convert a CSV list into entities of a model with `convert`, using a standard's mapping file, a mapping of your own made with `mapping`, or the CSV template.
- [Exporting to other tools](/en/toolkit/export): make a CSV template, a Table Schema, a structured output schema for AI and a PostgreSQL / PostGIS table from a model with `export`.
