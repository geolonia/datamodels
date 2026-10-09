---
title: 拡張を載せる
description: モデルに足した属性をモデルのページに載せ、ほかの組織が同じ名前を使えるようにする。フォームの書き方を項目ごとに、例付きで
---

# 拡張を載せる

あなたの組織は、このカタログのモデルに属性を足して使っていますか？ それなら、モデルのページの「拡張している組織」に載せられます。同じ意味の属性が要るほかの組織が、新しく作らずにあなたの名前を使えるので、お互いのデータがそろいます。

フォームに記入するだけです。費用はかからず、プログラミングも要りません。足した属性の良し悪しは審査しません。GitHub のアカウントが要ります。

## 用意するもの {#before}

- **GitHub のアカウント**。無ければ[登録](https://github.com/signup)してください。
- **拡張したモデル**。例：`task/Task`
- **足した属性**。それぞれの名前、IRI、意味。
- **あなたの @context**。その URL、またはデータの中に書いている @context。

言葉の意味：

- **属性**は、データの 1 つの項目です（`name` や `category` など）。
- **IRI** は、属性に付ける名前としての Web アドレスです。誰が見ても同じ意味になるようにします。自分のドメインのアドレスを使います（例：`https://gtt-project.org/ns/fiware#category`）。
- **@context** は、属性の名前と IRI を結び付ける短いファイルです。書き方は[属性を足す](/guide/extend)に、ブラウザで作るなら[拡張ビルダー](/guide/builder)があります。

## フォームに記入する {#form}

モデルのページのリンク「フォームで登録してください」から開くと、モデル名が入った状態になります。[空のフォーム](https://github.com/geolonia/datamodels/issues/new?template=extension-report.yml)からでも構いません。日本語でも英語でも大丈夫です。

| 項目 | 書くこと | 例（GTT プロジェクト） |
|---|---|---|
| 拡張したモデル | サブジェクトと型を `/` でつないで | `task/Task` |
| 組織名 | 組織の名前を日本語と英語で | `GTT プロジェクト / GTT Project` |
| 足した属性 | 1 行に 1 つ：名前、IRI、意味（日本語 / 英語）をカンマで区切って | `category, https://gtt-project.org/ns/fiware#category, 課題のカテゴリー名 / The issue category name` |
| @context | @context の URL、またはデータの中に書いている @context | `https://gtt-project.org/ns/fiware-task.jsonld` |
| 基にしたバージョン | サブジェクトのバージョン。サブジェクトのページにあります | `1.0.0` |
| 組織またはプロジェクトのページ（任意） | 組織または拡張について書いたページ | `https://gtt-project.org/ns/fiware.html#task-profile` |
| 公開しているデータ（任意） | データを公開していれば、その場所 | （空） |
| 公開の同意 | 2 つともチェック：組織を代表していること、内容を誰でも再利用できること（CC0 1.0） | 両方チェック |

Issue は公開されます。API キー、パスワード、トークン、ログイン URL は書かないでください。

最後に「Create」を押します。

## そのあと {#next}

1. メンテナーが、あなたが組織を代表していることを確かめます。Issue で質問することがあります。
2. メンテナーかあなたが、Pull Request でカタログに登録します。名前がモデルの属性と重ならないこと、IRI が datamodels.jp のアドレスでないことは、自動で検査されます。ドメインがあなたのものかどうかは検査しません。そのための同意のチェックです。
3. マージされると、数分でモデルのページの「拡張している組織」と `catalog.json` に載ります。

内容は申告のまま載せます。属性の設計が良いかどうかは、datamodels.jp では確かめません。あとで直したり外したりしたいときは、新しい [Issue](https://github.com/geolonia/datamodels/issues) で知らせてください。

## 例：GTT プロジェクト {#example}

GTT プロジェクトの Redmine 用プラグインは、課題を Task のエンティティとして NGSI-LD ブローカーに送ります。Task には課題のカテゴリーの属性が無いので、GTT は `category` を 1 つ足しました。

- @context の [fiware-task.jsonld](https://gtt-project.org/ns/fiware-task.jsonld) は、カタログの task の @context を取り込み、`category` を足しています。
- GTT が [#189](https://github.com/geolonia/datamodels/issues/189) で登録し、[#190](https://github.com/geolonia/datamodels/pull/190) でカタログに入りました。
- [Task のページ](/models/task/Task/#extensions)に載っています。

## みんなに役立ちそうなら {#propose}

モデルを使う多くの人に役立つ属性なら、カタログそのものに提案してください。[貢献する](/guide/contribute)を見てください。
