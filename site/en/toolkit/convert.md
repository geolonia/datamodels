---
title: Converting a list
description: Convert a CSV list into entities of a catalog model with the convert command of datamodels-toolkit and the model's mapping file
---

# Converting a list

`datamodels convert` turns a CSV list into entities of a model of this catalog and checks each one against the model's JSON Schema. The rules for the conversion are in the model's mapping file; [Converting data](/en/guide/mapping) explains mapping files.

```bash
npx github:geolonia/datamodels-toolkit#v0.3.3 convert \
  disaster/EvacuationSite jichitai-opendata-site \
  092011_evacuation_space.csv --out sites.json
```

This example converts a municipality's list of designated emergency evacuation sites (指定緊急避難場所一覧, municipal standard open dataset 03) into EvacuationSite entities. The arguments are the model (`<subject>/<Type>`), the name of the mapping file and the CSV file. The model page lists its mapping files under **Referenced standards**, and `catalog.json` lists them as `mappingUrls`.

Add `--normalized` for the NGSI-LD normalized form. Rows with only `to` are documentation: convert those fields yourself, following the note.

The mapping files are read from datamodels.jp. To try a mapping before it is published, build [geolonia/datamodels](https://github.com/geolonia/datamodels) (`npm run build`) and add `--site dist`.

The [tutorial](/en/guide/tutorial) converts real open data and shows it on a map, step by step.
