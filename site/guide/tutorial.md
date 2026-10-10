---
title: "チュートリアル：CSV ファイルから地図まで"
description: FIWARE のコンテキストブローカーを初めて試す人向けのチュートリアル。実際のオープンデータをカタログのモデルに変換し、ブローカーに登録して、検索し、地図に表示するまでを手順ごとに説明します。
---

# チュートリアル：CSV ファイルから地図まで

FIWARE のコンテキストブローカーを初めて試す人のためのチュートリアルです。実際のオープンデータをブローカーに登録し、検索して、結果を地図で確認します。各手順で、何が起きたのか、なぜそうするのかも説明します。FIWARE や NGSI-LD の知識は要りません。Bash か zsh が使えるターミナル（macOS、Linux、Windows では WSL）があれば大丈夫です。所要時間は 30 分ほどです。

使うのは、宇都宮市の指定緊急避難場所一覧です。学校や公園など 198 か所が、CSV ファイルで公開されています。ここに載せたコマンドは、すべて 2026-10-10 に実行して確かめています。

## はじめに：コンテキストブローカーとは {#broker}

**コンテキストブローカー**は、まちの「いまの状態」をためておくデータベースです。避難場所、通行止め、センサーの値、作業の依頼などを扱います。アプリは Web 経由でデータを書き込み、読み出します。表計算ソフトとの違いは、次の 3 つです。

- **どのアプリも同じ形式でやり取りできる。** ブローカーは、国際標準（ETSI）の **NGSI-LD** に従っています。そのため、ある NGSI-LD ブローカー向けに作ったアプリは、ほかのブローカーにも移しやすくなります。ただし、標準のどこまでに対応しているかは、ブローカーによって違います。**FIWARE** は、この標準を中心としたオープンソースのコミュニティです。Orion-LD、Scorpio、GeonicDB などが、そのブローカーです。このチュートリアルでは GeonicDB を使います。
- **意味や場所で検索できる。**「洪水のときの避難場所をすべて」「駅から 1 km 以内」のように検索できます。
- **変化を通知してもらえる。** アプリが購読（サブスクリプション）しておけば、データが変わったときに通知が届きます。このチュートリアルでは扱いません。

ブローカーでは、データの 1 件 1 件を**エンティティ**と呼びます。避難場所 1 か所が、1 つのエンティティです。エンティティには、**id**（一意の名前）、**型**（ここでは `EvacuationSite`）、**属性**（名称、位置、対象となる災害の種別など）があります。

ここに datamodels.jp の**モデル**が加わります。モデルは、型ごとに、どんな属性をどんな意味で持つかを決めたものです。2 つの市が同じモデルを使えば、データの形がそろい、同じアプリを両方の市で使えます。

