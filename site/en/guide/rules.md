---
title: Rules for models
description: The rules for models in this catalog, when to define a new type, mapping to standards, and how to write examples
---

# Rules for models

This page is for people who add or change models in the catalog. How to propose is in [Contributing](/en/guide/contribute); who decides is in [CONTRIBUTING.md](https://github.com/geolonia/datamodels/blob/main/CONTRIBUTING.md#stages-and-who-decides).

## Reuse first, define only what is missing

The rule of this catalog is "extend, do not duplicate". Where a type or attribute from [Smart Data Models](https://smartdatamodels.org/), NGSI-LD or [schema.org](https://schema.org/) fits, the catalog uses it as it is. Where nothing fits, the catalog defines its own type under `https://datamodels.jp/ns/<subject>/`, and still uses upstream attributes where they fit. Example: [RoadRestriction](/en/models/transportation/RoadRestriction/) is the catalog's own type, but `roadName`, `validFrom` and `validTo` come from Smart Data Models.

<svg class="flow-diagram" viewBox="0 0 460 200" role="img" aria-label="Does an upstream type fit? Then use it. Is adding attributes enough? Then extend it. Otherwise define the catalog's own type and record why in notes.yaml." xmlns="http://www.w3.org/2000/svg"><defs><marker id="dc-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="10" y="10" width="230" height="50" rx="10"/><text class="t" x="125" y="40">Does an upstream type fit?</text><line class="a" x1="240" y1="35" x2="282" y2="35" marker-end="url(#dc-ah)"/><text class="l" x="246" y="28">yes</text><rect class="box" x="286" y="10" width="164" height="50" rx="10"/><text class="t" x="368" y="40">use it</text><line class="a" x1="125" y1="60" x2="125" y2="74" marker-end="url(#dc-ah)"/><text class="l" x="133" y="71">no</text><rect class="box" x="10" y="76" width="230" height="50" rx="10"/><text class="t" x="125" y="106">Is adding attributes enough?</text><line class="a" x1="240" y1="101" x2="282" y2="101" marker-end="url(#dc-ah)"/><text class="l" x="246" y="94">yes</text><rect class="box" x="286" y="76" width="164" height="50" rx="10"/><text class="t" x="368" y="106">extend it</text><line class="a" x1="125" y1="126" x2="125" y2="140" marker-end="url(#dc-ah)"/><text class="l" x="133" y="137">no</text><rect class="box main" x="10" y="142" width="440" height="50" rx="10"/><text class="t" x="230" y="163">Define the catalog's own type</text><text class="s" x="230" y="181">and record in notes.yaml why nothing fitted</text></svg>

### When not to use an upstream type

Using upstream where it fits does not mean bending everything to fit. Some upstream models were published for one project only, some assume how things work in North America, and some were fixed before much feedback. Define your own type when:

- the meaning or the required attributes of the upstream type do not match how things work in Japan;
- the upstream type depends on a specific product or region;
- adding attributes is not enough and the meaning would have to change (changing meaning is not allowed, so a new type is the honest option).

Write the upstream types you looked at, and why they did not fit, in the model's `notes.yaml`, so nobody repeats the same work.

So far, every model in the catalog is the catalog's own type; upstream names are used for some attributes. Each model's notes and [issue #16](https://github.com/geolonia/datamodels/issues/16) record why.

## Rules {#rules}

- Never change the meaning or type of an upstream attribute. Add a new one instead.
- Status attributes (`progress`, `openingStatus`, `restrictionStatus` and others) have fixed value lists. When no value fits, leave the status out and give the local wording in `statusLabel` (then required). Do not force the nearest value.
- Never redefine a reserved name of the NGSI-LD core context (`status`, `description`, `location`, `createdAt`, `modifiedAt`, `observedAt` and others). CI rejects it. When you need a status, name it like `incidentStatus`.
- Group models by subject (topic), never by region, customer or project.
- Use the [common](/en/models/common/) value types for shared structures: [JapaneseAddress](/en/models/common/JapaneseAddress/) for addresses, [Geometry](/en/models/common/Geometry/) for `location` and other locations, [ContactPoint](/en/models/common/ContactPoint/) for contacts, [OpeningHours](/en/models/common/OpeningHours/) for opening hours. When a model allows fewer geometry types, narrow it next to the `$ref` (DesignatedShelter allows only a Point).
- To give an existing type another name, use an alias (`x-alias-of`: same attributes, same required fields). To add attributes or to keep a type separate, use a subclass (`x-subclass-of`: attributes with the same name keep the parent's meaning, the parent's required attributes stay required). CI checks both. The parent may also be a schema.org, Smart Data Models or NGSI-LD core type (common's ContactPoint is a subclass of schema.org ContactPoint); then CI checks only that the IRI is in one of these namespaces and that its name starts with a capital letter, as class names do. CI does not check that the class exists, so open the IRI to make sure.

## Mapping to Japanese standards {#mapping}

A mapping file (`mapping/*.yaml`) says how a model relates to a standard, so that data that follows the standard can be used with the model directly. The catalog keeps its mapping files few (decided 2026-10-12):

- **A mapping file only for a published standard or format that many lists follow and that the model was designed from.** These are national standards such as the Digital Agency's [自治体標準オープンデータセット](https://www.digital.go.jp/resources/open_data/municipal-standard-data-set-test), the data of the Geospatial Information Authority of Japan (GSI), the Government Interoperability Framework (GIF) or the Essential Elements of Information (EEI) for disaster response, and widely used systems whose format is public (such as GitHub Issues or Redmine). Example: [EvacuationSite](/en/models/disaster/EvacuationSite/#mapping-jichitai-opendata-site).
- **No mapping file for one organisation's own list or system.** Its owners keep that mapping themselves; `datamodels mapping` writes a first version ([Converting your data](/en/toolkit/convert#your-own-list)).
- **Conversion rules only in a few worked examples.** Most mapping files only document how the model relates to the standard (`to` and `note`). A proposal adds conversion rules (`column`, `transform`) only when lists that follow the standard are actually converted.

Reviewers check that the standard exists and that many lists follow it; CI does not.

### New editions of a standard {#standard-revisions}

A mapping file names the edition it follows (for example the 20260801 edition of the 自治体標準オープンデータセット, or version 1.1 of EEI). When a new edition comes out, maintainers update the mapping. That alone changes no version number. If the model itself has to change, the [version rules](/en/guide/urls#versions) apply. There is no fixed deadline.

## Writing examples {#examples}

Every entity model has two examples (key-values and normalized); a value type such as Geometry has only the key-values one. They appear on the model page, CI validates them, and people copy them when they write a client, so all subjects share one scenario.

- **Scenario**: a fictional heavy-rain response in Chiyoda, Tokyo (July 2026). The ward sets up a disaster-response project, a task checks a flooded underpass on Yasukuni-dōri, the road is closed and a shelter opens.
- **Real and fictional**: place names, addresses, codes (local government code, Address Base Registry town id and others) and coordinates are real. Events, people, teams and system numbers are invented. No personal names; use identifiers such as `staff-0012` or `field-team-a`.
- **Identifiers**: `urn:ngsi-ld:<Type>:<local id>`. Use the source system's number as the local id where there is one (`urn:ngsi-ld:Task:1234`). When several organisations share one broker, add the organisation: `urn:ngsi-ld:<Type>:<org>:<local id>`.
- **References**: a reference to another catalog type points at that type's example (Task's `project` is the Project example). References to the same type (`parent`, `relatedTo`) and to types the catalog does not define (`Person`, `Team`) are free. CI checks this.
- **URLs**: source-system URLs use an example domain such as `tracker.example.jp`.
- **Times**: local Japanese times carry `+09:00`.
