---
title: Tips & Tricks
description: Match attribute and type names to your own terminology without changing the model, with JSON-LD aliases
---

# Tips & Tricks

## Match attribute and type names to your own terminology

Often the model fits but a name does not match how people talk. The catalog says `assignee`, one city calls the response team `responsibleTeam`. The catalog does this itself: `DisasterEvent` in [disaster response](/en/models/disaster/) is an alias of `Project` in [task management](/en/models/task/).

There is no need for a new model. In JSON-LD a key is only a term, and the `@context` decides which IRI it stands for. Any number of terms may point at the same IRI, so a context that assigns your names to the catalog's IRIs renames things while the model stays the same. This is called an **alias**.

```json
{
  "@context": [
    "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld",
    {
      "tm": "https://datamodels.jp/ns/task/",
      "Saigai": "tm:Project",
      "responsibleTeam": "tm:assignee"
    }
  ]
}
```

An entity written with `responsibleTeam` expands to the same IRI as one written with `assignee`. Inside the broker they are the same attribute; queries, subscriptions and other clients see no difference. On the way out, NGSI-LD compacts with the context of the request, so a client that sends this context gets `responsibleTeam` and `Saigai` back.

### Rules

- **Short names are ASCII letters, digits and `_`.** Brokers such as GeonicDB restrict attribute names to `[A-Za-z0-9_]` or a full IRI; a key in Japanese script is rejected before the context is consulted. Most other clients and tools assume ASCII too, so keep aliases ASCII.
- **One name per IRI within one context.** Importing the catalog context and adding an alias gives one IRI two terms, and which one comes back is decided by the JSON-LD rule, shortest term first. To get your names back reliably, write the alias context as a complete list of every term you use and do not import the catalog context. Copying the catalog context and renaming is the quick way.
- **A type alias is not a separate type.** `DisasterEvent` and `Project` share an IRI, so a broker stores and matches them as one type, and authorisation policies treat them as one type. A type that needs its own IRI, to separate access by type or to add attributes, is a **subclass**, not an alias: it keeps the parent's IRIs for attributes of the same name, as `IncidentReport` does with `Task` ([extend](/en/guide/extend)).

### Together with an adapter (GeonicDB)

The keys of `propertyDetails` are short names. With aliases, register the definition under your names and point `contextUrl` at the alias context. The export script applies the renames in one go:

```bash
node adapters/geonicdb/export.mjs disaster --type DisasterEvent --type-name Saigai \
  --context-url https://example.com/context/city-disaster.jsonld --out ./out
node adapters/geonicdb/export.mjs disaster --type IncidentResponseAction --rename assignee=responsibleTeam \
  --context-url https://example.com/context/city-disaster.jsonld --out ./out
```

Each property keeps the catalog IRI in its `@context`, so the vocabulary is unchanged even though the names are yours.

## Related

- [Extend and contribute](/en/guide/extend): when you need to **add** attributes or types
- [Use with GeonicDB](/en/guide/geonicdb): what registering does, adding your own attributes
