---
title: Mapping files
description: What a mapping file says (which field of a standard matches which attribute of a model) and where to find one
---

# Mapping files

Many models correspond to a standard that data already follows in Japan, for example a dataset of the municipal standard open datasets, the Essential Elements of Information (EEI) for disaster response, or the shelter data of the Geospatial Information Authority of Japan (GSI). A **mapping file** says, for one model and one standard, which field of the standard matches which attribute of the model. With it, data that follows the standard fits the model.

<svg class="flow-diagram" viewBox="0 0 460 104" role="img" aria-label="The standard's column 想定収容人数 goes through one row of the mapping file (column and transform) and becomes the model attribute maxCapacity. The text &quot;120&quot; becomes the integer 120." xmlns="http://www.w3.org/2000/svg"><defs><marker id="mp-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="10" y="8" width="130" height="58" rx="10"/><text class="t" x="75" y="32">想定収容人数</text><text class="s" x="75" y="51">standard's column</text><line class="a" x1="140" y1="37" x2="163" y2="37" marker-end="url(#mp-ah)"/><rect class="box main" x="165" y="8" width="130" height="58" rx="10"/><text class="t" x="230" y="32">Mapping row</text><text class="s" x="230" y="51">column, transform</text><line class="a" x1="295" y1="37" x2="318" y2="37" marker-end="url(#mp-ah)"/><rect class="box" x="320" y="8" width="130" height="58" rx="10"/><text class="t m" x="385" y="32">maxCapacity</text><text class="s" x="385" y="51">model attribute</text><text class="s" x="75" y="92">"120" (text)</text><text class="s" x="230" y="92">transform: integer</text><text class="s" x="385" y="92">120 (integer)</text></svg>

## Where to find them

- On the model page, under **Referenced standards**: one row per standard, opening to the table. The YAML file is linked under the table.
- All of them, by standard: [Standards covered](/en/guide/standards).
- As files: `https://datamodels.jp/mapping/<subject>/<Type>/<name>.yaml`, and listed per model in `catalog.json` (`mappingUrls`).

A mapping file has no version: its URL stays, and its content follows the current model.

## What a mapping file says

<!-- languages: own code -->
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
  nationalShelterId:
    to: null
    note: { ja: このデータセットには無い, en: not in this dataset }
```

- `standard`: the standard, its link, its licence and a short note.
- `fields`: one row per attribute of the model. `to` names the matching field of the standard, `note` explains, and `to: null` means the standard has no counterpart.

## Conversion rules {#convert}

A row can also say how to convert: `column` (the column of the CSV), `transform` (for example `integer`, `flag`, `split`; the toolkit's [README](https://github.com/geolonia/datamodels-toolkit/tree/v0.3.8#convert) lists them all), a constant `value`, or `via` (build a nested value, such as an address, with another mapping file). `convert.id` names the entities. Rows with only `to` are documentation. Only some mapping files have conversion rules; most only document how the model relates to the standard.

The converter `datamodels convert` from [datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) reads these rules and turns a CSV list into entities of the model. How to use it: [Converting your data](/en/toolkit/convert).

## Adding a mapping

The catalog has mapping files only for published standards that many lists follow. One organisation's own list gets no mapping file in the catalog: convert it with a mapping of your own, kept with the list ([Converting your data](/en/toolkit/convert#your-own-list)).

When a standard matches a model and has no mapping file yet, propose one in an [issue](https://github.com/geolonia/datamodels/issues/new) ([Contributing](/en/guide/contribute)). Which standards get a mapping file: [Rules for models](/en/guide/rules#mapping).
