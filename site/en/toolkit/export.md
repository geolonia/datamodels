---
title: Exporting to other tools
description: With export from datamodels-toolkit, make a CSV template, a Table Schema, a structured output schema for AI and a PostgreSQL / PostGIS table from a model
---

# Exporting to other tools

You can use the data models without an NGSI-LD broker. The toolkit's `export` command makes files from one model:

```bash
npx github:geolonia/datamodels-toolkit#v0.3.6 export \
  disaster/EvacuationSite --to csv,table-schema,ai,postgis
```

| `--to` | File | What it is for |
|---|---|---|
| `csv` | `EvacuationSite.csv` | A CSV template: fill in one row per entity in a spreadsheet, then [convert it](/en/toolkit/convert#csv-template). |
| `table-schema` | `EvacuationSite.tableschema.json` | The [Table Schema](https://datapackage.org/standard/table-schema/) of those columns, to check the filled-in CSV file with `frictionless validate`. |
| `ai` | `EvacuationSite.ai.json` | A strict JSON Schema for the structured output of an AI model, to extract entities from PDFs or e-mails in the shape of the model. |
| `postgis` | `EvacuationSite.sql` | A PostgreSQL / PostGIS `CREATE TABLE` with constraints and a spatial index. |

Every file keeps the model's attribute names and IRIs, so the data converts to the NGSI-LD form and back. The files go into the `--out` folder (default: the current folder). Models of your own site work too: give the site's folder.

## Download from datamodels.jp {#download}

You do not need the command for the models of datamodels.jp: each model page has these files under **Download**, for example [designated emergency evacuation site (EvacuationSite)](/en/models/disaster/EvacuationSite/). The list by model is on [Adapters](/en/adapters/).

These files are rebuilt with the site and are not covered by the promise that published files never change. If you need the exact file later, keep a copy and note the subject version it was made from.

## Structured output for AI {#ai}

Only models with a strict form have an AI file. Decision, for example, has none: its `answers` attribute has no fixed shape.

Claude's strict mode takes at most 16 nullable properties per request. Use the schema of a larger model as a tool's `input_schema` without `strict`, or remove the attributes you do not need. OpenAI's strict mode takes it as it is.
