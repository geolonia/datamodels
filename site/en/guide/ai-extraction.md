---
title: Extracting data with AI
description: Give a model's AI schema to an AI model to extract entities from an e-mail or a PDF, check the answer, and make NGSI-LD entities
---

# Extracting data with AI

Most entity model pages have **structured output for AI** in the **Download** row: a JSON Schema that the structured outputs of AI models accept, with descriptions in English. Send it to an AI model together with a document, such as an e-mail or a PDF, and the model answers with the attributes of the model. This page extracts a [designated emergency evacuation site (EvacuationSite)](/en/models/disaster/EvacuationSite/) from a short notice, with the OpenAI API or the Claude API.

<svg class="flow-diagram" viewBox="0 0 460 398" role="img" aria-label="Send a document and the AI schema to an AI model; it answers with JSON in the shape of the model. Add id and type, check it with the JSON Schema, and it is an NGSI-LD entity." xmlns="http://www.w3.org/2000/svg"><defs><marker id="ai-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="58" rx="10"/><text class="t" x="230" y="33">Document and AI schema</text><text class="s" x="230" y="53">an e-mail or a PDF, and EvacuationSite.ai.json</text><line class="a" x1="230" y1="68" x2="230" y2="114" marker-end="url(#ai-ah)"/><text class="l" x="242" y="95">① send to the API</text><rect class="box main" x="20" y="116" width="420" height="58" rx="10"/><text class="t" x="230" y="141">AI model</text><text class="s" x="230" y="161">answers in the shape of the schema</text><line class="a" x1="230" y1="176" x2="230" y2="222" marker-end="url(#ai-ah)"/><text class="l" x="242" y="203">② JSON answer</text><rect class="box" x="20" y="224" width="420" height="58" rx="10"/><text class="t m" x="230" y="249">site.json</text><text class="s" x="230" y="269">the attributes only: no id or type</text><line class="a" x1="230" y1="284" x2="230" y2="330" marker-end="url(#ai-ah)"/><text class="l" x="242" y="311">③ add id and type, check</text><rect class="box" x="20" y="332" width="420" height="58" rx="10"/><text class="t" x="230" y="357">NGSI-LD entity</text><text class="s" x="230" y="377">in the key-values form</text></svg>

## 1. The schema and the text {#input}

```bash
curl -sSfO https://datamodels.jp/adapters/ai/disaster/EvacuationSite.ai.json
```

The file is `{ name, description, strict, schema }`. `id` and `type` are not in it: your application sets them. The text is in `notice.txt`, for example:

```text
千代田区（全国地方公共団体コード 131016）は、都立一橋高校（東京都千代田区東神田1-12-13）を、地震、高潮、内水氾濫の指定緊急避難場所に指定しました。区の番号は 13101-0012 です。指定避難所も兼ねます。
```

The local government code (`localGovernmentCode`, 6 digits) is required. When the text does not give it, the AI model guesses one, so write it into the text or set it yourself after the answer. The school's name, address and hazards are those in the data of designated emergency evacuation sites of the Geospatial Information Authority of Japan (GSI) for Chiyoda City; the ward's number is made up for the example.

Both APIs also take a PDF file as input; their documentation shows how.

## 2. Ask the model {#request}

The requests are built with [jq](https://jqlang.org/), which puts the schema and the text into the body. The model names are examples: any model with structured outputs or tools works.

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

- **OpenAI API:** the file is the `json_schema` of `response_format` as it is, with `strict: true`. The answer has every attribute, with `null` where the text says nothing.
- **Claude API:** the `schema` is the `input_schema` of a tool, and the answer is the tool's input. The model in the example does not accept a forced `tool_choice`, so the system prompt asks for the tool; when the answer has no tool call, `jq -e` stops with an error, and you send the request again. Claude's strict mode (`"strict": true` on the tool) takes at most 16 properties that may be `null` per request. EvacuationSite has more, so the example leaves strict out; the answer then usually follows the schema, and step 3 checks it. For a smaller model, or after you remove the attributes you do not need, add `"strict": true`.
- To get several sites from one text, put the schema into a list: `{"type": "object", "properties": {"sites": {"type": "array", "items": …}}}`, with `required` and `additionalProperties: false` as in the file.

Read the providers' notes on structured outputs before you rely on them: [OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas), [Claude](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).

## 3. Check the answer and make an entity {#entity}

The answer has the attributes only. Remove the empty ones, drop any `id` or `type` the AI added, and add your own:

```bash
jq 'walk(if type == "object" then with_entries(select(.value != null)) else . end)
  | del(.id, .type)
  | {id: "urn:ngsi-ld:EvacuationSite:0012", type: "EvacuationSite"} + .' \
  site.json > entity.json
```

Then check `entity.json` against the model's JSON Schema:

```bash
# pipx install check-jsonschema (or uvx check-jsonschema ...)
check-jsonschema --schemafile \
  https://datamodels.jp/schema/disaster/EvacuationSite/v1.json entity.json
```

```text
ok -- validation done
```

To check it from Node.js or Python, see [Validate JSON](/en/guide/use#validate). Strict mode keeps the shape of the answer, but the AI schema leaves some rules (minimums, rules on several attributes) to its descriptions, and without strict mode nothing is guaranteed. The JSON Schema checks them all. It cannot check the facts: a model can still misread a code or a number, so compare the values with the document before you store them.

`entity.json` is now a key-values entity. To send it to an NGSI-LD broker, put it into the normalized form with the @context ([Send it to an NGSI-LD broker](/en/guide/use#broker)).

## Your own models {#own-models}

For the models of a site of your own, make the same file with `datamodels export --to ai`. A model with an attribute that has no strict form has no AI file ([Exporting to other tools](/en/toolkit/export#ai)).
