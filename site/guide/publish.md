---
title: 一覧を公開する
description: 自治体が CSV で公開している一覧（避難場所、AED の設置場所など）を、カタログのモデルに合った JSON に変換し、オープンデータとして CSV の隣に公開する手順
---

# 一覧を公開する

オープンデータのサイトで CSV の一覧を公開している、自治体の担当者向けのページです。一覧を JSON ファイルに変換して、CSV の隣に公開します。この JSON は key-values の形（属性名と値だけの、単純な JSON）で、モデルの JSON Schema で検証済みです。

同じモデルの JSON なら、アプリを作る人は、どの自治体の一覧も同じプログラムで読めます。

<svg class="flow-diagram" viewBox="0 0 460 352" role="img" aria-label="宇都宮市の CSV の 1 行（名称が中央小学校、災害種別_洪水が 1）を、対応表を使う convert で変換すると、モデル EvacuationSite のエンティティが 1 つできる。key-values の形の JSON で、災害種別_洪水の 1 は hazardTypes の flood になる。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="pub-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="100" rx="10"/><text class="t" x="230" y="32">宇都宮市の CSV（1 行）</text><text class="l" x="32" y="60">名称</text><text class="c" x="32" y="90">中央小学校</text><text class="l" x="124" y="60">緯度</text><text class="c" x="124" y="90">36.55925966</text><text class="l" x="214" y="60">経度</text><text class="c" x="214" y="90">139.8847723</text><text class="l hl" x="310" y="60">災害種別_洪水</text><text class="c hl" x="310" y="90">1</text><text class="l" x="420" y="60">…</text><text class="c" x="420" y="90">…</text><line class="a" x1="32" y1="70" x2="428" y2="70"/><line class="a" x1="230" y1="108" x2="230" y2="150" marker-end="url(#pub-ah)"/><text class="l" x="240" y="134">convert（対応表を使う）</text><rect class="box main" x="20" y="152" width="420" height="192" rx="10"/><text class="t" x="230" y="176">エンティティ（key-values の形）</text><text class="s" x="230" y="196">モデル EvacuationSite の JSON</text><text class="c" x="40.0" y="222">{</text><text class="c" x="54.4" y="240">"type": "EvacuationSite",</text><text class="c" x="54.4" y="258">"name": "中央小学校",</text><text class="c" x="54.4" y="276">"location": { "type": "Point",</text><text class="c" x="68.8" y="294">"coordinates": [139.8847723, 36.55925966] },</text><text class="c" x="54.4" y="312">"hazardTypes": [<tspan class="hl">"flood"</tspan>, "landslide", "earthquake"]</text><text class="c" x="40.0" y="330">}</text></svg>

- **モデル**：避難場所や AED などの種類ごとに、属性の名前と意味を決めたものです。
- **エンティティ**：データの 1 件です。CSV の 1 行が、1 つのエンティティになります。
- **対応表**：CSV のどの列が、モデルのどの属性になるかを書いたファイルです。

