---
title: 貢献する
description: 参加の方法。モデルの提案、拡張やサイトの登録、他のカタログを知らせるフォームと、そのあとの流れ
---

# 貢献する

企業、自治体、個人を問わず、誰でも参加できます。ルールは全員同じです。日本語でも英語でも構いません。

何かを頼むときは、合う Issue フォームを使います。Issue フォームは、項目に記入して送る GitHub のページです。GitHub のアカウント（無料）が要ります。無ければ[登録](https://github.com/signup)してください。下の節ごとに、フォームを使う場面、書くこと、そのあとの流れを説明します。

フォームの内容が、そのままサイトに載ることはありません。まずメンテナーが確かめます。そのうえで、自動の検査とレビューを通った Pull Request（カタログのファイルの変更案）だけがカタログに入ります。

Issue は誰でも読めます。パスワード、API キー、トークン、ログイン URL は書かないでください。

質問、不具合、アイデアは、ふつうの [Issue](https://github.com/geolonia/datamodels/issues/new) で知らせてください。「この属性の意味が分からない」も歓迎です。

<!-- One section per issue form (.github/ISSUE_TEMPLATE): when to use it, what it asks, what happens next. -->

## モデルや属性を提案する {#model-proposal}

新しいモデルや、モデルを使う多くの人に役立つ属性は、モデルの提案フォームで提案します。スキーマを書く必要はありません。

カタログに載せるのは、既存の標準（国のガイドライン、Smart Data Models、RFC など）に基づき、いま実際にあるデータを表すモデルだけです。詳しくは[モデルのルール](/guide/rules)にあります。自分のプロジェクトだけで使うモデルは、自分のサイトで公開できます（[自分のデータモデル](/guide/own-models)）。自分たちのためだけに属性を足すときや、名前だけを変えるときは、提案は要りません（[どのページを読むか](/guide/#which)）。

フォームには、1 件のデータが何を表すか、そのデータをいま誰がどのくらい持っているか、基にする標準を書きます。合う標準が無ければ、その理由を書きます。分かれば、ほかにそのモデルを使いそうな組織と、データの例も書きます。Issue を開くと、似ているモデルが自動でコメントされます。そのまま使えるモデルや、拡張できるモデルがないか確かめてください。

そのあと：まず Issue で提案について話し合います。次に、提案した人かメンテナーが Pull Request でモデルを書きます（[自分でファイルを変える](#pull-requests)）。自分でコードを書けなくても構いません。取り込まれると、モデルはドラフトとして公開されます。別々の 2 つの組織が自分のシステムで使うと、安定になります（[段階](/guide/rules#stages)）。

<svg class="flow-diagram" viewBox="0 0 460 120" role="img" aria-label="モデルは、提案（Issue）、ドラフト（カタログに入る）、安定（独立した 2 つの実装）、非推奨（新規には使わない。公開は続く）と進みます。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="lc-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="10" y="10" width="104" height="58" rx="10"/><text class="t" x="62.0" y="35">提案</text><text class="s" x="62.0" y="55">Issue</text><line class="a" x1="114" y1="39" x2="120" y2="39" marker-end="url(#lc-ah)"/><rect class="box" x="122" y="10" width="104" height="58" rx="10"/><text class="t" x="174.0" y="35">ドラフト</text><text class="s" x="174.0" y="55">カタログに入る</text><line class="a" x1="226" y1="39" x2="232" y2="39" marker-end="url(#lc-ah)"/><rect class="box main" x="234" y="10" width="104" height="58" rx="10"/><text class="t" x="286.0" y="35">安定</text><text class="s" x="286.0" y="55">安心して使える</text><line class="a" x1="338" y1="39" x2="344" y2="39" marker-end="url(#lc-ah)"/><rect class="box" x="346" y="10" width="104" height="58" rx="10"/><text class="t" x="398.0" y="35">非推奨</text><text class="s" x="398.0" y="55">公開は続く</text><text class="s" x="118.0" y="92">レビュー・マージ</text><text class="s" x="230.0" y="92">2 つの組織が実装</text><text class="s" x="342.0" y="92">新規には使わない</text></svg>

[モデルの提案フォームを開く](https://github.com/geolonia/datamodels/issues/new?template=model-proposal.yml)

## 拡張を載せる {#extension}

組織がカタログのモデルに属性を足して使っているなら、拡張の登録フォームで、モデルのページの「このモデルをもとにしたもの」に載せられます。同じ意味の属性が要るほかの組織がその名前を使えるので、お互いのデータがそろいます。[ツールキット](/toolkit/)で作った自分のサイトで公開しているなら、フォームは要りません。サイトを載せれば（[次の節](#site-listing)）、サイトのモデルが自動でモデルのページに載ります。

フォームには、拡張したモデル（例：`task/Task`）、組織名（日本語と英語）、足した属性ごとの名前・IRI・意味を書きます。IRI は、属性の名前として使う Web アドレスです。自分の組織の Web サイトなど、自分で管理するドメインのアドレスを使います。自分の @context と、基にしたバージョンも書きます。組織を代表していることと、内容を誰でも再利用できること（CC0 1.0）にも同意します。モデルのページのリンク「フォームで登録してください」から開くと、モデル名が入った状態になります。@context が初めてなら、[属性を足す](/guide/extend)を参照してください。@context は[拡張ビルダー](/guide/extend#builder)でも作れます。

そのあと：メンテナーが、登録した人が組織を代表していることを確かめます。メンテナー（または登録した人）が Pull Request で登録し、名前がモデルの属性と重なっていないかなどを自動で検査します。取り込まれると、数分でモデルのページと `catalog.json` に載ります。属性は申告のまま載せます。設計の良し悪しは、datamodels.jp では確かめません。記入の例は [#189](https://github.com/geolonia/datamodels/issues/189) にあります。

[拡張の登録フォームを開く](https://github.com/geolonia/datamodels/issues/new?template=extension-report.yml)

## データモデルのサイトを載せる {#site-listing}

[ツールキット](/toolkit/)で作った自分のサイトでデータモデルを公開しているなら（[サイトを始める](/toolkit/start)）、サイトの登録フォームで[データモデルのサイト](/guide/sites)の一覧に載せられます。サイトのモデルがカタログのモデルをもとにしていれば、そのモデルのページの「このモデルをもとにしたもの」にも、足した属性と一緒に載ります。

フォームには、サイトの URL、`catalog.json` の URL、名前（日本語と英語。`catalog.json` の publisher と同じ名前）を書きます。チェックを入れて、サイトを運営していること（または運営者の代わりに申請していること）を示します。サイトとモデルを datamodels.jp が載せることにも同意します。サイトが移ったり閉じたりしたら、Issue で知らせてください。

そのあと：メンテナーが Pull Request でサイトを一覧に足します。その Pull Request でサイトの `catalog.json` を読み込み、読んだ内容をレビューで確かめます。モデルの中身は datamodels.jp では確かめません。それぞれのサイトが自分のモデルを決めます。

[サイトの登録フォームを開く](https://github.com/geolonia/datamodels/issues/new?template=site-listing.yml)

## 他のカタログを知らせる {#catalog}

「[他のデータモデルカタログ](/guide/catalogs)」に載っていないデータモデルや語彙のカタログを知っていたら、他のカタログの登録フォームで知らせてください。自治体標準オープンデータセットのような、データの標準の形も含みます。世界のもの、日本のもの、1 つの組織のもの、どれでも構いません。ログインや契約なしで、誰でも読めるものに限ります。

フォームには、カタログの名前、ページ、公開している組織、範囲、内容と形式、datamodels.jp との関係、ライセンスを書きます。分からない項目には、分かることだけ、または「不明」と書いてください。メンテナーが質問します。

そのあと：メンテナーがカタログを見て、Issue で質問することがあります。合えば、Pull Request でページに載せます。

[他のカタログの登録フォームを開く](https://github.com/geolonia/datamodels/issues/new?template=catalog-report.yml)

## 自分でファイルを変える {#pull-requests}

依頼を送るだけなら、上のフォームで足ります。Pull Request でカタログのファイルを自分で変えるときは、GitHub の [CONTRIBUTING.md](https://github.com/geolonia/datamodels/blob/main/CONTRIBUTING.md) に従ってください。Pull Request の手順、決め方、署名（DCO）を説明しています。貢献した内容は、カタログの[ライセンス](/LICENSE-CONTENT)で公開します。
