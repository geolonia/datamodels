---
title: "Tutorial: from a CSV file to a map"
description: One real open-data CSV converted into a catalog model, step by step. An optional second part loads the result into an NGSI-LD context broker, queries it and shows it on a map
---

# Tutorial: from a CSV file to a map

This tutorial converts one real open-data file into a catalog model. Steps 1–2 turn a CSV list into JSON that follows the model. Steps 3–6 are optional: they put that JSON into an NGSI-LD context broker, ask it questions and show the result on a map. Each step says what happened and why. You need no knowledge of FIWARE or NGSI-LD, only a terminal with Bash or zsh (macOS, Linux, or WSL on Windows). Steps 1–2 take about 10 minutes, the whole tutorial about 30.

The data is Utsunomiya City's list of designated emergency evacuation sites (指定緊急避難場所): 198 schools, parks and other places, published as a CSV file. The steps were run on 2026-10-15 against a local GeonicDB v0.22.0; the login steps follow the CLI's documentation.

## First: entities and models {#model}

Each record of data is an **entity**: one evacuation site is one entity. An entity has an **id** (a unique name), a **type** (`EvacuationSite`) and **attributes** (its name, its location, the hazards it is designated for).

A datamodels.jp **model** is the agreed list of attributes for a type, with the meaning of each. When two cities use the same model, their data fits together, and the same app works for both.

