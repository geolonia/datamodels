---
title: Versions
description: With datamodels-toolkit, change a published model in a new version, keep the old version online, and move to a newer toolkit
---

# Versions

A published version must not change: data that names its `@context` relies on it. `check` compares the files with the published ones and fails when a published file would change.

## Changing a model later {#bump}

Before you change anything, start the next version with `bump`. It keeps the published version online (its `@context`, vocabulary and schemas go into `models/road/releases/`), then raises the subject's `version` in `subject.yaml` and the version in its schema URLs (`$id`, and `$ref` between the subject's models). It refuses when the files differ from the published ones. Commit the result.

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

The first thing `bump` does, keeping the version, is also a command of its own: `release`. It saves the current version into `models/road/releases/` and does not raise the version. Run it once a version is published, before you change its sources, and commit the result. `check` notes a published version that is not saved yet. `build` publishes every saved version next to the current one. A saved version is kept as it is.

Online, `release` first compares the files with the published ones. When the sources changed after publishing, it refuses: restore them (for example with git), release, and then make the change in a new version.

```bash
npx @geolonia/datamodels@0.3.10 release road
```

## How a published version is kept {#never-changes}

The release snapshots in `models/<subject>/releases/vX.Y.Z/`, written by `release` and `bump`, hold the bytes of every published version: they are the record of what was published. Three checks guard them:

- `build` and `check` stop when the sources of the released current version differ from its snapshot.
- Online, `check` compares each exact version with the file the site serves.
- `check --base <git ref>` compares the snapshots with a git ref, usually the branch that a pull request goes into. A snapshot file that changed or is gone is a problem; a new snapshot is fine. This works offline, and also sees a version that was removed, which the site cannot show.

`--all-released` also requires a snapshot of each subject's current version. It is for a catalog that releases a version before it publishes it, as datamodels.jp does. Without it, `check` only notes a published version that has no snapshot. In a pull request, fetch the base branch first:

```bash
git fetch origin main
npx @geolonia/datamodels@0.3.10 check --base origin/main --all-released
```

### Before the launch {#prerelease}

Before an official launch, `prerelease: true` in `node.yaml` lets you correct published versions in place: delete the subject's snapshot, change the sources, and run `release <subject> --offline`. A version that should not have been published can be removed as a whole: delete its folder under `releases/`. A release folder without its `context.jsonld` stops the build: a version is removed with its folder, not file by file.

While the flag is true both in the base branch and in the change, `check --base` notes the corrections and removals instead of failing, in the snapshots and online. Without `--base`, `check` cannot see the base branch, so a changed published file stays a problem.

The base branch decides. Once it has the flag, a change may not remove it, or set it from `false` back to `true`. So after the launch (`prerelease: false`), published versions are fixed for good.

## Moving to a newer toolkit {#upgrade}

To move the node to a newer toolkit, run `upgrade` and commit: it changes the version in the workflow and in the Markdown files at the top of the node, such as the README, to the latest release (or the one given with `--to`). Dependabot also proposes new releases.

```bash
npx @geolonia/datamodels@0.3.10 upgrade
```

`upgrade` reads the release from the GitHub API. In `.github/workflows/`, it pins the Action to the release's commit SHA, with the tag as a comment. An `npx` line that ran the toolkit from GitHub (`npx github:geolonia/datamodels-toolkit#vX.Y.Z`) becomes the npm form (`npx @geolonia/datamodels@X.Y.Z`).
