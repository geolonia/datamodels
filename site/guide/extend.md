---
title: 属性を足す
description: カタログのモデルを複製せずに独自の属性を足す方法と、その置き場所
---

# 属性を足す

カタログのモデルはほぼ合うけれど、自分のシステムにはいくつか属性が足りない。そんなときは新しいモデルを作る必要も、カタログを複製する必要もありません。足したい属性だけを定義した小さな @context を公開します。これを**プロファイル**と呼びます。

合うモデルがまったくないときは、提案してください（[貢献する](/guide/contribute)）。名前の呼び方だけが合わないときは[独自の名前で使う](/guide/names)を見てください。

## プロファイルの書き方

カタログの @context を URL で並べ、その横に自分の属性を定義します。カタログの属性は意味（IRI）がそのままで、足した属性だけが新しくなります。次の例は [RoadRestriction](/models/transportation/RoadRestriction/) に巡回ルート `patrolRoute` を足すものです。

```json
{
  "@context": [
    "https://datamodels.jp/context/transportation/v1.jsonld",
    {
      "acme": "https://example.com/ns/acme/",
      "patrolRoute": "acme:patrolRoute"
    }
  ]
}
```

足した属性の名前は、あなたが管理するドメインの下に置きます（この例では `example.com`）。`datamodels.jp` の名前はカタログのものなので使わないでください。[拡張ビルダー](/guide/builder)で、この @context と対応する JSON Schema をブラウザで作れます。

**カタログに新しい属性が増えたとき。** 上の @context はカタログをエイリアス（`v1.jsonld`）で取り込むので、1.x の新しい属性もすぐに使えます。JSON Schema は追従しません。カタログのスキーマは余分な属性を許さないので、拡張したスキーマはある時点のカタログのスキーマの写し（バージョンは `x-extends` に記録）になるためです。新しい属性も検証したいときは、拡張ビルダーで作り直してください。

## 置き場所 {#host-context}

@context は、あなたが管理する、変わらない HTTPS の URL に置きます（自分のドメイン、GitHub Pages、アドレスが固定のオブジェクトストレージなど）。データは `@context` か `Link` ヘッダーでこの URL を示し、ブローカーや JSON-LD のツールがそれを読みに行きます。GeonicDB では Custom Data Model の `contextUrl` に指定します。

- バージョンごとに別の URL で公開し、公開したファイルは変えず、消さないでください。
- `Content-Type: application/ld+json` と `Access-Control-Allow-Origin: *` で配信します。

いまのカタログは拡張を預かりません。その案は [#56](https://github.com/geolonia/datamodels/issues/56) で検討しています。

## Smart Data Models のモデルから始めるとき

書き方は同じです。上流の @context は `master` ではなく、コミットを固定した URL（`https://raw.githubusercontent.com/smart-data-models/dataModel.<分野>/<commit>/context.jsonld`）で読み込みます。上流が変わっても、保存済みデータの意味が変わらないようにするためです。

## 他の人にも役立ちそうなら

その属性を [Issue](https://github.com/geolonia/datamodels/issues) でカタログに提案してください。次のマイナーバージョンに入れば、自分の拡張は要らなくなります。
