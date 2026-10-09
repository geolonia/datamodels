---
title: GeonicDB で使う
description: カタログのデータモデルを GeonicDB に登録し、エンティティを作成・検索するまでの手順
---

# GeonicDB で使う

GeonicDB は、このカタログを運営している Geolonia の NGSI-LD ブローカーです。どのブローカーにも共通の手順は[使い方](/guide/use)にあります。このページでは、GeonicDB で加わる機能を説明します。**モデルを登録**でき、登録すると GeonicDB がその型のエンティティをすべてモデルで検証します。

<svg class="flow-diagram" viewBox="0 0 460 300" role="img" aria-label="datamodels.jp のモデルの定義を GeonicDB に登録し、アプリがエンティティを作成すると GeonicDB がモデルで検証し、検索できる" xmlns="http://www.w3.org/2000/svg"><defs><marker id="gdb-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="58" rx="10"/><text class="t" x="230.0" y="33">datamodels.jp</text><text class="s" x="230.0" y="53">モデルの定義（.json）と @context</text><rect class="box main" x="20" y="121" width="420" height="58" rx="10"/><text class="t" x="230.0" y="146">GeonicDB（あなたのテナント）</text><text class="s" x="230.0" y="166">登録したモデル: その型のルール</text><rect class="box" x="20" y="234" width="420" height="58" rx="10"/><text class="t" x="230.0" y="259">あなたのアプリ</text><text class="s" x="230.0" y="279">エンティティを作成・検索</text><line class="a" x1="110" y1="68" x2="110" y2="119" marker-end="url(#gdb-ah)"/><text class="l" x="120" y="98">① 登録</text><line class="a d" x1="350" y1="119" x2="350" y2="68" marker-end="url(#gdb-ah)"/><text class="l e" x="340" y="98">@context を参照</text><line class="a" x1="110" y1="232" x2="110" y2="181" marker-end="url(#gdb-ah)"/><text class="l" x="120" y="211">② 作成: 検証して保存</text><line class="a" x1="350" y1="181" x2="350" y2="232" marker-end="url(#gdb-ah)"/><text class="l e" x="340" y="211">③ 検索</text></svg>

モデルごとに、登録用の定義を `https://datamodels.jp/adapters/geonicdb/<サブジェクト>/<型>.json` で公開しています（[モデルごとの一覧](/adapters/geonicdb/)）。定義にはモデルの @context（`contextUrl`）が入っているので、登録するだけで GeonicDB がカタログの属性名を使います。

**登録したモデルが確認すること**（作成・更新のたび）: 必須属性、値の型（日時は RFC 3339 を厳密に）、許される値、パターン、最小値・最大値。モデルに無い属性は拒否されます（`additionalProperties: false` のモデル。カタログの既定）。登録は任意です。モデルを登録・変更しても、既存のエンティティは検証し直されません。

## 手順

テナントと、これらの操作を許すポリシーを付けた API キー（[API キー](https://docs.geonicdb.com/ja/saas/api-key)、[ポリシーバインディング](https://docs.geonicdb.com/ja/reference/auth#ポリシーバインディング-policyid)）、それに 3 つの環境変数が要ります: `GEONICDB_BASE_URL`（例 `https://<your-deployment>.geonicdb.jp`）、`GEONICDB_TENANT`、`GEONICDB_API_KEY`。

```bash
# 1. モデルを登録する（テナントごとに 1 回）。テナントは API キーで決まります。
curl -sSf https://datamodels.jp/adapters/geonicdb/transportation/RoadRestriction.json -o RoadRestriction.json
curl -X POST "$GEONICDB_BASE_URL/custom-data-models" \
  -H "Content-Type: application/json" -H "x-api-key: $GEONICDB_API_KEY" \
  --data @RoadRestriction.json

# 2. エンティティを作成する。モデルのページの normalized の例をそのまま。
curl -sSf https://datamodels.jp/examples/transportation/RoadRestriction/example-normalized.jsonld -o entity.jsonld
curl -X POST "$GEONICDB_BASE_URL/ngsi-ld/v1/entities" \
  -H "Content-Type: application/ld+json" \
  -H "x-api-key: $GEONICDB_API_KEY" -H "NGSILD-Tenant: $GEONICDB_TENANT" \
  --data @entity.jsonld

# 3. 検索する（通行止めだけ）。
curl "$GEONICDB_BASE_URL/ngsi-ld/v1/entities?type=RoadRestriction&q=restrictionStatus==%22closed%22" \
  -H "Accept: application/ld+json" \
  -H 'Link: <https://datamodels.jp/context/transportation/v1.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  -H "x-api-key: $GEONICDB_API_KEY" -H "NGSILD-Tenant: $GEONICDB_TENANT"
```

- 登録すると `201 Created`、同じ型名のモデルが既にあれば `409` が返ります。テナント管理者としてログインした `geonic` CLI なら、ポリシーなしで `geonic models create @RoadRestriction.json` で登録できます。
- 自分のデータは、body に @context を入れて（`application/ld+json`）送るか、`application/json` と `Link` ヘッダーで送ります。両方は同時に使いません。テナントは `NGSILD-Tenant` ヘッダーで指定します（[マルチテナンシー](https://docs.geonicdb.com/ja/core-concepts/multi-tenancy)）。

## 独自の属性

モデルはほぼ合うが独自の属性がいくつか要るときは、その属性を足したプロファイルの @context を作って置き（[属性を足す](/guide/extend)）、カタログの属性と自分の属性を持つ定義を登録します。独自の属性も他と同じように検証されます。他の案件でも役に立つ属性なら、カタログに[提案してください](https://github.com/geolonia/datamodels/issues)。

<details class="rules">
<summary>独自の属性を入れた定義を書き出す</summary>

型名をキーにした拡張ファイルを用意して書き出します。カタログの属性を再定義しようとするとエラーになります。

```json
{
  "RoadRestriction": {
    "contextUrl": "https://example.com/context/acme-transportation.jsonld",
    "propertyDetails": {
      "patrolRoute": { "ngsiType": "Property", "valueType": "string", "example": "A-3", "description": "巡回ルート", "@context": "https://example.com/ns/acme/patrolRoute" }
    }
  }
}
```

```bash
node adapters/geonicdb/export.mjs transportation --type RoadRestriction --extend ./acme.json --out ./out
```

未知の属性を検証せずに受け付けるだけなら、`--allow-additional` で書き出します。

</details>

<details class="rules">
<summary>テナント内で型名を変える</summary>

型名に接頭辞を付けたいテナント（複数の案件が共有し、ポリシーを型名で分けているときなど）は、接頭辞付きの定義を書き出せます。属性名とその意味はカタログのままです。

```bash
git clone https://github.com/geolonia/datamodels && cd datamodels && npm ci
node adapters/geonicdb/export.mjs transportation --type-prefix Acme --out ./out
```

</details>
