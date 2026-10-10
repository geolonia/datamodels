---
title: 独自の名前で使う
description: モデルを変えずに、属性名や型名を自分たちの用語に合わせる方法。JSON-LD のエイリアス
---

# 独自の名前で使う

モデルは合っているのに、名前だけが現場の言い方と違う、ということはよくあります。カタログでは `assignee` でも、ある市では対応班を `responsibleTeam` と呼んでいる。新しいモデルは要りません。JSON-LD では名前はただのラベルで、その意味は @context が決めます。自分の名前にカタログの意味を割り当てれば、モデルはそのままで名前だけ変わります。これを**エイリアス**と呼びます。

<svg class="flow-diagram" viewBox="0 0 460 150" role="img" aria-label="自分の名前 responsibleTeam とカタログの名前 assignee は、同じ意味 https://datamodels.jp/ns/task/assignee を指します。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="nm-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="10" y="8" width="190" height="58" rx="10"/><text class="t m" x="105.0" y="32">responsibleTeam</text><text class="s" x="105.0" y="51">自分の名前</text><rect class="box" x="10" y="84" width="190" height="58" rx="10"/><text class="t m" x="105.0" y="108">assignee</text><text class="s" x="105.0" y="127">カタログの名前</text><line class="a" x1="200" y1="37" x2="256" y2="66" marker-end="url(#nm-ah)"/><line class="a" x1="200" y1="113" x2="256" y2="84" marker-end="url(#nm-ah)"/><rect class="box main" x="260" y="46" width="190" height="58" rx="10"/><text class="t" x="355.0" y="70">同じ意味</text><text class="s" x="355.0" y="89">…/ns/task/assignee</text></svg>

次の例は、[タスク管理](/models/task/)の `Project` を `Saigai`、`assignee` を `responsibleTeam` という名前で使うものです。

```json
{
  "@context": [
    "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld",
    {
      "tm": "https://datamodels.jp/ns/task/",
      "Saigai": "tm:Project",
      "responsibleTeam": { "@id": "tm:assignee", "@type": "@id" }
    }
  ]
}
```

名前だけでなく、属性の定義をまるごとコピーしてください。`assignee` は別のエンティティを指す（`"@type": "@id"`）ので、`responsibleTeam` にもそう書きます。書かないと、チームの ID がただの文字列として読まれます。

`responsibleTeam` で書いたデータは、`assignee` で書いたものとまったく同じ意味です。NGSI-LD のブローカーは、標準の決まりで属性を IRI で保存します。そのため、どちらの名前で送っても同じ属性として保存されます。検索でも購読でも、ほかのクライアントから見ても違いはありません。この @context を渡したクライアントには、`responsibleTeam` と `Saigai` の名前で返ります。

## 守ること

- **属性の短い名前は英数字と `_` だけ。** NGSI-LD の決まりではありませんが、GeonicDB は属性の短い名前を `^[A-Za-z0-9_]+$` で検査し、日本語の名前は受け付けません。完全な IRI なら受け付けます。
- **自分の @context では、ひとつの意味にひとつの名前。** カタログの @context を取り込んだ上で別名を足すと、ひとつの意味に名前が 2 つでき、JSON-LD は短いほうで返します。必ず自分の名前で受け取りたいなら、自分の @context は使う名前をすべて並べた一覧として書き、カタログの @context は取り込まないでください。カタログの @context をコピーして名前を書き換えるのが早道です。
- **型のエイリアスは、別の型ではありません。** `Saigai` と `Project` は同じ意味なので、ブローカーは同じ型として保存・照合し、アクセスの規則も同じ型として扱います。型を分けたい（型でアクセスを分ける、属性を足す）ときは、エイリアスではなく**サブクラス**を使います。サブクラスは独自の意味を持ち、親の属性はそのまま使えます（スキーマの `x-subclass-of`。[モデルのルール](/guide/rules#rules)）。

## 関連

- [属性を足す](/guide/extend)：属性を**足す**とき
- [GeonicDB で使う](/guide/geonicdb)：登録すると何が起きるか、独自の属性を足すとき、独自の名前で登録するとき
