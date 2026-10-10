---
title: Your own names
description: Use your own names for attributes and types without changing the model, with JSON-LD aliases
---

# Your own names

Often the model fits but a name does not match how people talk. The catalog says `assignee`; one city calls the response team `responsibleTeam`. You do not need a new model: in JSON-LD a name is only a label, and the @context says what it means. Give your own name the catalog's meaning, and the model stays the same. This is called an **alias**.

<svg class="flow-diagram" viewBox="0 0 460 150" role="img" aria-label="Your name responsibleTeam and the catalog's name assignee both stand for the same meaning, https://datamodels.jp/ns/task/assignee." xmlns="http://www.w3.org/2000/svg"><defs><marker id="nm-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="10" y="8" width="190" height="58" rx="10"/><text class="t m" x="105.0" y="32">responsibleTeam</text><text class="s" x="105.0" y="51">your name</text><rect class="box" x="10" y="84" width="190" height="58" rx="10"/><text class="t m" x="105.0" y="108">assignee</text><text class="s" x="105.0" y="127">the catalog's name</text><line class="a" x1="200" y1="37" x2="256" y2="66" marker-end="url(#nm-ah)"/><line class="a" x1="200" y1="113" x2="256" y2="84" marker-end="url(#nm-ah)"/><rect class="box main" x="260" y="46" width="190" height="58" rx="10"/><text class="t" x="355.0" y="70">one meaning</text><text class="s" x="355.0" y="89">…/ns/task/assignee</text></svg>

The example below uses `Saigai` for `Project` and `responsibleTeam` for `assignee` from [task management](/en/models/task/):

```json
{
  "@context": [
    "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld",
    {
      "tm": "https://datamodels.jp/ns/task/",
      "Saigai": "tm:Project",
      "responsibleTeam": { "@id": "tm:assignee", "@type": "@id" }
    }
  ]
}
```

Copy an attribute's whole definition, not only its name: `assignee` points to another entity (`"@type": "@id"`), so `responsibleTeam` must say so too, or a team's id is read as plain text.

Data written with `responsibleTeam` means exactly the same as data written with `assignee`. An NGSI-LD broker stores an attribute by its IRI (the standard requires it), so it stores both as one attribute, and queries, subscriptions and other clients see no difference. A client that sends this @context gets `responsibleTeam` and `Saigai` back.

## Rules

- **Short attribute names use ASCII letters, digits and `_`.** NGSI-LD does not require this, but GeonicDB checks short attribute names against `^[A-Za-z0-9_]+$` and rejects a name in Japanese script. A full IRI is accepted too.
- **One name per meaning in your @context.** If you take the catalog's @context and add an alias, one meaning has two names, and JSON-LD returns the shorter one. To always get your names back, write your @context as a complete list of the names you use, without the catalog's. Copying the catalog's @context and renaming is the quick way.
- **A type alias is not a separate type.** `Saigai` and `Project` have the same meaning, so a broker stores and matches them as one type, and access rules treat them as one. A type that must be separate (to control access by type, or to add attributes) is a **subclass**, not an alias: it has its own meaning and keeps the parent's attributes (a schema's `x-subclass-of`; [Rules for models](/en/guide/rules#rules)).

## Related

- [Adding attributes](/en/guide/extend): when you need to **add** attributes
- [Use with GeonicDB](/en/guide/geonicdb): what registering does, your own attributes, registering under your own names
