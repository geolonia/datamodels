---
title: Converting data
description: Convert data that follows a standard into a catalog model, with the model's mapping file
---

# Converting data

Many models correspond to a standard that data already follows in Japan, for example a dataset of the municipal standard open datasets, EEI or GSI's shelter data. A **mapping file** says, for one model and one standard, which field of the standard matches which attribute of the model. With it you can convert existing data into the model.

## Where to find them

- On the model page, under **Referenced standards**: one row per standard, opening to the table. The YAML file is linked under the table.
- All of them, by standard: [Find a model by standard](/en/guide/standards).
- As files: `https://datamodels.jp/mapping/<subject>/<Type>/<name>.yaml`, and listed per model in `catalog.json` (`mappingUrls`).

A mapping file has no version: its URL stays, and its content follows the current model.

## What a mapping file says

```yaml
standard:
  name: { ja: …, en: "Municipal standard open dataset, … sheet '03. …'" }
  url: https://www.digital.go.jp/resources/open_data/municipal-standard-data-set-test
  license: { ja: …, en: "Public Data License 1.0, compatible with CC BY 4.0" }
fields:
  name: { to: 名称 (name), column: 名称 }
  maxCapacity:
    to: 想定収容人数 (maxCapacity)
    column: 想定収容人数
    transform: integer
  nationalShelterId: { to: null, note: { en: "not in this dataset" } }
```

- `standard`: the standard, its link, its licence and a short note.
- `fields`: one row per attribute of the model. `to` names the matching field of the standard, `note` explains, and `to: null` means the standard has no counterpart.

## Converting a list

A row can also say how to convert: `column` (the column of the CSV), `transform` (for example `integer`, `flag`, `split`), a constant `value`, or `via` (build a nested value, such as an address, with another mapping file). `convert.id` names the entities.

The converter `datamodels convert` from [datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) reads these rules. It turns a CSV list into entities of the model and checks each one against the model's JSON Schema:

```bash
npx github:geolonia/datamodels-toolkit convert \
  disaster/EvacuationSite jichitai-opendata-site \
  092011_evacuation_space.csv --out sites.json
```

Add `--normalized` for the NGSI-LD normalized form. Rows with only `to` are documentation: convert those fields yourself, following the note.

## Adding a mapping

When a standard matches a model and has no mapping file yet, propose one: see [Rules for models](/en/guide/rules#mapping).
