---
title: Checking and building
description: Check and build a node with the check and build commands of datamodels-toolkit, and publish it with the GitHub Action
---

# Checking and building

```bash
npx @geolonia/datamodels@0.3.15 check
npx @geolonia/datamodels@0.3.15 build
```

`check` validates every schema and example. On GitHub, the workflow runs the same check on every pull request.

For a node that is not online yet, `check` cannot compare the published files, so it notes that. This is not a problem, and the exit code is 0:

```text
  note: https://models.example.org/context/road/v0.1.0.jsonld: not reachable (ENOTFOUND), not compared
  …
.: ok
```

`build` writes the site into `_site/`. Open `_site/index.html` in a browser to look at the front page. The links between the pages start with the base URL, though, so only the front page opens from your computer.

## What check checks {#checks}

- Every schema compiles, and every `examples/example.json` is valid against its schema. A model has one example: `example.json`, and `example-normalized.jsonld` in the normalized form. Any other file in `examples/` is not read, published or checked; `check` notes it.
- In `schema.json`, the `const` of `type` is the model's folder name, `$id` is where the build publishes the schema, `x-version` (when there is one) is the subject's version, and each `x-ngsi.type` is `Property`, `Relationship`, `GeoProperty`, `JsonProperty` or `VocabProperty`.
- `example.json` is checked without the `{"json": …}` and `{"vocab": …}` wrappers that a `JsonProperty` and a `VocabProperty` keep in the key-values form: the schema describes the value inside. The example of an entity type is also checked with an `@context` (the alias URL, and the exact URL with the NGSI-LD core context): data may carry one, so the schema must accept it. In both examples, Polygon rings close (RFC 7946).
- `example-normalized.jsonld`, when there is one, follows the schema. Each attribute has the schema's `x-ngsi.type` (`Property` without one), and several instances only with `x-ngsi.multi`. A date or date-time value carries `"@type": "Date"` or `"DateTime"`. Its `id` and `vocab` values are those of `example.json`, and its key-values form is valid. Its `@context` is a list with the alias URL of the subject's major version (for example `v1.jsonld`).
- A JSON-LD processor expands `example-normalized.jsonld`: each attribute to its IRI, the type to the model's type IRI, and a `vocab` value to a defined IRI. Nothing is lost when it is compacted again. The example of a value type is tried as the value of an attribute, and the vocabulary must expand too. The node's own @contexts come from the build, also offline, and the NGSI-LD core context v1.8 comes with the toolkit. Any other context is read online, and only noted when it cannot be read.
- Every entity type and attribute is a term of the subject's `@context` (or an NGSI-LD core term such as `location`), and expands to the IRI in the schema (`x-iri`). Otherwise JSON-LD drops the attribute, or gives it another meaning. A term from a context imported by URL is checked online; offline it is only noted.
- Each mapping file (`mapping/*.yaml`) has the form of a [mapping file](/en/guide/mapping): a `standard` with a `name` (and optionally `url`, `license`, `note`), and for each field a row with `to` (`null` when the standard has no such item) and an optional `note`. Its texts are in the node's languages. A key that is not a language tag is a text that YAML cut at a comma: quote it.
- The [conversion rules](/en/guide/mapping#convert) of a mapping file are checked as `convert` applies them. `via` names another mapping file of the node (`<subject>/<Type>/<name>`), and the files that `via` connects do not form a circle. A row for a position in an array (`coordinates[2]`) only documents it. Unknown keys are reported, so a typo does not go unseen.
- The release snapshot of the current version holds exactly what the sources produce. Every snapshot, the current version's included, is compared with the files online, and with a git ref by `--base`: a version that is already online is served unchanged ([How a published version is kept](/en/toolkit/versions#never-changes)).
- A model does not redefine a term of a model it `extends`: the same name keeps the same IRI.

The exit code is 1 on a problem. Another node that cannot be reached, or does not answer within 20 seconds, is only noted: a node that is down never fails someone else's check. `--offline` skips the published files, the extended models and the schemas on other sites.

`check` reads other nodes' files only over https from public hosts. An address in your node's own files that cannot be read this way is a problem (exit code 1). When a redirect leads to such an address, or the host name points to a private address, it is only noted. So is an address that comes from another node's files.

## GitHub Action {#action}

The workflow that `init` writes (`.github/workflows/publish.yml`) uses the toolkit's GitHub Action. The Action runs `check` and `build` and publishes the node on GitHub Pages. On a pull request it only checks and builds; every push to `main` publishes ([Publish on GitHub Pages](/en/toolkit/start#publish)).

```yaml
# .github/workflows/publish.yml
name: Publish
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions: {}

jobs:
  check:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@<SHA> # vX.Y.Z
        with:
          persist-credentials: false
      - uses: geolonia/datamodels-toolkit@<SHA> # vX.Y.Z
        with:
          deploy: 'false'

  publish:
    if: github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.node.outputs.page_url }}
    concurrency:
      group: pages
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@<SHA> # vX.Y.Z
        with:
          persist-credentials: false
      - id: node
        uses: geolonia/datamodels-toolkit@<SHA> # vX.Y.Z
```

The workflow pins each Action to the commit SHA of a release, with the tag as a comment (`<SHA> # vX.Y.Z` above). Move to a newer toolkit with [`upgrade`](/en/toolkit/versions#upgrade); Dependabot also proposes new releases.

The Action has three inputs:

- `directory`: the folder with `node.yaml` and `models/` (default `.`).
- `deploy`: `'false'` to only check and build (default `'true'`).
- `offline`: `'true'` to check without the network (default `'false'`).

The Action's outputs are `page_url`, the address of the published site, and `site`, the folder with the built files, for a step that publishes them on another host (since v0.3.7).
