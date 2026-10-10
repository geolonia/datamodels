---
title: "チュートリアル：CSV ファイルから地図まで"
description: FIWARE のコンテキストブローカーを初めて試す人向け。実際のオープンデータを 1 つ、カタログのモデルに変換し、ブローカーに入れ、検索し、地図に表示する。手順ごとに説明付き
---

# チュートリアル：CSV ファイルから地図まで

FIWARE のコンテキストブローカーを初めて試す人のためのチュートリアルです。実際のオープンデータを 1 つ、ブローカーに入れ、検索し、結果を地図で見ます。手順ごとに、何が起きたか、なぜそうするかを書いています。FIWARE や NGSI-LD の知識は要りません。ターミナルが使えれば十分です。30 分ほどかかります。

データは宇都宮市の指定緊急避難場所一覧です。学校や公園など 198 か所が CSV ファイルで公開されています。ここのコマンドは、すべて 2026-10-10 に実行して確かめました。

## まず：コンテキストブローカーとは {#broker}

**コンテキストブローカー**は、まちの「いまの状態」を入れておくデータベースです。避難場所、通行止め、センサーの値、作業の依頼などです。アプリは Web を通して書き込み、読み出します。表計算ソフトにはできないことが 3 つあります。

- **どのアプリも同じ言葉で話す。** ブローカーは国際標準（ETSI）の **NGSI-LD** に従います。ある NGSI-LD ブローカー用に作ったアプリは、ほかのブローカーでも動きます。**FIWARE** はこの標準のまわりのオープンソースのコミュニティで、Orion-LD、Scorpio、GeonicDB などがこのブローカーです。このチュートリアルでは GeonicDB を使います。
- **意味と場所で検索できる。**「洪水の避難場所すべて」「駅から 1 km 以内」のように聞けます。
- **変化を知らせてもらえる。** アプリは購読しておけば、何かが変わったときに知らせを受けます。このチュートリアルではそこまでは扱いません。

ブローカーの中では、1 つの「もの」を **エンティティ** と呼びます。避難場所 1 か所が 1 つのエンティティです。エンティティには **id**（一意の名前）、**型**（`EvacuationSite`）、**属性**（名称、位置、指定されている災害の種別など）があります。

datamodels.jp が足すのは **モデル** です。型ごとに、どの属性をどんな意味で持つかを決めたものです。2 つの市が同じモデルを使えば、データがそろい、同じアプリが両方で使えます。

