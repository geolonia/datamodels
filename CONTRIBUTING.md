# 貢献の仕方 / Contributing

[English below](#contributing)

<!-- #region ja -->
datamodels.jp は、日本で使えるデータモデルを共有の資産として公開するカタログです。企業、自治体、個人を問わず、誰でも提案・修正できます。ルールは全員同じです。日本語でも英語でも構いません。

## 参加の方法

- **質問・不具合・アイデア**: [Issue](https://github.com/geolonia/datamodels/issues/new) を開いてください。「この属性の意味が分からない」も歓迎です。
- **新しいモデルや属性の提案**: [モデルの提案フォーム](https://github.com/geolonia/datamodels/issues/new?template=model-proposal.yml)を使ってください。まだスキーマを書く必要はありません。
- **モデルの追加・修正**: Pull Request を送ってください（下の手順）。
- **上流への提案**: 日本以外でも使えるモデルは、Smart Data Models の [incubated](https://github.com/smart-data-models/incubated) に提案できます。フォルダ構成を Smart Data Models と揃えているのはこのためです。正式公開までは提案しません。モデルをまだその場で直すことがあるからです。公開の時に、候補を 1 つの Issue にまとめ、誰がいつ提案するかを決めます（2026-10-03 決定）。

## モデルのルール

- **既存の標準に基づく**: 国や自治体のガイドライン、Smart Data Models、GIF、RFC などに基づくモデルだけを公開します。検討した上流の型と、採用しなかった理由は `notes.yaml` に書きます。
- **実際のデータがある**: 架空のユースケースではなく、いま存在するデータを表すこと。
- **製品に依存しない**: 特定の製品向けの注釈や型名は入れません（製品向けのファイルは `adapters/` が作ります）。
- 書き方の詳細は[モデルのルール](https://datamodels.jp/guide/rules)にあります（独自の型を作るとき、予約語、エイリアスとサブクラス、状態の属性、標準との対応表、例の書き方）。

## 段階と決め方

- **提案**（Issue）→ **ドラフト**（`draft`、マージされたモデル）→ **安定**（`stable`）→ **非推奨**（`deprecated`）。非推奨になったモデルも公開をやめず、URL は変わりません。
- **試行**（`experimental`）は、必要なときだけ使う段階です。実際に使いながら学ぶためのモデルで、別のモデルに置き換わることがあります。データモデルのネットワークのほかのノードと同じ段階で（#200）、datamodels.jp で使うことは少ないはずです（2026-10-10 決定）。
- **安定**になるには、`ADOPTERS.yaml` に別々の組織による 2 つの実装が必要です。各項目に `name`、`organization`、`url`（公開リポジトリ、ドキュメント、連絡先）を書きます。CI は組織が 2 つあるかを検査し、安定にする Pull Request のレビュアーが、実在し独立しているかを確認します。カタログを運営する Geolonia の実装も、同じ条件（`url` を含む）で 1 つとして数えます。もう 1 つは別の組織の実装です。同じ組織は、顧客や案件が違っても 1 つとして数え、`organization` には実装した組織の名前を書きます。
- 通常の Pull Request はメンテナーがレビューしてマージします。新しいサブジェクト（分野ごとのモデルのまとまり）、メジャーバージョン、安定への昇格は、小さなグループ（Hal、宮内さん、大橋さん、Daniel）がその Pull Request や Issue の上で決めます。

## Pull Request の手順

1. リポジトリをフォークして、ブランチを作ります。
2. `npm ci` の後、新しいモデルなら `npm run new-model -- <サブジェクト> <型名>` でひな形を作ります（Smart Data Models と同じ構成: `schema.json`, `catalog.yaml`, `examples/`, `notes.yaml`）。TODO の箇所を埋めます。
3. `npm run validate:models` が、足りない箇所を一覧にします。最後に `npm run check` と `npm test` が通ることを確認します。
4. すべてのコミットに `git commit -s` で署名（Signed-off-by）を付けて、Pull Request を送ります。
5. CI（スキーマ、例、`@context` の展開、予約語、バージョンの検証と自動レビュー。このリポジトリ内のブランチならプレビュー URL も）の結果を見て、レビューに答えます。

公開済みのバージョンの記録（スナップショットとマニフェスト）はメンテナーが行います。正式公開前（プレリリース）は、現行バージョンをその場で修正できます。

### ツールが作ったモデルを提案する

データを登録するツール（ブローカーの管理画面など）は、利用者のデータから新しいモデルを作ることがあります。それを提案として渡すときは、このリポジトリのモデルと同じ構成のフォルダ（**提案バンドル**）を書き出します。

- `models/<サブジェクト>/<型名>/` に `catalog.yaml`、`schema.json`、`examples/`、あれば `mapping/`（元になった標準や公開データとの対応）、`notes.yaml`、`ADOPTERS.yaml`（使っている組織とおよそのデータ量）を置きます。`npm run validate:models` で足りない箇所が分かります。
- **ツールは自分で投稿しません。** 人が自分の GitHub アカウントで Pull Request を開き、署名（DCO）を付けます。作者と責任は人に残ります。
- レビューを経て、他のモデルと同じく `draft` で取り込みます。新しい段階はありません。
- `ADOPTERS.yaml` の記載は、早めの根拠になります。1 つの組織は 1 回だけ数えるので、`stable` に 2 つの独立した組織が要るという規則は変わりません（2026-10-06 決定、#156）。

### 他のカタログを知らせる

ほかのデータモデルカタログや語彙は、[他のカタログの登録フォーム](https://github.com/geolonia/datamodels/issues/new?template=catalog-report.yml)で知らせてください。メンテナーが確認して「[他のデータモデルカタログ](https://datamodels.jp/guide/catalogs)」のページに載せます。書き方は「[他のカタログを知らせる](https://datamodels.jp/guide/report-catalog)」にあります。datamodels.jp のモデルを拡張したカタログを機械が読める形で一覧にする方法は、まだ決まっていません（#56）。

### 拡張を一覧に載せる

モデルに属性を足して使っている組織は、その拡張をモデルのページの「拡張している組織」と `catalog.json` に載せられます。同じ意味の属性に、ほかの組織が同じ名前を使えるようにするためです。

1. 持ち主が [拡張の登録フォーム](https://github.com/geolonia/datamodels/issues/new?template=extension-report.yml) に記入します（モデルのページからはモデル名が入った状態で開きます）。書き方は「[拡張を載せる](https://datamodels.jp/guide/list-extension)」にあります。
2. メンテナーか持ち主が、`models/<サブジェクト>/<型名>/extensions/<名前>.yaml` を足す Pull Request を開きます（署名付き）。
3. CI が形を検査します。IRI が datamodels.jp のアドレスでないこと（自分のドメインかどうかは検査しない）、名前がモデルの属性や NGSI-LD のコアの用語と重ならないこと。@context をデータの中に書く場合は、サブジェクトの @context を取り込み、各用語を書いた IRI で定義していること。
4. レビューで確かめるのは、登録した人がその組織を代表していることだけです。内容は確認せず、持ち主の申告のまま載せます。アクセス情報（キー、トークン、ログイン URL）は載せません。

```yaml
organization: { ja: 和歌山県, en: Wakayama Prefecture }
url: https://www.pref.wakayama.lg.jp/        # 任意
version: 1.0.0                               # 基にしたサブジェクトのバージョン
context:                                     # URL、またはデータの中に書く @context
  - https://datamodels.jp/context/transportation/v1.jsonld
  - { detour: https://www.pref.wakayama.lg.jp/ns/road/detour }
terms:
  detour:
    iri: https://www.pref.wakayama.lg.jp/ns/road/detour
    description: { ja: 迂回路, en: Detour route }
data: https://example.org/road-restrictions  # 任意：公開しているデータ
since: 2026-10                               # 任意：載せた時期
```

## 署名（DCO）

コミットの `Signed-off-by: 名前 <メールアドレス>` は、[Developer Certificate of Origin](https://developercertificate.org/) に同意することを表します。つまり、その変更を自分で作ったか、公開する権利があり、このリポジトリのライセンスで公開してよいことを示します。別の同意書はありません。

- 付け方: `git commit -s`（名前とメールアドレスはコミットの作者と同じにします）
- 付け忘れたとき: `git rebase --signoff origin/main` の後、`git push --force-with-lease`。履歴を書き換えたくなければ、DCO チェックの詳細に表示される文面で、前のコミットに署名を追加するコミットを 1 つ足すこともできます。

[DCO アプリ](https://github.com/apps/dco)が、Pull Request のすべてのコミット（ボットとマージコミットを除く）に作者の署名があるかを検査します。

## ライセンス

機械が読むファイル（スキーマ、`@context`、語彙、例、`catalog.yaml`、対応表、公開する `catalog.json` とアダプターのファイル）は [CC0 1.0](https://github.com/geolonia/datamodels/blob/main/LICENSE-CONTENT.md)、文章（注記、モデルの README、サイトのページ）は [CC BY 4.0](https://github.com/geolonia/datamodels/blob/main/LICENSE-CONTENT.md)、ツールのコードは [Apache-2.0](https://github.com/geolonia/datamodels/blob/main/LICENSE) です。CC BY の出典（Smart Data Models、GIF のコアスキーマなど）から内容を写したファイルは CC BY 4.0 のままです。そのファイルと出典を、モデルのフォルダの `LICENSE.md` に書いてください。

<!-- #endregion ja -->

---

# Contributing

<!-- #region en -->
datamodels.jp publishes data models that work in Japan as a shared, product-neutral resource. Anyone can propose and change models, whether a company, a municipality or an individual, and the same rules apply to everyone. Japanese and English are both welcome.

## Ways to take part

- **Questions, bugs, ideas**: open an [issue](https://github.com/geolonia/datamodels/issues/new). "I do not understand this attribute" is welcome too.
- **Proposing a new model or new attributes**: use the [model proposal form](https://github.com/geolonia/datamodels/issues/new?template=model-proposal.yml). No schema is needed yet.
- **Adding or changing a model**: open a pull request (steps below).
- **Proposing upstream**: a model that is useful beyond Japan can be proposed to Smart Data Models via [incubated](https://github.com/smart-data-models/incubated). The folder layout matches Smart Data Models for exactly this. Nothing is proposed before the official launch, while models may still be corrected in place; at the launch, the candidates go into one issue that says who proposes them and when (decided 2026-10-03).

## Rules for models

- **Built on an existing standard**: the catalog publishes models that rest on government or municipal guidelines, Smart Data Models, GIF, an RFC or similar. Record the upstream types you considered, and why they did not fit, in `notes.yaml`.
- **Real data**: a model describes data that exists today, not a hypothetical use case.
- **Product-neutral**: no product-specific annotations or type names (files for particular products come from `adapters/`).
- The details are in [Rules for models](https://datamodels.jp/en/guide/rules): when to define a new type, reserved names, aliases and subclasses, status attributes, mapping to standards, writing examples.

## Stages and who decides

- **Proposal** (an issue) → **draft** (a merged model) → **stable** → **deprecated**. A deprecated model stays published; its URLs never change.
- **Experimental** (`experimental`) is an optional stage: a model in use, to learn from, that may still be replaced. It is the same stage as on the other nodes of the web of data models (#200); on datamodels.jp it will be rare (decided 2026-10-10).
- **Stable** needs two implementations from different organisations in `ADOPTERS.yaml`. Each entry gives `name`, `organization` and a `url` (public repository, documentation or a contact). CI checks that two organisations are listed; the reviewer of the pull request that sets `stable` checks that they are real and independent. An implementation by Geolonia, which runs the catalog, counts as one on the same terms (with a `url`); the other must come from a different organisation. One organisation counts once, whatever the customer or project, and `organization` names the organisation that built it.
- Maintainers review and merge ordinary pull requests. New subjects, major versions and promotions to `stable` are decided by a small group (Hal, 宮内さん, 大橋さん, Daniel), in the pull request or issue concerned.

## Pull request steps

1. Fork the repository and create a branch.
2. Run `npm ci`. For a new model, `npm run new-model -- <subject> <Type>` creates the files in the Smart Data Models layout (`schema.json`, `catalog.yaml`, `examples/`, `notes.yaml`); fill in the TODO markers.
3. `npm run validate:models` lists what is still missing. Before you push, `npm run check` and `npm test` must pass.
4. Sign off every commit with `git commit -s` and open the pull request.
5. Check the CI results (validation of schemas, examples, `@context` expansion, protected terms and versions, and an automated review; for branches in this repository also a preview URL) and answer the review.

Recording published versions (snapshots and the manifest) is a maintainer step. Until the official launch (pre-release), the current version may still be corrected in place.

### Proposing a model that a tool made

A tool that registers data (a broker console, for example) may build a new model from a user's data. To hand it in as a proposal, the tool writes out a folder in the same layout as the models in this repository: a **proposal bundle**.

- In `models/<subject>/<Type>/`: `catalog.yaml`, `schema.json`, `examples/`, `mapping/` if the data follows a standard or a published dataset, `notes.yaml`, and `ADOPTERS.yaml` (who uses the model, and roughly how much data). `npm run validate:models` lists what is missing.
- **Tools never post.** A person opens the pull request under their own GitHub account and signs off the commits (DCO), so authorship and responsibility stay with a person.
- After review, the model is merged as `draft`, like any other. There is no extra stage.
- The `ADOPTERS.yaml` entry gives reviewers evidence early. One organisation still counts once, so `stable` still needs two independent organisations (decided 2026-10-06, #156).

### Telling us about another catalog

Report another catalog of data models or vocabularies with the [catalog form](https://github.com/geolonia/datamodels/issues/new?template=catalog-report.yml). A maintainer checks it and lists it on the page "[Other data model catalogs](https://datamodels.jp/en/guide/catalogs)". Step by step: "[Telling us about another catalog](https://datamodels.jp/en/guide/report-catalog)". How catalogs that extend datamodels.jp models are listed for machines is not decided yet (#56).

### Listing an extension

An organisation that added attributes to a model can list its extension on the model page ("Extended by") and in `catalog.json`, so others who need an attribute with the same meaning can reuse the name.

1. The owner fills in the [extension form](https://github.com/geolonia/datamodels/issues/new?template=extension-report.yml) (from a model page it opens with the model filled in). Step by step: "[Listing your extension](https://datamodels.jp/en/guide/list-extension)".
2. A maintainer or the owner opens a pull request that adds `models/<subject>/<Type>/extensions/<name>.yaml` (signed off).
3. CI checks the form of it: the IRIs are not under datamodels.jp (whether the domain is the owner's is not checked), and the names clash with no attribute of the model and no NGSI-LD core term; an inline @context imports the subject's @context and defines each term with the IRI listed.
4. The review only checks that the person who reported it represents the organisation. The content is listed as the owner reported it, without review. Access details (keys, tokens, login URLs) are never listed.

```yaml
organization: { ja: 和歌山県, en: Wakayama Prefecture }
url: https://www.pref.wakayama.lg.jp/        # optional
version: 1.0.0                               # the subject version it builds on
context:                                     # a URL, or the @context written inside the data
  - https://datamodels.jp/context/transportation/v1.jsonld
  - { detour: https://www.pref.wakayama.lg.jp/ns/road/detour }
terms:
  detour:
    iri: https://www.pref.wakayama.lg.jp/ns/road/detour
    description: { ja: 迂回路, en: Detour route }
data: https://example.org/road-restrictions  # optional: the data, if public
since: 2026-10                               # optional: when it was listed
```

## Sign-off (DCO)

`Signed-off-by: Name <email>` in a commit states that you agree to the [Developer Certificate of Origin](https://developercertificate.org/): you wrote the change or have the right to submit it, and it may be published under this repository's licences. There is no separate contributor agreement.

- How: `git commit -s` (the name and email must match the commit's author).
- Forgot it: `git rebase --signoff origin/main`, then `git push --force-with-lease`. If you would rather not rewrite history, add one follow-up commit that signs off the earlier ones, with the text shown in the DCO check's details.

The [DCO app](https://github.com/apps/dco) checks that every commit of a pull request (except bots and merge commits) is signed off by its author.

## Licences

Machine-readable files (schemas, `@context` files, vocabularies, examples, `catalog.yaml`, mapping files, and the published `catalog.json` and adapter files) are [CC0 1.0](https://github.com/geolonia/datamodels/blob/main/LICENSE-CONTENT.md); prose (notes, the models' READMEs, the site's pages) is [CC BY 4.0](https://github.com/geolonia/datamodels/blob/main/LICENSE-CONTENT.md); the tooling is [Apache-2.0](https://github.com/geolonia/datamodels/blob/main/LICENSE). A file that copies content from a CC BY source (Smart Data Models, the GIF core schema) stays CC BY 4.0: name the file and its source in the model folder's `LICENSE.md`.
<!-- #endregion en -->
