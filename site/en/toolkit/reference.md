---
title: Command reference
description: Every command of datamodels-toolkit (the datamodels command), with its arguments, options, defaults and exit codes
---

# Command reference

Every command of `datamodels`, with its arguments, options, defaults and exit codes, in one place. How to use them, step by step, is on the task pages; each command below links to its page.

Run a command with `npx` ([Running it](/en/toolkit/#run)):

```bash
npx @geolonia/datamodels@0.3.15 search 避難
```

## For every command {#general}

- `datamodels --help` lists the commands. `datamodels <command> --help`, or `datamodels help <command>`, shows the arguments and options of one command.
- `[dir]` is the folder of the node, with `node.yaml` and `models/` ([The node and build](/en/toolkit/node#layout)). The default is the current folder.
- The results go to standard output: the entities of `convert`, the mapping of `mapping`, and the lines of `search` and `nodes`. Notes, repairs, problems and the summary go to standard error.
- An option with a value needs one: an empty value (`--out=`) or a value that starts with `-` is a usage error.

Exit codes:

| Code | Meaning |
|---|---|
| `0` | Done. |
| `1` | The command found a problem, or could not read a file or a site. Each command below says when. |
| `2` | A usage error: an unknown command or option, a missing argument, or an option value in the wrong form. The command prints its usage line. Some values are checked only later, and then the exit code is 1; each command below says which. |

## init {#init}

```text
datamodels init [dir] [options]
```

Starts a node in `dir`: `node.yaml`, the first subject, a README, `.gitignore`, the workflow that publishes the node, a Dependabot configuration and, for CC0-1.0 and CC-BY-4.0, `LICENSE`. A file that exists is kept. Steps: [Starting a site](/en/toolkit/start#init).

| Argument or option | Default | What it is |
|---|---|---|
| `[dir]` | `.` | Where to write the files |
| `--base-url <URL>` | (required) | The base URL of every IRI, such as `https://models.example.org` |
| `--iris <form>` | `hash` | `hash` (`/ns/<subject>#<Term>`) or `slash` (`/ns/<subject>/<Term>`) |
| `--languages <list>` | `en` | The languages of titles and descriptions, comma-separated, the main one first |
| `--publisher <name>` | (required) | Who publishes the node |
| `--publisher-url <URL>` | (required) | The publisher's website |
| `--license <id>` | `CC0-1.0` | The licence of the models, an SPDX identifier |
| `--subject <name>` | (required) | The first subject, in lower-case letters, digits and hyphens, such as `road` |
| `--github <owner/name>` | | Also create the public repository with `gh` (or keep the existing remote) and turn on GitHub Pages |
| `--yes` | | Never ask: use the options and the defaults |

In a terminal, `init` asks for what the options do not give. In CI and scripts, and with `--yes`, it never asks: a missing required option is a usage error (exit code 2). A value that is not valid stops it before it writes anything (exit code 1).

## search {#search}

```text
datamodels search <words...> [options]
```

Finds models by words in their type, title, attributes and description, in an index and the nodes it links to. Steps: [Look for an existing model first](/en/toolkit/models#search).

| Argument or option | Default | What it is |
|---|---|---|
| `<words...>` | | What to look for, in English or Japanese. A word in Latin letters needs 3 letters or more; a Japanese word 2 characters or more, with a kanji or katakana |
| `--index <URL>` | `https://datamodels.jp/catalog.json` | The `catalog.json`, or the address of a node, to start at |
| `--depth <N>` | `1` | How many links to follow from it, 0 to 5. 0 reads only the index |
| `--limit <N>` | `10` | How many models to list |
| `--json` | | Machine-readable output: each model with its type IRI, version, schema, `@context` and index |

Exit code 1 only when the index you start at cannot be read. A linked node that cannot be read is noted and skipped. Words with nothing to search for are a usage error.

## nodes {#nodes}

```text
datamodels nodes [options]
```

Lists the nodes reachable from an index: name, address, licence, number of models, and the node that links to it. Steps: [Look for an existing model first](/en/toolkit/models#search).

| Option | Default | What it is |
|---|---|---|
| `--index <URL>` | `https://datamodels.jp/catalog.json` | The `catalog.json`, or the address of a node, to start at |
| `--depth <N>` | `1` | How many links to follow from it, 0 to 5. 0 reads only the index |
| `--json` | | Machine-readable output |

The exit codes are those of `search`.

## add {#add}

```text
datamodels add <subject>/<Type> [dir] [--value]
```

Adds a model to a subject of the node: `schema.json`, `catalog.yaml`, an example, `notes.yaml`, and the type in the subject's `@context`. Steps: [A new model](/en/toolkit/models#add).

| Argument or option | Default | What it is |
|---|---|---|
| `<subject>/<Type>` | | The new model, such as `road/RoadPatrol`. The subject must exist; the type name is UpperCamelCase (letters and digits) |
| `[dir]` | `.` | The node |
| `--value` | | A value type (a structure used inside attributes, such as an address) instead of an entity type |

Exit code 1, for example, when the subject does not exist, the model exists, or the type name is not valid.

## extend {#extend}

```text
datamodels extend [model] [subject/Type] [dir] [options]
```

Starts a model of this node from a model of another node, such as datamodels.jp's. Steps: [Starting from a catalog model](/en/toolkit/models#extend).

| Argument or option | Default | What it is |
|---|---|---|
| `[model]` | (asked) | The model to extend: `<subject>/<Type>` as in the other node's `catalog.json`, or its type IRI |
| `[subject/Type]` | (asked) | The new model in this node, such as `road/RoadTask` |
| `[dir]` | `.` | The node |
| `--index <URL>` | for a type IRI, its own node's index when that lists it ([below](#type-iri)); else the first node in `node.yaml`, else `https://datamodels.jp/catalog.json` | Another node's `catalog.json` |
| `--subclass` | | A subtype with its own type IRI (`x-subclass-of`), instead of the same type with more attributes (`x-alias-of`) |

In a terminal, `extend` asks for the missing model (from a list) and the new name. Elsewhere, a missing one is a usage error.

`extend` reads the other node's index, schema and example only over https from public hosts. It shows which index it read the model from.

### A model given by its type IRI {#type-iri}

For `extend` and `export`:

- Without `--index`, a model given by its type IRI is looked up first on the node that made the IRI. `export` looks at the models of your node before that.
- That node's index is the part of the IRI before `/ns/`, plus `catalog.json` (https IRIs only).
- If that index cannot be read within 5 seconds (redirects included), or does not list the model, the default index is used.
- So the model of the node that made the IRI wins over an alias with the same IRI in the default index. To use the alias, give `--index`, or `<subject>/<Type>` when the alias is in the default index.
- `export` and `extend` take a model from a catalog only when its type name is UpperCamelCase and its version is x.y.z.

## check {#check}

```text
datamodels check [dir] [options]
```

Runs the checks a node needs before it publishes: schemas, examples, published versions, extended terms. Steps: [Checking and building](/en/toolkit/check).

| Argument or option | Default | What it is |
|---|---|---|
| `[dir]` | `.` | The node |
| `--offline` | | Skip what needs the network: published files, extended models, schemas on other sites |
| `--base <git ref>` | | Compare the release snapshots with a git ref, such as `origin/main` (fetch it first): a published version is never changed or removed |
| `--all-released` | | Require a release snapshot of the current version of every subject |

Exit code 1 on a problem. Another node that cannot be reached, or does not answer within 20 seconds, is only noted. Which versions may change: [Versions](/en/toolkit/versions).

## build {#build}

```text
datamodels build [dir] [--out <dir>]
```

Writes the files the node publishes. What it writes: [The node and build](/en/toolkit/node#build).

| Argument or option | Default | What it is |
|---|---|---|
| `[dir]` | `.` | The node |
| `--out <dir>` | `<dir>/_site` | Where to write the files |

Exit code 1 when the node is not valid: for example a wrong setting in `node.yaml`, or a released version whose sources changed.

## release {#release}

```text
datamodels release <subject> [dir] [--offline]
```

Keeps the current version of a subject online: a snapshot of its `@context`, vocabulary and schemas in `models/<subject>/releases/vX.Y.Z/`. Steps: [Only keeping a version](/en/toolkit/versions#release).

| Argument or option | Default | What it is |
|---|---|---|
| `<subject>` | | The subject, such as `road` |
| `[dir]` | `.` | The node |
| `--offline` | | Do not compare the snapshot with the published files |

When the version already has a snapshot, `release` compares the sources with it and changes nothing. Exit code 1 when the sources differ from the snapshot or from the published files, or when a published file cannot be read (an HTTP error other than 404, which means not published, or a failed read); `--offline` skips the comparison with the published files.

## bump {#bump}

```text
datamodels bump <subject> <level> [dir] [--offline]
```

Gives a subject a new version. It runs `release` first, then raises `version` in `subject.yaml` and the version in the subject's own schema URLs (`$id`, and `$ref` between its models). Steps: [Changing a model later](/en/toolkit/versions#bump).

| Argument or option | Default | What it is |
|---|---|---|
| `<subject>` | | The subject, such as `road` |
| `<level>` | | `patch`, `minor` or `major`, as in Semantic Versioning: `major` for a change that breaks existing data |
| `[dir]` | `.` | The node |
| `--offline` | | Release without comparing with the published files |

Exit code 1 when the release fails, as for `release`, or the level is not one of the three.

## upgrade {#upgrade}

```text
datamodels upgrade [dir] [--to <vX.Y.Z>]
```

Moves the node to a release of the toolkit. The Action in `.github/workflows/` is pinned to the release's commit SHA, with the tag as a comment. The `npx` lines in the Markdown files at the top of the node run that release; from v0.3.8 on, the older form `npx github:geolonia/datamodels-toolkit#vX.Y.Z` becomes the npm form, and an older release gets the GitHub form. Steps: [Moving to a newer toolkit](/en/toolkit/versions#upgrade).

| Argument or option | Default | What it is |
|---|---|---|
| `[dir]` | `.` | The node |
| `--to <vX.Y.Z>` | the latest release | A release tag, such as `v0.3.9` |

It reads the release from the GitHub API. Exit code 1 when that fails, or the tag is not a release.

## convert {#convert}

```text
datamodels convert <subject>/<Type> <mapping> <file.csv> [options]
```

Turns a list (CSV) into entities of a catalog model, and validates each entity against the model's JSON Schema. Steps: [Converting your data](/en/toolkit/convert).

| Argument or option | Default | What it is |
|---|---|---|
| `<subject>/<Type>` | | The model, as on its page, such as `disaster/EvacuationSite` |
| `<mapping>` | | One of the model's mapping files, by name; a mapping file of your own (a path, or a name that ends in `.yaml` or `.yml`); or `csv-template` for a CSV with the columns of the model's CSV template |
| `<file.csv>` | | The list, in UTF-8 or Shift_JIS |
| `--set <attribute=value>` | | A value the list does not carry. Repeat it for more than one. Only for a field that the mapping fills |
| `--normalized` | key-values | The NGSI-LD normalized form instead of key-values |
| `--out <file.json>` | standard output | Write the entities to a file |
| `--check` | | Convert only the first rows, write nothing, and report what to fix |
| `--rows <N>` | `20` | How many rows `--check` converts |
| `--site <URL\|dir>` | `https://datamodels.jp` | Where to read the catalog, or a folder laid out like the site |

Usage errors: `--rows` without `--check`; `--check` with `--out` or `--normalized`; `--set` without `=`, or with a name that the mapping does not fill.

Exit code 1 when a row is invalid, a file cannot be read, or the mapping cannot be used: a rule the converter cannot apply, or, in a file of your own, a TODO left or an attribute the model does not have. With `--check`, the exit code is 0 only when every checked row is valid and the mapping has no problem.

## mapping {#mapping}

```text
datamodels mapping <subject>/<Type> <file.csv> [options]
```

Writes a first mapping file for your own list (CSV) and a catalog model: a row per attribute, with the column that fits it or a TODO. Steps: [Any other CSV](/en/toolkit/convert#your-own-list).

| Argument or option | Default | What it is |
|---|---|---|
| `<subject>/<Type>` | | The model, as on its page, such as `disaster/EvacuationSite` |
| `<file.csv>` | | The list, in UTF-8 or Shift_JIS |
| `--out <file.yaml>` | standard output | Write to a new file. A file that exists is never overwritten |
| `--site <URL\|dir>` | `https://datamodels.jp` | Where to read the catalog, or a folder laid out like the site |

Exit code 1 when a file or the catalog cannot be read, the model is a value type, or the `--out` file exists.

## export {#export}

```text
datamodels export <subject>/<Type> [dir] --to <adapters> [options]
```

Writes files made from one entity model for other tools. Steps: [Exporting to other tools](/en/toolkit/export).

| Argument or option | Default | What it is |
|---|---|---|
| `<subject>/<Type>` | | The model, such as `disaster/EvacuationSite`, or its type IRI |
| `[dir]` | `.` | A node. Without `--index`, its own model is used when it has one |
| `--to <adapters>` | (required) | One or more of `csv`, `table-schema`, `ai`, `postgis`, comma-separated |
| `--out <dir>` | `.` | Where to write the files, named `<Type>.<ext>` |
| `--index <URL>` | for a type IRI, its own node's index when that lists it ([above](#type-iri)); else the first node in `node.yaml`, else `https://datamodels.jp/catalog.json` | Another node's `catalog.json`, to read the model from. When given, the node is not read; without it, the default is used only when the node does not have the model |

A missing or unknown `--to` is a usage error. Exit code 1 when the model cannot be read or is a value type, or a file cannot be written.
