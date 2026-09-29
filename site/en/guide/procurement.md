---
title: One line in the procurement specification
description: Sample wording for requiring standards compliance, interoperability and data portability in a system's procurement specification, and how to check a proposal
---

# One line in the procurement specification

The LDP digital society headquarters' recommendations on disaster-management DX (防災DX, May 2026) ask municipalities to add "interoperability, standards compliance and data portability" as requirements to the procurement specification when their systems are next renewed. Without that line, they say, vendor lock-in cannot be avoided ([interview with 大野敬太郎, デジタル行政, 29 September 2026](https://www.digital-gyosei.com/post/2026-09-29-interview-keitaroohno-part2/), in Japanese).

This page gives sample wording for those requirements, using this catalog's models and correspondence tables, and ways to check a proposal.

::: info About the sample wording
The wording is a starting point, not legal text to use as it is. Adapt it to your contract, your existing systems and your procurement rules. Specifications in Japan are written in Japanese: the Japanese version of this page has the wording in Japanese.
:::

## Sample wording

Pick the types that fit your data from the [list of data models](/en/models/) and replace the type names. The example is for shelters and evacuation sites.

**Standards compliance**

> The system can export its data on shelters and evacuation sites as JSON that conforms to the DesignatedShelter, EvacuationSite and EvacuationShelter models of datamodels.jp (JSON Schema, CC0 1.0). Facilities are identified by the nationwide common shelter and evacuation-site ID (全国共通避難所・避難場所ID).

**Interoperability**

> Data can be exported and imported through an API based on a published specification (such as the NGSI-LD API) or as files. The contractor delivers a table of correspondence between the system's data items and the models above and the Essential Elements of Information (EEI, 災害対応基本共有情報).

**Data portability**

> The rights to the data the system holds belong to the contracting authority, which can take out all of it, in the format above and at no extra cost, during the contract and at its end.

## Checking a proposal

- **Correspondence table**: ask the bidder to show which model attribute each of the system's data items corresponds to. A table like the "Corresponding standards" tables on the model pages is enough. [Standards mapped](/en/models/standards/) lists which models correspond to which standards.
- **Sample data**: validate the exported JSON against the model's JSON Schema (step 2 of [Using the models](/en/guide/use)). If there are no errors, the format is right.
- **Cost**: check in the contract and the quotation that exporting data or using the API costs nothing extra.

## When a model lacks an item you need

When a model does not have an item you need, add your own attribute ([Extending models](/en/guide/extend)) or propose adding it to the catalog ([Contributing](/en/guide/contribute)).
