---
title: Converting your data
description: Convert your own CSV list into entities of a catalog model with the convert command of datamodels-toolkit, in one of three ways - a standard's mapping file, a mapping file of your own, or the CSV template
---

# Converting your data

You can convert your own list (CSV) into entities (NGSI-LD) of a model of this catalog with `convert` from datamodels-toolkit. Every entity is checked against the model's JSON Schema. You need [Node.js](https://nodejs.org/) 24 or later ([Toolkit](/en/toolkit/#run)).

There are three ways, depending on your list:

| Your list | What to do | Mapping file |
|---|---|---|
| Follows a standard (such as the municipal standard open datasets) | [Use the standard's mapping](#standard) | the catalog's |
| Any other CSV | [Make your own mapping](#your-own-list) | your own |
| Not made yet | [Fill in the CSV template](#csv-template) | none |

<svg class="flow-diagram" viewBox="0 0 460 258" role="group" aria-label="Three ways from a list to NGSI-LD entities: a list that follows a standard with the catalog's mapping, any other CSV with your own mapping, the CSV template with no mapping. convert turns each into entities, each checked against the JSON Schema." xmlns="http://www.w3.org/2000/svg"><defs><marker id="cv-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><a href="#standard"><rect class="box" x="10" y="8" width="140" height="56" rx="10"/><text class="t" x="80" y="32">Standard list</text><text class="s" x="80" y="51">e.g. municipal data</text><line class="a" x1="80" y1="64" x2="80" y2="92" marker-end="url(#cv-ah)"/><rect class="box" x="10" y="94" width="140" height="56" rx="10"/><text class="t" x="80" y="118">Catalog mapping</text><text class="s" x="80" y="137">use as it is</text></a><a href="#your-own-list"><rect class="box" x="160" y="8" width="140" height="56" rx="10"/><text class="t" x="230" y="32">Any other CSV</text><text class="s" x="230" y="51">your own list</text><line class="a" x1="230" y1="64" x2="230" y2="92" marker-end="url(#cv-ah)"/><rect class="box" x="160" y="94" width="140" height="56" rx="10"/><text class="t" x="230" y="118">Your mapping</text><text class="s" x="230" y="137">draft with mapping</text></a><a href="#csv-template"><rect class="box" x="310" y="8" width="140" height="56" rx="10"/><text class="t" x="380" y="32">CSV template</text><text class="s" x="380" y="51">a list you start</text><line class="a" x1="380" y1="64" x2="380" y2="92" marker-end="url(#cv-ah)"/><rect class="box" x="310" y="94" width="140" height="56" rx="10"/><text class="t" x="380" y="118">No mapping</text><text class="s" x="380" y="137">column = attribute</text></a><line class="a" x1="80" y1="150" x2="150" y2="190" marker-end="url(#cv-ah)"/><line class="a" x1="230" y1="150" x2="230" y2="190" marker-end="url(#cv-ah)"/><line class="a" x1="380" y1="150" x2="310" y2="190" marker-end="url(#cv-ah)"/><text class="l" x="240" y="176">convert</text><rect class="box main" x="10" y="192" width="440" height="58" rx="10"/><text class="t" x="230" y="216">NGSI-LD entities</text><text class="s" x="230" y="235">each checked against the model's JSON Schema</text></svg>

## Your list follows a standard {#standard}

If your list follows a standard that has a mapping file with conversion rules in the catalog, such as the municipal standard open datasets or the data of the Geospatial Information Authority of Japan (GSI), that mapping file converts it as it is. A mapping file without conversion rules only documents the standard; for such a list, make a mapping of your own (below). [Mapping files](/en/guide/mapping) explains how they work.

```bash
npx @geolonia/datamodels@0.3.10 convert \
  disaster/EvacuationSite jichitai-opendata-site \
  092011_evacuation_space.csv --out sites.json
```

This example converts a municipality's list of designated emergency evacuation sites (指定緊急避難場所一覧, municipal standard open dataset 03) into EvacuationSite entities. The CSV is Utsunomiya City's list, the file that step 1 of the [tutorial](/en/guide/tutorial#data) downloads. The arguments are the model (`<subject>/<Type>`), the name of the mapping file and the CSV file. The model page lists its mapping files under **Referenced standards**, and `catalog.json` lists them as `mappingUrls`.

Only some mapping files have conversion rules (`column`, `transform`). The others describe how the model relates to the standard, and do not convert a list on their own ([which standards have a mapping](/en/guide/rules#mapping)). Then make a mapping of your own, [as below](#your-own-list). Rows with only `to` are documentation too: convert those fields yourself, following the note.

`--set` gives a value that the list does not carry. In GSI's data, for example, the municipality code is only in the file name. The `13101_2.csv` of the example is GSI's file of designated emergency evacuation sites in Chiyoda City ([download](https://hinanmap.gsi.go.jp/hinanjocp/defaultFtpData/csv/13101_2.csv)):

```bash
npx @geolonia/datamodels@0.3.10 convert \
  disaster/EvacuationSite gsi-emergency-site \
  13101_2.csv --set localGovernmentCode=131016
```

The local government code has 6 digits, with the check digit at the end. Given the 5 digits `13101`, `convert` adds the check digit and says so.

## Any other CSV {#your-own-list}

A list that follows no standard needs a mapping of your own: a YAML file that says which column fills which attribute. It has the same form as the catalog's [mapping files](/en/guide/mapping), without `standard`. Keep it with your list; the catalog does not publish it. It converts the next version of the list too.

1. `mapping` writes a first version. Columns that fit are filled in; attributes without a matching column say TODO.
2. Fill in the TODOs: write the column, or delete the row when your list has nothing for it. Also decide how the entities get their ids (`convert.id`).
3. `convert --check` checks the first 20 rows. Fix and check again until they are valid, then check the whole list with `--rows` set to its number of rows.
4. Convert without `--check`. Rows that are still invalid are left out and listed, and the exit code is 1.

```bash
# 1. a first mapping
npx @geolonia/datamodels@0.3.10 mapping \
  disaster/EvacuationSite my-list.csv --out my-list.yaml
# 3. check the first rows
npx @geolonia/datamodels@0.3.10 convert \
  disaster/EvacuationSite my-list.yaml my-list.csv --check
# 4. convert
npx @geolonia/datamodels@0.3.10 convert \
  disaster/EvacuationSite my-list.yaml my-list.csv --out entities.json
```

About the first version that `mapping` writes:

- A column fills an attribute when its name matches the attribute's name (in English or Japanese). The columns that the catalog's mapping files read are clues too. Longitude and latitude columns become the location.
- Every row has a comment of one line, in Japanese when the CSV header is Japanese. No value of your list goes into the file.
- When the header has nearly all the columns of one of the catalog's mapping files, `mapping` says so: try that mapping file first.
- `--out` never overwrites a file.

A value that is the same in every row can go in `value`. Never guess a value that is not in your list. `convert` refuses a mapping that still has a TODO, or that names an attribute the model does not have.

`--check` converts only the first rows (`--rows N`, default 20) and writes no file. On standard error it reports:

- problems of the mapping: TODOs left, attributes the model does not have;
- columns the mapping reads that the CSV does not have;
- required attributes that no row gets;
- each invalid row with its first three schema errors, duplicate ids and ids in exponent form;
- the repairs ([Results](#results)).

The last line sums it up, for example `18 of 20 rows valid`. The exit code is 0 when every checked row is valid and the mapping has no problem.

### With an AI agent {#agent}

An AI agent can fill in the TODOs with you. The [agent skill](https://github.com/geolonia/datamodels-toolkit/tree/v0.3.10/skills/datamodels) of datamodels-toolkit (`skills/datamodels`) gives it the steps and the rules: never invent values, and ask about unclear columns. For Claude Code, copy the folder into your project's `.claude/skills/`.

An example prompt:

> Convert my-list.csv into disaster/EvacuationSite from datamodels.jp. Make a mapping with `datamodels mapping`, look at the first rows of the CSV to fill in the TODOs, and fix it until `--check --rows` with the number of rows in the CSV says every row is valid. Don't make up values that are not in the list, and ask me about any column whose meaning is unclear.

Keep the finished mapping: it is the record of how the list was converted.

## You start from the CSV template {#csv-template}

For a new list, fill in the model's CSV template, one row per entity. No mapping is needed. The template is on the model page under **Download**, and `export` makes it too ([Exporting to other tools](/en/toolkit/export)).

```bash
npx @geolonia/datamodels@0.3.10 convert \
  disaster/EvacuationSite csv-template sites.csv --out entities.json
```

Each column fills the attribute of the same name:

- `id` is the entity id as it is.
- A column such as `address.postalCode` is a field of a value, such as the address.
- `longitude` and `latitude` make a point. A model that allows other shapes also has a `location` column for a GeoJSON geometry.
- A list is split at `;`, and a boolean is `true` or `false`.

You can delete the columns you do not use: `convert` lists them as "not in the file, so left empty", and those attributes stay empty. To check the file with frictionless, though, keep every column ([Using a spreadsheet (CSV)](/en/guide/csv#fill)).

## Results {#results}

Whichever way you convert, the results work the same:

- It detects UTF-8 and Shift_JIS.
- A column that the mapping reads but the CSV does not have is listed as "not in the file, so left empty", and that attribute stays empty. Without the column of a required attribute, the rows are invalid.
- It repairs only what it can prove, such as a local government code that lost its leading zero or lacks its check digit (the check digit decides). It lists every repair on standard error.
- Invalid rows are left out and listed by line. Rows that get the same id are invalid, and so is an id in exponent form, such as `1.31E+11`: a spreadsheet rounded the number and its digits are lost.
- The exit code is 1 when a row is invalid or a file cannot be read, and 2 for a usage error.

## Options {#options}

- `--out file.json`: write to a file (default: standard output).
- `--normalized`: the NGSI-LD normalized form instead of the key-values form, with the subject's `@context` and the NGSI-LD core context.
- `--set attribute=value`: a value the list does not carry ([example above](#standard)).
- `--check`, `--rows N`: check the first rows only ([above](#your-own-list)).
- `--site`: the site to read the mapping files and models from (default: datamodels.jp). To try a mapping before it is published, build [geolonia/datamodels](https://github.com/geolonia/datamodels) (`npm run build`) and add `--site dist`.

The [tutorial](/en/guide/tutorial) converts real open data and shows it on a map, step by step. [Publishing your list](/en/guide/publish) says how to publish a converted list as open data. All options are in the toolkit's [README](https://github.com/geolonia/datamodels-toolkit/tree/v0.3.8#convert).
