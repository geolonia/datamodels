---
title: 対応表
description: 標準のどの項目がモデルのどの属性に当たるかを示す対応表（マッピングファイル）のある場所と、書いてあること
---

# 対応表

多くのモデルは、日本のデータがすでに従っている標準（自治体標準オープンデータセット、災害対応基本共有情報（EEI）、国土地理院の避難所データなど）に対応しています。**対応表**（マッピングファイル）は、1 つのモデルと 1 つの標準について、標準のどの項目がモデルのどの属性に当たるかを示します。標準に従うデータを、モデルに合わせて使えます。

<svg class="flow-diagram" viewBox="0 0 460 104" role="img" aria-label="標準の列「想定収容人数」は、対応表の 1 行（column と transform）を通って、モデルの属性 maxCapacity になります。文字列の &quot;120&quot; は整数の 120 になります。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="mp-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="10" y="8" width="130" height="58" rx="10"/><text class="t" x="75" y="32">想定収容人数</text><text class="s" x="75" y="51">標準の列</text><line class="a" x1="140" y1="37" x2="163" y2="37" marker-end="url(#mp-ah)"/><rect class="box main" x="165" y="8" width="130" height="58" rx="10"/><text class="t" x="230" y="32">対応表の 1 行</text><text class="s" x="230" y="51">column、transform</text><line class="a" x1="295" y1="37" x2="318" y2="37" marker-end="url(#mp-ah)"/><rect class="box" x="320" y="8" width="130" height="58" rx="10"/><text class="t m" x="385" y="32">maxCapacity</text><text class="s" x="385" y="51">モデルの属性</text><text class="s" x="75" y="92">"120"（文字列）</text><text class="s" x="230" y="92">transform: integer</text><text class="s" x="385" y="92">120（整数）</text></svg>

## どこにあるか

- モデルのページの**参照している標準**：標準ごとに 1 行で、開くと対応表が見られます。YAML のファイルは表の下にリンクがあります。
- 標準ごとの一覧：[対応している標準](/guide/standards)。
- ファイル：`https://datamodels.jp/mapping/<subject>/<Type>/<name>.yaml`。モデルごとに `catalog.json`（`mappingUrls`）にも載っています。

対応表にはバージョンがありません。URL は変わらず、内容はその時点のモデルに合わせて更新します。

## 対応表に書いてあること

<!-- languages: own code -->
```yaml
standard:
  name: { ja: "自治体標準オープンデータセット … シート「03.…」", en: … }
  url: https://www.digital.go.jp/resources/open_data/municipal-standard-data-set-test
  license: { ja: "公共データ利用規約（第1.0版）（PDL1.0、CC BY 4.0 と互換）", en: … }
fields:
  name: { to: 名称 (name), column: 名称 }
  maxCapacity:
    to: 想定収容人数 (maxCapacity)
    column: 想定収容人数
    transform: integer
  nationalShelterId:
    to: null
    note: { ja: このデータセットには無い, en: not in this dataset }
```

- `standard`：標準の名前、リンク、ライセンス、短い説明。
- `fields`：モデルの属性ごとに 1 行。`to` は標準の対応する項目、`note` は補足です。`to: null` は標準に当たる項目が無いことを示します。

## 変換の規則 {#convert}

変換の規則があるのは、一部の対応表だけです。ほとんどの対応表は、モデルと標準の関係を説明するだけです。規則のある行には、属性の値の作り方を書きます。

