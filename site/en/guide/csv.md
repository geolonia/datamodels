---
title: Using a spreadsheet
description: Fill in a model's CSV template, check it with frictionless validate against its Table Schema, and turn it into NGSI-LD entities
---

# Using a spreadsheet

Every model page has a **CSV template** and its **Table Schema** in the **Download** row. With them, people who work in a spreadsheet can make data in the shape of a model without writing JSON. This page fills in the template of [designated emergency evacuation site (EvacuationSite)](/en/models/disaster/EvacuationSite/), checks it, and turns it into NGSI-LD entities.

<svg class="flow-diagram" viewBox="0 0 460 398" role="img" aria-label="Take the CSV template from the model page, fill it in in a spreadsheet, check it with frictionless validate, and turn it into NGSI-LD entities with datamodels convert." xmlns="http://www.w3.org/2000/svg"><defs><marker id="csv-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="58" rx="10"/><text class="t" x="230" y="33">CSV template</text><text class="s" x="230" y="53">Download row of the model page</text><line class="a" x1="230" y1="68" x2="230" y2="114" marker-end="url(#csv-ah)"/><text class="l" x="242" y="95">① fill in, in a spreadsheet</text><rect class="box" x="20" y="116" width="420" height="58" rx="10"/><text class="t m" x="230" y="141">sites.csv</text><text class="s" x="230" y="161">one row per site</text><line class="a" x1="230" y1="176" x2="230" y2="222" marker-end="url(#csv-ah)"/><text class="l" x="242" y="203">② frictionless validate</text><rect class="box" x="20" y="224" width="420" height="58" rx="10"/><text class="t" x="230" y="249">Checked sites.csv</text><text class="s" x="230" y="269">every cell checked with the Table Schema</text><line class="a" x1="230" y1="284" x2="230" y2="330" marker-end="url(#csv-ah)"/><text class="l" x="242" y="311">③ datamodels convert</text><rect class="box main" x="20" y="332" width="420" height="58" rx="10"/><text class="t" x="230" y="357">NGSI-LD entities</text><text class="s" x="230" y="377">also checked with the JSON Schema</text></svg>

You need [Node.js](https://nodejs.org/) 24 or later, and Python for frictionless.

## 1. Get the files {#files}

Both files are in the Download row of the model page. On the command line:

```bash
BASE=https://datamodels.jp/adapters
curl -sSfO "$BASE/csv/disaster/EvacuationSite.csv"
curl -sSfO "$BASE/table-schema/disaster/EvacuationSite.tableschema.json"
```

## 2. Fill in the template {#fill}

Open `EvacuationSite.csv` in a spreadsheet. Its first row has one column per attribute; the attribute table on the model page says what each one means. Add one row per site, leave the cells you do not know empty, and save the file as `sites.csv` in UTF-8 (in Excel: "CSV UTF-8"). This row has two mistakes on purpose, for the next steps to find:

| Column | Value |
|---|---|
| `id` | `urn:ngsi-ld:EvacuationSite:0012` |
| `name` | 都立一橋高校 |
| `externalSiteId` | `13101-0012` |
| `localGovernmentCode` | `13101` |
| `address.addressText` | `東京都千代田区東神田1-12-13` |
| `longitude`, `latitude` | `139.7810002`, `35.6945488` |
| `hazardTypes` | `earthquake;fire` |
| `alsoDesignatedShelter` | `true` |

A list such as `hazardTypes` is split at `;`, and `longitude` and `latitude` make the location. Keep every column of the template, also the empty ones: the Table Schema expects all of them, in this order.

## 3. Check it with frictionless {#validate}

[frictionless](https://framework.frictionlessdata.io/) checks every cell against the Table Schema: the type, the pattern, the allowed values, and whether a required cell is filled in.

```bash
pip install frictionless   # or: pipx install frictionless
frictionless validate sites.csv --schema EvacuationSite.tableschema.json
```

The result, shortened:

```text
│ sites │ table │ sites.csv │ INVALID │
┃ Row ┃ Field ┃ Type             ┃ Message                                     ┃
│ 2   │ 7     │ constraint-error │ The cell "13101" in row at position "2" and │
│     │       │                  │ field "localGovernmentCode" at position "7" │
│     │       │                  │ does not conform to a constraint:           │
│     │       │                  │ constraint "pattern" is "\d{6}"             │
```

The local government code has 6 digits, with the check digit at the end. Change the cell to `131016`, save, and run the same command again:

```text
│ sites │ table │ sites.csv │ VALID  │
```

## 4. Convert it into NGSI-LD entities {#convert}

`datamodels convert` from [datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) turns each row into an entity and checks it against the model's JSON Schema:

```bash
npx github:geolonia/datamodels-toolkit#v0.3.5 convert \
  disaster/EvacuationSite csv-template sites.csv --out entities.json
```

```text
sites.csv: utf-8, 1 row(s), 0 valid EvacuationSite, 1 invalid
  line 2: data/hazardTypes/1 must be equal to one of the allowed values
```

The JSON Schema checks what the Table Schema cannot: the values inside a list, and rules on several columns, such as "externalSiteId or nationalShelterId". `fire` is not a hazard type of this model; the attribute table lists them. Change it to `inlandFlood` and run `convert` again:

```text
sites.csv: utf-8, 1 row(s), 1 valid EvacuationSite, 0 invalid
```

`entities.json` now has the entity, with the empty cells left out:

```json
[
  {
    "id": "urn:ngsi-ld:EvacuationSite:0012",
    "type": "EvacuationSite",
    "name": "都立一橋高校",
    "externalSiteId": "13101-0012",
    "localGovernmentCode": "131016",
    "address": { "addressText": "東京都千代田区東神田1-12-13" },
    "location": { "type": "Point", "coordinates": [139.7810002, 35.6945488] },
    "hazardTypes": ["earthquake", "inlandFlood"],
    "alsoDesignatedShelter": true
  }
]
```

This is the key-values form. Add `--normalized` to get the form an NGSI-LD broker takes, with the @context ([Sending to an NGSI-LD broker](/en/guide/use#broker)). More about the columns of the template: [Converting your data](/en/toolkit/convert#csv-template).

## Your own models {#own-models}

For the models of a site of your own, make the same two files with `datamodels export` ([Exporting to other tools](/en/toolkit/export)).
