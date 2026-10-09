---
title: 属性を足す
description: カタログのモデルを複製せずに独自の属性を足す方法と、その置き場所
---

# 属性を足す

カタログのモデルはほぼ合うけれど、自分のシステムにはいくつか属性が足りない。そんなときは新しいモデルを作る必要も、カタログを複製する必要もありません。カタログの @context を取り込み、足したい属性だけを定義した小さな @context を自分で公開します。これを**プロファイル**と呼びます。

::: tip いちばん簡単な方法
[拡張ビルダー](/guide/builder)が、ブラウザで 2 つのファイルを作ります。あなたの @context と、カタログの属性と自分の属性を確認する JSON Schema です。
:::

<svg class="flow-diagram" viewBox="0 0 460 330" role="img" aria-label="データは自分の @context を指します。自分の @context はカタログの @context を取り込み（カタログの属性の意味はそのまま）、自分のドメインの名前で独自の属性を足します。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="ext-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="56" rx="10"/><text class="t" x="230.0" y="32">あなたのデータ</text><text class="s" x="230.0" y="51">patrolRoute 付きの RoadRestriction</text><line class="a" x1="230.0" y1="64" x2="230.0" y2="104" marker-end="url(#ext-ah)"/><text class="l" x="240.0" y="89">@context</text><rect class="box main" x="20" y="106" width="420" height="128" rx="10"/><text class="t" x="230.0" y="130">あなたの @context（自分のドメイン）</text><rect class="box" x="36" y="146" width="186" height="72" rx="10"/><text class="t" x="129.0" y="170">カタログを取り込む</text><text class="s" x="129.0" y="189">roadName、address …</text><rect class="box" x="238" y="146" width="186" height="72" rx="10"/><text class="t" x="331.0" y="170">自分の属性を足す</text><text class="s" x="331.0" y="189">patrolRoute</text><line class="a" x1="129" y1="218" x2="129" y2="262" marker-end="url(#ext-ah)"/><line class="a" x1="331" y1="218" x2="331" y2="262" marker-end="url(#ext-ah)"/><rect class="box" x="20" y="264" width="200" height="58" rx="10"/><text class="t" x="120.0" y="288">datamodels.jp</text><text class="s" x="120.0" y="307">カタログの意味</text><rect class="box" x="240" y="264" width="200" height="58" rx="10"/><text class="t" x="340.0" y="288">あなたの名前空間</text><text class="s" x="340.0" y="307">example.com/ns/acme/</text></svg>

合うモデルがまったくないときは、提案してください（[貢献する](/guide/contribute)）。名前の呼び方だけが違うときは[独自の名前で使う](/guide/names)を見てください。

## @context の書き方 {#writing-a-profile}

カタログの @context を URL で並べ、その横に自分の属性を定義します。次の例は [RoadRestriction](/models/transportation/RoadRestriction/) に巡回ルート `patrolRoute` を足すものです。

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

カタログの属性の意味はそのままで、足した属性だけが新しくなります。足した属性の名前は、あなたが管理するドメインの下に置きます（この例では `example.com`）。`datamodels.jp` の名前はカタログのものです。

## データで使う {#use}

データには、カタログの @context の代わりに自分の @context を書き、カタログの属性の横に自分の属性を書きます。

```json
{
  "@context": "https://example.com/context/acme-transportation-v1.jsonld",
  "id": "urn:ngsi-ld:RoadRestriction:0001",
  "type": "RoadRestriction",
  "roadName": "靖国通り",
  "restrictionStatus": "closed",
  "patrolRoute": "A-3"
}
```

NGSI-LD のブローカーに送るときは、[使い方](/guide/use#broker)のように NGSI-LD のコアコンテキストも並べます。

## 置き場所 {#host-context}

@context は、あなたが管理する、変わらない HTTPS のアドレスに置きます（自分のドメイン、GitHub Pages、アドレスが固定のオブジェクトストレージなど）。ブローカーや JSON-LD のツールは、そこから読みます（GeonicDB では、登録するモデルの `contextUrl`）。

- バージョンごとに別のアドレスで公開し、公開したファイルは変えず、消さないでください。
- `Content-Type: application/ld+json` と `Access-Control-Allow-Origin: *` で配信します。

いまのカタログは拡張を預かりません。その案は [#56](https://github.com/geolonia/datamodels/issues/56) で検討しています。

## カタログに新しい属性が増えたとき {#updates}

あなたの @context はカタログをエイリアス（`v1.jsonld`）で取り込むので、カタログの新しい属性もすぐデータで使えます。JSON Schema は自動では追従しません。拡張ビルダーで作り直してください。

## Smart Data Models のモデルから始めるとき

書き方は同じです。上流の @context は `master` ではなく、コミットを固定したアドレス（`…/dataModel.<分野>/<commit>/context.jsonld`）で取り込みます。上流が変わっても、データの意味が変わらないようにするためです。

## 他の人にも役立ちそうなら

その属性を [Issue](https://github.com/geolonia/datamodels/issues) でカタログに提案してください。次のマイナーバージョンに入れば、その属性のための拡張は要らなくなります。
