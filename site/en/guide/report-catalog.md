---
title: Telling us about another catalog
description: Know a catalog of data models or vocabularies that is missing? Tell us with a form. The form, field by field, with an example
---

# Telling us about another catalog

Do you know a catalog of data models or vocabularies that is missing on [Other data model catalogs](/en/guide/catalogs)? Tell us with a form. A maintainer checks it and adds it to the page, so others find it before they make something new.

You need no programming, only a GitHub account.

## What counts as a catalog {#what}

Any collection of data definitions that others can reuse: data models, vocabularies, or standard layouts for data, such as the municipal standard open datasets. Anyone must be able to read it without a login or a contract.

It can be global, Japanese, or from one organisation or project. A catalog that extends models of datamodels.jp is welcome too.

## Fill in the form {#form}

Open the [catalog form](https://github.com/geolonia/datamodels/issues/new?template=catalog-report.yml). Japanese or English are both fine. The examples below are for a catalog that is already listed.

| Field | What to write | Example |
|---|---|---|
| Name of the catalog | Its name in Japanese and in English | `自治体標準オープンデータセット / Municipal standard open datasets` |
| Page of the catalog | The URL of the page people read | `https://www.digital.go.jp/resources/open_data/municipal-standard-data-set-test` |
| Publisher | Who publishes it | `デジタル庁 / Digital Agency` |
| Scope | Choose: Global, Japan, or One organisation or project | Japan |
| Content and formats | Which fields its models cover, and in which formats (JSON Schema, @context, XSD, Excel, CSV and so on) | `Standard formats for municipal open data (public facilities, evacuation sites, AEDs and more). CSV column definitions` |
| Relation to datamodels.jp | Choose: Extends models of datamodels.jp; Overlaps or could be mapped; or Useful as a reference | Overlaps, or could be mapped |
| Related models (optional) | Models of datamodels.jp it relates to, as subject/Type | `disaster/EvacuationSite` |
| Machine-readable index (optional) | The URL of a list that programs can read. Say so if it has the same format as `catalog.json` | (empty) |
| Licence | For example CC BY 4.0. Write "unknown" if you do not know | `PDL 1.0 (public data licence)` |
| Public | Tick the box: anyone can read it without a login or a contract | ticked |

Not sure about a field? Write what you know. The maintainer can ask.

Then click "Create".

## What happens next {#next}

1. A maintainer looks at the catalog and may ask you a question in the issue.
2. If it fits, it is added to [Other data model catalogs](/en/guide/catalogs).

## Extended one of our models? {#extension}

If your organisation added attributes to a model of datamodels.jp, you can also list them on that model's page. See [Listing your extension](/en/guide/list-extension).
