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

You need [Node.js](https://nodejs.org/) 24 or later. The commands run a release from GitHub with `npx`; there is nothing to install.

```bash
npx github:geolonia/datamodels-toolkit#v0.3.8 --help
```

The first time, `npx` asks before it downloads the package (`Need to install the following packages: … Ok to proceed? (y)`): answer `y`.

The examples in this section use this release. This section explains them task by task. Every command and option is in `--help` and the [Command reference](/en/toolkit/reference).

## Pages {#pages}

### Publish your site {#publish}

- [Starting a site](/en/toolkit/start): start a node with `init`, and publish it on GitHub Pages and your own domain.
- [Your site's models](/en/toolkit/models): look for an existing model with `search`, add models with `add` and `extend`, and write their attributes.
- [Checking and building](/en/toolkit/check): `check`, `build`, and the GitHub Action that publishes.
- [Versions](/en/toolkit/versions): change a published model with `bump`, and move to a newer toolkit with `upgrade`.
- [Other hosts](/en/toolkit/hosts): publish a node on Cloudflare Pages, Netlify or another static host.

### Your data {#data}

- [Converting your data](/en/toolkit/convert): convert a CSV list into entities of a model with `convert`, using a standard's mapping file, a mapping of your own made with `mapping`, or the CSV template.
- [Exporting to other tools](/en/toolkit/export): make a CSV template, a Table Schema, a structured output schema for AI and a PostgreSQL / PostGIS table from a model with `export`.

### Reference {#reference}

- [Command reference](/en/toolkit/reference): every command with its arguments, options, defaults and exit codes.
- [The node and build](/en/toolkit/node): what a node holds, `node.yaml`, and what `build` writes.
