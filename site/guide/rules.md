---
title: モデルのルール
description: カタログに載せるモデル、このカタログのモデルが守るルール、独自の型を作るとき、標準との対応表、例の書き方、モデルの段階（ドラフトなど）
---

# モデルのルール

このページは、カタログにモデルを足したり変えたりする人向けです。提案の仕方は[貢献する](/guide/contribute)に、決め方は [CONTRIBUTING.md](https://github.com/geolonia/datamodels/blob/main/CONTRIBUTING.md#段階と決め方) にあります。モデルのページにある「ドラフト」などの意味は、[段階](#stages)にあります。

## カタログに載せるモデル {#accepts}

カタログに載せるのは、次の 3 つを満たすモデルだけです。

- **既存の標準に基づく**：国や自治体のガイドライン、Smart Data Models、GIF、RFC などに基づきます。検討した上流の型と、使わなかった理由は `notes.yaml` に書きます。
- **実際のデータがある**：架空のユースケースではなく、いま存在するデータを表します。
- **製品に依存しない**：特定の製品向けの注釈や型名は入れません。製品向けのファイルは、[アダプター](/adapters/)が作ります。

1 つのプロジェクトや組織だけで使うモデルは、自分のサイトで公開できます（[自分のデータモデル](/guide/own-models)）。

## まず使い回し、足りないものだけ定義する

このカタログの方針は「複製せず、拡張する」です。[Smart Data Models](https://smartdatamodels.org/)、NGSI-LD、[schema.org](https://schema.org/) の型や属性で合うものがあれば、そのまま使います。合うものがなければ、`https://datamodels.jp/ns/<subject>/` の下に独自の型を定義します。その場合も、合う上流の属性はそのまま使います。例えば [RoadRestriction](/models/transportation/RoadRestriction/) はカタログ独自の型ですが、`roadName`・`validFrom`・`validTo` は Smart Data Models のものです。

<svg class="flow-diagram" viewBox="0 0 460 200" role="img" aria-label="上流の型が合うならそれを使う。属性を足すだけで足りるなら拡張する。どちらでもなければカタログ独自の型を定義し、理由を notes.yaml に記録する。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="dc-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="10" y="10" width="230" height="50" rx="10"/><text class="t" x="125" y="40">上流の型が合う？</text><line class="a" x1="240" y1="35" x2="282" y2="35" marker-end="url(#dc-ah)"/><text class="l" x="246" y="28">はい</text><rect class="box" x="286" y="10" width="164" height="50" rx="10"/><text class="t" x="368" y="40">そのまま使う</text><line class="a" x1="125" y1="60" x2="125" y2="74" marker-end="url(#dc-ah)"/><text class="l" x="133" y="71">いいえ</text><rect class="box" x="10" y="76" width="230" height="50" rx="10"/><text class="t" x="125" y="106">属性を足せば足りる？</text><line class="a" x1="240" y1="101" x2="282" y2="101" marker-end="url(#dc-ah)"/><text class="l" x="246" y="94">はい</text><rect class="box" x="286" y="76" width="164" height="50" rx="10"/><text class="t" x="368" y="106">拡張する</text><line class="a" x1="125" y1="126" x2="125" y2="140" marker-end="url(#dc-ah)"/><text class="l" x="133" y="137">いいえ</text><rect class="box main" x="10" y="142" width="440" height="50" rx="10"/><text class="t" x="230" y="163">カタログ独自の型を定義する</text><text class="s" x="230" y="181">合わなかった理由を notes.yaml に記録</text></svg>

### 上流の型を使わないとき

「合うなら上流を使う」というのは、無理にでも合わせるという意味ではありません。上流のモデルには、1 つの案件のために公開されただけのもの、北米の事情を前提にしたもの、十分な意見を集める前に固まったものもあります。次のような場合は独自の型を定義します。

- 上流の型の意味や必須属性が、日本の運用と食い違う。
- 上流の型が特定の製品や地域の事情に依存している。
- 属性を足すだけでは足りず、意味を変えないと使えない（意味の変更は禁止なので、独自の型にする）。

検討した上流の型と、使わなかった理由をモデルの `notes.yaml` に書いてください。後から見た人が同じ検討を繰り返さないためです。日付のある変更の記録は、`notes` ではなく `history` に書きます。モデルのページでは、注記の下に畳んで表示します。

今のところ、カタログのモデルはすべて独自の型で、一部の属性に上流の名前を使っています。理由は各モデルの注記と [Issue #16](https://github.com/geolonia/datamodels/issues/16) にあります。

## 守ること {#rules}

- 上流の属性の意味や型は変えません。必要なら新しい属性を足します。
- 状態の属性（`progress`、`openingStatus`、`restrictionStatus` など）の値の一覧は決まっています。合う値がないときは状態の属性を省き、`statusLabel` に元の呼び方を書きます（そのとき `statusLabel` は必須）。近い値に無理に当てはめないでください。
- NGSI-LD core context の予約語は再定義しません。`status`、`description`、`location`、`createdAt`、`modifiedAt`、`observedAt` などです。CI が弾きます。`status` が要るときは `incidentStatus` のように名前を変えます。
- モデルは分野でまとめ、地域名・顧客名・案件名ではまとめません。
- 共通の構造は [common](/models/common/) の値型を使います。住所は [JapaneseAddress](/models/common/JapaneseAddress/)、`location` などの位置は [Geometry](/models/common/Geometry/)、連絡先は [ContactPoint](/models/common/ContactPoint/)、利用できる時間は [OpeningHours](/models/common/OpeningHours/) です。使えるジオメトリを絞るときは `$ref` の横で制約します（DesignatedShelter は点だけ）。
- 既にある型に名前だけ合わせたいときは、別名（`x-alias-of`）を使います。属性も必須項目も同じです。
- 属性を足したいとき、型を分けたいときは、サブクラス（`x-subclass-of`）を使います。同じ名前の属性は親と同じ意味で、親の必須項目は残ります。CI はどちらも検査します。親は、schema.org、Smart Data Models、NGSI-LD core の型でもかまいません。たとえば common の ContactPoint は、schema.org の ContactPoint のサブクラスです。そのとき CI が検査するのは、IRI がこれらの名前空間にあることと、名前がクラス名のように大文字で始まることだけです。クラスが実在するかは検査しないので、IRI を開いて確かめてください。

## 日本の標準との対応表 {#mapping}

対応表（`mapping/*.yaml`）は、モデルと標準の関係を示します。標準に従うデータを、そのままモデルで使えるようにするためです。カタログに置く対応表は、少なくします（2026-10-12 決定）。

- **対応表を置くのは、多くの一覧が従っている公開の標準や形式で、モデルの元になったものだけです。** デジタル庁の[自治体標準オープンデータセット](https://www.digital.go.jp/resources/open_data/municipal-standard-data-set-test)、国土地理院のデータのような国の標準です。政府相互運用性フレームワーク（GIF）や災害対応基本共有情報（EEI）も、これに当たります。形式が公開されていて広く使われているシステム（GitHub Issues、Redmine など）も含みます。例は [EvacuationSite](/models/disaster/EvacuationSite/#mapping-jichitai-opendata-site) です。
- **1 つの組織だけの一覧やシステムには、対応表を置きません。** その対応表は、持ち主が自分で持ちます。下書きは `datamodels mapping` で作れます（[データを変換する](/toolkit/convert#your-own-list)）。
- **変換の規則は、少しの実例にだけ書きます。** ほとんどの対応表は、モデルと標準の関係を説明するだけです（`to` と `note`）。変換の規則（`column`、`transform`）を足す提案は、その標準に従う一覧を実際に変換するときだけにします。

当たる標準があるか、多くの一覧が従っているかは、レビューで確認します（CI では検査しません）。

### 標準の新しい版 {#standard-revisions}

対応表には、対応する標準の版を書きます（例：自治体標準オープンデータセットの 20260801 版、EEI 第 1.1 版）。新しい版が出たら、メンテナーが対応表を合わせます。対応表だけの変更なら、バージョンは上がりません。モデルも変える必要があるときは、[バージョンの決まり](/guide/urls#versions)に従います。追従の期限は決めていません。

## 例の書き方 {#examples}

エンティティのモデルには、例が 2 つあります（key-values の形と normalized の形）。Geometry などの値型には、key-values の例が 1 つあります。例はモデルのページに載り、CI が検査します。例はクライアントを作る人のお手本になるので、すべての分野で 1 つのシナリオにそろえています。

- **シナリオ**：架空の出来事として、東京都千代田区の大雨対応（令和 8 年 7 月）を使います。区が災害対応のプロジェクトを立ち上げます。靖国通りのアンダーパスの冠水を確認するタスクがあり、道路が通行止めになり、避難所が開設されます。
- **実在と架空**：地名、住所、各種コード（全国地方公共団体コード、アドレス・ベース・レジストリの町字 ID など）、座標は実在のものを使います。出来事、人、チーム、システムの番号は架空です。個人名は使わず、`staff-0012` や `field-team-a` のような識別子にします。
- **ID**：`urn:ngsi-ld:<型名>:<ローカル ID>`。元のシステムに番号があれば、それをローカル ID にします（`urn:ngsi-ld:Task:1234`）。複数の組織が 1 つのブローカーを共有するときは、`urn:ngsi-ld:<型名>:<組織>:<ローカル ID>` のように組織を入れます。
- **参照**：カタログのほかの型への参照は、その型の例の ID を指します（Task の `project` は Project の例）。同じ型への参照（`parent`、`relatedTo`）と、カタログが定義しない型（`Person`、`Team`）への参照は自由です。CI がこれを検査します。
- **URL**：元のシステムの URL は `tracker.example.jp` のような例示用のドメインにします。
- **日時**：日本時間の場合は `+09:00` を付けます。

## 段階 {#stages}

モデルのページには、モデルの段階を表示しています。モデルは、プルリクエストが取り込まれるとドラフトになります。各段階の意味は、次の表のとおりです。

| 段階 | 意味 |
|---|---|
| ドラフト（`draft`） | レビューを経てカタログに入ったモデルです。まだ、別々の 2 つの組織による実装はありません。安定になるまでに、新しいバージョンで変わることがあります。本番で使うなら、安定を待つことを勧めます。 |
| 試行（`experimental`） | 実際に使いながら学ぶためのモデルです。別のモデルに置き換わることがあります。このカタログで使うことは、まれです。 |
| 安定（`stable`） | 別々の 2 つの組織が、自分のシステムで使っているモデルです。 |
| 非推奨（`deprecated`） | 新しいデータには使わないでほしいモデルです。公開は続き、URL も変わりません。後継があれば、モデルのページに示します。 |

段階によらず、公開したバージョンは変わりません（正式公開から）。モデルを変えるときは、新しいバージョンを出します（[URL とバージョン](/guide/urls)）。

安定にするには、`ADOPTERS.yaml` に、別々の組織による 2 つの実装を書きます。各項目には、`name`、`organization`、`url`（公開リポジトリ、ドキュメント、連絡先）を書きます。CI は、組織が 2 つあるかを検査します。安定にする Pull Request のレビュアーが、実在し独立しているかを確かめます。

- カタログを運営する Geolonia の実装も、同じ条件で 1 つとして数えます。もう 1 つは、別の組織の実装です。
- 同じ組織は、顧客や案件が違っても 1 つとして数えます。`organization` には、実装した組織の名前を書きます。
