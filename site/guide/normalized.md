---
title: normalized の形
description: エンティティの 2 つの形（key-values と normalized）と、key-values の形を NGSI-LD ブローカーが受け取る normalized の形にする決まり
---

# normalized の形

エンティティは、2 つの形で書けます。

- **key-values の形**：属性名と値だけの、単純な JSON の形です。JSON Schema は、この形のデータを検証します。
- **normalized の形**：NGSI-LD ブローカーが通常受け取る形です。各属性が、自分の種類も示します。値を持つ Property なのか、別のエンティティを指す Relationship なのか、といった種類です。

モデルのページには、両方の形の例があります。normalized の形を自分で書かなくてよいことも多いです。モデルのページの「試す」タブでは、入力したデータを 2 つの形で切り替えて見られます。CSV の一覧なら、[datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) の `datamodels convert … --normalized` で変換できます（[データを変換する](/toolkit/convert)）。自分のコードで変換するときは、次の決まりに従ってください。ブローカーへの送り方は、[NGSI-LD ブローカーに送る](/guide/use#broker)で説明しています。

## 決まり {#rules}

- `id` と `type` はそのままにします。
- 各属性は、モデルのページの属性の表にある NGSI-LD の型で包みます。
  - Property：`{ "type": "Property", "value": … }`。
  - Relationship：`{ "type": "Relationship", "object": … }`。
  - GeoProperty：`{ "type": "GeoProperty", "value": … }`。
  - JsonProperty：`{ "type": "JsonProperty", "json": … }`。
  - VocabProperty：`{ "type": "VocabProperty", "vocab": … }`。

  JsonProperty と VocabProperty は、key-values の形でもメンバーを残します（`{ "json": … }`、`{ "vocab": … }`）。JSON Schema が表すのは中の値です。key-values の形のデータをスキーマで検証するときは、このメンバーを外してください。この 2 つは NGSI-LD 1.8 の型です。使う前に、ブローカーが対応しているかを確かめてください。
- 日時の Property（スキーマの `format: date-time`）の値は `{ "@type": "DateTime", "@value": … }` にします。日付の Property（`format: date`）は `{ "@type": "Date", "@value": … }` です。日付でも日時でもよい Property（モデルのページで「日付または日時」）は、値に合わせます。`2026-07-11` なら Date、`2026-07-11T09:00:00+09:00` なら DateTime です。
- 複数の値を持つ属性（属性の表で「複数可」と示すもの。Task の `assignee` など）は、値ごとに 1 つのインスタンスを並べた配列にし、それぞれに `datasetId` を付けます。カタログの例は `urn:ngsi-ld:dataset:<属性名>:<番号>` の形を使っています。
- `@context` には、分野の @context のバージョンの別名と、NGSI-LD のコアコンテキストを並べます。

## 例 {#example}

次の key-values の形の Task を例にします。

```json
{
  "id": "urn:ngsi-ld:Task:1234",
  "type": "Task",
  "name": "靖国通りのアンダーパスの冠水を確認する",
  "progress": "in-process",
  "due": "2026-07-08T12:00:00+09:00",
  "assignee": ["urn:ngsi-ld:Team:field-team-a"]
}
```

これを normalized の形にすると、次のようになります。

```json
{
  "@context": [
    "https://datamodels.jp/context/task/v1.jsonld",
    "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld"
  ],
  "id": "urn:ngsi-ld:Task:1234",
  "type": "Task",
  "name": {
    "type": "Property",
    "value": "靖国通りのアンダーパスの冠水を確認する"
  },
  "progress": { "type": "Property", "value": "in-process" },
  "due": {
    "type": "Property",
    "value": { "@type": "DateTime", "@value": "2026-07-08T12:00:00+09:00" }
  },
  "assignee": [
    {
      "type": "Relationship",
      "object": "urn:ngsi-ld:Team:field-team-a",
      "datasetId": "urn:ngsi-ld:dataset:assignee:1"
    }
  ]
}
```
