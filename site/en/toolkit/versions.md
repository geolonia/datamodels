---
title: Versions
description: With datamodels-toolkit, change a published model in a new version, keep the old version online, and move to a newer toolkit
---

# Versions

A published version must not change: data that names its `@context` relies on it. `check` compares the files with the published ones and fails when a published file would change.

## Changing a model later {#bump}

Before you change anything, start the next version with `bump`. It keeps the published version online (its `@context`, vocabulary and schemas go into `models/road/releases/`), then raises the subject's `version` in `subject.yaml` and the version in its schema URLs (`$id`, and `$ref` between the subject's models). It refuses when the files differ from the published ones. Commit the result.

```bash
npx @geolonia/datamodels@0.3.15 bump road minor
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

When the version already has a snapshot, `release` compares the sources with it instead, and changes nothing. Otherwise, online, `release` first compares the files with the published ones. When the sources changed after publishing, it refuses: restore them (for example with git), release, and then make the change in a new version. A file it cannot read also stops it, unless the site answers 404 (not published).

```bash
npx @geolonia/datamodels@0.3.15 release road
```

## How a published version is kept {#never-changes}

The release snapshots in `models/<subject>/releases/vX.Y.Z/`, written by `release` and `bump`, hold the bytes of every published version: they are the record of what was published.

<svg class="flow-diagram" viewBox="0 0 460 250" role="img" aria-label="The snapshot in models/road/releases/v1.0.0/ is copied byte for byte to /context/road/v1.0.0.jsonld on the site. The sources in models/road/, at the current version v1.1.0, are built to /context/road/v1.1.0.jsonld. Once v1.1.0 is released, its snapshot releases/v1.1.0/ is written, and the sources are checked against it." xmlns="http://www.w3.org/2000/svg"><defs><marker id="rel-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="10" y="8" width="210" height="56" rx="10"/><text class="t m" x="115" y="32">releases/v1.0.0/</text><text class="s" x="115" y="52">a released version (snapshot)</text><rect class="box d" x="240" y="8" width="210" height="56" rx="10"/><text class="t m" x="345" y="32">releases/v1.1.0/</text><text class="s" x="345" y="52">once v1.1.0 is released</text><line class="a d" x1="345" y1="64" x2="345" y2="96"/><text class="l e" x="335" y="84">checked against</text><rect class="box" x="240" y="96" width="210" height="56" rx="10"/><text class="t m" x="345" y="120">models/road/</text><text class="s" x="345" y="140">the sources, current v1.1.0</text><line class="a" x1="115" y1="64" x2="115" y2="182" marker-end="url(#rel-ah)"/><text class="l" x="125" y="128">byte for byte</text><line class="a" x1="345" y1="152" x2="345" y2="182" marker-end="url(#rel-ah)"/><text class="l" x="355" y="172">build</text><rect class="box main" x="10" y="184" width="440" height="58" rx="10"/><text class="t" x="230" y="208">On the site</text><text class="s" x="115" y="228">/context/road/v1.0.0.jsonld</text><text class="s" x="345" y="228">/context/road/v1.1.0.jsonld</text></svg>

Three checks guard them:

- `build` and `check` stop when the sources of the released current version differ from its snapshot.
- Online, `check` compares each exact version with the file the site serves.
- `check --base <git ref>` compares the snapshots with a git ref, usually the branch that a pull request goes into. A snapshot file that changed or is gone is a problem; a new snapshot is fine. This works offline, and also sees a version that was removed, which the site cannot show.

`--all-released` also requires a snapshot of each subject's current version. It is for a catalog that releases a version before it publishes it, as datamodels.jp does. Without it, `check` only notes a published version that has no snapshot. In a pull request, fetch the base branch first:

```bash
git fetch origin main
npx @geolonia/datamodels@0.3.15 check --base origin/main --all-released
```

### Before the launch {#prerelease}

Before an official launch, `prerelease: true` in `node.yaml` lets you correct published versions in place: delete the subject's snapshot, change the sources, and run `release <subject> --offline`. An earlier version that should not have been published can be removed as a whole: delete its folder under `releases/`. The current version is always built from the sources, so it stays online. A release folder without its `context.jsonld` stops the build: a version is removed with its folder, not file by file.

While the flag is true both in the base branch and in the change, `check --base` notes the corrections and removals instead of failing, in the snapshots and online. Without `--base`, `check` cannot see the base branch, so a changed published file stays a problem.

The base branch decides. Once it has the flag, a change may not remove it, or set it from `false` back to `true`. So after the launch (`prerelease: false`), published versions are fixed for good.

## Moving to a newer toolkit {#upgrade}

To move the node to a newer toolkit, run `upgrade` and commit: it changes the version in the workflow and in the Markdown files at the top of the node, such as the README, to the latest release (or the one given with `--to`). Dependabot also proposes new releases.

```bash
npx @geolonia/datamodels@0.3.15 upgrade
```

`upgrade` reads the release from the GitHub API. In `.github/workflows/`, it pins the Action to the release's commit SHA, with the tag as a comment. An `npx` line that ran the toolkit from GitHub (`npx github:geolonia/datamodels-toolkit#vX.Y.Z`) becomes the npm form (`npx @geolonia/datamodels@X.Y.Z`). This holds for v0.3.8 and later; with an older `--to`, the lines get the GitHub form.
