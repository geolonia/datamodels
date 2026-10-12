---
title: AI でデータを取り出す
description: モデルの AI 用スキーマを AI モデルに渡してメールや PDF からエンティティを取り出し、答えを検証して NGSI-LD のエンティティにする
---

# AI でデータを取り出す

エンティティのモデルの多くは、ページの**ダウンロード**の行に **AI 用の構造化出力**があります。AI モデルの構造化出力が受け付ける JSON Schema で、説明は英語です。メールや PDF などの文書と合わせて AI モデルへ送ると、モデルの属性の形で答えが返ります。このページでは、短いお知らせの文から[指定緊急避難場所（EvacuationSite）](/models/disaster/EvacuationSite/)を取り出します。OpenAI の API と Claude の API の両方の例を示します。

<svg class="flow-diagram" viewBox="0 0 460 398" role="img" aria-label="文書と AI 用のスキーマを AI モデルに送ると、モデルの形の JSON が返ります。id と type を足して JSON Schema で検証し、NGSI-LD のエンティティにします。" xmlns="http://www.w3.org/2000/svg"><defs><marker id="ai-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="58" rx="10"/><text class="t" x="230" y="33">文書と AI 用のスキーマ</text><text class="s" x="230" y="53">メールや PDF と EvacuationSite.ai.json</text><line class="a" x1="230" y1="68" x2="230" y2="114" marker-end="url(#ai-ah)"/><text class="l" x="242" y="95">① API に送る</text><rect class="box main" x="20" y="116" width="420" height="58" rx="10"/><text class="t" x="230" y="141">AI モデル</text><text class="s" x="230" y="161">スキーマの形で答える</text><line class="a" x1="230" y1="176" x2="230" y2="222" marker-end="url(#ai-ah)"/><text class="l" x="242" y="203">② 答えの JSON</text><rect class="box" x="20" y="224" width="420" height="58" rx="10"/><text class="t m" x="230" y="249">site.json</text><text class="s" x="230" y="269">属性だけ。id と type は無い</text><line class="a" x1="230" y1="284" x2="230" y2="330" marker-end="url(#ai-ah)"/><text class="l" x="242" y="311">③ id と type を足して検証</text><rect class="box" x="20" y="332" width="420" height="58" rx="10"/><text class="t" x="230" y="357">NGSI-LD のエンティティ</text><text class="s" x="230" y="377">key-values の形</text></svg>

## 1. スキーマと文書 {#input}

```bash
curl -sSfO https://datamodels.jp/adapters/ai/disaster/EvacuationSite.ai.json
```

ファイルの中身は `{ name, description, strict, schema }` です。`id` と `type` は入っていません。この 2 つはアプリケーションで決めます。文書は `notice.txt` に入れておきます。たとえば次の文です。

```text
千代田区（全国地方公共団体コード 131016）は、都立一橋高校（東京都千代田区東神田1-12-13）を、地震、高潮、内水氾濫の指定緊急避難場所に指定しました。区の番号は 13101-0012 です。指定避難所も兼ねます。
```

全国地方公共団体コード（`localGovernmentCode`、6 桁）は必須の属性です。文書に無いと、AI モデルが推測して埋めます。文書に書いておくか、答えを受け取った後に自分で入れてください。学校の名称、住所、災害の種別は、国土地理院の指定緊急避難場所データ（千代田区）と同じです。区の番号は、例のために作った値です。

どちらの API も、PDF のファイルをそのまま受け取れます。方法はそれぞれのドキュメントにあります。

## 2. モデルに尋ねる {#request}

リクエストは [jq](https://jqlang.org/) で組み立て、スキーマと文書を本文に入れます。モデル名は一例です。構造化出力やツールに対応したモデルなら、どれでも使えます。

::: code-group

```bash [OpenAI API]
jq -n --slurpfile s EvacuationSite.ai.json --rawfile text notice.txt '{
  model: "gpt-6-astra",
  messages: [
    {role: "system", content: "Extract the evacuation site from the text."},
    {role: "user", content: $text}
  ],
  response_format: {type: "json_schema", json_schema: $s[0]}
}' > request.json
curl -sS https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" --data @request.json \
  | jq '.choices[0].message.content | fromjson' > site.json
```

```bash [Claude API]
jq -n --slurpfile s EvacuationSite.ai.json --rawfile text notice.txt '{
  model: "claude-opus-5-5",
  max_tokens: 16000,
  system: "Extract the evacuation site from the text with the tool.",
  tools: [{name: $s[0].name, description: $s[0].description,
    input_schema: $s[0].schema}],
  messages: [{role: "user", content: $text}]
}' > request.json
curl -sS https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" --data @request.json \
  | jq -e 'first(.content[] | select(.type == "tool_use") | .input)' > site.json
```

:::

- **OpenAI API**：ファイルをそのまま `response_format` の `json_schema` にします。`strict: true` です。答えにはすべての属性が入り、文書に書いていない属性は `null` になります。
- **Claude API**：`schema` をツールの `input_schema` にします。答えはツールへの入力として返ります。例のモデルは `tool_choice` でツールの使用を強制できないので、system でツールを使うよう指示しています。答えにツールの呼び出しが無いときは `jq -e` がエラーで止まるので、リクエストを送り直してください。Claude の strict モード（ツールの `"strict": true`）は、union 型のパラメーターを 1 回のリクエストで 16 個までしか受け付けません。`null` になりうるプロパティも数えます（[AI の構造化出力](/toolkit/export#ai)）。EvacuationSite はそれより多いので、この例では strict を外しています。この場合、答えはたいていスキーマに従いますが、手順 3 で確かめてください。小さなモデルや、要らない属性を外したスキーマなら、`"strict": true` を付けられます。
- 1 つの文書から複数の避難場所を取り出すときは、スキーマを配列に入れます。形は `{"type": "object", "properties": {"sites": {"type": "array", "items": …}}}` です。ファイルと同じく、`required` と `additionalProperties: false` も付けます。

構造化出力を使う前に、各社の説明を読んでください（[OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas)、[Claude](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)）。

## 3. 答えを検証してエンティティにする {#entity}

答えには属性だけが入っています。空の属性を除き、AI が `id` や `type` を入れていたら消して、自分の `id` と `type` を足します。

```bash
jq 'walk(if type == "object" then with_entries(select(.value != null)) else . end)
  | del(.id, .type)
  | {id: "urn:ngsi-ld:EvacuationSite:0012", type: "EvacuationSite"} + .' \
  site.json > entity.json
```

次に、`entity.json` をモデルの JSON Schema で検証します。

```bash
# pipx install check-jsonschema（または uvx check-jsonschema …）
check-jsonschema --schemafile \
  https://datamodels.jp/schema/disaster/EvacuationSite/v1.json entity.json
```

```text
ok -- validation done
```

Node.js や Python で検証する方法は、[JSON を検証する](/guide/use#validate)にあります。strict モードでも、答えの形が保証されるだけです。AI 用のスキーマは、一部の決まり（最小値や、複数の属性にまたがる決まり）を説明に書くだけにしています。strict を外したときは、形も保証されません。JSON Schema はこれらをすべて確かめます。ただし、内容が正しいかまでは確かめられません。AI モデルがコードや数を読み違えることもあるので、保存する前に文書と見比べてください。

これで `entity.json` は key-values の形のエンティティです。NGSI-LD ブローカーに送るには、@context 付きの normalized の形にします（[normalized の形](/guide/normalized)）。

## 自分のモデル {#own-models}

自分のサイトのモデルでも、`datamodels export --to ai` で同じファイルを作れます。決まった形を持たない属性があるモデルには、AI 用のファイルはありません（[他のツールに書き出す](/toolkit/export#ai)）。
