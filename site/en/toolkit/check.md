---
title: Checking and building
description: Check and build a node with the check and build commands of datamodels-toolkit, and publish it with the GitHub Action
---

# Checking and building

```bash
npx github:geolonia/datamodels-toolkit#v0.3.8 check
npx github:geolonia/datamodels-toolkit#v0.3.8 build
```

`check` validates every schema and example. On GitHub, the workflow runs the same check on every pull request.

For a node that is not online yet, `check` cannot compare the published files, so it notes that. This is not a problem, and the exit code is 0:

```text
  note: https://models.example.org/context/road/v0.1.0.jsonld: not reachable (ENOTFOUND), not compared
  …
.: ok
```

`build` writes the site into `_site/`. Open `_site/index.html` in a browser to look at the front page. The links between the pages start with the base URL, though, so only the front page opens from your computer.

## GitHub Action {#action}

The workflow that `init` writes (`.github/workflows/publish.yml`) uses the toolkit's GitHub Action. The Action runs `check` and `build` and publishes the node on GitHub Pages. On a pull request it only checks and builds; every push to `main` publishes ([Publish on GitHub Pages](/en/toolkit/start#publish)).

The workflow pins the Action to a release. Move to a newer one with [`upgrade`](/en/toolkit/versions#upgrade); Dependabot also proposes new releases.
