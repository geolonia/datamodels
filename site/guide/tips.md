---
title: Tips & Tricks
description: モデルを変えずに、属性名や型名を自分たちの用語に合わせる方法。JSON-LD のエイリアス
---

# Tips & Tricks

## 属性名や型名を自分たちの用語に合わせる

モデルは合っているのに、名前だけが現場の言い方と違う、ということはよくあります。カタログでは `assignee` でも、ある市では対応班を `responsibleTeam` と呼んでいる。カタログの `Project` を、別の市は `DisasterEvent` と呼びたい。

このために新しいモデルを作る必要はありません。JSON-LD では、キーは「語（term）」にすぎず、それがどの IRI を指すかは `@context` が決めます。同じ IRI を指す語は何個あってもよいので、自分たちの名前を同じ IRI に割り当てた context を用意すれば、モデルはそのままで名前だけ変わります。これを**エイリアス**と呼びます。

```json
{
  "@context": [
    "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld",
    {
      "disaster": "https://models.geonicdb.com/ns/disaster/",
      "DisasterEvent": "disaster:Project",
      "responsibleTeam": "disaster:assignee",
      "remarks": "disaster:memo"
    }
  ]
}
```

`responsibleTeam` で書いたエンティティは、`assignee` で書いたものと同じ IRI に展開されます。ブローカーの中では同じ属性で、検索・購読・他のクライアントから見た違いはありません。読み出すときは NGSI-LD がリクエストの context で短縮するので、この context を渡したクライアントには `responsibleTeam` と `DisasterEvent` で返ってきます。

### 守ること

- **短縮名は英数字と `_` だけ。** GeonicDB は属性名を `[A-Za-z0-9_]`（または完全な IRI）に限定しています。日本語のキーは context を見る前に拒否されます。他のクライアントやツールも英数字を前提にしていることが多いので、エイリアスも英数字で付けてください。
- **ひとつの context の中で、ひとつの IRI にひとつの名前。** カタログの context を取り込んだ上で別名を足すと、同じ IRI に 2 つの語ができ、読み出し時にどちらで返るかは JSON-LD の規則（短いほうが優先）で決まります。確実に自分の名前で受け取りたいなら、エイリアス用の context は「使う語をすべて列挙した完全な一覧」として書き、カタログの context は取り込まないでください。カタログの context をコピーして名前を書き換えるのが早道です。
- **型のエイリアスは、別の型ではありません。** `DisasterEvent` と `Project` は同じ IRI なので、GeonicDB では同じ型として保存・照合され、認可ポリシーも同じ型として扱います。案件ごとに型を分けたい（認可を型で分ける）場合は、別の IRI が必要です。それはエイリアスではなく[拡張](/guide/extend)の話になります。

### GeonicDB の Custom Data Model と組み合わせる

Custom Data Model の `propertyDetails` のキーは短縮名です。エイリアスを使うなら、定義もエイリアスの名前で登録し、`contextUrl` にはエイリアス用の context を指定します。書き出しスクリプトが名前の置き換えをまとめて行います。

```bash
node scripts/export-geonicdb.mjs disaster --type Project --type-name DisasterEvent \
  --rename assignee=responsibleTeam,memo=remarks \
  --context-url https://example.com/context/city-disaster.jsonld --out ./out
```

各属性の `@context` にはカタログの IRI が残るので、名前が変わっても語彙は同じです。

## 関連

- [拡張する・貢献する](/guide/extend): 属性や型を**足す**とき
- [GeonicDB で使う](/guide/geonicdb): 登録すると何が起きるか、独自の属性を足すとき