ほかの言葉の意味は、[用語](/guide/#terms)にまとめています。

::: warning プレリリース中
このカタログは、まだ正式公開の前です。それまでは、公開済みのファイルも直されることがあります（[URL とバージョン](/guide/urls)）。手順は今すぐ試せますが、ポータルへの JSON の公開は、正式公開のあとにしてください。
:::

## 1. 一覧が標準に従っているか確かめる {#standard}

多くの自治体は、デジタル庁の自治体標準オープンデータセットに従って一覧を公開しています。従っている一覧は、カタログの対応表でそのまま変換できます。変換できるのは、データ項目定義書 A の次のシートの一覧です。

- **03 指定緊急避難場所一覧**：モデル [`disaster/EvacuationSite`](/models/disaster/EvacuationSite/)、対応表 `jichitai-opendata-site`
- **08 AED設置箇所一覧**：モデル [`facility/AEDLocation`](/models/facility/AEDLocation/)、対応表 `jichitai-opendata-aed`
- **10 医療機関一覧**：モデル [`facility/MedicalInstitution`](/models/facility/MedicalInstitution/)、対応表 `jichitai-opendata-medical`
- **13 公衆トイレ一覧**：モデル [`facility/PublicToilet`](/models/facility/PublicToilet/)、対応表 `jichitai-opendata-toilet`

見分けるには、CSV の 1 行目（見出し）を見ます。定義書どおりの一覧には、`全国地方公共団体コード`、`ID`、`名称` などの共通の列があります。そのあとに、シートごとの列が続きます。指定緊急避難場所一覧なら `災害種別_洪水` など、AED設置箇所一覧なら `設置位置` などです。各シートの定義書と対応表には、[対応している標準](/guide/standards#jichitai-opendata)からたどれます。

一覧が標準に従っていないときは、自分の対応表を作って変換します（[それ以外の CSV](/toolkit/convert#your-own-list)）。

## 2. 変換する {#convert}

[Node.js](https://nodejs.org/) 24 以降が要ります。ここでは、宇都宮市の指定緊急避難場所一覧を例にします。[チュートリアルの手順 1](/guide/tutorial#data) のコマンドで、`sites.csv` としてダウンロードできます。

```bash
npx github:geolonia/datamodels-toolkit#v0.3.8 convert \
  disaster/EvacuationSite jichitai-opendata-site sites.csv --out sites.json
```

行末の `\` は、コマンドが次の行に続くという印です。Windows のコマンドプロンプトや PowerShell では、1 行にまとめて書きます。引数は、モデル、対応表、CSV ファイルの順です。自分の一覧では、上に挙げたシートから、合うモデルと対応表を選びます。`--out` は、書き出す JSON ファイルです。JSON は、CSV が Shift_JIS でも UTF-8 で書き出されます。1 件目の中身は、[チュートリアルの手順 2](/guide/tutorial#convert)で見られます。

2026-10-12 に実行したときの出力です。省略はしていません（標準エラー出力）。

```text
sites.csv: shift_jis, 198 row(s), 198 valid EvacuationSite, 0 invalid
  repaired 396×: localGovernmentCode: restored the leading zero (e.g. 92011 → 092011)
  repaired 198×: addressLocality: left out 所在地_市区町村: not a municipality name (e.g. 宇都宮市中央本町1-29)
```

- 1 行目は、まとめです。文字コード（Shift_JIS）を見分けて読み、198 行すべてが有効でした。
- `repaired` の行は、変換で直したところです。表計算ソフトで消えた、全国地方公共団体コードの先頭の 0 を戻しました。コードの列は 2 つ（`全国地方公共団体コード` と `所在地_全国地方公共団体コード`）なので、198 行で 396 回です。
- `所在地_市区町村` の列には、市の名前のあとに町名と番地まで入っていました。そのため、この列は属性 `addressLocality` に入れていません。住所は、`所在地_連結表記` の列から `address.addressText` に入っています。CSV を直すときの手がかりにしてください。

**無効な行があるとき**は、その行は JSON に入らず、行番号と理由が表示されます（終了コードは 1）。CSV を直して、変換し直してください。最初の行（既定は 20 行）だけを確かめるには、`--check` を使います（[データを変換する](/toolkit/convert#your-own-list)）。

## 3. 公開する {#publish}

- **置き場所**：`sites.json` を、CSV と同じデータセットに、リソースとして追加します。形式は JSON です。CSV は置き換えずに残します。CSV を使っている人やアプリがあるからです。ファイル名は自由ですが、CSV と同じ名前で拡張子だけを `.json` にすると、対応が分かりやすくなります。
- **ライセンス**：CSV と同じライセンスにします。JSON は、CSV と同じデータを別の形にしたものです。
- **説明**：リソースかデータセットの説明に、使ったモデルを書きます。モデルのページと、JSON Schema と @context の URL です。JSON Schema があれば、誰でも JSON を検証できます。@context は、属性名を Web 上で一意の名前に結び付けるファイルで、データを Linked Data として使う人が読みます。URL には、バージョンの別名（`v1`）を使います。別名は互換性のあるバージョンにだけ進むので、変換した JSON は新しいバージョンでも有効です（[URL とバージョン](/guide/urls)）。
- **更新**：CSV を更新したら、同じコマンドで変換し直して、JSON も差し替えます。CSV と JSON の中身がずれないようにするためです。

説明の例です。

<!-- languages: own code -->
```text
上の CSV を、datamodels.jp のモデル EvacuationSite に変換した JSON です（key-values の形）。
モデル：https://datamodels.jp/models/disaster/EvacuationSite/
JSON Schema：https://datamodels.jp/schema/disaster/EvacuationSite/v1.json
@context：https://datamodels.jp/context/disaster/v1.jsonld
```

## 次に（任意） {#next}

- **NGSI-LD ブローカーに送る**：[チュートリアルの後半](/guide/tutorial#next-broker)で、同じ一覧をブローカーに入れ、検索して、地図に表示します。
- **データベースで使う**：[PostgreSQL / PostGIS で使う](/guide/postgis)で、モデルのテーブルを作り、距離で検索します。
- **PDF から一覧を作る**：[AI でデータを取り出す](/guide/ai-extraction)で、PDF やメールから、同じモデルのエンティティを AI で取り出します。
