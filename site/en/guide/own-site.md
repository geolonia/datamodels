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
npx github:geolonia/datamodels-toolkit#v0.3.1 init my-models
cd my-models
```

`init` asks a few questions:

- **Base URL:** where the node will be, for example `https://models.example.org`. It is part of every IRI the node publishes, so **choose it once**: you cannot change it after you publish. A `https://<account>.github.io/<repository>` address works too, but then your IRIs depend on the name of your GitHub account. For IRIs that outlive the domain, use a [w3id.org address](#w3id).
- **Languages:** for example `ja,en`. One is enough.
- **Publisher:** your organisation's name and website.
- **Licence:** `CC0-1.0` lets anyone use the models without conditions, like this catalog.
- **The first subject:** a group of models that share one `@context`, for example `road`. Its name is part of the IRIs too.

It writes `node.yaml` (the settings), `models/road/` (the subject), a README, `LICENSE`, the workflow that publishes the node, and a Dependabot configuration that proposes new toolkit releases. In an existing repository, it adds only the files that are missing.

With the [GitHub CLI](https://cli.github.com/) (`gh`), add `--github my-org/my-models`: `init` then also creates that public repository, pushes the files and turns on GitHub Pages ([step 4](#publish)).

## 2. Add a model {#add}

```bash
npx github:geolonia/datamodels-toolkit#v0.3.1 add road/RoadPatrol
```

To start from a model of this catalog instead, use `extend`. It copies the catalog model's schema, imports its `@context` and records the model it builds on, so `check` keeps its names and meanings. Then add your attributes as below. With `--subclass`, the new model is a subtype with its own IRI.

```bash
npx github:geolonia/datamodels-toolkit#v0.3.1 extend task/Task road/RoadTask
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
npx github:geolonia/datamodels-toolkit#v0.3.1 check
npx github:geolonia/datamodels-toolkit#v0.3.1 build
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

## 6. A permanent address (optional) {#w3id}

Your IRIs contain your domain, so they last as long as you keep the domain. If the models may outlive it (a project that ends, a team that moves), take an address from [w3id.org](https://w3id.org/), a free redirect service run by the W3C Permanent Identifier Community Group. `https://w3id.org/<name>/` forwards to wherever the node is; when the node moves, only the redirect changes.

Decide before you publish: the base URL is part of every IRI.

1. Choose a name: lower-case letters, digits and hyphens, not a generic word, for example `my-org-models`.
2. Open a pull request to [perma-id/w3id.org](https://github.com/perma-id/w3id.org) that adds `ids/my-org-models/.htaccess` with your contact and the redirect:

   ```apache
   # # /my-org-models/
   #
   # https://w3id.org/my-org-models/ redirects to https://models.example.org/
   #
   # ## Contact
   # This space is administered by:
   #
   # Your Name
   # you@example.org
   # GitHub username: your-account

   RewriteEngine on
   RewriteRule ^(.*)$ https://models.example.org/$1 [R=302,L]
   ```

   The rule keeps the path, so `https://w3id.org/my-org-models/ns/road` opens `https://models.example.org/ns/road`, and every IRI and file of the node works through it. Use 302, not 301: browsers keep a 301 forever, so you could not move the node later. Read [Creating an identifier](https://w3id.org/docs/guides/create-an-id) before you open the pull request.
3. In [step 1](#init), give `https://w3id.org/my-org-models` as the base URL. The site itself stays on GitHub Pages at your domain ([steps 4](#publish) and [5](#domain)); every link and IRI the node publishes goes through w3id.org.

Hash IRIs work through the redirect: the part after `#` stays in the browser, so `https://w3id.org/my-org-models/ns/road#RoadPatrol` opens the right row of the page.

## Changing a model later {#versions}

A published version must not change: data that names its `@context` relies on it. `check` compares the files with the published ones and fails when a published file would change.

Before you change anything, start the next version with `bump`. It keeps the published version online (its `@context`, vocabulary and schemas go into `models/road/releases/`), then raises the subject's `version` in `subject.yaml` and the version in its schema URLs. It refuses when the files differ from the published ones. Commit the result.

```bash
npx github:geolonia/datamodels-toolkit#v0.3.1 bump road minor
```

Then make the change. The site has both versions; see [URLs and versions](/en/guide/urls#versions) for which level (`patch`, `minor`, `major`) fits a change.

To move the node to a newer toolkit, run `upgrade` and commit: it changes the version in the workflow and the README. Dependabot also proposes new releases.

All commands and options: [datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit#readme).
