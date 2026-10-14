---
title: Exporting to other tools
description: With export from datamodels-toolkit, make a CSV template, a Table Schema, a structured output schema for AI and a PostgreSQL / PostGIS table from a model
---

# Exporting to other tools

You can use the data models without an NGSI-LD broker. The toolkit's `export` command makes files from one model:

```bash
npx @geolonia/datamodels@0.3.16 export \
  disaster/EvacuationSite --to csv,table-schema,ai,postgis
```

| `--to` | File | What it is for |
|---|---|---|
| `csv` | `EvacuationSite.csv` | A CSV template: fill in one row per entity in a spreadsheet, then [convert it](/en/toolkit/convert#csv-template). |
| `table-schema` | `EvacuationSite.tableschema.json` | The [Table Schema](https://datapackage.org/standard/table-schema/) of those columns, to check the filled-in CSV file with `frictionless validate`. |
| `ai` | `EvacuationSite.ai.json` | A strict JSON Schema for the structured output of an AI model, to extract entities from PDFs or e-mails in the shape of the model. |
| `postgis` | `EvacuationSite.sql` | A PostgreSQL / PostGIS `CREATE TABLE` with constraints and a spatial index. |

Every file keeps the model's attribute names and IRIs, so the data converts to the NGSI-LD form and back. The files, named `<Type>.<ext>`, go into the `--out` folder (default: the current folder).

Models of your own site work too: give the site's folder (default: the current folder). With `--index`, `export` reads the model from that `catalog.json` and does not read your site at all. Without it, when your site has no such model, `export` reads it from the first node in `node.yaml`, else datamodels.jp. A type IRI works in place of `<subject>/<Type>`. For a type IRI, `export` tries the node that made the IRI before the first node in `node.yaml` ([A model given by its type IRI](/en/toolkit/reference#type-iri)).

```bash
npx @geolonia/datamodels@0.3.16 export road/RoadPatrol my-models --to postgis
```

## How a model becomes columns {#columns}

The CSV template, its Table Schema and the SQL table split a model the same way:

- One column per attribute, with the attribute's name (`hazardTypes`); in SQL in snake_case (`hazard_types`). `id` is the first column, and the primary key in SQL. There is no `type` column: every row is an entity of the model.
- The location: in the CSV file `longitude` and `latitude` (WGS 84). A model that allows other shapes than a point also has a `location` column for a GeoJSON geometry. In SQL, `geometry(<type>, 4326)`: with one allowed shape, that type (such as `Point` or `Polygon`); with several, `Geometry` and a `CHECK` for the allowed shapes.
- A value made of plain fields, such as `address` (JapaneseAddress), becomes one column per field: `address.postalCode` in the CSV file, `address_postal_code` in SQL, each with its own rules. So a spreadsheet can fill each field, and SQL can check and index it.
- A list of plain values is one column, with the values separated by `;` (a Table Schema `list`). In SQL it is an array, such as `text[]`. SQL checks only its allowed values, its minimum length, duplicates and empty (NULL) items.
- Anything else, such as the answers of a Decision, is JSON in one column. The Table Schema checks it with the attribute's JSON Schema (its `jsonSchema` constraint). In SQL it is a `jsonb` column, which PostgreSQL does not check against the schema.
- A rule on several attributes, such as "at least one of externalSiteId and nationalShelterId", is a `CHECK` in SQL, and a sentence in the descriptions of the Table Schema and the AI schema. Other rules, such as if/then, stay in the JSON Schema; the files say so.

The Table Schema follows version 2 of the standard. Its titles and descriptions are in the first language of the catalog (Japanese for datamodels.jp), and the other languages are under `x-translations`. Each column's IRI is in `x-iri`; `x-typeIri`, `x-schema` and `x-context` name the model. The catalog has no short labels, so a title is the start of the description, when that is short.

## Download from datamodels.jp {#download}

You do not need the command for the models of datamodels.jp: each model page has these files under **Download**, for example [designated emergency evacuation site (EvacuationSite)](/en/models/disaster/EvacuationSite/). Each file is explained on [Adapters](/en/adapters/#downloads).

These files are rebuilt with the site and are not covered by the promise that published files never change. If you need the exact file later, keep a copy and note the subject version it was made from.

## Structured output for AI {#ai}

Only models with a strict form have an AI file. Decision, for example, has none: its `answers` attribute has no fixed shape.

The AI schema keeps to what the structured outputs of both OpenAI and Anthropic accept, as their documentation said on 2026-10-11 ([OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas), [Anthropic](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)):

- Every object has `additionalProperties: false` and lists every property in `required`. An optional attribute may be `null` instead.
- No `$ref`: the value types are written out.
- `anyOf` instead of `oneOf`. An attribute with `allOf`, `not`, if/then, `patternProperties`, `dependentSchemas` or a `$ref` left inside it has no strict form, so the model has no AI file. On the model, an "at least one of" rule becomes a sentence in the description, and any other rule on several attributes a link: `More rules: <schema URL>`.
- Only the formats `date-time`, `date`, `time`, `duration`, `email`, `hostname`, `ipv4`, `ipv6` and `uuid`.
- Patterns without `(?`: a pattern with a lookaround or a non-capturing group goes into the description.
- No `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `minLength`, `maxLength`, `maxItems` or `uniqueItems`; `minItems` only 0 or 1.

What it leaves out goes into the description, for example "(minimum 0; maximum 9)". `id` and `type` are not in it: your application sets them ([Extracting data with AI](/en/guide/ai-extraction#entity)). The descriptions are in English.

Claude's strict mode takes at most 16 parameters with a union type (`anyOf`, or a type with `null`) per request. Each optional attribute counts, and so does a value that allows several shapes, such as a geometry, also inside other values. `export` says so when a model has more. Use the schema of a larger model as a tool's `input_schema` without `strict`, or remove the attributes you do not need. OpenAI's strict mode takes it as it is.
