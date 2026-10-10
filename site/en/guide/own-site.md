---
title: Publishing on your own site
description: Publish your own data models with fixed URLs on GitHub Pages, with datamodels-toolkit, step by step
---

# Publishing on your own site

This page publishes your own data models on a site of your own, a node: from the first command to your own domain. Not sure yet whether you need one? See [Your own data models](/en/guide/own-models).

The result looks like [models.geolonia.com](https://models.geolonia.com): `catalog.json`, the `@context`, JSON Schemas, a vocabulary, examples, and a page for every type and attribute.

## What you need {#before}

- [Node.js](https://nodejs.org/) 24 or later. The commands run with `npx`; there is nothing to install.
- A GitHub account, for GitHub Pages.
- A domain or subdomain you control, such as `models.example.org` (recommended, [step 5](#domain)).

## 1. Start the node {#init}

```bash
npx github:geolonia/datamodels-toolkit#v0.2.0 init my-models
cd my-models
```

`init` asks a few questions:

- **Base URL:** where the node will be, for example `https://models.example.org`. It is part of every IRI the node publishes, so **choose it once**: you cannot change it after you publish. A `https://<account>.github.io/<repository>` address works too, but then your IRIs depend on the name of your GitHub account.
- **Languages:** for example `ja,en`. One is enough.
- **Publisher:** your organisation's name and website.
- **Licence:** `CC0-1.0` lets anyone use the models without conditions, like this catalog.
- **The first subject:** a group of models that share one `@context`, for example `road`. Its name is part of the IRIs too.

It writes `node.yaml` (the settings), `models/road/` (the subject), a README, and the workflow that publishes the node. In an existing repository, it adds only the files that are missing.

With the [GitHub CLI](https://cli.github.com/) (`gh`), add `--github my-org/my-models`: `init` then also creates that public repository, pushes the files and turns on GitHub Pages ([step 4](#publish)).

## 2. Add a model {#add}

```bash
npx github:geolonia/datamodels-toolkit#v0.2.0 add road/RoadPatrol
```

To start from a model of this catalog instead, use `extend`. It copies the catalog model's schema, imports its `@context` and records the model it builds on, so `check` keeps its names and meanings. Then add your attributes as below. With `--subclass`, the new model is a subtype with its own IRI.

```bash
npx github:geolonia/datamodels-toolkit#v0.2.0 extend task/Task road/RoadTask
```

This adds `models/road/RoadPatrol/` with `schema.json`, `catalog.yaml` and `examples/example.json`, and the type `RoadPatrol` to the subject's `@context`. Then add each attribute in three places. In `models/road/RoadPatrol/schema.json`, under `properties`, with its IRI in `x-iri`:

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

## 3. Check and build {#check}

```bash
npx github:geolonia/datamodels-toolkit#v0.2.0 check
npx github:geolonia/datamodels-toolkit#v0.2.0 build
```

`check` validates every schema and example. `build` writes the site into `_site/`; open `_site/index.html` to look at it. On GitHub, the workflow runs the same check on every pull request.

## 4. Publish on GitHub Pages {#publish}

If you started with `--github`, the repository exists: commit your models and push them.

Otherwise, create an empty repository on GitHub and push the folder to its `main` branch. Then, in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.

From then on, every push to `main` builds the node and publishes it. Until you set up your domain, the site is at `https://<account>.github.io/<repository>/`.

## 5. Your domain {#domain}

1. At your DNS provider, add a CNAME record from your subdomain to `<account>.github.io`, for example `models` → `my-org.github.io`.
2. In **Settings → Pages**, enter the domain under **Custom domain**. When GitHub has its certificate (minutes to an hour), turn on **Enforce HTTPS**.

It is worth [verifying the domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages) for your account or organisation, so nobody else can publish a site on it.

## Changing a model later {#versions}

A published version must not change: data that names its `@context` relies on it. `check` compares the files with the published ones and fails when a published file would change.

Before you change anything, keep the published version online. `release` saves its `@context`, vocabulary and schemas in `models/road/releases/`; commit them. It refuses when the files differ from the published ones.

```bash
npx github:geolonia/datamodels-toolkit#v0.2.0 release road
```

Then make the change, and raise the subject's `version` in `subject.yaml`, as described in [URLs and versions](/en/guide/urls#versions). The site then has both versions.

All commands and options: [datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit#readme).
