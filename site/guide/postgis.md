---
title: PostgreSQL / PostGIS で使う
description: モデルのテーブルを PostGIS に作り、行を入れ、誤った値が拒まれることを確かめ、距離で検索する
---

# PostgreSQL / PostGIS で使う

エンティティのモデルのページには、**ダウンロード**の行に **PostgreSQL / PostGIS のテーブル**があります。モデルの決まりを制約にした `CREATE TABLE` です。空間インデックスと、各属性の IRI を書いたコメントも付いています。このページでは、[指定緊急避難場所（EvacuationSite）](/models/disaster/EvacuationSite/)のテーブルを PostGIS に作り、避難場所を 1 か所入れて、駅の近くの避難場所を検索します。

<svg class="flow-diagram" viewBox="0 0 460 290" role="img" aria-label="モデルの SQL ファイルを PostGIS に読み込むとテーブルができます。行を入れ、範囲で検索します。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="pg-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="58" rx="10"/><text class="t m" x="230" y="33">EvacuationSite.sql</text><text class="s" x="230" y="53">CREATE TABLE、CHECK、IRI のコメント</text><line class="a" x1="230" y1="68" x2="230" y2="114" marker-end="url(#pg-ah)"/><text class="l" x="242" y="95">① psql で読み込む</text><rect class="box main" x="20" y="116" width="420" height="58" rx="10"/><text class="t" x="230" y="141">evacuation_site テーブル</text><text class="s" x="230" y="161">PostgreSQL / PostGIS</text><line class="a" x1="230" y1="176" x2="230" y2="222" marker-end="url(#pg-ah)"/><text class="l" x="242" y="203">② 行を入れて、検索する</text><rect class="box" x="20" y="224" width="420" height="58" rx="10"/><text class="t" x="230" y="249">検索の結果</text><text class="s" x="230" y="269">駅から 1 km 以内の避難場所</text></svg>

Docker が必要です。PostGIS を入れた自分の PostgreSQL でも、同じ手順で使えます。

## 1. PostGIS を起動する {#start}

```bash
docker run -d --name datamodels-postgis -e POSTGRES_HOST_AUTH_METHOD=trust \
  postgis/postgis:16-3.4
# データベースの準備ができるまで待つ（初回は 10 秒ほど、長くても 2 分）。
for i in $(seq 120); do
  docker logs datamodels-postgis 2>&1 | grep -q "init process complete" &&
    docker exec datamodels-postgis pg_isready -U postgres -q && break
  sleep 1
done
# 「accepting connections」なら準備完了。そうでなければ、ログに原因が出る。
docker exec datamodels-postgis pg_isready -U postgres || docker logs datamodels-postgis
```

`POSTGRES_HOST_AUTH_METHOD=trust` では、パスワードなしで誰でも接続できます。自分のコンピューターでの試験だけに使ってください。

このイメージは amd64 用だけです。Apple Silicon の Mac では、Docker がエミュレーションで動かします。プラットフォームが違うという警告が出ますが、このページの手順はそのまま動きます。

## 2. テーブルを作る {#table}

```bash
BASE=https://datamodels.jp/adapters
curl -sSfO "$BASE/postgis/disaster/EvacuationSite.sql"
docker exec -i datamodels-postgis psql -U postgres < EvacuationSite.sql
```

```text
CREATE FUNCTION
CREATE TABLE
CREATE INDEX
COMMENT
COMMENT
…
```

列の名前は、属性名をスネークケースにしたものです。たとえば `hazardTypes` は `hazard_types` になります。値の中の項目は、それぞれ 1 つの列になります（`address.addressText` は `address_address_text`）。複数の値は配列で、位置は `geometry(Point, 4326)` です。

## 3. 避難場所を入れる {#insert}

`docker exec -it datamodels-postgis psql -U postgres` で SQL のプロンプトを開き、次を実行します。名称、住所、位置、災害の種別は、国土地理院の指定緊急避難場所データ（千代田区）と同じです。区の番号 `13101-0012` は、例のために作った値です。

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

モデルの決まりに合わない値は、テーブルが受け付けません。使える値、6 桁の全国地方公共団体コードのようなパターン、最小値、複数の列にまたがる決まり（「externalSiteId か nationalShelterId」）を確かめます。たとえば、`fire` はこのモデルの災害の種別にありません。

```sql
UPDATE evacuation_site SET hazard_types = ARRAY['fire']
WHERE id = 'urn:ngsi-ld:EvacuationSite:0012';
```

```text
ERROR:  new row for relation "evacuation_site" violates check constraint "evacuation_site_hazard_types_check"
DETAIL:  Failing row contains (urn:ngsi-ld:EvacuationSite:0012, 都立一橋高校, null, …).
```

## 4. 距離で検索する {#query}

秋葉原駅から 1 km 以内の避難場所を、距離（メートル）と一緒に取り出します。

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

この検索は、地球上の距離（`geography`）をメートルで測ります。ファイルの空間インデックスは `geometry` に付いています。大きなテーブルでは、この検索が使うインデックスを足してください。`CREATE INDEX ON evacuation_site USING gist ((location::geography));` です。

## コメントの IRI {#iris}

各列のコメントには、日本語と英語の説明があります。最後の行には、属性の IRI を山かっこで囲んで書いています。データベースのツールで見られるほか、SQL でも読み出せます。

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

IRI はモデルの @context と同じです。そのため、テーブルの行と NGSI-LD のエンティティは、同じ意味のデータとして扱えます。終わったら、`docker rm -f datamodels-postgis` でコンテナーを削除します。

## 自分のモデル {#own-models}

自分のサイトのモデルでも、`datamodels export` で同じファイルを作れます（[他のツールに書き出す](/toolkit/export)）。
