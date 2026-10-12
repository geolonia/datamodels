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

Only some mapping files have conversion rules; most only document how the model relates to the standard. A row with rules says how to fill its attribute:

- `column`: the column of the CSV, or a list of columns for a transform that reads several.
- `transform`: how to read the column ([Transforms](#transforms)). Without one, the text is taken as it is.
- `value`: a constant, the same in every row.
- `via`: build a nested value, such as an address, with another mapping file, for example `common/JapaneseAddress/jichitai-opendata-address`.

A row with only `to` is documentation.

A field name with a dot fills a field of a value: `address.postalCode: { column: 郵便番号 }`. The catalog's mapping files mostly use `via` instead, so that several models share the rules for an address.

`convert.id` is the template of the entity ids:

```yaml
convert:
  id: "urn:ngsi-ld:MedicalInstitution:{localGovernmentCode}-{externalFacilityId}"
```

- `{attribute}` is that attribute's value in the row; `{address.localGovernmentCode}` is a field of a value.
- Inside a longer id, a value is URL-encoded. A template that is only one value, such as `"{id}"`, takes the value as it is.
- Without a template, a field `id` with a `column` gives the entity id as it is.

`convert.allDay` says what opening hours of 0:00 to 0:00 mean in the list ([below](#all-day)).

The converter `datamodels convert` from [datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) reads these rules and turns a CSV list into entities of the model. How to use it: [Converting your data](/en/toolkit/convert).

### Transforms {#transforms}

| `transform` | Columns | What it makes |
|---|---|---|
| (none) or `text` | 1 | The text as it is. Empty is no value. |
| `code6` | 1 | A 6-digit local government code, checked against its check digit. For a 5-digit value, it restores a lost leading zero when that gives a valid code, else adds the check digit when the value starts with a prefecture code (`01` to `47`); when both are possible, it is a problem. For a 4-digit value, it adds both, when the result starts with a prefecture code. Anything else is a problem. |
| `number` | 1 | A number. |
| `integer` | 1 | A whole number. It also takes `1,200` and `1200人`. |
| `numbers` | 2 or more | A list of numbers. |
| `flag` | 1 | `1` is true; `0` or empty is false. |
| `boolean` | 1 | `true` or `false` (also `TRUE`, `True`, `1`, `0`). Empty is no value. |
| `yesno` | 1 | `有`, `有り`, `あり`, `アリ`, `はい`, `○`, `〇`, `◯` are true; `無`, `無し`, `なし`, `ナシ`, `いいえ`, `×`, `✕` are false. Empty is no value. `values` replaces these words ([values](#values)). |
| `flags` | from `values` | A list of the values whose column holds `1`: `values: { 洪水: flood, 地震: earthquake }`. |
| `split` | 1 | A list, split at `;` or `；`. |
| `weekdays` | 1 | The days of OpeningHours (`Monday` … `Sunday`, `PublicHolidays`), [below](#weekdays). |
| `time` | 1 | A time as `HH:MM`, [below](#time). |
| `geometry` | 1 to 3 | Two columns, longitude and latitude, make a GeoJSON Point. One column holds a GeoJSON geometry. With three, the third is the GeoJSON for rows without longitude and latitude. |
| `json` | 1 | The JSON in the column. |
| `municipality` | 1 | A municipality name. A value that goes on, such as `宇都宮市中央本町1-29`, is left out and reported. |
| `machiazaId` | 1 | The 7-digit town id of the Address Base Registry, without its hyphen. |
| `nationalShelterType` | 1 | `general` or `welfare`, from the type code in a 全国共通避難所・避難場所 ID. |

No transform guesses. Without `values`, `text` and `split` take any text, and `municipality` leaves out a value that is not a municipality name and lists it as a repair. With any other transform, a text outside the forms it knows is a problem of the row, named with its column and the text: for example `不明` for `yesno`, `月～金（祝日を除く）` or `第2土曜` for `weekdays`, and `25:00` or `9時半` for `time`.

#### weekdays {#weekdays}

`weekdays` reads `月～金`, `月-金`, `月火水木金`, `月・水・金`, `土日祝`, `月曜日～金曜日`, and `12345` (1 is Monday, 7 Sunday). `平日` is Monday to Friday, and `毎日` the seven days. A range wraps: `金～月` is Friday to Monday. `祝` and `祝日` are `PublicHolidays`, which are in the list only when the text names them.

#### time {#time}

`time` writes `9:00`, `9時` and `9時30分` as `09:00` and `09:30`, with full-width digits made half-width. Seconds are kept (`17:00:30`). Each change is listed as a repair.

It reads the hours 0 to 24. `0:00` becomes `00:00`, the start of the day. `24:00` is kept: the schema allows it as a closing time (the end of the day) but not as an opening time, so a row that opens at 24:00 is invalid. `24:30` and `25:00` are problems.

### values {#values}

`values` turns the texts of one column into the model's values:

```yaml
medicalInstitutionType:
  column: 医療機関の種類
  values: { 病院: hospital, 有床診療所: clinicWithBeds, 無床診療所: clinicWithoutBeds }
```

- It works without a transform, with `split` (for each item of the list) and with `yesno` (instead of its words, for example `values: { 外部利用不可: true, "": false }`).
- An empty cell is no value. Without a transform and with `yesno`, an entry for `""` gives it a value, when the file has the column. With `split`, an empty cell stays no value.
- A text that `values` does not have is a problem of the row. It is never taken as it is.

### Opening hours of 0:00 to 0:00 {#all-day}

Lists do not agree on what 0:00 to 0:00 means. schema.org says only that a closing time before the opening time runs into the next day. Google's guidelines for structured data, the most used convention, read `00:00` to `23:59` as open 24 hours, and `00:00` to `00:00` as closed all day. Japanese lists often write `0:00` to `0:00` for "around the clock".

So when a value opens and closes at 0:00, the row has a problem until the mapping says what the list means. This holds for `opens` and `closes` of OpeningHours, from columns or from a JSON value such as the CSV template's, also in a list:

```yaml
convert:
  allDay: open      # open all day: written as 00:00 to 23:59
# allDay: closed    # closed all day: written as 00:00 to 00:00
```

- `convert.allDay` applies to the opening hours that the mapping builds, and to those of every mapping it reaches through `via`. When more than one of them says it, the outermost one wins. So a mapping of your own decides it for the catalog's OpeningHours mapping, without a change to that file.
- Each row it applies to is listed as a repair.
- The meaning belongs to one list. In the mapping files of a catalog or node, `check` allows only `convert.id` under `convert`, so `allDay` works only in a mapping of your own. To convert such a list, use a [mapping of your own](/en/toolkit/convert#your-own-list).
- The same time at another hour, such as `9:00` to `9:00`, is always a problem of the row: no convention says what it means.

## Adding a mapping

The catalog has mapping files only for published standards that many lists follow. One organisation's own list gets no mapping file in the catalog: convert it with a mapping of your own, kept with the list ([Converting your data](/en/toolkit/convert#your-own-list)).

When a standard matches a model and has no mapping file yet, propose one in an [issue](https://github.com/geolonia/datamodels/issues/new) ([Contributing](/en/guide/contribute)). Which standards get a mapping file: [Rules for models](/en/guide/rules#mapping).
