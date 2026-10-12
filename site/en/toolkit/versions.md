---
title: Versions
description: With datamodels-toolkit, change a published model in a new version, keep the old version online, and move to a newer toolkit
---

# Versions

A published version must not change: data that names its `@context` relies on it. `check` compares the files with the published ones and fails when a published file would change.

## Changing a model later {#bump}

Before you change anything, start the next version with `bump`. It keeps the published version online (its `@context`, vocabulary and schemas go into `models/road/releases/`), then raises the subject's `version` in `subject.yaml` and the version in its schema URLs. It refuses when the files differ from the published ones. Commit the result.

```bash
npx @geolonia/datamodels@0.3.10 bump road minor
```

For a node that is not online yet, there is nothing to compare with, so `bump` and `release` stop:

```text
road v0.1.0: nothing released, the published files could not be compared:
  https://models.example.org/context/road/v0.1.0.jsonld: ENOTFOUND
  …
Try again when the site answers, or release with --offline to skip the comparison.
```

In that case, add `--offline` to keep the version without the comparison (`bump road minor --offline`).

Then make the change. The site has both versions; see [URLs and versions](/en/guide/urls#versions) for which level (`patch`, `minor`, `major`) fits a change.

## Only keeping a version {#release}

The first thing `bump` does, keeping the version, is also a command of its own: `release`. It saves the current version into `models/road/releases/` and does not raise the version. Run it once a version is published, before you change its sources, and commit the result. `check` notes a published version that is not saved yet.

```bash
npx @geolonia/datamodels@0.3.10 release road
```

## Moving to a newer toolkit {#upgrade}

To move the node to a newer toolkit, run `upgrade` and commit: it changes the version in the workflow and in the Markdown files at the top of the node, such as the README, to the latest release (or the one given with `--to`). Dependabot also proposes new releases.

```bash
npx @geolonia/datamodels@0.3.10 upgrade
```
