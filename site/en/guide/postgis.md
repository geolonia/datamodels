---
title: Using PostgreSQL / PostGIS
description: Load a model's table into PostGIS, insert a row, see a wrong value rejected, and query by distance
---

# Using PostgreSQL / PostGIS

Every entity model page has a **PostgreSQL / PostGIS table** in the **Download** row: a `CREATE TABLE` with the model's rules as constraints, a spatial index, and comments with each attribute's IRI. This page loads the table of [designated emergency evacuation site (EvacuationSite)](/en/models/disaster/EvacuationSite/) into PostGIS, adds a site, and asks which sites are near a station.

<svg class="flow-diagram" viewBox="0 0 460 290" role="img" aria-label="Load the model's SQL file into PostGIS to make the table, then insert rows and query them by distance." xmlns="http://www.w3.org/2000/svg"><defs><marker id="pg-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="58" rx="10"/><text class="t m" x="230" y="33">EvacuationSite.sql</text><text class="s" x="230" y="53">CREATE TABLE, CHECKs, comments with IRIs</text><line class="a" x1="230" y1="68" x2="230" y2="114" marker-end="url(#pg-ah)"/><text class="l" x="242" y="95">① load with psql</text><rect class="box main" x="20" y="116" width="420" height="58" rx="10"/><text class="t" x="230" y="141">Table evacuation_site</text><text class="s" x="230" y="161">PostgreSQL / PostGIS</text><line class="a" x1="230" y1="176" x2="230" y2="222" marker-end="url(#pg-ah)"/><text class="l" x="242" y="203">② insert rows, query</text><rect class="box" x="20" y="224" width="420" height="58" rx="10"/><text class="t" x="230" y="249">Query result</text><text class="s" x="230" y="269">sites within 1 km of a station</text></svg>

You need Docker. A PostgreSQL with PostGIS of your own works the same way.

## 1. Start PostGIS {#start}

```bash
docker run -d --name postgis -e POSTGRES_HOST_AUTH_METHOD=trust \
  postgis/postgis:16-3.4
# Wait until the database is ready (about 10 seconds the first time).
until docker logs postgis 2>&1 | grep -q "init process complete"; do
  sleep 1
done
```

`POSTGRES_HOST_AUTH_METHOD=trust` lets anyone connect without a password: use it only for a test on your own computer.

## 2. Create the table {#table}

```bash
BASE=https://datamodels.jp/adapters
curl -sSfO "$BASE/postgis/disaster/EvacuationSite.sql"
docker exec -i postgis psql -U postgres < EvacuationSite.sql
```

```text
CREATE FUNCTION
CREATE TABLE
CREATE INDEX
COMMENT
COMMENT
…
```

The columns are the attributes in snake_case: `hazardTypes` becomes `hazard_types`. Each field of a value gets its own column (`address.addressText` becomes `address_address_text`), a list is an array, and the location is a `geometry(Point, 4326)`.

## 3. Add a site {#insert}

Open a SQL prompt with `docker exec -it postgis psql -U postgres` and run:

```sql
INSERT INTO evacuation_site (id, name, external_site_id,
  local_government_code, address_address_text, location,
  hazard_types, also_designated_shelter)
VALUES ('urn:ngsi-ld:EvacuationSite:0012', '都立一橋高校', '13101-0012',
  '131016', '東京都千代田区東神田1-12-13',
  ST_SetSRID(ST_MakePoint(139.7810002, 35.6945488), 4326),
  ARRAY['stormSurge', 'earthquake', 'inlandFlood'], true);
```

```text
INSERT 0 1
```

The table refuses values that break the model's rules: allowed values, patterns such as the 6-digit local government code, minimums, and rules on several columns ("externalSiteId or nationalShelterId"). `fire` is not a hazard type of this model:

```sql
UPDATE evacuation_site SET hazard_types = ARRAY['fire']
WHERE id = 'urn:ngsi-ld:EvacuationSite:0012';
```

```text
ERROR:  new row for relation "evacuation_site" violates check constraint "evacuation_site_hazard_types_check"
DETAIL:  Failing row contains (urn:ngsi-ld:EvacuationSite:0012, 都立一橋高校, null, …).
```

## 4. Query by distance {#query}

Sites within 1 km of Akihabara Station, with the distance in metres:

```sql
WITH station AS (
  SELECT ST_SetSRID(ST_MakePoint(139.7731, 35.6984), 4326)::geography AS p
)
SELECT name, round(ST_Distance(location::geography, p)) AS metres
FROM evacuation_site, station
WHERE ST_DWithin(location::geography, p, 1000);
```

```text
     name     | metres
--------------+--------
 都立一橋高校 |    833
(1 row)
```

The query measures in metres on the earth (`geography`). The spatial index of the file is on the `geometry`; for a large table, add one that this query uses: `CREATE INDEX ON evacuation_site USING gist ((location::geography));`.

## The IRIs in the comments {#iris}

Each column's comment has the description in Japanese and English, and the attribute's IRI in angle brackets on the last line. Database tools show it, and a query can read it:

```sql
SELECT attname AS "column",
  substring(col_description(attrelid, attnum) from '<([^>]+)>$') AS iri
FROM pg_attribute
WHERE attrelid = 'evacuation_site'::regclass
  AND attname IN ('name', 'address_postal_code', 'hazard_types');
```

```text
       column        |                      iri
---------------------+-----------------------------------------------
 name                | https://uri.etsi.org/ngsi-ld/name
 address_postal_code | https://schema.org/postalCode
 hazard_types        | https://datamodels.jp/ns/disaster/hazardTypes
(3 rows)
```

The IRIs are the same as in the model's @context, so a row and an NGSI-LD entity of the model mean the same thing. When you are done, remove the container with `docker rm -f postgis`.

## Your own models {#own-models}

For the models of a site of your own, make the same file with `datamodels export` ([Exporting to other tools](/en/toolkit/export)).
