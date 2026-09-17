---
title: Other data model catalogs
description: Catalogs of data models and vocabularies used globally and in Japan. What this catalog extends and references
---

# Other data model catalogs

This catalog references and extends what exists elsewhere instead of copying it. This page lists that "elsewhere". Some can be used with NGSI-LD as they are; others need a mapping.

## Global

| Catalog | Content | NGSI-LD |
|---|---|---|
| [Smart Data Models](https://smartdatamodels.org/) | Run by FIWARE, TM Forum, IUDX and OASC. Over 900 models for smart cities, agriculture, energy and more. JSON Schema, `@context`, examples, multilingual specs (Japanese is machine-translated) | Ready to use. The upstream of this catalog |
| [ETSI NGSI-LD specification (GS CIM 009 V1.8.1)](https://www.etsi.org/deliver/etsi_gs/CIM/001_099/009/01.08.01_60/gs_cim009v010801p.pdf) | The NGSI-LD API specification (PDF). Its core context with the reserved terms (`location`, `observedAt`, `status` and others) is published versioned at [uri.etsi.org](https://uri.etsi.org/ngsi-ld/v1/) | Always applied implicitly |
| [schema.org](https://schema.org/) | General web vocabulary: addresses (PostalAddress), organisations, events | Reused as attribute IRIs, as Smart Data Models does |
| [SAREF](https://saref.etsi.org/) | ETSI ontologies for smart appliances, energy and buildings | Used together with NGSI-LD |
| [W3C SOSA/SSN](https://www.w3.org/TR/vocab-ssn/) | Sensor and observation ontology | Reference for observation models |

## Japan

| Catalog | Content | NGSI-LD |
|---|---|---|
| [Digital Agency GIF (Government Interoperability Framework)](https://www.digital.go.jp/policies/data_strategy_government_interoperability_framework) | Core data models (person, legal entity, address, facility, building and more) and domain implementation models. Published as XSD and Excel. [GitHub](https://github.com/JDA-DM/GIF) | Needs mapping. [JapaneseAddress](/en/models/common/JapaneseAddress/) maps to the GIF address |
| [推奨データセット (Recommended datasets)](https://www.digital.go.jp/resources/data_dataset/) | Standard formats for municipal open data (shelters, AEDs, public facilities, events and more). CSV column definitions | Needs mapping. NGSI-LD versions are planned in this catalog |
| [Address Base Registry](https://www.digital.go.jp/policies/base_registry_address) | Base data for addresses including the town id (町字ID) | Referenced by `abrMachiazaId` in JapaneseAddress |
| [Spatial ID (guideline)](https://www.ipa.go.jp/digital/architecture/guidelines/4dspatio-temporal-guideline.html) | METI, MLIT, GSI, NEDO and IPA. A common identifier for 3D space and the guideline for using it with time as 4D spatiotemporal information | Native in GeonicDB |

## Finding a model in Smart Data Models

Use the [search](https://smartdatamodels.org/index.php/list-of-data-models-3/) on the Smart Data Models site or browse the `dataModel.<Subject>` repositories in the [smart-data-models](https://github.com/smart-data-models) GitHub organisation. GeonicDB's MCP tool `data_models` lists and searches them too.

To extend a model you found for Japan, see [Extend and contribute](/en/guide/extend). To have it listed in this catalog, open an [issue](https://github.com/geolonia/geonicdb-models/issues).