<svg class="flow-diagram" viewBox="0 0 460 412" role="img" aria-label="宇都宮市の CSV ファイルを EvacuationSite モデルのエンティティに変換し、コンテキストブローカーに入れ、検索して地図に表示する" xmlns="http://www.w3.org/2000/svg"><defs><marker id="tut-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="58" rx="10"/><text class="t" x="230.0" y="33">sites.csv</text><text class="s" x="230.0" y="53">宇都宮市の一覧（1 行が 1 か所）</text><rect class="box" x="20" y="121" width="420" height="58" rx="10"/><text class="t" x="230.0" y="146">198 のエンティティ</text><text class="s" x="230.0" y="166">カタログのモデル EvacuationSite</text><rect class="box main" x="20" y="234" width="420" height="58" rx="10"/><text class="t" x="230.0" y="259">コンテキストブローカー（GeonicDB）</text><text class="s" x="230.0" y="279">保存し、モデルで検査する</text><rect class="box" x="20" y="347" width="420" height="58" rx="10"/><text class="t" x="230.0" y="372">検索と地図</text><text class="s" x="230.0" y="392">「洪水の避難場所」「駅の近く」</text><line class="a" x1="230" y1="68" x2="230" y2="119" marker-end="url(#tut-ah)"/><text class="l" x="240" y="98">① 変換</text><line class="a" x1="230" y1="181" x2="230" y2="232" marker-end="url(#tut-ah)"/><text class="l" x="240" y="211">② 投入</text><line class="a" x1="230" y1="294" x2="230" y2="345" marker-end="url(#tut-ah)"/><text class="l" x="240" y="324">③ 検索、④ 地図</text></svg>

## 用意するもの {#before}

- **Node.js 24 以上**と **[jq](https://jqlang.org/)**（JSON を扱う小さなツール）。
- **GeonicDB のテナント。** テナントは、共用のブローカーの中にある自分専用の領域です。ほかの人からはデータが見えません。ブローカーの運用者から、アドレスとテナント管理者のログイン情報を受け取ってください。
- **GeonicDB CLI**（`geonic`）。GeonicDB をコマンドで操作するツールです。インストールして、最初に一度だけログインします。

```bash
npm install -g @geolonia/geonicdb-cli
geonic config set url "https://<your-deployment>.geonicdb.jp"
geonic auth login --tenant "<your-tenant>"
```

`geonic` はアドレスとログイン情報を覚えているので、以下のコマンドで毎回指定する必要はありません。ログインの代わりに API キーを使う場合は、[GeonicDB で使う](/guide/geonicdb#steps)を参照してください。

作業用に空のフォルダを作り、以下のコマンドはすべてそこで実行します。

## 1. データを取得する {#data}

宇都宮市は、この一覧を[オープンデータカタログ](https://catalog.city.utsunomiya.tochigi.jp/dataset/shiteikinkyuuhinanbashoichiran)で、CC BY ライセンスで公開しています。`sites.csv` という名前でダウンロードします。

```bash
HOST=https://catalog.city.utsunomiya.tochigi.jp
SET=dataset/4d41b0e3-b48a-4079-8896-7de6f6f1a850
FILE=resource/ab7c2ca6-9ce3-409a-947b-4744fcfec7c6/download
curl -sSfL -o sites.csv "$HOST/$SET/$FILE/092011_evacuation_space_sanitized_new.csv"
```

表計算ソフトで開いてみてください。1 行が避難場所 1 か所で、名称、緯度、経度のほか、災害の種別ごとの列（洪水なら `災害種別_洪水`）があります。これは自治体標準オープンデータセットの形式で、多くの自治体が同じ列で公開しています。

## 2. カタログのモデルに変換する {#convert}

ブローカーに登録できるのは、CSV ファイルではなくエンティティです。この避難場所に当たるカタログのモデルは [EvacuationSite](/models/disaster/EvacuationSite/) です。このモデルには、どの列をどの属性にするかを書いた**対応表**（`jichitai-opendata-site`）が用意されています。そのため、変換のコードを自分で書く必要はありません。

```bash
npx github:geolonia/datamodels-toolkit convert disaster/EvacuationSite \
  jichitai-opendata-site sites.csv --out sites.json
```

**何が起きたか：** CSV の 1 行が 1 つのエンティティになり、1 件ずつモデルで検査されました。変換ツールは、自動で直した箇所も表示します。たとえば、表計算ソフトで先頭の 0 が落ちた地方公共団体コード（`92011 → 092011`）です。198 か所すべてが有効でした。`sites.json` の最初の 1 件を見てみましょう。

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

列 `災害種別_洪水` は `hazardTypes` の `"flood"` に、緯度と経度は GeoJSON の点になりました。`name` や `hazardTypes` という名前はモデルで決まっているので、どの自治体のデータでも同じです。

続いて、ブローカーに登録するための形にも変換します。

```bash
npx github:geolonia/datamodels-toolkit convert disaster/EvacuationSite \
  jichitai-opendata-site sites.csv --normalized --out sites.jsonld
```

`--normalized` を付けると、同じデータを NGSI-LD の正規の形（normalized）で書き出し、**@context** を付けます。@context は辞書のようなものです。たとえば、`name` が `https://uri.etsi.org/ngsi-ld/name` を指すことをブローカーに伝えます。`hazardTypes` は `https://datamodels.jp/ns/disaster/hazardTypes` を指します。この完全な名前（**IRI**）は Web 全体で一意なので、別々のシステムが、意味の違う「name」を取り違えることはありません。

## 3. モデルを登録し、データを入れる {#load}

まず、ブローカーにモデルを登録します。登録すると、ブローカーは EvacuationSite を受け取るたびにモデルで検査し、合わないデータを受け付けなくなります。そのあとで、ファイルのデータを入れます。

```bash
BASE=https://datamodels.jp
curl -sSf "$BASE/adapters/geonicdb/disaster/EvacuationSite.json" | geonic models create
geonic import sites.jsonld --input-format json
```

**何が起きたか：** `geonic models create` で、カタログが GeonicDB 用に公開しているモデルの定義を登録しました。`geonic import` は 198 件のエンティティを送り、`Imported: 198 succeeded, 0 failed` と返します。1 つ目のコマンドをもう一度実行すると、`409` になります。モデルがすでに登録されているためです。

## 4. 検索する {#query}

ブローカーは、属性を完全な名前（IRI）で保存しています。検索するときにも同じ @context を渡せば、短い名前で指定できます。`--count-only` を付けると、件数だけが返ります。

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

`--query` は属性で絞り込みます（`;` は「かつ」）。次は場所で絞り込みます。宇都宮駅から 1 km 以内の避難場所を、名称付きで取り出します。

```bash
geonic entities list --type EvacuationSite --context $C --key-values \
  --georel 'near;maxDistance==1000' --geometry Point \
  --coords '[139.8986,36.5592]' --attrs name
```

東小学校や駅東公園など、5 か所が見つかります。`--key-values` は、手順 2 で見た単純な形で返すように指定するオプションです。

**`--context` を外して試してみてください：** 同じ検索でも、何も見つかりません。辞書が無いと、`EvacuationSite` が `https://datamodels.jp/ns/disaster/EvacuationSite` のことだと、ブローカーには分からないからです。

## 5. 地図に表示する {#map}

地図のツールは **GeoJSON** を読み込みます。すべての避難場所を単純な形で取り出し、jq で GeoJSON に変換します。

```bash
geonic entities list --type EvacuationSite --context $C --key-values \
  --limit 1000 > sites-kv.json
jq '{type: "FeatureCollection", features: map({type: "Feature",
  geometry: .location, properties: {id, name, hazardTypes,
  alsoDesignatedShelter, address: .address.addressText}})}' \
  sites-kv.json > sites.geojson
```

`sites.geojson` を地図のツールで開きます。ブラウザで [geojson.io](https://geojson.io/) にドラッグするか、QGIS で開いてください。点を選ぶと、名称と災害の種別が表示されます。

ブローカーから直接データを読む Web 地図を作りたい場合は、[geonicdb-workshop](https://github.com/geolonia/geonicdb-workshop) のテンプレートから始められます。

## 6. モデルによる検査を確かめる {#check}

手順 3 でモデルを登録したので、ブローカーはモデルに合わないデータを受け付けません。問題のある避難場所を 2 件送って、確かめてみましょう。

```bash
# 名称の無い避難場所（モデルでは必須）
jq '.[1] | .id += "-test" | del(.name)' sites.jsonld | geonic entities create
# → Required attribute 'name' is missing

# モデルに無い属性を持つ避難場所
jq '.[2] | .id += "-test" | .capacity = {type: "Property", value: 500}' \
  sites.jsonld | geonic entities create
# → Attribute 'capacity' is not defined in data model 'EvacuationSite'
```

大勢の人や多くのアプリが同じブローカーに書き込んでも、これでデータの品質が保たれます。

ただし、制約が 1 つあります。`hazardTypes` のようなリストについて、GeonicDB は、リストであることだけを検査し、中の値を検査しません。そのため、`["typhoon"]` を持つ避難場所も保存されてしまいます。手順 2 の変換では中の値も検査しているので、登録する前の時点で検証できています。詳しくは[登録したモデルが検査すること](/guide/geonicdb#checks)を参照してください。

## できたこと {#done}

- 198 か所の避難場所を、ほかの自治体も使えるモデルでブローカーに登録しました。
- 属性と場所で検索し、ブローカーから結果を得ました。
- 結果を地図で確認しました。

次のステップ：

- **自分のデータを使う：** 対応表の仕組みは[データを変換する](/guide/mapping)、対応表がある標準の一覧は[対応している標準](/guide/standards)にあります。
- **モデルに自分の属性を足す：**[属性を足す](/guide/extend)を参照してください。
- **CLI の代わりに curl で同じ手順を試す、ブローカーについてもっと知る：**[GeonicDB で使う](/guide/geonicdb)を参照してください。
