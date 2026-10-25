---
title: Publishing your list
description: For a municipality that publishes a CSV list (evacuation sites, AED locations and similar) as open data. Convert it into JSON that follows a catalog model, and publish it next to the CSV
---

# Publishing your list

This page is for staff of a city or other municipality who publish a CSV list on their open data portal. You convert the list into a JSON file and publish it next to the CSV. The JSON is in the key-values form (plain JSON with attribute names and their values), and it is checked against the model's JSON Schema.

When lists use the same model, app developers can read the list of every city with the same code.

<svg class="flow-diagram" viewBox="0 0 460 370" role="img" aria-label="One row of Utsunomiya's CSV (名称 中央小学校, 災害種別_洪水 1) is converted with the mapping file into one entity of the model EvacuationSite, as JSON in the key-values form. The 1 in 災害種別_洪水 becomes flood in hazardTypes." xmlns="http://www.w3.org/2000/svg"><defs><marker id="pub-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="100" rx="10"/><text class="t" x="230" y="32">Utsunomiya's CSV (one row)</text><text class="l" x="32" y="60">名称</text><text class="c" x="32" y="90">中央小学校</text><text class="l" x="124" y="60">緯度</text><text class="c" x="124" y="90">36.55925966</text><text class="l" x="214" y="60">経度</text><text class="c" x="214" y="90">139.8847723</text><text class="l hl" x="310" y="60">災害種別_洪水</text><text class="c hl" x="310" y="90">1</text><text class="l" x="420" y="60">…</text><text class="c" x="420" y="90">…</text><line class="a" x1="32" y1="70" x2="428" y2="70"/><line class="a" x1="230" y1="108" x2="230" y2="150" marker-end="url(#pub-ah)"/><text class="l" x="240" y="134">convert, with the mapping file</text><rect class="box main" x="20" y="152" width="420" height="210" rx="10"/><text class="t" x="230" y="176">One entity (key-values form)</text><text class="s" x="230" y="196">JSON in the model EvacuationSite, shortened</text><text class="c" x="40.0" y="222">{</text><text class="c" x="54.4" y="240">"type": "EvacuationSite",</text><text class="c" x="54.4" y="258">"name": "中央小学校",</text><text class="c" x="54.4" y="276">"location": { "type": "Point",</text><text class="c" x="68.8" y="294">"coordinates": [139.8847723, 36.55925966] },</text><text class="c" x="54.4" y="312">"hazardTypes": [<tspan class="hl">"flood"</tspan>, "landslide", "earthquake"]</text><text class="c" x="54.4" y="330">…</text><text class="c" x="40.0" y="348">}</text></svg>

- **model**: for one kind of thing, such as evacuation sites or AEDs, the names and meanings of its attributes.
- **entity**: one record of data. One row of the CSV becomes one entity.
- **mapping file**: a file that says which column of the CSV becomes which attribute of the model.

The other words are explained in [Terms](/en/guide/#terms).

::: warning Pre-release
The catalog is not officially launched yet, and until then published files may still be corrected ([URLs and versions](/en/guide/urls)). Try the steps now, but publish the JSON on your portal only after the official launch.
:::

## 1. Check that your list follows the standard {#standard}

Many municipalities publish their lists in the format of the Digital Agency's municipal standard open datasets (自治体標準オープンデータセット). A list in this format can be converted with the catalog's mapping file as it is. The catalog has a mapping file for these sheets of the data item definition document A (データ項目定義書A):

- **03 指定緊急避難場所一覧** (evacuation sites): model [`disaster/EvacuationSite`](/en/models/disaster/EvacuationSite/), mapping file `jichitai-opendata-site`
- **08 AED設置箇所一覧** (AED locations): model [`facility/AEDLocation`](/en/models/facility/AEDLocation/), mapping file `jichitai-opendata-aed`
- **10 医療機関一覧** (medical institutions): model [`facility/MedicalInstitution`](/en/models/facility/MedicalInstitution/), mapping file `jichitai-opendata-medical`
- **13 公衆トイレ一覧** (public toilets): model [`facility/PublicToilet`](/en/models/facility/PublicToilet/), mapping file `jichitai-opendata-toilet`

How to check: look at the first row of the CSV (the column headers). A list that follows the definitions has common columns such as `全国地方公共団体コード` (local government code), `ID` and `名称` (name). After them come the columns of its sheet: `災害種別_洪水` (flood) and similar for evacuation sites, `設置位置` (where the AED is) for AEDs. [Standards covered](/en/guide/standards#jichitai-opendata) links to the definitions and the mapping file of each sheet.

If your list does not follow the standard, write a mapping file of your own and convert with it ([Any other CSV](/en/toolkit/convert#your-own-list)).

## 2. Convert {#convert}

You need [Node.js](https://nodejs.org/) 24 or later. The example here is Utsunomiya City's list of designated emergency evacuation sites. Step 1 of the [tutorial](/en/guide/tutorial#data) downloads it as `sites.csv`.

```bash
npx @geolonia/datamodels@0.3.17 convert \
  disaster/EvacuationSite jichitai-opendata-site sites.csv --out sites.json
```

The `\` at the end of a line means the command goes on in the next line. In the Windows Command Prompt or PowerShell, write it on one line. The arguments are the model, the mapping file and the CSV file. For your own list, take the model and the mapping file of your sheet from the list above. `--out` is the JSON file to write. The JSON is written in UTF-8, even when the CSV is in Shift_JIS. Step 2 of the [tutorial](/en/guide/tutorial#convert) shows the first entity in it.

This is the output of a run on 2026-10-12, in full (on standard error):

```text
sites.csv: shift_jis, 198 row(s), 198 valid EvacuationSite, 0 invalid
  repaired 396×: localGovernmentCode: restored the leading zero (e.g. 92011 → 092011)
  repaired 198×: addressLocality: left out 所在地_市区町村: not a municipality name (e.g. 宇都宮市中央本町1-29)
```

- The first line sums up: the converter recognised the character encoding (Shift_JIS), and all 198 rows are valid.
- The `repaired` lines are what the converter fixed. It put back the leading zero of the local government codes, which a spreadsheet had dropped. There are two code columns (`全国地方公共団体コード` and `所在地_全国地方公共団体コード`), so 198 rows make 396 repairs.
- The column `所在地_市区町村` (city) also held the town and the street number, so the converter did not put it into the attribute `addressLocality`. The address is still there: `address.addressText` comes from the column `所在地_連結表記` (full address). Use this as a hint for fixing the CSV.

**If some rows are invalid,** they are left out of the JSON and listed with their row number and the reason (exit code 1). Fix the CSV and convert again. To check only the first rows (20 by default), use `--check` ([Converting your data](/en/toolkit/convert#your-own-list)).

## 3. Publish {#publish}

- **Where:** add `sites.json` to the same dataset as the CSV, as one more resource, with the format JSON. Keep the CSV: people and apps use it. Any file name works; the CSV's name with `.json` instead of `.csv` shows which CSV it comes from.
- **Licence:** the same licence as your CSV. The JSON is the same data in another form.
- **Description:** in the description of the resource or the dataset, name the model you used: its page, and the URLs of its JSON Schema and @context. With the JSON Schema, anyone can validate each entity in the JSON: the file is a list of entities, and the schema describes one. The @context is a file that links each attribute name to a name that is unique on the web; people who use the data as linked data read it. Use the version alias (`v1`) in these URLs. It moves only to compatible versions, so your JSON stays valid ([URLs and versions](/en/guide/urls)).
- **Updates:** when the CSV changes, convert it again with the same command and replace the JSON, so that both always hold the same data.

An example description:

<!-- languages: own code -->
```text
The CSV above, converted into the datamodels.jp model EvacuationSite (key-values form).
Model: https://datamodels.jp/en/models/disaster/EvacuationSite/
JSON Schema: https://datamodels.jp/schema/disaster/EvacuationSite/v1.json
@context: https://datamodels.jp/context/disaster/v1.jsonld
```

## Next (optional) {#next}

- **Send it to an NGSI-LD broker:** the [second part of the tutorial](/en/guide/tutorial#next-broker) loads the same list into a broker, queries it and shows it on a map.
- **Use it in a database:** [Using PostgreSQL / PostGIS](/en/guide/postgis) creates the model's table and queries it by distance.
- **Make a list from PDFs:** [Extracting data with AI](/en/guide/ai-extraction) takes entities of the same model out of a PDF or an e-mail.
