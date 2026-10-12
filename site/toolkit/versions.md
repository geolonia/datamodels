---
title: バージョン
description: datamodels-toolkit で、公開したモデルを新しいバージョンで変え、古いバージョンを残し、新しいツールキットに移る手順
---

# バージョン

公開したバージョンは変えられません。`@context` を指定したデータは、その内容を前提にしているからです。`check` は公開済みのファイルと比べ、変わるファイルがあれば失敗します。

## 公開した後でモデルを変える {#bump}

変える前に、`bump` で次のバージョンを始めます。`bump` は、公開したバージョンをサイトに残します（その `@context`、語彙、スキーマを `models/road/releases/` に保存します）。そのうえで、`subject.yaml` の `version` と、スキーマの URL（`$id` と、分野のモデルの間の `$ref`）のバージョンを上げます。公開済みのファイルと違えば止まります。結果をコミットしてください。

```bash
npx @geolonia/datamodels@0.3.10 bump road minor
```

まだ公開していないノードでは、比べるファイルが無いので、`bump` と `release` は止まります。

```text
road v0.1.0: nothing released, the published files could not be compared:
  https://models.example.org/context/road/v0.1.0.jsonld: ENOTFOUND
  …
Try again when the site answers, or release with --offline to skip the comparison.
```

そのときは `--offline` を付けて、比べずに保存します（`bump road minor --offline`）。

そのうえでモデルを変えます。サイトには両方のバージョンが残ります。変更にどのレベル（`patch`、`minor`、`major`）が合うかは、[URL とバージョン](/guide/urls#versions)を見てください。

## バージョンを残すだけ {#release}

`bump` が最初に行う保存は、`release` だけでも実行できます。今のバージョンを `models/road/releases/` に保存し、バージョンは上げません。公開した後、ソースを変える前に実行して、結果をコミットします。`check` は、まだ保存していない公開済みのバージョンを知らせます。`build` は、保存したすべてのバージョンを今のバージョンと並べて公開します。保存したバージョンは、そのまま残ります。

オンラインでは、`release` はまず公開済みのファイルと比べます。公開した後にソースが変わっていれば、止まります。そのときは、ソースを元に戻し（git などで）、`release` を実行してから、新しいバージョンで変更します。

```bash
npx @geolonia/datamodels@0.3.10 release road
```

## 公開したバージョンを守る仕組み {#never-changes}

`release` と `bump` が `models/<subject>/releases/vX.Y.Z/` に書くスナップショットは、公開したすべてのバージョンの中身をそのまま持っています。これが、何を公開したかの記録です。次の 3 つの検査が、スナップショットを守ります。

- リリース済みの今のバージョンのソースがスナップショットと違えば、`build` と `check` が止まります。
- オンラインでは、`check` が正確なバージョンごとに、サイトが配信するファイルと比べます。
- `check --base <git ref>` は、スナップショットを git の ref と比べます。ふつうは、Pull Request のマージ先のブランチです。変わったスナップショットのファイルや、消えたファイルは問題になります。新しいスナップショットは問題になりません。この検査はオフラインでも使え、サイトからは分からない、消したバージョンにも気づきます。

`--all-released` を付けると、各分野の今のバージョンにもスナップショットを求めます。datamodels.jp のように、公開する前にバージョンをリリースするカタログ向けです。付けなければ、スナップショットの無い公開済みのバージョンを知らせるだけです。Pull Request では、先にマージ先のブランチを取得します。

```bash
git fetch origin main
npx @geolonia/datamodels@0.3.10 check --base origin/main --all-released
```

### 正式公開の前 {#prerelease}

正式公開の前は、`node.yaml` に `prerelease: true` と書くと、公開したバージョンをその場で直せます。分野のスナップショットを消し、ソースを直してから、`release <subject> --offline` を実行します。公開すべきでなかったバージョンは、まるごと消せます。`releases/` の下のそのフォルダーを消します。`context.jsonld` の無いリリースのフォルダーがあると、ビルドが止まります。バージョンはファイルごとではなく、フォルダーごと消します。

マージ先のブランチと変更の両方で `prerelease: true` の間は、`check --base` は直したところと消したところを、失敗ではなく注記として知らせます。スナップショットとオンラインの両方で同じです。`--base` を付けなければ、`check` はマージ先のブランチを見られません。そのため、変わった公開済みのファイルは問題のままです。

決めるのはマージ先のブランチです。マージ先にこの設定があれば、変更で設定を消したり、`false` から `true` に戻したりはできません。そのため、正式公開の後（`prerelease: false`）は、公開したバージョンは二度と変わりません。

## 新しいツールキットに移る {#upgrade}

ノードを新しいツールキットに移すには、`upgrade` を実行してコミットします。ワークフローと、ノードの最上位にある Markdown ファイル（README など）のバージョンが、最新のリリース（`--to` で指定したときはそのリリース）に変わります。Dependabot も新しいリリースを提案します。

```bash
npx @geolonia/datamodels@0.3.10 upgrade
```

`upgrade` は、リリースを GitHub の API から読みます。`.github/workflows/` では、Action をリリースのコミットの SHA で固定し、タグをコメントに書きます。GitHub から実行する形の `npx` の行は、npm の形に書き換えます。`npx github:geolonia/datamodels-toolkit#vX.Y.Z` は、`npx @geolonia/datamodels@X.Y.Z` になります。
