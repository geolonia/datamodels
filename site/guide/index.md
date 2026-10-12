---
title: ガイド
description: カタログのモデルの使い方と自治体の一覧の公開、モデルの合わせ方（属性を足す、独自の名前）、カタログへの貢献の仕方、自分のモデルの公開の仕方、URL とバージョン
---

# ガイド

このサイトで使う言葉の意味は、[用語](#terms)にまとめています。

## どのページを読むか {#which}

まず、カタログのモデルが自分のデータに合うかを見ます。そのまま合わないときも、少し合わせれば使えることがあります。

<svg class="flow-diagram" viewBox="0 0 460 296" role="group" aria-label="どのページを読むか。カタログのモデルがそのまま合うなら、モデルを使う。名前だけが違うなら、独自の名前で使う（別名）。属性が少し足りないなら、属性を足す（拡張）。どれも合わないなら、自分のサイトで公開するか、カタログに提案する。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="wh-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="10" y="8" width="230" height="56" rx="10"/><text class="t" x="125" y="41">モデルがそのまま合う？</text><line class="a" x1="240" y1="36" x2="282" y2="36" marker-end="url(#wh-ah)"/><text class="l" x="246" y="29">はい</text><a href="/guide/use"><rect class="box main" x="286" y="8" width="164" height="56" rx="10"/><text class="t" x="368" y="32">モデルを使う</text><text class="s" x="368" y="51">使い方</text></a><line class="a" x1="125" y1="64" x2="125" y2="80" marker-end="url(#wh-ah)"/><text class="l" x="133" y="77">いいえ</text><rect class="box" x="10" y="82" width="230" height="56" rx="10"/><text class="t" x="125" y="115">名前だけが違う？</text><line class="a" x1="240" y1="110" x2="282" y2="110" marker-end="url(#wh-ah)"/><text class="l" x="246" y="103">はい</text><a href="/guide/names"><rect class="box main" x="286" y="82" width="164" height="56" rx="10"/><text class="t" x="368" y="106">独自の名前で使う</text><text class="s" x="368" y="125">別名</text></a><line class="a" x1="125" y1="138" x2="125" y2="154" marker-end="url(#wh-ah)"/><text class="l" x="133" y="151">いいえ</text><rect class="box" x="10" y="156" width="230" height="56" rx="10"/><text class="t" x="125" y="189">属性が少し足りない？</text><line class="a" x1="240" y1="184" x2="282" y2="184" marker-end="url(#wh-ah)"/><text class="l" x="246" y="177">はい</text><a href="/guide/extend"><rect class="box main" x="286" y="156" width="164" height="56" rx="10"/><text class="t" x="368" y="180">属性を足す</text><text class="s" x="368" y="199">拡張</text></a><line class="a" x1="125" y1="212" x2="125" y2="228" marker-end="url(#wh-ah)"/><text class="l" x="133" y="225">いいえ</text><rect class="box d" x="10" y="230" width="440" height="58" rx="10"/><text class="t" x="230" y="254">どれも合わない</text><a href="/guide/own-models"><text class="s k" x="120" y="275">自分のサイトで公開</text></a><text class="s" x="230" y="275">または</text><a href="/guide/contribute#model-proposal"><text class="s k" x="340" y="275">カタログに提案</text></a></svg>

## モデルを使う

- [チュートリアル：CSV ファイルから地図まで](/guide/tutorial)：実際のオープンデータをモデルに変換します。後半（任意）では、ブローカーに登録し、検索して、地図に表示します。
- [一覧を公開する](/guide/publish)：自治体の CSV の一覧から、モデルに合った JSON を作り、オープンデータとして CSV の隣に公開します。
- [使い方](/guide/use)：カタログのモデルで JSON を検証し、NGSI-LD ブローカーに送り、Linked Data として使う方法です。
  - [アダプター](/adapters/)：モデルのページの「ダウンロード」の行にある各ファイルの内容、使い方、入手先です。
  - [表計算ソフト（CSV）で使う](/guide/csv)：CSV テンプレートに入力し、frictionless で検証して、エンティティに変換します。
  - [PostgreSQL / PostGIS で使う](/guide/postgis)：モデルのテーブルを作り、行を入れて、距離で検索します。
  - [AI でデータを取り出す](/guide/ai-extraction)：AI 用のスキーマで、メールや PDF からエンティティを取り出します。
  - [GeonicDB で使う](/guide/geonicdb)：モデルを GeonicDB に登録し、エンティティを作成・検索します。

## モデルを合わせる

- [属性を足す](/guide/extend)：モデルを複製せずに、独自の属性を足します（拡張）。必要なファイルは、ページの中の拡張ビルダーで作れます。
- [独自の名前で使う](/guide/names)：モデルはそのままで、属性名や型名を自分たちの呼び方に合わせます（別名）。

## カタログに加わる

- [貢献する](/guide/contribute)：参加の方法です。モデルの提案、拡張やサイトの登録、他のカタログを知らせるフォームと、そのあとの流れを説明します。
- [モデルのルール](/guide/rules)：独自の型を作るときの考え方、守ること、標準との対応表、例の書き方です。

## カタログの外のモデル

- [自分のデータモデル](/guide/own-models)：このカタログに合わないモデルの公開先です。自分のサイトか、Smart Data Models を選べます。
- [自分のサイトを作る（ツールキット）](/toolkit/)：自分のモデルを変わらない URL で自分のサイトに公開する手順と、CSV の一覧の変換です。

## 参照

- [対応している標準](/guide/standards)：自治体標準オープンデータセットや災害対応基本共有情報（EEI）など、モデルが対応している標準と、対応するモデルの一覧です。
- [対応表](/guide/mapping)：標準のどの項目がモデルのどの属性に当たるかを示すファイルです。ある場所と、書いてあることを説明します。
- [URL とバージョン](/guide/urls)：どの URL を使うか、何が変わらないか、バージョンと非推奨について説明します。
- [他のデータモデルカタログ](/guide/catalogs)：提案の前に確かめておきたい、国内外のデータモデルのカタログです。
- [データモデルのサイト](/guide/sites)：自分のデータモデルを公開している、datamodels.jp が知っているサイトの一覧です。1 行に 1 つのサイトで、もとにしたカタログのモデルが分かります。

## 用語 {#terms}

このサイトでは、次の言葉を次の意味で使います。

- **モデル**：ある種類のデータ（型）が、どの属性をどんな意味で持つかを決めたものです。@context、JSON Schema、例で公開しています。
- **エンティティ**：データの 1 件です。避難場所 1 か所が、1 つのエンティティです。
- **属性**：エンティティが持つ項目です。名称、位置、対象となる災害の種別などです。
- **分野**：関係するモデルのまとまりです。名前空間とバージョンを持ちます（`disaster`、`transportation` など）。URL やコマンドでは `<subject>` と書きます。
- **@context**：短い名前（`hazardTypes` など）を IRI に結び付ける、辞書のようなファイルです。
- **IRI**：型や属性に付けた、Web 全体で一意の名前です（`https://datamodels.jp/ns/disaster/hazardTypes` など）。
- **key-values の形**：属性名と値だけの、単純な JSON の形です。JSON Schema は、この形のデータを検証します。
- **normalized の形**：NGSI-LD ブローカーに送る形です。各属性が、Property や Relationship などの種類も示します。
- **検証**：データが JSON Schema などの決まりに合っているかを確かめることです。CI やツールキットの `check` がカタログやサイトのファイルを確かめることは、「検査」と呼びます。
- **対応表**：標準や手元の一覧のどの項目が、モデルのどの属性に当たるかを書いたファイルです（[対応表](/guide/mapping)）。
- **拡張**：カタログのモデルに自分の属性を足すために公開する、小さな @context です。技術的には、モデルのプロファイルです（[属性を足す](/guide/extend)）。ツールキットの `extend` は別のもので、カタログのモデルをもとに、自分のサイトに新しいモデルを作ります。
- **別名**：カタログの型や属性に付ける、自分たちの名前です。意味は変わりません（[独自の名前で使う](/guide/names)）。
- **バージョンの別名**：`v1.jsonld` のように、メジャーバージョンだけを書いた URL です。互換性のある最新のバージョンを指します（[URL とバージョン](/guide/urls)）。
