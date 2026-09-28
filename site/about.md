---
title: このサイトについて
description: datamodels.jp の運営者、ライセンス、免責、プライバシー
---

# このサイトについて

datamodels.jp は、日本で使えるデータモデルのカタログです。JSON Schema と JSON-LD で公開し、NGSI-LD でもそのまま使えます。特定の製品に依存しない共有の資産（デジタルコモンズ）として公開しています。

## 運営者

[株式会社Geolonia](https://www.geolonia.com/company/) が運営しています。

- モデルへの質問・提案・不具合の報告: [GitHub の Issue](https://github.com/geolonia/datamodels/issues)（日本語・英語どちらでも）
- その他のお問い合わせ: [Geolonia のお問い合わせフォーム](https://www.geolonia.com/contact/)

## ライセンス

- **モデルのファイル**（JSON Schema、JSON-LD の `@context`、語彙、例、`catalog.yaml`、対応表、`catalog.json`、公開しているアダプターのファイル `/adapters/…`）: [CC0 1.0](/LICENSE-CONTENT)。条件なしで使えます。ファイルの中の正規の URL（スキーマの `$id`、`@context` の URL、型と属性の IRI）は、コピーしても残してください（お願いであり、条件ではありません）。新しいバージョンがあることを、コピーを見た人が知る手がかりになります。
- **文章**（モデルの注記と `README.md`、このサイトのページ）: [CC BY 4.0](/LICENSE-CONTENT)。利用するときは、たとえば「出典: datamodels.jp（株式会社Geolonia）、CC BY 4.0」のように表示し、使ったページへのリンクを付けてください（編集・加工した場合はその旨も）。各ページの上にそのページの URL があります。
- CC BY の標準（Smart Data Models、GIF のコアスキーマなど）から内容を写したファイルは、ファイル全体が CC BY 4.0 のままで、各モデルの `LICENSE.md` にそのファイルと出典を書きます。現在、写した部分はありません（対応を記録し、IRI を再利用しているだけです）。
- **ツールのコード**（サイト、スクリプト、`adapters/` のアダプターのコード）: [Apache-2.0](https://github.com/geolonia/datamodels/blob/main/LICENSE)
- 他の語彙の IRI（Smart Data Models、schema.org、NGSI-LD など）は参照しているだけで、それぞれの提供元のものです。上流から派生した部分の出典は、各モデルの注記に記載しています。

## 免責

- モデルは現状のまま提供し、正確性・完全性・特定の目的への適合性を保証しません。
- 政府や自治体の標準との対応表は、このカタログによる解釈です。各機関が承認したものではありません。
- 現在はプレリリース版です。正式公開までは、公開済みのバージョンも直接修正することがあります。正式公開後は[変わらない URL](/guide/urls)の約束が適用されます。

## プライバシー

- Cookie、アクセス解析、外部のスクリプトは使っていません。フォームもありません。
- サイト内検索はブラウザの中で動き、検索語は送信されません。外観（ライト・ダーク）の設定はブラウザにだけ保存されます。
- ホスティング事業者（Cloudflare）が、サービスの提供に必要な範囲で通常のアクセスログ（IP アドレス、ブラウザの種類など）を処理します。
- Geolonia の[プライバシーポリシー](https://www.geolonia.com/privacy/)も参照してください。

アクセス解析などを導入する場合は、先にこのページで知らせます。
