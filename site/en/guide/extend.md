---
title: Adding attributes
description: Add attributes of your own to a catalog model without copying it, and where to host the result
---

# Adding attributes

Often a catalog model fits, but your system needs a few more attributes. You do not need a new model, and you do not copy the catalog: you publish a small @context of your own that takes the catalog's @context and adds only your attributes. This is called a **profile**.

::: tip The easiest way
The [extension builder](/en/guide/builder) writes both files in the browser: your @context, and a JSON Schema that checks the catalog's attributes and yours.
:::

<svg class="flow-diagram" viewBox="0 0 460 330" role="img" aria-label="Your data names your @context. Your @context imports the catalog's @context, so the catalog attributes keep their meaning, and adds your own attributes, named under your own domain." xmlns="http://www.w3.org/2000/svg"><defs><marker id="ext-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="20" y="8" width="420" height="56" rx="10"/><text class="t" x="230.0" y="32">Your data</text><text class="s" x="230.0" y="51">a RoadRestriction with patrolRoute</text><line class="a" x1="230.0" y1="64" x2="230.0" y2="104" marker-end="url(#ext-ah)"/><text class="l" x="240.0" y="89">its @context</text><rect class="box main" x="20" y="106" width="420" height="128" rx="10"/><text class="t" x="230.0" y="130">Your @context (on your domain)</text><rect class="box" x="36" y="146" width="186" height="72" rx="10"/><text class="t" x="129.0" y="170">imports the catalog</text><text class="s" x="129.0" y="189">roadName, address …</text><rect class="box" x="238" y="146" width="186" height="72" rx="10"/><text class="t" x="331.0" y="170">adds yours</text><text class="s" x="331.0" y="189">patrolRoute</text><line class="a" x1="129" y1="218" x2="129" y2="262" marker-end="url(#ext-ah)"/><line class="a" x1="331" y1="218" x2="331" y2="262" marker-end="url(#ext-ah)"/><rect class="box" x="20" y="264" width="200" height="58" rx="10"/><text class="t" x="120.0" y="288">datamodels.jp</text><text class="s" x="120.0" y="307">the catalog's meaning</text><rect class="box" x="240" y="264" width="200" height="58" rx="10"/><text class="t" x="340.0" y="288">your namespace</text><text class="s" x="340.0" y="307">example.com/ns/acme/</text></svg>

If no catalog model fits at all, propose one ([Contributing](/en/guide/contribute)). If only the names differ from how you call things, see [Your own names](/en/guide/names).

## Writing the @context {#writing-a-profile}

List the catalog's @context by its URL, then define your attributes next to it. This example adds a patrol route, `patrolRoute`, to [RoadRestriction](/en/models/transportation/RoadRestriction/):

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

The catalog's attributes keep their meaning; only yours are new. Name yours under a domain you control (`example.com` here): the `datamodels.jp` names belong to the catalog.

## Using it in your data {#use}

Your data names your @context instead of the catalog's, and has your attributes next to the catalog's:

```json
{
  "@context": "https://example.com/context/acme-transportation-v1.jsonld",
  "id": "urn:ngsi-ld:RoadRestriction:0001",
  "type": "RoadRestriction",
  "roadName": "靖国通り",
  "location": {
    "type": "LineString",
    "coordinates": [[139.7505, 35.695], [139.752, 35.6956]]
  },
  "restrictionStatus": "closed",
  "patrolRoute": "A-3"
}
```

To send it to an NGSI-LD broker, list the NGSI-LD core context too, as in [Using the models](/en/guide/use#broker).

## Where to host it {#host-context}

Put your @context at an HTTPS address that you control and that does not change: your own domain, GitHub Pages, or object storage with a fixed address. Brokers and JSON-LD tools fetch it from there (in GeonicDB, it is the `contextUrl` of a registered model).

- Publish each version at its own address, and never change or remove a published file.
- Serve it with `Content-Type: application/ld+json` and `Access-Control-Allow-Origin: *`.

The catalog does not host extensions today; ideas for that are discussed in [#56](https://github.com/geolonia/datamodels/issues/56).

## When the catalog gets new attributes {#updates}

Your @context takes the catalog by its alias (`v1.jsonld`), so new catalog attributes work in your data at once. The JSON Schema does not follow by itself: build it again with the extension builder.

## Starting from a Smart Data Models model

It works the same way. Take the upstream @context by an address pinned to a commit, not `master` (`https://raw.githubusercontent.com/smart-data-models/dataModel.<Domain>/<commit>/context.jsonld`), so the meaning of your data does not change when upstream changes.

## Useful beyond your project?

Propose the attribute to the catalog with an [issue](https://github.com/geolonia/datamodels/issues). Once it is in the catalog, new data can use the catalog's attribute. Data you already wrote keeps your attribute (and its meaning) until you convert it.
