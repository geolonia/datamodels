---
layout: home
# The browser tab and search results: the name and what it is (titleTemplate: false, no " | datamodels.jp").
title: datamodels.jp：日本で使えるデータモデル
titleTemplate: false
description: 避難所や道路規制、施設、タスクなどを表す共通のデータモデル。自治体やシステムが違っても、データを組み合わせられます。JSON Schema、JSON-LD、NGSI-LD で使えます。

hero:
  # The headline carries the page; the mark and name are in the navigation (docs/brand.md).
  name: ''
  # HTML: 「ずっと変わらない」 and 「URL で。」 never break inside, so a narrow screen breaks between them; 「データモデル」 and the full stop (the mark's dot) are red.
  text: 日本で使える<br><span class="accent">データモデル</span>を、<span class="nowrap">ずっと変わらない</span> <span class="nowrap">URL で<span class="dot">。</span></span>
  # The tagline says what the models are for; the last phrase keeps together on a phone.
  tagline: 避難所や道路規制、施設、タスクなどを表す共通の定義です。自治体やシステムが違っても、データを<span class="nowrap">組み合わせられます。</span>
  # Records from many systems linked to the shared definitions; one branch adds its own attribute (#167).
  image:
    light: /hero-illustration.svg
    dark: /hero-illustration-dark.svg
    alt: いくつものシステムのデータが共通の定義につながり、1 つのシステムがその上に自分の属性を足している図
  actions:
    - theme: brand
      text: データモデル一覧
      link: /models/
    - theme: alt
      text: 使い方ガイド
      link: /guide/use
    - theme: alt
      text: 貢献する
      link: /guide/contribute

features:
  - title: 日本向け
    details: 自治体標準オープンデータセット、災害対応基本共有情報（EEI）、国土地理院の避難所データなど、すでに使っている標準があれば、対応するモデルを探せます。
    link: /guide/standards
    linkText: 対応している標準
  - title: 自治体の一覧を公開する
    details: 避難場所や AED の設置場所など、CSV で公開している一覧を、モデルに合った JSON にして、CSV の隣に公開します。
    link: /guide/publish
    linkText: 一覧を公開する
  - title: データを変換する
    details: CSV の一覧を、モデルのエンティティに変換します。1 件ずつ、モデルの JSON Schema で検証します。
    link: /toolkit/convert
    linkText: データを変換する
  - title: 複製せず、拡張する
    details: Smart Data Models、NGSI-LD、schema.org の型や属性で合うものはそのまま使います。独自の属性はその上に足せます。
    link: /guide/extend
    linkText: 拡張する
  - title: 変わらない URL
    details: 正式公開後は、バージョン付きで公開した @context・JSON Schema・語彙を変更も削除もしません。リンクはずっと使えます。
    link: /guide/urls
    linkText: URL とバージョン
  - title: 自分のモデルを公開する
    details: 自分たちだけが使うモデルは、自分のサイトに変わらない URL で公開できます。オープンソースのツールキットで作れます。
    link: /toolkit/
    linkText: ツールキット
  - title: みんなで育てる
    details: よくある用途のモデルを、使う人と一緒に改善していきます。ご提案をお待ちしています。
    link: /guide/contribute
    linkText: 貢献する
---
