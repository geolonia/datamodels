# 貢献の仕方 / Contributing

[English below](#contributing)

datamodels.jp は、日本で使えるデータモデルを共有の資産として公開するカタログです。企業、自治体、個人を問わず、誰でも提案・修正できます。ルールは全員同じです。日本語でも英語でも構いません。

## 参加の方法

依頼は Issue フォームで受け付けます。フォームごとの使う場面、書くこと、そのあとの流れは、サイトの「[貢献する](https://datamodels.jp/guide/contribute)」にあります。

- **質問・不具合・アイデア**: [Issue](https://github.com/geolonia/datamodels/issues/new) を開いてください。「この属性の意味が分からない」も歓迎です。
- **新しいモデルや属性の提案**: [モデルの提案フォーム](https://github.com/geolonia/datamodels/issues/new?template=model-proposal.yml)を使ってください。まだスキーマを書く必要はありません。
- **拡張を載せる**: [拡張の登録フォーム](https://github.com/geolonia/datamodels/issues/new?template=extension-report.yml)を使ってください。
- **自分のサイトを載せる**: [サイトの登録フォーム](https://github.com/geolonia/datamodels/issues/new?template=site-listing.yml)を使ってください。
- **他のカタログを知らせる**: [他のカタログの登録フォーム](https://github.com/geolonia/datamodels/issues/new?template=catalog-report.yml)を使ってください。datamodels.jp のモデルを拡張したカタログを機械が読める形で一覧にする方法は、まだ決まっていません（#56）。
- **モデルの追加・修正**: Pull Request を送ってください（下の手順）。
- **上流への提案**: 日本以外でも使えるモデルは、Smart Data Models の [incubated](https://github.com/smart-data-models/incubated) に提案できます。フォルダ構成を Smart Data Models と揃えているのはこのためです。正式公開までは提案しません。モデルをまだその場で直すことがあるからです。公開の時に、候補を 1 つの Issue にまとめ、誰がいつ提案するかを決めます（2026-10-03 決定）。

## モデルのルール

カタログに載せるモデルの条件と書き方は、サイトの「[モデルのルール](https://datamodels.jp/guide/rules#accepts)」にあります。載せるモデル、独自の型を作るとき、予約語、別名とサブクラス、状態の属性、標準との対応表、例の書き方、段階です。

## 段階と決め方

- モデルの段階（ドラフト、試行、安定、非推奨）と、安定になる条件は、サイトの「[モデルのルール](https://datamodels.jp/guide/rules#stages)」にあります。
- 通常の Pull Request はメンテナーがレビューしてマージします。新しい分野、メジャーバージョン、安定への昇格は、小さなグループが決めます。メンバーは Hal、宮内さん、大橋さん、Daniel で、その Pull Request や Issue の上で決めます。

## Pull Request の手順

1. リポジトリをフォークして、ブランチを作ります。
2. `pnpm install` を実行します（pnpm が入っていなければ `npx pnpm install`）。新しいモデルなら、`pnpm run new-model -- <subject> <Type>` でひな形を作り、TODO の箇所を埋めます。構成は Smart Data Models と同じです（`schema.json`、`catalog.yaml`、`examples/`、`notes.yaml`）。
3. `pnpm run validate:models` が、足りない箇所を一覧にします。[datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) の `datamodels check --offline`（どのデータモデルノードでも使う検査）を実行し、続けてこのカタログ独自のルール（`scripts/lib/catalog-rules.mjs`）を検査します。最後に `pnpm run check` と `pnpm test` が通ることを確認します。
4. すべてのコミットに `git commit -s` で署名（Signed-off-by）を付けて、Pull Request を送ります。
5. CI（スキーマ、例、`@context` の展開、予約語、バージョンの検査と自動レビュー。このリポジトリ内のブランチならプレビュー URL も）の結果を見て、レビューに答えます。

公開済みバージョンのリリース（`models/<subject>/releases/` のスナップショット）は、メンテナーが作ります。正式公開前（プレリリース）は、現行バージョンをその場で修正できます。

サイトの日本語のページは、`pnpm run lint:ja`（textlint、Geolonia のハンドブックと同じ規則）で検査します。このサイトでは、全角と半角の間に半角スペースを入れ、箇条書きも本文と同じです・ます体で書きます（`.textlintrc.json`）。英語版を一文ずつ訳すのではなく、日本語の読み手に向けて書いてください。

日本語と英語のページは、同じ Pull Request で両方を変えます。`pnpm run check:languages` が、見出し、コード、リンク、囲み（`:::`）が両方で同じかを検査します。文章の意味までは検査しないので、レビューで確かめます。片方の言語だけを変えるときは（日本語の書き直しなど）、Pull Request の説明に `One language only:` で始まる行を書き、理由を添えてください。

### ツールが作ったモデルを提案する

データを登録するツール（ブローカーの管理画面など）は、利用者のデータから新しいモデルを作ることがあります。それを提案として渡すときは、このリポジトリのモデルと同じ構成のフォルダ（**提案バンドル**）を書き出します。

- `models/<subject>/<Type>/` に、モデルのファイルを置きます。`catalog.yaml`、`schema.json`、`examples/`、`notes.yaml`、`ADOPTERS.yaml`（使っている組織とおよそのデータ量）です。多くの一覧が従う公開の標準を元にしたモデルなら、その標準との対応表（`mapping/`）も置きます（[モデルのルール](https://datamodels.jp/guide/rules#mapping)）。`pnpm run validate:models` で足りない箇所が分かります。
- **ツールは自分で投稿しません。** 人が自分の GitHub アカウントで Pull Request を開き、署名（DCO）を付けます。作者と責任は人に残ります。
- レビューを経て、他のモデルと同じく `draft` で取り込みます。新しい段階はありません。
- `ADOPTERS.yaml` の記載は、早めの根拠になります。1 つの組織は 1 回だけ数えるので、`stable` に 2 つの独立した組織が要るという規則は変わりません（2026-10-06 決定、#156）。

### 登録された拡張を取り込む

拡張の登録フォームで届いた拡張は、次の手順でモデルのページの「このモデルをもとにしたもの」と `catalog.json` に入ります。ツールキットで作った自分のサイトで公開している拡張は、サイトを `nodes.yaml` に載せれば、`pnpm run nodes` で読んだ内容が同じ欄に載ります。サイトとフォームの両方に同じ拡張があるときは、サイトの内容を 1 回だけ載せます（拡張のページか @context の URL がサイトの URL で始まるとき、同じとみなします）。

1. 持ち主が [拡張の登録フォーム](https://github.com/geolonia/datamodels/issues/new?template=extension-report.yml) に記入します（モデルのページからはモデル名が入った状態で開きます）。使う場面とそのあとの流れは「[拡張を載せる](https://datamodels.jp/guide/contribute#extension)」にあります。
2. メンテナーか持ち主が、`models/<subject>/<Type>/extensions/<name>.yaml` を足す Pull Request を開きます（署名付き）。
3. CI が形を検査します。IRI が datamodels.jp のアドレスでないこと（自分のドメインかどうかは検査しない）、名前がモデルの属性や NGSI-LD のコアの用語と重ならないこと。@context をデータの中に書く場合は、分野の @context を取り込み、各用語を書いた IRI で定義していること。
4. レビューで確かめるのは、登録した人がその組織を代表していることだけです。内容は確認せず、持ち主の申告のまま載せます。アクセス情報（キー、トークン、ログイン URL）は載せません。

```yaml
organization: { ja: 和歌山県, en: Wakayama Prefecture }
url: https://www.pref.wakayama.lg.jp/        # 任意
version: 1.0.0                               # 基にした分野のバージョン
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

- 付け方：`git commit -s`（名前とメールアドレスは、コミットの作者と同じにします）。
- 付け忘れたとき：`git rebase --signoff origin/main` の後、`git push --force-with-lease` を実行します。履歴を書き換えたくなければ、DCO チェックの詳細に表示される文面で、前のコミットに署名を追加するコミットを 1 つ足すこともできます。

[DCO アプリ](https://github.com/apps/dco)が、Pull Request のすべてのコミット（ボットとマージコミットを除く）に作者の署名があるかを検査します。

## ライセンス

機械が読むファイルは CC0 1.0、文章は CC BY 4.0、コードは Apache-2.0 です。どのファイルにどれが当たるか、CC BY の出典から写したときの書き方は、[ライセンス](https://datamodels.jp/LICENSE-CONTENT)にあります。

---

# Contributing

datamodels.jp publishes data models that work in Japan as a shared, product-neutral resource. Anyone can propose and change models, whether a company, a municipality or an individual, and the same rules apply to everyone. Japanese and English are both welcome.

## Ways to take part

Requests go through issue forms. When to use each form, what it asks and what happens next: "[Contributing](https://datamodels.jp/en/guide/contribute)" on the site.

- **Questions, bugs, ideas**: open an [issue](https://github.com/geolonia/datamodels/issues/new). "I do not understand this attribute" is welcome too.
- **Proposing a new model or new attributes**: use the [model proposal form](https://github.com/geolonia/datamodels/issues/new?template=model-proposal.yml). No schema is needed yet.
- **Listing an extension**: use the [extension form](https://github.com/geolonia/datamodels/issues/new?template=extension-report.yml).
- **Listing your own site**: use the [site listing form](https://github.com/geolonia/datamodels/issues/new?template=site-listing.yml).
- **Telling us about another catalog**: use the [catalog form](https://github.com/geolonia/datamodels/issues/new?template=catalog-report.yml). How catalogs that extend datamodels.jp models are listed for machines is not decided yet (#56).
- **Adding or changing a model**: open a pull request (steps below).
- **Proposing upstream**: a model that is useful beyond Japan can be proposed to Smart Data Models via [incubated](https://github.com/smart-data-models/incubated). The folder layout matches Smart Data Models for exactly this. Nothing is proposed before the official launch, while models may still be corrected in place; at the launch, the candidates go into one issue that says who proposes them and when (decided 2026-10-03).

## Rules for models

What the catalog accepts, and how to write a model: "[Rules for models](https://datamodels.jp/en/guide/rules#accepts)" on the site. It covers what the catalog accepts, when to define a new type, reserved names, aliases and subclasses, status attributes, mapping to standards, writing examples and the stages.

## Stages and who decides

- The stages of a model (draft, experimental, stable, deprecated) and what a model needs to become stable: "[Rules for models](https://datamodels.jp/en/guide/rules#stages)" on the site.
- Maintainers review and merge ordinary pull requests. New subjects, major versions and promotions to `stable` are decided by a small group (Hal, 宮内さん, 大橋さん, Daniel), in the pull request or issue concerned.

## Pull request steps

1. Fork the repository and create a branch.
2. Run `pnpm install` (without pnpm installed, `npx pnpm install`). For a new model, `pnpm run new-model -- <subject> <Type>` creates the files in the Smart Data Models layout (`schema.json`, `catalog.yaml`, `examples/`, `notes.yaml`); fill in the TODO markers.
3. `pnpm run validate:models` lists what is still missing: it runs `datamodels check --offline` from [datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit), the same check every data model node uses, and then the catalog's own rules (`scripts/lib/catalog-rules.mjs`). Before you push, `pnpm run check` and `pnpm test` must pass.
4. Sign off every commit with `git commit -s` and open the pull request.
5. Check the CI results (validation of schemas, examples, `@context` expansion, protected terms and versions, and an automated review; for branches in this repository also a preview URL) and answer the review.

Releasing published versions (the snapshots in `models/<subject>/releases/`) is a maintainer step. Until the official launch (pre-release), the current version may still be corrected in place.

The site's Japanese pages are checked with `pnpm run lint:ja` (textlint, the rules of Geolonia's handbook). This site puts a half-width space between Japanese and Latin text, and writes list items in the same polite form as the body (`.textlintrc.json`). Write the Japanese for Japanese readers, rather than translating the English sentence by sentence.

Change the Japanese and English page in the same pull request. `pnpm run check:languages` checks that both have the same headings, code, links and boxes (`:::`). It does not check what the words mean; review does. To change one language only (a rewrite of the Japanese, say), add a line starting with `One language only:` and the reason to the pull request description.

### Proposing a model that a tool made

A tool that registers data (a broker console, for example) may build a new model from a user's data. To hand it in as a proposal, the tool writes out a folder in the same layout as the models in this repository: a **proposal bundle**.

- In `models/<subject>/<Type>/`: `catalog.yaml`, `schema.json`, `examples/`, `mapping/` if the model was designed from a published standard that many lists follow ([Rules for models](https://datamodels.jp/en/guide/rules#mapping)), `notes.yaml`, and `ADOPTERS.yaml` (who uses the model, and roughly how much data). `pnpm run validate:models` lists what is missing.
- **Tools never post.** A person opens the pull request under their own GitHub account and signs off the commits (DCO), so authorship and responsibility stay with a person.
- After review, the model is merged as `draft`, like any other. There is no extra stage.
- The `ADOPTERS.yaml` entry gives reviewers evidence early. One organisation still counts once, so `stable` still needs two independent organisations (decided 2026-10-06, #156).

### Adding a listed extension

An extension reported with the extension form gets onto the model page ("Built on by others") and into `catalog.json` in these steps. An extension published on a site of its own, made with the toolkit, needs no listing: once the site is in `nodes.yaml`, `pnpm run nodes` reads it into the same section. When a site and a listed extension are the same, the section shows the site's data once (they are the same when the extension's page or @context URL starts with the site's URL).

1. The owner fills in the [extension form](https://github.com/geolonia/datamodels/issues/new?template=extension-report.yml) (from a model page it opens with the model filled in). When to use it and what happens next: "[List your extension](https://datamodels.jp/en/guide/contribute#extension)".
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

Machine-readable files are CC0 1.0, prose is CC BY 4.0 and code is Apache-2.0. Which file falls under which, and what to write when you copy from a CC BY source: [Licences](https://datamodels.jp/en/LICENSE-CONTENT).
