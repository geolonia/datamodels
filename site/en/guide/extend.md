---
title: Extend and contribute
description: How to extend an existing data model for Japan, add your own, and contribute to the catalog
---

# Extend and contribute

The rule of this catalog is "extend, do not duplicate". Types and attributes of the global [Smart Data Models](https://smartdatamodels.org/) are used as they are; only attributes needed in Japan and Japan-specific models are added. This page shows how that works in practice.

## Three ways

| Goal | Method | Example |
|---|---|---|
| Use a global model as it is | Use the upstream `@context` and type. The catalog adds Japanese descriptions and examples | `WeatherObserved` |
| Add Japanese attributes to an existing model | **Profile**: import the upstream context by URL and publish a context that defines only the added attributes | `Building` with residential indication |
| Model something that only exists in Japan | **Own subject**: mint type and attribute IRIs under `https://models.geonicdb.com/ns/<subject>/` | [Disaster response](/en/models/disaster/) |

### Writing a profile

Nothing upstream is copied. The upstream context is listed by URL in the `@context` array; upstream attributes keep their IRIs and only the added ones get catalog IRIs.

```json
{
  "@context": [
    "https://raw.githubusercontent.com/smart-data-models/dataModel.Building/<commit>/context.jsonld",
    "https://models.geonicdb.com/context/common/v1.jsonld",
    {
      "gb": "https://models.geonicdb.com/ns/Building/",
      "residentialIndication": "gb:residentialIndication"
    }
  ]
}
```

Use a commit-pinned upstream URL, not `master`, so the meaning of stored data cannot drift when upstream changes.

### Rules

- Never change the meaning or type of an upstream attribute. Add a new one instead.
- Never redefine a protected term of the NGSI-LD core context (`status`, `description`, `location`, `createdAt`, `modifiedAt`, `observedAt` and others). The catalog CI rejects it. When you need a status, name it like `incidentStatus`.
- Namespaces are organised by subject, never by region, customer or project.
- Use the value types of the [common](/en/models/common/) subject for shared structures such as addresses.

## Contributing

The catalog lives in the public repository [geolonia/geonicdb-models](https://github.com/geolonia/geonicdb-models). Japanese and English are both welcome.

- **Adding or changing a model**: open a pull request using the [Smart Data Models folder layout](https://github.com/geolonia/geonicdb-models#repository-layout) (`schema.json`, `catalog.yaml`, `examples/`, `notes.yaml`). CI validates schemas, examples, `@context` expansion, protected terms and versions.
- **Questions, proposals, reports**: open an [issue](https://github.com/geolonia/geonicdb-models/issues). "I need this model" and "I do not understand this attribute" are welcome too.
- **Proposing upstream**: a model that turns out to be useful beyond Japan is proposed to Smart Data Models via [incubated](https://github.com/smart-data-models/incubated). The shared folder layout exists for exactly this.

Published model content is [CC BY 4.0](/LICENSE-CONTENT); the tooling is Apache-2.0.
