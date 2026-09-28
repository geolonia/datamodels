---
title: Extending models
description: How to extend an existing data model for Japan, add your own, the rules, and how to write examples
---

# Extending models

The rule of this catalog is "extend, do not duplicate". Types and attributes of the global [Smart Data Models](https://smartdatamodels.org/) are used as they are; only attributes needed in Japan and Japan-specific models are added. This page shows how that works in practice.

## Three ways

| Goal | Method | Example |
|---|---|---|
| Use a global model as it is | Use the upstream `@context` and type. The catalog adds Japanese descriptions and examples | `WeatherObserved` |
| Add Japanese attributes to an existing model | **Profile**: import the upstream context by URL and publish a context that defines only the added attributes | `Building` with residential indication |
| Model something that only exists in Japan | **Own subject**: mint type and attribute IRIs under `https://datamodels.jp/ns/<subject>/` | [Disaster response](/en/models/disaster/) |

### Writing a profile

Nothing upstream is copied. The upstream context is listed by URL in the `@context` array; upstream attributes keep their IRIs and only the added ones get catalog IRIs.

```json
{
  "@context": [
    "https://raw.githubusercontent.com/smart-data-models/dataModel.Building/<commit>/context.jsonld",
    "https://datamodels.jp/context/common/v1.jsonld",
    {
      "gb": "https://datamodels.jp/ns/Building/",
      "residentialIndication": "gb:residentialIndication"
    }
  ]
}
```

Use a commit-pinned upstream URL, not `master`, so the meaning of stored data cannot drift when upstream changes.

### When not to adopt an upstream type

"Extend, do not duplicate" means using an upstream model when one fits, not bending everything to fit. Upstream models are sometimes just what someone published first for their own use case without general value, sometimes shaped by North American assumptions that do not hold in Japan, and sometimes fixed before much thought or feedback went into them. Mint your own type when:

- the meaning or the required attributes of the upstream type contradict how things work in Japan;
- the upstream type depends on a specific product or region;
- adding attributes is not enough and the meaning would have to change (changing meaning is forbidden, so a new type is the honest option).

Do record the upstream types you considered and why they did not fit in the model's `notes.yaml`, so nobody repeats the same analysis later.

### Where we stand

The first subject, [disaster response](/en/models/disaster/), is based on the data models of Takamatsu City's flood-response application and built on [task management](/en/models/task/) (shared attributes carry the task subject's IRIs). It originally also had `DisasterEvent` (an **alias** of `Project`) and reports, actions, handover notes and photos (**subclasses** of `Task`, `Comment` and `Attachment`); these were removed on 2026-09-24 as tenant-specific types with no external standard behind them (see "Versioning and lifecycle" in [docs/design.md](https://github.com/geolonia/datamodels/blob/main/docs/design.md)). Road closures and shelters were compared against upstream (Smart Data Models `RoadSegment` and `Alert`, the Digital Agency's municipal standard open datasets): no type fits, so both stay minted, but attribute IRIs and status value spaces are borrowed. Road closures were then rebuilt on national guidelines (National Police Agency, MLIT) as road restrictions in general and, no longer specific to disasters, moved to the [transportation](/en/models/transportation/) subject as `RoadRestriction` (2026-09-25). The notes of each model and [issue #16](https://github.com/geolonia/datamodels/issues/16) record the analysis. For how aliases and subclasses are written, see [Tips & Tricks](/en/guide/tips).

### Rules

- Never change the meaning or type of an upstream attribute. Add a new one instead.
- Status attributes (`progress`, `openingStatus`, `restrictionStatus` and others) have closed value lists. When no value fits, leave the status out and give the local wording in `statusLabel` (then required). Do not force the nearest value.
- Never redefine a protected term of the NGSI-LD core context (`status`, `description`, `location`, `createdAt`, `modifiedAt`, `observedAt` and others). The catalog CI rejects it. When you need a status, name it like `incidentStatus`.
- Namespaces are organised by subject, never by region, customer or project.
- Use the value types of the [common](/en/models/common/) subject for shared structures: [JapaneseAddress](/en/models/common/JapaneseAddress/) for addresses, [Geometry](/en/models/common/Geometry/) for `location` and other GeoProperties. Narrow a geometry next to the `$ref` when a model allows fewer types (Attachment allows only a Point).
- When the Digital Agency's [自治体標準オープンデータセット](https://www.digital.go.jp/resources/open_data/municipal-standard-data-set-test) has a dataset that matches the model, add a correspondence table (`mapping/jichitai-opendata-*.yaml`), so a municipality can fit its own data to the model directly. See [EvacuationShelter](/en/models/disaster/EvacuationShelter/#mapping-jichitai-opendata-shelter); the location columns are mapped in [JapaneseAddress](/en/models/common/JapaneseAddress/#mapping-jichitai-opendata-address) and [Geometry](/en/models/common/Geometry/#mapping-jichitai-opendata-location). The review checks whether a matching dataset exists (CI does not).
- To give an existing type another name, use an alias (`x-alias-of`: same attributes, same required fields). To add attributes or separate the type, use a subclass (`x-subclass-of`: attributes of the same name keep the parent's IRIs, the parent's required attributes stay required). CI checks both.

## Writing examples {#examples}

Every model has two examples (key-values and normalized). They appear on the model page, CI validates them, and people copy them when they write a client, so all subjects share one scenario.

- **Scenario**: a fictional heavy-rain response in Chiyoda, Tokyo (July 2026). The ward sets up a disaster-response project, a task checks a flooded underpass on Yasukuni-dōri, the road is closed and a shelter opens.
- **Real and fictional**: place names, addresses, codes (local government code, Address Base Registry town id and others) and coordinates are real. Events, people, teams and system numbers are invented. No personal names; use identifiers such as `staff-0012` or `field-team-a`.
- **Identifiers**: `urn:ngsi-ld:<Type>:<local id>`. Use the source system's number as the local id where there is one (`urn:ngsi-ld:Task:1234`). When several organisations share one broker, add the organisation: `urn:ngsi-ld:<Type>:<org>:<local id>`.
- **References**: a reference to another catalog type points at that type's example (Task's `project` is the Project example). References to the same type (`parent`, `relatedTo`) and to types the catalog does not define (`Person`, `Team`) are free. CI checks this.
- **URLs**: source-system URLs use an example domain such as `tracker.example.jp`.
- **Times**: local Japanese times carry `+09:00`.

## Contributing

How to propose, the stages and who decides, the pull request steps and the sign-off (DCO) are in [Contributing](/en/guide/contribute).
