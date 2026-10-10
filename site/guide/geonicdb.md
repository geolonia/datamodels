---
title: GeonicDB で使う
description: カタログのデータモデルを GeonicDB に登録し、エンティティを作成・検索するまでの手順
---

# GeonicDB で使う

GeonicDB は、このカタログを運営している Geolonia の NGSI-LD ブローカーです。どのブローカーにも共通の手順は[使い方](/guide/use)にあります。このページでは、GeonicDB ならではの機能を説明します。GeonicDB には**モデルを登録**できます。登録すると、その型のエンティティはすべてモデルで検証されます。

<svg class="flow-diagram" viewBox="0 0 460 300" role="img" aria-label="datamodels.jp のモデルの定義を GeonicDB に登録し、アプリがエンティティを作成すると GeonicDB がモデルで検証し、検索できる" xmlns="http://www.w3.org/2000/svg"><defs><marker id="gdb-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="58" rx="10"/><text class="t" x="230.0" y="33">datamodels.jp</text><text class="s" x="230.0" y="53">モデルの定義（.json）と @context</text><rect class="box main" x="20" y="121" width="420" height="58" rx="10"/><text class="t" x="230.0" y="146">GeonicDB（自分のテナント）</text><text class="s" x="230.0" y="166">登録したモデル: その型のルール</text><rect class="box" x="20" y="234" width="420" height="58" rx="10"/><text class="t" x="230.0" y="259">自分のアプリ</text><text class="s" x="230.0" y="279">エンティティを作成・検索</text><line class="a" x1="110" y1="68" x2="110" y2="119" marker-end="url(#gdb-ah)"/><text class="l" x="120" y="98">① 登録</text><line class="a d" x1="350" y1="119" x2="350" y2="68" marker-end="url(#gdb-ah)"/><text class="l e" x="340" y="98">@context を参照</text><line class="a" x1="110" y1="232" x2="110" y2="181" marker-end="url(#gdb-ah)"/><text class="l" x="120" y="211">② 作成: 検証して保存</text><line class="a" x1="350" y1="181" x2="350" y2="232" marker-end="url(#gdb-ah)"/><text class="l e" x="340" y="211">③ 検索</text></svg>

モデルごとに、登録用の定義を `https://datamodels.jp/adapters/geonicdb/<サブジェクト>/<型>.json` で公開しています（[モデルごとの一覧](/adapters/geonicdb/)）。定義にはモデルの @context（`contextUrl`）が入っているので、登録するだけで、GeonicDB でカタログの属性名がそのまま使えます。

登録しなくても使えます。登録したモデルが何を検査し、何を検査しないかは、[下の節](#checks)で説明します。

## 手順

テナントと、これらの操作を許すポリシーを付けた API キーが要ります（[API キー](https://docs.geonicdb.com/ja/saas/api-key)、[ポリシーバインディング](https://docs.geonicdb.com/ja/reference/auth#ポリシーバインディング-policyid)）。使う環境変数は次の 3 つです。

- `GEONICDB_BASE_URL`（例：`https://<your-deployment>.geonicdb.jp`）
- `GEONICDB_TENANT`
- `GEONICDB_API_KEY`

::: code-group

```bash [curl]
BASE=https://datamodels.jp
MODEL=transportation/RoadRestriction
KEY="x-api-key: $GEONICDB_API_KEY"
TENANT="NGSILD-Tenant: $GEONICDB_TENANT"

# 1. モデルを登録する（テナントごとに 1 回）。テナントは API キーで決まります。
curl -sSf "$BASE/adapters/geonicdb/$MODEL.json" -o model.json
curl -X POST "$GEONICDB_BASE_URL/custom-data-models" \
  -H "Content-Type: application/json" -H "$KEY" \
  --data @model.json

# 2. エンティティを作成する。モデルのページの normalized の例から、
#    型付きの日時を文字列に直して（下の注を参照）。
curl -sSf "$BASE/examples/$MODEL/example-normalized.jsonld" \
  | jq 'walk(if type == "object" and has("@value") then .["@value"] else . end)' \
  > entity.jsonld
curl -X POST "$GEONICDB_BASE_URL/ngsi-ld/v1/entities" \
  -H "Content-Type: application/ld+json" -H "$KEY" -H "$TENANT" \
  --data @entity.jsonld

# 3. 検索する（通行止めだけ）。
CONTEXT="$BASE/context/transportation/v1.jsonld"
REL='rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'
curl -G "$GEONICDB_BASE_URL/ngsi-ld/v1/entities" \
  --data-urlencode 'type=RoadRestriction' \
  --data-urlencode 'q=restrictionStatus=="closed"' \
  -H "Accept: application/ld+json" -H "Link: <$CONTEXT>; $REL" \
  -H "$KEY" -H "$TENANT"
```

```bash [GeonicDB CLI]
BASE=https://datamodels.jp
MODEL=transportation/RoadRestriction
# 最初に 1 回：送り先。API キーで使うときは GDB_API_KEY も設定します。
geonic config set url "$GEONICDB_BASE_URL"
geonic config set service "$GEONICDB_TENANT"
export GDB_API_KEY="$GEONICDB_API_KEY"

# 1. モデルを登録する（テナントごとに 1 回）。
curl -sSf "$BASE/adapters/geonicdb/$MODEL.json" | geonic models create

# 2. エンティティを作成する。モデルのページの normalized の例から、
#    型付きの日時を文字列に直して（下の注を参照）。
curl -sSf "$BASE/examples/$MODEL/example-normalized.jsonld" \
  | jq 'walk(if type == "object" and has("@value") then .["@value"] else . end)' \
  | geonic entities create

# 3. 検索する（通行止めだけ）。
geonic entities list --type RoadRestriction \
  --query 'restrictionStatus=="closed"' \
  --context "$BASE/context/transportation/v1.jsonld"
```

:::

- 登録すると `201 Created`、同じ型名のモデルが既にあれば `409` が返ります。登録したモデルを変えるときは `PATCH /custom-data-models/<型名>` か `geonic models update <型名> @model.json` を使います。
- **型付きの日時：** normalized の例では、日時を `{"@type": "DateTime", "@value": "…"}` の形で書いています。ただし、GeonicDB のモデルの検査は、今のところ文字列しか受け付けません。そのため手順 2 では、[jq](https://jqlang.org/) で文字列に直しています（[#185](https://github.com/geolonia/datamodels/issues/185)）。自分のデータでは、`"validFrom": {"type": "Property", "value": "2026-07-08T09:00:00+09:00"}` のように文字列で送れます。
- **GeonicDB CLI：** [geonicdb-cli](https://github.com/geolonia/geonicdb-cli)（`npm install -g @geolonia/geonicdb-cli`）。`geonic auth login` でテナント管理者としてログインすれば、API キーもポリシーも要りません。保存したログイン情報は `--api-key` より優先されるので、API キーで使うときは、先に `geonic auth logout` を実行してください。どのコマンドも、`--dry-run` を付けると、実際には送らずにリクエストの内容を表示します。
- 自分のデータを送るときは、@context をボディに入れて（`application/ld+json`）送るか、`application/json` と `Link` ヘッダーで送ります。両方を同時には使いません。テナントは `NGSILD-Tenant` ヘッダーで指定します（[マルチテナンシー](https://docs.geonicdb.com/ja/core-concepts/multi-tenancy)）。

## 登録したモデルが検査すること {#checks}

GeonicDB は、その型のエンティティを作成・変更するたびに検査します。まとめて送るとき（バッチ）や NGSIv2 で送るときも同じです。

- 必須の属性があること
- 値の型が合っていること（文字列、数値、整数、真偽値、リスト、オブジェクト、GeoJSON、URI、RFC 3339 の日時）と、長さ、最小値・最大値、パターン、許される値のルールを守っていること
- モデルに無い属性が含まれていないこと（カタログの定義では許していません）
- 一意でなければならない組み合わせが一意であること（定義で宣言していれば）

検査しないこと：

- リストの中の値（許される値、最低の個数など）。リストであることだけを検査します（カタログの JSON Schema は中の値も検査します。`datamodels convert` の変換時など）。
- 属性が Property と Relationship のどちらで送られたか、Relationship がどの型を指しているか。
- モデルを登録していない型のエンティティ。そのまま保存されます。
- 型を複数持つエンティティの 2 つめ以降の型。検査するのは 1 つめの型だけです。
- モデルを登録・変更する前からあるエンティティ。変更の影響は、試しに実行して確かめられます。何も変えずに、モデルに合わなくなるエンティティの数と例が返ります。
  - API：`PATCH /custom-data-models/<型名>?dryRun=true`。
  - CLI：`geonic models update <型名> @model.json --api-dry-run`。

## 独自の属性

モデルはほぼ合うものの、独自の属性がいくつか要るときは、その属性を足した @context（プロファイル）を作って公開します（[属性を足す](/guide/extend)）。そのうえで、カタログの属性と自分の属性の両方を含む定義を登録します。独自の属性も、ほかの属性と同じように検証されます。ほかの案件でも役に立つ属性なら、カタログに[提案してください](https://github.com/geolonia/datamodels/issues)。

<details class="rules">
<summary>独自の属性を入れた定義を書き出す</summary>

型名をキーにした拡張ファイルを用意し、定義を書き出します。カタログの属性を定義し直そうとすると、エラーになります。

```json
{
  "RoadRestriction": {
    "contextUrl": "https://example.com/context/acme-transportation.jsonld",
    "propertyDetails": {
      "patrolRoute": {
        "ngsiType": "Property",
        "valueType": "string",
        "example": "A-3",
        "description": "巡回ルート",
        "@context": "https://example.com/ns/acme/patrolRoute"
      }
    }
  }
}
```

```bash
node adapters/geonicdb/export.mjs transportation \
  --type RoadRestriction --extend ./acme.json --out ./out
```

未知の属性を検証せずに受け付けるだけなら、`--allow-additional` で書き出します。

</details>

<details class="rules">
<summary>テナント内で型名や属性名を変える</summary>

型名に接頭辞を付けたいテナント（複数の案件が共有し、ポリシーを型名で分けているときなど）は、接頭辞付きの定義を書き出せます。属性名とその意味はカタログのままです。

```bash
git clone https://github.com/geolonia/datamodels && cd datamodels && npm ci
node adapters/geonicdb/export.mjs transportation \
  --type-prefix Acme --out ./out
```

型や属性を独自の名前で使う（[独自の名前で使う](/guide/names)）なら、自分の名前で登録し、`contextUrl` に自分の @context を指定します。書き出しスクリプトが名前をまとめて置き換えます。各属性の意味は、カタログと同じです。

```bash
CONTEXT=https://example.com/context/city-disaster.jsonld
node adapters/geonicdb/export.mjs task --type Project --type-name Saigai \
  --context-url "$CONTEXT" --out ./out
node adapters/geonicdb/export.mjs task --type Task \
  --rename assignee=responsibleTeam \
  --context-url "$CONTEXT" --out ./out
```

</details>
