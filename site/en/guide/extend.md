---
title: Adding attributes
description: Add attributes of your own to a catalog model without copying it, and where to host the result
---

# Adding attributes

Often a catalog model fits, but your system needs a few more attributes. You do not need a new model, and you do not copy the catalog: you publish a small @context that adds only your attributes. This is called a **profile**.

If no catalog model fits at all, propose one: see [Contributing](/en/guide/contribute). If only the names do not match how you talk, see [Your own names](/en/guide/names).

## Writing a profile

List the catalog @context by URL, then define your attributes next to it. The catalog attributes keep their meaning (their IRIs); only yours are new. This example adds a patrol route, `patrolRoute`, to [RoadRestriction](/en/models/transportation/RoadRestriction/):

```json
{
  "@context": [
    "https://datamodels.jp/context/transportation/v1.jsonld",
    {
      "acme": "https://example.com/ns/acme/",
      "patrolRoute": "acme:patrolRoute"
    }
  ]
}
```

Name your attributes under a domain you control (`example.com` here). The `datamodels.jp` names belong to the catalog; do not use them. The [extension builder](/en/guide/builder) writes this @context and a matching JSON Schema in the browser.

**When the catalog gets new attributes.** The @context above imports the catalog by its alias (`v1.jsonld`), so new 1.x attributes work at once. The JSON Schema does not follow: it is a copy of the catalog schema at one version (recorded in `x-extends`), because catalog schemas do not allow extra attributes. To validate new catalog attributes, build the schema again with the extension builder.

## Where to host it {#host-context}

Put your @context at an HTTPS URL that you control and that does not change: your own domain, GitHub Pages, or object storage with a fixed address. Your data points to this URL (in `@context` or a `Link` header), and brokers and JSON-LD tools fetch it. In GeonicDB, it is the `contextUrl` of a Custom Data Model.

- Publish each version at its own URL, and never change or remove a published file.
- Serve it with `Content-Type: application/ld+json` and `Access-Control-Allow-Origin: *`.

The catalog does not host extensions today; ideas for that are discussed in [#56](https://github.com/geolonia/datamodels/issues/56).

## Starting from a Smart Data Models model

It works the same way. Import the upstream @context by a URL pinned to a commit (`https://raw.githubusercontent.com/smart-data-models/dataModel.<Domain>/<commit>/context.jsonld`), not `master`, so the meaning of stored data does not change when upstream changes.

## Useful beyond your project?

Propose the attribute to the catalog with an [issue](https://github.com/geolonia/datamodels/issues). Once it is in the next minor version, you no longer need your extension.
