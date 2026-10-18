---
title: GeonicDB で使う
description: カタログのデータモデルを GeonicDB に登録し、エンティティを作成・検索するまでの手順
---

# GeonicDB で使う

GeonicDB は、このカタログを運営している Geolonia の NGSI-LD ブローカーです。どのブローカーにも共通の手順は[使い方](/guide/use)にあります。このページでは、GeonicDB ならではの機能を説明します。GeonicDB には**モデルを登録**できます。登録すると、その型のエンティティはすべてモデルで検証されます。

<svg class="flow-diagram" viewBox="0 0 460 300" role="img" aria-label="datamodels.jp のモデルの定義を GeonicDB に登録し、アプリがエンティティを作成すると GeonicDB がモデルで検証し、検索できる" xmlns="http://www.w3.org/2000/svg"><defs><marker id="gdb-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="58" rx="10"/><text class="t" x="230.0" y="33">datamodels.jp</text><text class="s" x="230.0" y="53">モデルの定義（.json）と @context</text><rect class="box main" x="20" y="121" width="420" height="58" rx="10"/><text class="t" x="230.0" y="146">GeonicDB（自分のテナント）</text><text class="s" x="230.0" y="166">登録したモデル: その型のルール</text><rect class="box" x="20" y="234" width="420" height="58" rx="10"/><text class="t" x="230.0" y="259">自分のアプリ</text><text class="s" x="230.0" y="279">エンティティを作成・検索</text><line class="a" x1="110" y1="68" x2="110" y2="119" marker-end="url(#gdb-ah)"/><text class="l" x="120" y="98">① 登録</text><line class="a d" x1="350" y1="119" x2="350" y2="68" marker-end="url(#gdb-ah)"/><text class="l e" x="340" y="98">@context を参照</text><line class="a" x1="110" y1="232" x2="110" y2="181" marker-end="url(#gdb-ah)"/><text class="l" x="120" y="211">② 作成: 検証して保存</text><line class="a" x1="350" y1="181" x2="350" y2="232" marker-end="url(#gdb-ah)"/><text class="l e" x="340" y="211">③ 検索</text></svg>

モデルごとに、登録用の定義を `https://datamodels.jp/adapters/geonicdb/<subject>/<Type>.json` で公開しています（[モデルごとの一覧](/adapters/geonicdb/)）。定義にはモデルの @context（`contextUrl`）が入っているので、登録するだけで、GeonicDB でカタログの属性名がそのまま使えます。

登録しなくても使えます。登録したモデルが何を検証し、何を検証しないかは、[下の節](#checks)で説明します。

## 手順 {#steps}

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

# 2. エンティティを作成する。モデルのページの normalized の例を、
#    そのまま送ります（GeonicDB v0.22.0 以降。下の注を参照）。
curl -sSf "$BASE/examples/$MODEL/example-normalized.jsonld" -o entity.jsonld
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
curl -sSf "$BASE/adapters/geonicdb/$MODEL.json" -o model.json
geonic models create @model.json

# 2. エンティティを作成する。モデルのページの normalized の例を、
#    そのまま送ります（GeonicDB v0.22.0 以降。下の注を参照）。
curl -sSf "$BASE/examples/$MODEL/example-normalized.jsonld" -o entity.jsonld
geonic entities create @entity.jsonld

# 3. 検索する（通行止めだけ）。
geonic entities list --type RoadRestriction \
  --query 'restrictionStatus=="closed"' \
  --context "$BASE/context/transportation/v1.jsonld"
```

:::

- 登録すると `201 Created` が返ります。同じ型名のモデルが既にあれば、`Custom data model already exists` のエラー（HTTP 400）になります。登録したモデルを変えるときは `PATCH /custom-data-models/<Type>` か `geonic models update <Type> @model.json` を使います。
- **Decision：** Decision のモデルには、VocabProperty と JsonProperty の属性があります。GeonicDB は、v0.23.0 からこの 2 つの型をモデルで受け付けます。それより古い GeonicDB では、登録が HTTP 400 のエラーになります。
- **型付きの日時：** normalized の例では、日時を `{"@type": "DateTime", "@value": "…"}` の形で書いています。GeonicDB は、v0.22.0 からこの形を受け付けます。それより古い GeonicDB を使うときと、Task・Milestone・Project の例を送るときは、[jq](https://jqlang.org/) で日時を文字列に直します。Task などでは、`MODEL=task/Task` のように `MODEL` を変え、先にそのモデルを登録します。そのあと手順 2 の 2 つ目のコマンド（`curl -X POST … --data @entity.jsonld`）で送ります。CLI では `geonic entities create @entity.jsonld` です。

  ```bash
  curl -sSf "$BASE/examples/$MODEL/example-normalized.jsonld" -o typed.jsonld
  jq 'walk(if type == "object" and has("@value") then .["@value"] else . end)' \
    typed.jsonld > entity.jsonld
  ```

  Task と Milestone の `start`・`due`、Project の `start`・`end` は、v0.22.0 以降でも文字列で送る必要があります。これらは日付だけの値も取るので、モデルでは文字列として定義しています。文字列の検証は、型付きの値を受け付けません（[#185](https://github.com/geolonia/datamodels/issues/185)）。自分のデータでは、`"validFrom": {"type": "Property", "value": "2026-07-08T09:00:00+09:00"}` のように文字列で送れます。
- **GeonicDB CLI：** [geonicdb-cli](https://github.com/geolonia/geonicdb-cli)（`npm install -g @geolonia/geonicdb-cli@0.26.1`）。`geonic auth login` でテナント管理者としてログインすれば、API キーもポリシーも要りません。保存したログイン情報は `--api-key` より優先されるので、API キーで使うときは、先に `geonic auth logout` を実行してください。どのコマンドも、`--dry-run` を付けると、実際には送らずにリクエストの内容を表示します。
- 自分のデータを送るときは、@context をボディに入れて（`application/ld+json`）送るか、`application/json` と `Link` ヘッダーで送ります。両方を同時には使いません。テナントは `NGSILD-Tenant` ヘッダーで指定します（[マルチテナンシー](https://docs.geonicdb.com/ja/core-concepts/multi-tenancy)）。

## 登録したモデルが検証すること {#checks}

GeonicDB は、その型のエンティティを作成・変更するたびに検証します。まとめて送るとき（バッチ）や NGSIv2 で送るときも同じです。

- 必須の属性があること
- 値の型が合っていること（文字列、数値、整数、真偽値、リスト、オブジェクト、GeoJSON、URI、RFC 3339 の日時）と、長さ、最小値・最大値、パターン、許される値のルールを守っていること
  - VocabProperty の許される値は、送った @context で完全な IRI に直して比べること（`dpv:HumanNotInvolved` と書いても、完全な IRI で書いても同じ値）
- モデルに無い属性が含まれていないこと（カタログの定義では許していません）
- 一意でなければならない組み合わせが一意であること（定義で宣言していれば）

検証しないこと：

- リストの中の値（許される値、最低の個数など）。リストであることだけを検証します（カタログの JSON Schema は中の値も検証します。`datamodels convert` の変換時など）。
- 属性が Property と Relationship のどちらで送られたか、Relationship がどの型を指しているか。
- モデルを登録していない型のエンティティ。そのまま保存されます。
- 型を複数持つエンティティの 2 つめ以降の型。検証するのは 1 つめの型だけです。
- モデルを登録・変更する前からあるエンティティ。変更の影響は、試しに実行して確かめられます。何も変えずに、モデルに合わなくなるエンティティの数と例が返ります。
  - API：`PATCH /custom-data-models/<Type>?dryRun=true`（GeonicDB v0.17.0 以降）。
  - CLI：`geonic models update <Type> @model.json --api-dry-run`（geonicdb-cli 0.25.0 以降）。

## 独自の属性

モデルはほぼ合うものの、独自の属性がいくつか要るときは、その属性を足した @context（拡張）を作って公開します（[属性を足す](/guide/extend)）。そのうえで、カタログの属性と自分の属性の両方を含む定義を登録します。独自の属性も、ほかの属性と同じように検証されます。ほかの案件でも役に立つ属性なら、カタログに[提案してください](/guide/contribute#model-proposal)。

下の書き出しスクリプト（`adapters/geonicdb/export.mjs`）は、このカタログのリポジトリにあります。先にリポジトリを取得します。[Node.js](https://nodejs.org/) 24 以降が要ります。

```bash
git clone https://github.com/geolonia/datamodels && cd datamodels && npm ci
```

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
node adapters/geonicdb/export.mjs transportation \
  --type-prefix Acme --out ./out
```

型や属性を独自の名前で使う（[独自の名前で使う](/guide/names)）なら、自分の名前で登録し、`contextUrl` に自分の @context を指定します。書き出しスクリプトが名前をまとめて置き換えます。各属性の意味は、カタログと同じです。

```bash
CONTEXT=https://example.com/context/city-disaster.jsonld
node adapters/geonicdb/export.mjs task --type Project --type-name SaigaiTaiou \
  --context-url "$CONTEXT" --out ./out
node adapters/geonicdb/export.mjs task --type Task \
  --rename assignee=taiouHan \
  --context-url "$CONTEXT" --out ./out
```

</details>
