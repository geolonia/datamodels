---
title: The normalized form
description: The two forms of an entity, key-values and normalized, and the rules to turn the key-values form into the normalized form that NGSI-LD brokers take
---

# The normalized form

An entity can be written in two forms:

- **Key-values form:** plain JSON with attribute names and their values. The JSON Schema validates data in this form.
- **Normalized form:** the form that NGSI-LD brokers usually take. Each attribute also says what kind it is: a Property with a value, a Relationship pointing to another entity, and so on.

Every model page has its example in both forms. Often you do not need to write the normalized form yourself: the "Try it" tab on a model page switches what you write between the two forms, and for a CSV list `datamodels convert … --normalized` from [datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit) does it ([Converting your data](/en/toolkit/convert)). To do it in your own code, follow the rules below. How to send the result to a broker is in [Send it to an NGSI-LD broker](/en/guide/use#broker).

## The rules {#rules}

- `id` and `type` stay as they are.
- Wrap each attribute in the NGSI-LD type that the attribute table on the model page gives:
  - Property: `{ "type": "Property", "value": … }`.
  - Relationship: `{ "type": "Relationship", "object": … }`.
  - GeoProperty: `{ "type": "GeoProperty", "value": … }`.
  - JsonProperty: `{ "type": "JsonProperty", "json": … }`.
  - VocabProperty: `{ "type": "VocabProperty", "vocab": … }`.

  In key-values form, a JsonProperty and a VocabProperty keep their member: `{ "json": … }`, `{ "vocab": … }`. The JSON Schema describes the value inside, so remove that member before you validate key-values data against the schema. Both are NGSI-LD 1.8 types: check that your broker supports them before you use a model that has them.
- The value of a date-time Property (`format: date-time` in the schema) becomes `{ "@type": "DateTime", "@value": … }`, and that of a date Property (`format: date`) `{ "@type": "Date", "@value": … }`. A Property that takes either ("date or date-time" on the model page) follows its value: `2026-07-11` is a Date, `2026-07-11T09:00:00+09:00` a DateTime.
- A multi-valued attribute (marked "(multiple)" in the attribute table; for example `assignee` on Task) becomes an array with one instance per value, each with a `datasetId`. The catalog's examples use the form `urn:ngsi-ld:dataset:<attribute>:<n>`.
- The `@context` lists the version alias of the subject's @context and the NGSI-LD core context.

## An example {#example}

This Task in the key-values form

```json
{
  "id": "urn:ngsi-ld:Task:1234",
  "type": "Task",
  "name": "靖国通りのアンダーパスの冠水を確認する",
  "progress": "in-process",
  "due": "2026-07-08T12:00:00+09:00",
  "assignee": ["urn:ngsi-ld:Team:field-team-a"]
}
```

is, in the normalized form:

```json
{
  "@context": [
    "https://datamodels.jp/context/task/v1.jsonld",
    "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld"
  ],
  "id": "urn:ngsi-ld:Task:1234",
  "type": "Task",
  "name": {
    "type": "Property",
    "value": "靖国通りのアンダーパスの冠水を確認する"
  },
  "progress": { "type": "Property", "value": "in-process" },
  "due": {
    "type": "Property",
    "value": { "@type": "DateTime", "@value": "2026-07-08T12:00:00+09:00" }
  },
  "assignee": [
    {
      "type": "Relationship",
      "object": "urn:ngsi-ld:Team:field-team-a",
      "datasetId": "urn:ngsi-ld:dataset:assignee:1"
    }
  ]
}
```
