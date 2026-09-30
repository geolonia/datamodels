---
title: Versions and deprecation
description: How subjects are versioned, how deprecation works, and the stages of a model
---

# Versions and deprecation

Published URLs never change ([URLs that never change](/en/guide/urls)). This page describes how the models change while keeping that promise.

## One version per subject

Versions are per subject: its `@context`, vocabulary and every JSON Schema of the subject share one number (for example `transportation` 1.0.0). Numbers follow [Semantic Versioning](https://semver.org/).

| Change | Number | Example |
|---|---|---|
| A fix that changes neither meaning nor validation | patch (1.0.**1**) | a typo in a schema description |
| A compatible addition | minor (1.**1**.0) | a new optional attribute or model, a new allowed value |
| An incompatible change | major (**2**.0.0) | renaming an attribute or changing its type, removing an attribute or a value, making an optional attribute required |

A new allowed value is a minor version, but consumers that handle every value need to learn it, so the pull request and the model's notes (`notes.yaml`) say so. The **meaning** of an attribute never changes; a different meaning is a new attribute with a new IRI.

## Old versions stay

A new version does not replace the old files: `v1.0.0.jsonld` and `v1.0.0.json` stay published at the same URLs. An alias such as `v1.jsonld` points at the latest version of that major. Stored data references the alias ([URLs that never change](/en/guide/urls)): within a major version an attribute's meaning never changes, so data only gains new attributes. The exact version is for audits and for reproducing a result.

## Deprecating attributes

An attribute that is being replaced is marked `x-deprecated` in the schema and shown as deprecated on the model page. It stays at least until the next minor version and is removed only in the next major version.

## Following new editions of a standard {#standard-revisions}

A mapping file (`mapping/*.yaml`) names the edition of the standard it follows (for example the 20260801 edition of the 自治体標準オープンデータセット, or version 1.1 of EEI). When a standard publishes a new edition, maintainers update the mapping to it. Mapping files are not versioned published files, so that alone changes no version number. If the model itself has to change for the new edition, the table above applies: added attributes or values are a minor version, changed or removed ones a major version. There is no fixed deadline for following a new edition.

## Stages of a model

| Stage | Meaning |
|---|---|
| proposal | an [issue](https://github.com/geolonia/datamodels/issues/new?template=model-proposal.yml); not in the catalog yet |
| draft | in the catalog and validated, but may still change |
| stable | two implementations from different organisations are recorded in `ADOPTERS.yaml` (checked by CI and a reviewer) |
| deprecated | should not be used for new work; stays published with unchanged URLs. A replacement goes in `supersededBy` in `catalog.yaml` and is shown on the page and in `catalog.json` |

New subjects, major versions and promotions to stable are decided by a small group. See [CONTRIBUTING.md](https://github.com/geolonia/datamodels/blob/main/CONTRIBUTING.md).

## Pre-release for now

Until the official launch, the current version of each subject (1.0.0) may be corrected in place without a new number. A pull request that does so gets a list of the changed published files from CI. At the launch, `prerelease` in `published-manifest.json` becomes `false`: from then on published files cannot change at all, and changes become new versions as in the table above.