<svg class="flow-diagram" viewBox="0 0 460 412" role="img" aria-label="宇都宮市の CSV ファイルを EvacuationSite モデルのエンティティに変換し、コンテキストブローカーに入れ、検索して地図に表示する" xmlns="http://www.w3.org/2000/svg"><defs><marker id="tut-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="58" rx="10"/><text class="t" x="230.0" y="33">sites.csv</text><text class="s" x="230.0" y="53">宇都宮市の一覧（1 行が 1 か所）</text><rect class="box" x="20" y="121" width="420" height="58" rx="10"/><text class="t" x="230.0" y="146">198 のエンティティ</text><text class="s" x="230.0" y="166">カタログのモデル EvacuationSite</text><rect class="box main" x="20" y="234" width="420" height="58" rx="10"/><text class="t" x="230.0" y="259">コンテキストブローカー（GeonicDB）</text><text class="s" x="230.0" y="279">保存し、モデルで検査する</text><rect class="box" x="20" y="347" width="420" height="58" rx="10"/><text class="t" x="230.0" y="372">検索と地図</text><text class="s" x="230.0" y="392">「洪水の避難場所」「駅の近く」</text><line class="a" x1="230" y1="68" x2="230" y2="119" marker-end="url(#tut-ah)"/><text class="l" x="240" y="98">① 変換</text><line class="a" x1="230" y1="181" x2="230" y2="232" marker-end="url(#tut-ah)"/><text class="l" x="240" y="211">② 投入</text><line class="a" x1="230" y1="294" x2="230" y2="345" marker-end="url(#tut-ah)"/><text class="l" x="240" y="324">③ 検索、④ 地図</text></svg>

## 用意するもの {#before}

- **Node.js 24 以上**と **[jq](https://jqlang.org/)**（JSON を扱う小さなツール）。
- **GeonicDB のテナント。** テナントは、共有のブローカーの中の自分専用の場所です。ほかの人にはデータが見えません。ブローカーを運用している人から、アドレスと、テナント管理者としてのログインを受け取ってください。
- **GeonicDB CLI**（`geonic`）。GeonicDB をコマンドで操作するツールです。インストールして、1 回だけログインします。

```bash
npm install -g @geolonia/geonicdb-cli
geonic config set url "https://<your-deployment>.geonicdb.jp"
geonic auth login --tenant "<your-tenant>"
```

`geonic` はアドレスとログインを覚えるので、以下のコマンドには要りません。ログインの代わりに API キーを使うときは、[GeonicDB で使う](/guide/geonicdb#steps)を見てください。

空のフォルダを作り、以下はすべてそこで実行します。

## 1. データを取得する {#data}

宇都宮市は、この一覧を[オープンデータカタログ](https://catalog.city.utsunomiya.tochigi.jp/dataset/shiteikinkyuuhinanbashoichiran)で CC BY で公開しています。`sites.csv` としてダウンロードします。

```bash
HOST=https://catalog.city.utsunomiya.tochigi.jp
SET=dataset/4d41b0e3-b48a-4079-8896-7de6f6f1a850
FILE=resource/ab7c2ca6-9ce3-409a-947b-4744fcfec7c6/download
curl -sSfL -o sites.csv "$HOST/$SET/$FILE/092011_evacuation_space_sanitized_new.csv"
```

表計算ソフトで開いてみてください。1 行が 1 か所で、名称、緯度、経度と、災害の種別ごとの列（洪水なら `災害種別_洪水`）があります。多くの自治体が同じ列で公開しています。自治体標準オープンデータセットの形式です。

## 2. カタログのモデルに変換する {#convert}

ブローカーは CSV ファイルを受け取りません。受け取るのはエンティティです。この避難場所に対応するカタログのモデルは [EvacuationSite](/models/disaster/EvacuationSite/) で、どの列がどの属性になるかを書いた **対応表**（`jichitai-opendata-site`）があります。だから自分でコードを書く必要はありません。

```bash
npx github:geolonia/datamodels-toolkit convert disaster/EvacuationSite \
  jichitai-opendata-site sites.csv --out sites.json
```

**何が起きたか：** 1 行が 1 つのエンティティになり、1 つずつモデルで検査されました。変換は直したところを表示します。たとえば表計算ソフトで先頭の 0 が抜けた地方公共団体コード（`92011 → 092011`）です。198 か所すべてが有効です。`sites.json` の最初の 1 件を見てみましょう。

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

列 `災害種別_洪水` は `hazardTypes` の `"flood"` に、緯度と経度は GeoJSON の点になりました。名前（`name`、`hazardTypes`）はモデルのもので、どの自治体でも同じです。

次に、ブローカー用にもう一度変換します。

```bash
npx github:geolonia/datamodels-toolkit convert disaster/EvacuationSite \
  jichitai-opendata-site sites.csv --normalized --out sites.jsonld
```

`--normalized` を付けると、同じデータを NGSI-LD の正規の形（normalized）で書き出し、**@context** を付けます。@context は辞書のようなものです。ここでは、`name` が `https://uri.etsi.org/ngsi-ld/name` のことだと、ブローカーに伝えます。`hazardTypes` は `https://datamodels.jp/ns/disaster/hazardTypes` のことです。この完全な名前（**IRI**）は Web 全体で一意なので、2 つのシステムが違う意味の「name」を取り違えることがありません。

## 3. モデルを登録してデータを入れる {#load}

まずブローカーにモデルを教えます。それ以降、ブローカーは受け取った EvacuationSite を 1 つずつモデルで検査し、合わないものは拒否します。そのあとでファイルを入れます。

```bash
BASE=https://datamodels.jp
curl -sSf "$BASE/adapters/geonicdb/disaster/EvacuationSite.json" | geonic models create
geonic import sites.jsonld --input-format json
```

**何が起きたか：** `geonic models create` が、カタログが GeonicDB 用に公開しているモデルの定義を登録しました。`geonic import` が 198 のエンティティを送り、`Imported: 198 succeeded, 0 failed` と答えます。1 つめのコマンドを 2 回実行すると、2 回目は `409` になります。モデルはもう登録されています。

## 4. 検索する {#query}

ブローカーは、@context の完全な名前（IRI）で保存しています。検索するときも同じ @context を渡すと、短い名前が使えます。`--count-only` は件数だけを答えます。

```bash
C=https://datamodels.jp/context/disaster/v1.jsonld

# 全部で何か所？                                               → 198
geonic entities list --type EvacuationSite --context $C --count-only

# 洪水の避難場所                                               → 79
geonic entities list --type EvacuationSite --context $C --count-only \
  --query 'hazardTypes=="flood"'

# そのうち指定避難所も兼ねるもの                               → 69
geonic entities list --type EvacuationSite --context $C --count-only \
  --query 'hazardTypes=="flood";alsoDesignatedShelter==true'
```

`--query` は属性で絞り込みます（`;` は「かつ」）。次は場所で、宇都宮駅から 1 km 以内の避難場所を名称付きで出します。

```bash
geonic entities list --type EvacuationSite --context $C --key-values \
  --georel 'near;maxDistance==1000' --geometry Point \
  --coords '[139.8986,36.5592]' --attrs name
```

東小学校や駅東公園など 5 か所です。`--key-values` は、手順 2 で見た単純な形で返すよう頼むものです。

**`--context` を外して試してみてください：** 同じ検索で何も見つかりません。辞書が無いと、ブローカーには `EvacuationSite` が `https://datamodels.jp/ns/disaster/EvacuationSite` のことだと分からないからです。

## 5. 地図に表示する {#map}

地図のツールは **GeoJSON** を読みます。すべての避難場所を単純な形で取り出し、jq で GeoJSON に変えます。

```bash
geonic entities list --type EvacuationSite --context $C --key-values \
  --limit 1000 > sites-kv.json
jq '{type: "FeatureCollection", features: map({type: "Feature",
  geometry: .location, properties: {id, name, hazardTypes,
  alsoDesignatedShelter, address: .address.addressText}})}' \
  sites-kv.json > sites.geojson
```

`sites.geojson` を地図のツールで開きます。ブラウザで [geojson.io](https://geojson.io/) にドラッグするか、QGIS で開いてください。点をクリックすると、名称と災害の種別が見えます。

ブローカーから直接読む自分の Web 地図を作るなら、[geonicdb-workshop](https://github.com/geolonia/geonicdb-workshop) のテンプレートから始められます。

## 6. モデルの検査を見る {#check}

手順 3 でモデルを登録したので、ブローカーはモデルに合わないデータを拒否します。壊れた避難場所を 2 つ送ってみます。

```bash
# 名称の無い避難場所（モデルでは必須）
jq '.[1] | .id += "-test" | del(.name)' sites.jsonld | geonic entities create
# → Required attribute 'name' is missing

# モデルに無い属性を持つ避難場所
jq '.[2] | .id += "-test" | .capacity = {type: "Property", value: 500}' \
  sites.jsonld | geonic entities create
# → Attribute 'capacity' is not defined in data model 'EvacuationSite'
```

多くの人やアプリが同じブローカーに書き込んでも、これでデータがきれいに保たれます。

限界が 1 つあります。`hazardTypes` のようなリストでは、GeonicDB はリストであることを検査し、中の値は検査しません。`["typhoon"]` を持つ避難場所も保存されます。手順 2 の変換は中の値も検査するので、入れる前に検証しています。詳しくは[登録したモデルが検査すること](/guide/geonicdb#checks)を見てください。

## できたこと {#done}

- 198 の避難場所が、ほかの自治体も使えるモデルでブローカーに入った。
- 属性と場所で検索し、ブローカーが答えた。
- 結果を地図で見た。

次に：

- **自分のデータ：** 対応表の仕組みは[データを変換する](/guide/mapping)に、対応表がある標準の一覧は[対応している標準](/guide/standards)にあります。
- **モデルに自分の属性を足す：**[属性を足す](/guide/extend)。
- **CLI の代わりに curl で同じ手順を、ブローカーについてもっと：**[GeonicDB で使う](/guide/geonicdb)。
