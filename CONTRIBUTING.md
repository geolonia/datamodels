# 貢献の仕方 / Contributing

[English below](#contributing)

<!-- #region ja -->
datamodels.jp は、日本で使えるデータモデルを共有の資産として公開するカタログです。企業、自治体、個人を問わず、誰でも提案・修正できます。ルールは全員同じです。日本語でも英語でも構いません。

## 参加の方法

- **質問・不具合・アイデア**: [Issue](https://github.com/geolonia/datamodels/issues/new) を開いてください。「この属性の意味が分からない」も歓迎です。
- **新しいモデルや属性の提案**: [モデルの提案フォーム](https://github.com/geolonia/datamodels/issues/new?template=model-proposal.yml)を使ってください。まだスキーマを書く必要はありません。
- **モデルの追加・修正**: Pull Request を送ってください（下の手順）。
- **上流への提案**: 日本以外でも使えるモデルになったら、Smart Data Models の [incubated](https://github.com/smart-data-models/incubated) に提案します。フォルダ構成を Smart Data Models と揃えているのはこのためです。

## モデルのルール

- **既存の標準に基づく**: 国や自治体のガイドライン、Smart Data Models、GIF、RFC などに基づくモデルだけを公開します。検討した上流の型と、採用しなかった理由は `notes.yaml` に書きます。
- **実際のデータがある**: 架空のユースケースではなく、いま存在するデータを表すこと。
- **製品に依存しない**: 特定の製品向けの注釈や型名は入れません（製品向けのファイルは `adapters/` が作ります）。
- 書き方の詳細は[拡張する](https://datamodels.jp/guide/extend)にあります（名前空間、予約語、エイリアスとサブクラス、状態の属性、例の書き方）。

## 段階と決め方

- **提案**（Issue）→ **draft**（マージされたモデル）→ **stable** → **deprecated**。deprecated になったモデルも公開をやめず、URL は変わりません。
- **stable** になるには、`ADOPTERS.yaml` に別々の組織による 2 つの実装が必要です。各項目に `name`、`organization`、`url`（公開リポジトリ、ドキュメント、連絡先）を書きます。CI は組織が 2 つあるかを検査し、stable にする Pull Request のレビュアーが、実在し独立しているかを確認します。
- 通常の Pull Request はメンテナーがレビューしてマージします。新しいサブジェクト、メジャーバージョン、stable への昇格は、小さなグループ（Hal、宮内さん、大橋さん、Daniel）がその Pull Request や Issue の上で決めます。

## Pull Request の手順

1. リポジトリをフォークして、ブランチを作ります。
2. `npm ci` の後、新しいモデルなら `npm run new-model -- <サブジェクト> <型名>` でひな形を作ります（Smart Data Models と同じ構成: `schema.json`, `catalog.yaml`, `examples/`, `notes.yaml`）。TODO の箇所を埋めます。
3. `npm run validate:models` が、足りない箇所を一覧にします。最後に `npm run check` と `npm test` が通ることを確認します。
4. すべてのコミットに `git commit -s` で署名（Signed-off-by）を付けて、Pull Request を送ります。
5. CI（スキーマ、例、`@context` の展開、予約語、バージョンの検証と自動レビュー。このリポジトリ内のブランチならプレビュー URL も）の結果を見て、レビューに答えます。

公開済みのバージョンの記録（スナップショットとマニフェスト）はメンテナーが行います。正式公開前（プレリリース）は、現行バージョンをその場で修正できます。

## 署名（DCO）

コミットの `Signed-off-by: 名前 <メールアドレス>` は、[Developer Certificate of Origin](https://developercertificate.org/) に同意することを表します。つまり、その変更を自分で作ったか、公開する権利があり、このリポジトリのライセンスで公開してよいことを示します。別の同意書はありません。

- 付け方: `git commit -s`（名前とメールアドレスはコミットの作者と同じにします）
- 付け忘れたとき: `git rebase --signoff origin/main` の後、`git push --force-with-lease`。履歴を書き換えたくなければ、DCO チェックの詳細に表示される文面で、前のコミットに署名を追加するコミットを 1 つ足すこともできます。

[DCO アプリ](https://github.com/apps/dco)が、Pull Request のすべてのコミット（ボットとマージコミットを除く）に作者の署名があるかを検査します。

## ライセンス

機械が読むファイル（スキーマ、`@context`、語彙、例、`catalog.yaml`、対応表）は [CC0 1.0](https://github.com/geolonia/datamodels/blob/main/LICENSE-CONTENT.md)、文章（注記、README、サイトのページ）は [CC BY 4.0](https://github.com/geolonia/datamodels/blob/main/LICENSE-CONTENT.md)、ツールのコードは [Apache-2.0](https://github.com/geolonia/datamodels/blob/main/LICENSE) です。CC BY の出典（Smart Data Models、GIF のコアスキーマなど）から内容を写したファイルは CC BY 4.0 のままです。そのファイルと出典を、モデルのフォルダの `LICENSE.md` に書いてください。

<!-- #endregion ja -->

---

# Contributing

<!-- #region en -->
datamodels.jp publishes data models that work in Japan as a shared, product-neutral resource. Anyone can propose and change models, whether a company, a municipality or an individual, and the same rules apply to everyone. Japanese and English are both welcome.

## Ways to take part

- **Questions, bugs, ideas**: open an [issue](https://github.com/geolonia/datamodels/issues/new). "I do not understand this attribute" is welcome too.
- **Proposing a new model or new attributes**: use the [model proposal form](https://github.com/geolonia/datamodels/issues/new?template=model-proposal.yml). No schema is needed yet.
- **Adding or changing a model**: open a pull request (steps below).
- **Proposing upstream**: a model that turns out to be useful beyond Japan is proposed to Smart Data Models via [incubated](https://github.com/smart-data-models/incubated). The folder layout matches Smart Data Models for exactly this.

## Rules for models

- **Built on an existing standard**: the catalog publishes models that rest on government or municipal guidelines, Smart Data Models, GIF, an RFC or similar. Record the upstream types you considered, and why they did not fit, in `notes.yaml`.
- **Real data**: a model describes data that exists today, not a hypothetical use case.
- **Product-neutral**: no product-specific annotations or type names (files for particular products come from `adapters/`).
- The details are in [Extending models](https://datamodels.jp/en/guide/extend): namespaces, protected terms, aliases and subclasses, status attributes, writing examples.

## Stages and who decides

- **Proposal** (an issue) → **draft** (a merged model) → **stable** → **deprecated**. A deprecated model stays published; its URLs never change.
- **Stable** needs two implementations from different organisations in `ADOPTERS.yaml`. Each entry gives `name`, `organization` and a `url` (public repository, documentation or a contact). CI checks that two organisations are listed; the reviewer of the pull request that sets `stable` checks that they are real and independent.
- Maintainers review and merge ordinary pull requests. New subjects, major versions and promotions to `stable` are decided by a small group (Hal, 宮内さん, 大橋さん, Daniel), in the pull request or issue concerned.

## Pull request steps

1. Fork the repository and create a branch.
2. Run `npm ci`. For a new model, `npm run new-model -- <subject> <Type>` creates the files in the Smart Data Models layout (`schema.json`, `catalog.yaml`, `examples/`, `notes.yaml`); fill in the TODO markers.
3. `npm run validate:models` lists what is still missing. Before you push, `npm run check` and `npm test` must pass.
4. Sign off every commit with `git commit -s` and open the pull request.
5. Check the CI results (validation of schemas, examples, `@context` expansion, protected terms and versions, and an automated review; for branches in this repository also a preview URL) and answer the review.

Recording published versions (snapshots and the manifest) is a maintainer step. Until the official launch (pre-release), the current version may still be corrected in place.

## Sign-off (DCO)

`Signed-off-by: Name <email>` in a commit states that you agree to the [Developer Certificate of Origin](https://developercertificate.org/): you wrote the change or have the right to submit it, and it may be published under this repository's licences. There is no separate contributor agreement.

- How: `git commit -s` (the name and email must match the commit's author).
- Forgot it: `git rebase --signoff origin/main`, then `git push --force-with-lease`. If you would rather not rewrite history, add one follow-up commit that signs off the earlier ones, with the text shown in the DCO check's details.

The [DCO app](https://github.com/apps/dco) checks that every commit of a pull request (except bots and merge commits) is signed off by its author.

## Licences

Machine-readable files (schemas, `@context` files, vocabularies, examples, `catalog.yaml`, mapping files) are [CC0 1.0](https://github.com/geolonia/datamodels/blob/main/LICENSE-CONTENT.md); prose (notes, READMEs, the site's pages) is [CC BY 4.0](https://github.com/geolonia/datamodels/blob/main/LICENSE-CONTENT.md); the tooling is [Apache-2.0](https://github.com/geolonia/datamodels/blob/main/LICENSE). A file that copies content from a CC BY source (Smart Data Models, the GIF core schema) stays CC BY 4.0: name the file and its source in the model folder's `LICENSE.md`.
<!-- #endregion en -->