- `column`：CSV の列です。複数の列を読む変換では、列のリストを書きます。
- `transform`：列の読み方です（[変換の種類](#transforms)）。書かなければ、文字列をそのまま使います。
- `value`：すべての行で同じ値です。
- `via`：住所などの入れ子の値を、別の対応表で作ります（例：`common/JapaneseAddress/jichitai-opendata-address`）。

`to` だけの行は、説明のための行です。

点を含む名前の行は、値の中の項目になります（`address.postalCode: { column: 郵便番号 }`）。ただし、カタログの対応表はたいてい `via` を使います。住所の規則を、複数のモデルで共有するためです。

`convert.id` は、エンティティの ID のひな形です。

```yaml
convert:
  id: "urn:ngsi-ld:MedicalInstitution:{localGovernmentCode}-{externalFacilityId}"
```

- `{属性}` は、その行の属性の値です。値の中の項目は `{address.localGovernmentCode}` のように書きます。
- ID の一部に入る値は、URL エンコードされます。値 1 つだけのひな形（`"{id}"` など）は、値をそのまま使います。
- ひな形が無いときは、`column` を書いた `id` の行の値が、そのまま ID になります。

`convert.allDay` は、一覧の「0:00～0:00」の営業時間が何を意味するかを書きます（[下の説明](#all-day)）。

[datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) の `datamodels convert` がこの規則を読み、CSV の一覧をモデルのエンティティに変換します。使い方は[データを変換する](/toolkit/convert)にあります。

### 変換の種類 {#transforms}

| `transform` | 列の数 | 作る値 |
|---|---|---|
| なし、または `text` | 1 | 文字列をそのまま使います。空なら値なしです。 |
| `code6` | 1 | 6 桁の全国地方公共団体コードで、検査数字で確かめます。5 桁なら、先頭に 0 を補って正しいコードになるときは 0 を補い、ならなければ検査数字を足します。どちらもできるときは問題です。4 桁なら、両方を補います。 |
| `number` | 1 | 数です。 |
| `integer` | 1 | 整数です。`1,200` や `1200人` も読みます。 |
| `numbers` | 2 以上 | 数のリストです。 |
| `flag` | 1 | `1` は真、`0` と空は偽です。 |
| `boolean` | 1 | `true` か `false` です（`TRUE`、`True`、`1`、`0` も読みます）。空なら値なしです。 |
| `yesno` | 1 | `有`、`有り`、`あり`、`アリ`、`はい`、`○`、`〇`、`◯` は真、`無`、`無し`、`なし`、`ナシ`、`いいえ`、`×`、`✕` は偽です。空なら値なしです。これらの言葉は `values` で置き換えられます（[values](#values)）。 |
| `flags` | `values` の列 | `1` の入った列の値を並べたリストです（`values: { 洪水: flood, 地震: earthquake }`）。 |
| `split` | 1 | `;` か `；` で区切ったリストです。 |
| `weekdays` | 1 | OpeningHours の曜日（`Monday`～`Sunday`、`PublicHolidays`）です（[下の説明](#weekdays)）。 |
| `time` | 1 | `HH:MM` の形の時刻です（[下の説明](#time)）。 |
| `geometry` | 1～3 | 経度と緯度の 2 列で、GeoJSON の Point を作ります。1 列なら、GeoJSON のジオメトリを読みます。3 列なら、3 列目は経度と緯度の無い行の GeoJSON です。 |
| `json` | 1 | 列の JSON を読みます。 |
| `municipality` | 1 | 市区町村名です。`宇都宮市中央本町1-29` のように続きのある値は使わず、そのことを知らせます。 |
| `machiazaId` | 1 | アドレス・ベース・レジストリの 7 桁の町字 ID です。ハイフンは取り除きます。 |
| `nationalShelterType` | 1 | 全国共通避難所・避難場所 ID の種別コードから、`general` か `welfare` を作ります。 |

変換は推測をしません。`values` が無ければ、`text` と `split` はどんな文字列も受け取ります。`municipality` は、市区町村名でない値を使わず、直したところとして知らせます。ほかの変換では、知らない書き方の値は、その行の問題として、列と値を添えて知らせます。たとえば、`yesno` の `不明`、`weekdays` の `月～金（祝日を除く）` や `第2土曜`、`time` の `25:00` や `9時半` です。

#### weekdays {#weekdays}

`weekdays` は、`月～金`、`月-金`、`月火水木金`、`月・水・金`、`土日祝`、`月曜日～金曜日`、`12345`（1 が月曜日、7 が日曜日）を読みます。`平日` は月曜日から金曜日、`毎日` は 7 日すべてです。範囲は週をまたげます（`金～月` は金曜日から月曜日）。`祝` と `祝日` は `PublicHolidays` です。祝日は、値に書いてあるときだけ入ります。

#### time {#time}

`time` は、`9:00`、`9時`、`9時30分` を `09:00` や `09:30` と書き直します。全角の数字は半角にします。秒は残します（`17:00:30`）。書き直したところは、すべて知らせます。

読むのは 0 時から 24 時までです。`0:00` は `00:00`（1 日の始まり）になります。`24:00` はそのまま残します。スキーマは、閉まる時刻（1 日の終わり）としては許し、開く時刻としては許しません。そのため、24:00 に開く行は無効です。`24:30` や `25:00` は問題として知らせます。

### values {#values}

`values` は、1 つの列の文字列を、モデルの値に置き換えます。

```yaml
medicalInstitutionType:
  column: 医療機関の種類
  values: { 病院: hospital, 有床診療所: clinicWithBeds, 無床診療所: clinicWithoutBeds }
```

- `transform` なしでも、`split`（リストの各項目）や `yesno`（その言葉の代わり。例：`values: { 外部利用不可: true, "": false }`）と一緒でも使えます。
- 空のセルは値なしです。`transform` なしと `yesno` では、`values` に `""` の項目があり、ファイルにその列があれば、その値になります。`split` では、空のセルは値なしのままです。
- `values` に無い文字列は、その行の問題になります。そのまま使うことはありません。

### 0:00～0:00 の営業時間 {#all-day}

「0:00～0:00」の意味は、一覧によって違います。schema.org は、閉まる時刻が開く時刻より前なら翌日まで続く、としか決めていません。最も広く使われている Google の構造化データのガイドラインでは、`00:00`～`23:59` が 24 時間営業、`00:00`～`00:00` が終日休みです。一方、日本の一覧では、`0:00`～`0:00` を「24 時間」の意味で書くことがよくあります。

そのため、開く時刻と閉まる時刻がどちらも 0:00 の値は、対応表に意味を書くまで、その行の問題になります。対象は OpeningHours の `opens` と `closes` です。列から作る値も、CSV テンプレートのような JSON の値も、リストの中の値も含みます。

```yaml
convert:
  allDay: open      # 終日利用可：00:00～23:59 と書く
# allDay: closed    # 終日利用不可：00:00～00:00 と書く
```

- `convert.allDay` は、その対応表が作る営業時間と、`via` でたどるすべての対応表の営業時間に効きます。複数の対応表に書いてあるときは、いちばん外側の対応表が優先です。そのため、自分の対応表に書けば、カタログの OpeningHours の対応表を変えずに意味を決められます。
- 書き直した行は、すべて知らせます。
- 意味は一覧ごとに決まります。カタログやノードの対応表では、`check` が `convert` の下に `id` しか許しません。そのため、`allDay` は自分の対応表でだけ使えます。そのような一覧は、[自分の対応表](/toolkit/convert#your-own-list)で変換します。
- `9:00`～`9:00` のように、0:00 以外で開く時刻と閉まる時刻が同じ値は、いつもその行の問題です。どの決まりも、その意味を定めていないからです。

## 対応表を足す

カタログに対応表を置くのは、多くの一覧が従っている公開の標準だけです。1 つの組織だけの一覧には、カタログの対応表を作りません。自分の対応表を手元に置いて変換します（[データを変換する](/toolkit/convert#your-own-list)）。

対応表がまだ無い標準を見つけたら、[Issue](https://github.com/geolonia/datamodels/issues/new) で提案してください（[貢献する](/guide/contribute)）。どの標準に対応表を置くかは、[モデルのルール](/guide/rules#mapping)にあります。