<svg class="flow-diagram" viewBox="0 0 460 412" role="img" aria-label="The CSV file from Utsunomiya is converted into 198 entities of the model EvacuationSite (sites.json). In the optional second part, they are loaded into an NGSI-LD broker, queried and shown on a map." xmlns="http://www.w3.org/2000/svg"><defs><marker id="tut-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="58" rx="10"/><text class="t" x="230.0" y="33">sites.csv</text><text class="s" x="230.0" y="53">Utsunomiya's list, one row per site</text><rect class="box main" x="20" y="121" width="420" height="58" rx="10"/><text class="t" x="230.0" y="146">198 entities</text><text class="s" x="230.0" y="166">sites.json, in the model EvacuationSite</text><rect class="box d" x="20" y="234" width="420" height="58" rx="10"/><text class="t" x="230.0" y="259">NGSI-LD broker (e.g. GeonicDB)</text><text class="s" x="230.0" y="279">optional: stores and checks them</text><rect class="box d" x="20" y="347" width="420" height="58" rx="10"/><text class="t" x="230.0" y="372">Questions and a map</text><text class="s" x="230.0" y="392">optional: "sites for floods", "near the station"</text><line class="a" x1="230" y1="68" x2="230" y2="119" marker-end="url(#tut-ah)"/><text class="l" x="240" y="98">① convert</text><line class="a d" x1="230" y1="181" x2="230" y2="232" marker-end="url(#tut-ah)"/><text class="l" x="240" y="211">② load</text><line class="a d" x1="230" y1="294" x2="230" y2="345" marker-end="url(#tut-ah)"/><text class="l" x="240" y="324">③ query, ④ map</text></svg>

## What you need {#before}

- **Node.js 24 or later.** Steps 1–2 need nothing else.

What steps 3–6 need (a tenant in a broker and more) is at the [start of the second part](#broker-before).

Make an empty folder and run everything below in it.

## 1. Get the data {#data}

Utsunomiya publishes the list in its [open data catalog](https://catalog.city.utsunomiya.tochigi.jp/dataset/shiteikinkyuuhinanbashoichiran) under CC BY. Download it as `sites.csv`:

```bash
HOST=https://catalog.city.utsunomiya.tochigi.jp
SET=dataset/4d41b0e3-b48a-4079-8896-7de6f6f1a850
FILE=resource/ab7c2ca6-9ce3-409a-947b-4744fcfec7c6/download
curl -sSfL -o sites.csv "$HOST/$SET/$FILE/092011_evacuation_space_sanitized_new.csv"
```

Open it in a spreadsheet if you like. Each row is one site, with columns such as 名称 (name), 緯度 and 経度 (latitude and longitude), and one column per hazard (災害種別_洪水 for floods, and so on). Many cities publish the same columns: this is the format of the municipal standard open datasets.

## 2. Convert it into the catalog model {#convert}

Converting turns each row of the CSV into one entity that follows the model. The catalog's model for these sites is [EvacuationSite](/en/models/disaster/EvacuationSite/), and it comes with a **mapping file** (`jichitai-opendata-site`) that says which column becomes which attribute. So the converter needs no code from you:

```bash
npx @geolonia/datamodels@0.3.18 convert \
  disaster/EvacuationSite jichitai-opendata-site sites.csv --out sites.json
```

**What happened:** each row became one entity, and each entity was checked against the model. The converter lists what it repaired, for example local government codes that lost their leading zero in the spreadsheet (`92011 → 092011`). It also leaves out the column 所在地_市区町村, because it holds a full address, not a city name; the full address is still kept. All 198 sites are valid. Look at the first one in `sites.json`, shortened here (the address, the telephone number and a few more attributes are left out):

```json
{
  "id": "urn:ngsi-ld:EvacuationSite:092011-1",
  "type": "EvacuationSite",
  "name": "中央小学校",
  "location": { "type": "Point", "coordinates": [139.8847723, 36.55925966] },
  "hazardTypes": ["flood", "landslide", "earthquake"],
  "alsoDesignatedShelter": true
}
```

The column 災害種別_洪水 became `"flood"` in `hazardTypes`; the latitude and longitude became a GeoJSON point. The names (`name`, `hazardTypes`) are the model's, the same for every city.

The `sites.json` you have now is a file a city can publish next to its CSV. How to do that is in [Publishing your list](/en/guide/publish). You can stop the tutorial here.

## Next: send it to a broker (optional) {#next-broker}

This part is optional. It puts the data from step 2 into an NGSI-LD context broker, asks it questions and shows the result on a map.

### What is a context broker? {#broker}

A **context broker** is a database for the current state of things in a city: an evacuation site, a road closure, a sensor reading, a task. Applications write to it and read from it over the web. It does three things a spreadsheet cannot:

- **Every application speaks the same language.** The broker follows **NGSI-LD**, an international standard (ETSI). An app written for one NGSI-LD broker is easier to move to another, though brokers differ in how much of the standard they support. **FIWARE** is the open-source community around this standard; Orion-LD, Scorpio and GeonicDB are such brokers.
- **You can ask by meaning and by place:** "all sites for floods", "all sites within 1 km of the station".
- **Others can follow changes:** an app can subscribe and is told when something changes. This tutorial does not go that far.

This tutorial uses GeonicDB, the broker of Geolonia, which runs this catalog. Any other NGSI-LD broker can do the same.

The commands use `geonic`, the command-line tool for GeonicDB, but it loads and queries the data through the NGSI-LD API. Only two things are GeonicDB features: registering the model in step 3, and the model check in step 6. To send data to another broker through the NGSI-LD API directly, see [Using the models](/en/guide/use#broker).

### What you need for this part {#broker-before}

- **A tenant in a broker.** A tenant is your own space in a shared broker; nobody else sees your data. Ask whoever runs the broker you use to set one up. They give you its address and a login as tenant administrator. For GeonicDB, ask through Geolonia's [contact form](https://www.geolonia.com/contact/) (Japanese).
- **[jq](https://jqlang.org/)**, a small tool for JSON, used in steps 5 and 6.
- **The GeonicDB CLI** (`geonic`), the command-line tool for GeonicDB. Install it and log in once. The login asks for your email address and password:

```bash
npm install -g @geolonia/geonicdb-cli@0.26.1
geonic config set url "https://<your-deployment>.geonicdb.jp"
geonic auth login --tenant "<your-tenant>"
```

`geonic` remembers the address and the login, so the commands below need neither. With an API key instead of a login, see [Use with GeonicDB](/en/guide/geonicdb#steps).

### 3. Register the model and load the data {#load}

First convert the data once more, into the form a broker takes:

```bash
npx @geolonia/datamodels@0.3.18 convert \
  disaster/EvacuationSite jichitai-opendata-site sites.csv \
  --normalized --out sites.jsonld
```

`--normalized` writes the same data in the normalized form, the form the NGSI-LD standard uses to send it, and adds an **@context**. The @context works like a dictionary: it tells the broker that `name` here means `https://uri.etsi.org/ngsi-ld/name` and `hazardTypes` means `https://datamodels.jp/ns/disaster/hazardTypes`. These full names (**IRIs**) are unique on the whole web, so two systems never mix up two different meanings of "name".

Then tell the broker about the model. From then on it checks every EvacuationSite it receives against the model, and refuses those that do not fit. Then load the file:

```bash
BASE=https://datamodels.jp
curl -sSf -o model.json "$BASE/adapters/geonicdb/disaster/EvacuationSite.json"
geonic models create @model.json
geonic import sites.jsonld --input-format json
```

**What happened:** `curl` downloaded the model's definition, which the catalog publishes for GeonicDB, and `geonic models create` registered it (`@model.json` means "read this file"). It prints the registered model and ends with `Model created.` `geonic import` sent the 198 entities and answers with a line that starts `Imported: 198 succeeded, 0 failed, 0 skipped …`. If you run `geonic models create` twice, the second answers `Custom data model already exists`: the model is already there.

### 4. Ask questions {#query}

The broker stored the full names (IRIs) from the @context. When you ask, give it the same @context, so the short names work. `--count-only` answers with a number:

```bash
C=https://datamodels.jp/context/disaster/v1.jsonld

# How many sites?                                              → 198
geonic entities list --type EvacuationSite --context $C --count-only

# Sites for floods                                             → 79
geonic entities list --type EvacuationSite --context $C --count-only \
  --query 'hazardTypes=="flood"'

# ... that are also designated shelters                       → 69
geonic entities list --type EvacuationSite --context $C --count-only \
  --query 'hazardTypes=="flood";alsoDesignatedShelter==true'
```

`--query` filters by attribute (`;` means "and"). Now by place, the sites within 1 km of Utsunomiya Station, with their names:

```bash
geonic entities list --type EvacuationSite --context $C --key-values \
  --georel 'near;maxDistance==1000' --geometry Point \
  --coords '[139.8986,36.5592]' --attrs name
```

Five sites, among them 東小学校 and 駅東公園. `--key-values` asks for the key-values form, the simple form you saw first in step 2.

**Try without `--context`:** the same question finds nothing. Without the dictionary, the broker does not know that `EvacuationSite` means `https://datamodels.jp/ns/disaster/EvacuationSite`.

### 5. Show it on a map {#map}

Map tools read **GeoJSON**. Get all sites in the key-values form and turn them into GeoJSON with jq:

```bash
geonic entities list --type EvacuationSite --context $C --key-values \
  --limit 1000 > sites-kv.json
jq '{type: "FeatureCollection", features: map({type: "Feature",
  geometry: .location, properties: {id, name, hazardTypes,
  alsoDesignatedShelter, address: .address.addressText}})}' \
  sites-kv.json > sites.geojson
```

Open `sites.geojson` in a map tool: drag it onto [geojson.io](https://geojson.io/) in the browser, or open it in QGIS. Click a point to see its name and hazards.

To build your own web map that reads the broker directly, start from the [geonicdb-workshop](https://github.com/geolonia/geonicdb-workshop) template (in Japanese). Put your broker's address and tenant in its `.env.local`; the code that reads the data and draws it is yours to write. The template reads without logging in, so the tenant must allow anonymous reads; a tenant admin sets that up.

### 6. See the model check at work {#check}

Because you registered the model in step 3, the broker refuses data that does not fit it. Send two broken sites:

```bash
# A site without a name (the model requires one)
jq '.[1] | .id += "-test" | del(.name)' sites.jsonld > no-name.json
geonic entities create @no-name.json
# → Required attribute 'name' is missing

# A site with an attribute the model does not have
jq '.[2] | .id += "-test" | .capacity = {type: "Property", value: 500}' \
  sites.jsonld > extra.json
geonic entities create @extra.json
# → Attribute 'capacity' is not defined in data model 'EvacuationSite'
```

This is what keeps the data clean when many people and apps write to the same broker.

One limit: for a list such as `hazardTypes`, GeonicDB checks that the value is a list, not the values in it. A site with `["typhoon"]` would be stored. The converter in step 2 checks the values too, before anything is loaded. More in [What a registered model checks](/en/guide/geonicdb#checks).

## What you have now {#done}

- 198 evacuation sites in a model other cities can use too, each one validated (steps 1–2).
- If you did the second part: the sites in a broker, questions by attribute and by place answered by the broker, and a map of the result.

Next:

- **Publish the converted list:** [Publishing your list](/en/guide/publish).
- **Your own data:** [Converting your data](/en/toolkit/convert) shows the steps; [Mapping files](/en/guide/mapping) explains the mapping files; [Standards covered](/en/guide/standards) lists the standards that have one.
- **Attributes of your own** on top of a model: [Adding attributes](/en/guide/extend).
- **The same steps with curl** instead of the CLI, and more on the broker: [Use with GeonicDB](/en/guide/geonicdb).
