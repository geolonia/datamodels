---
title: Checking and building
description: Check and build a node with the check and build commands of datamodels-toolkit, and publish it with the GitHub Action
---

# Checking and building

```bash
npx github:geolonia/datamodels-toolkit#v0.3.5 check
npx github:geolonia/datamodels-toolkit#v0.3.5 build
```

`check` validates every schema and example. `build` writes the site into `_site/`; open `_site/index.html` to look at it. On GitHub, the workflow runs the same check on every pull request.

## GitHub Action {#action}

The workflow that `init` writes (`.github/workflows/publish.yml`) uses the toolkit's GitHub Action. The Action runs `check` and `build` and publishes the node on GitHub Pages. On a pull request it only checks and builds; every push to `main` publishes ([Publish on GitHub Pages](/en/toolkit/start#publish)).

The workflow pins the Action to a release. Move to a newer one with [`upgrade`](/en/toolkit/versions#upgrade); Dependabot also proposes new releases.
