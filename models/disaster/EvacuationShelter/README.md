# EvacuationShelter

避難所運用状況 / Evacuation shelter operation

Operational overlay for one evacuation shelter. The shelter master data (name, location) is not included: the designated shelter is referenced by `shelter` (DesignatedShelter), `externalShelterId` or `nationalShelterId`, and one of the three is required. Only opening status and evacuee counts live here. When the shelter is also a designated emergency evacuation site, `site` links to its EvacuationSite.

避難所1か所の運用状況を表す。避難所そのものの基本情報（名称・位置などのマスタ）は含まず、指定避難所を `shelter`（DesignatedShelter）、`externalShelterId` か `nationalShelterId` で参照して（どれか 1 つは必須）、その上に開設状況と避難者数だけを重ねる。同じ場所の指定緊急避難場所は `site` で EvacuationSite を参照する。

- Type IRI: `https://datamodels.jp/ns/disaster/EvacuationShelter`
- Context: `https://datamodels.jp/context/disaster/v1.jsonld` (alias), `https://datamodels.jp/context/disaster/v1.0.0.jsonld` (exact)
- Schema: `https://datamodels.jp/schema/disaster/EvacuationShelter/v1.json` (alias), `https://datamodels.jp/schema/disaster/EvacuationShelter/v1.0.0.json` (exact)
- Page: https://datamodels.jp/models/disaster/EvacuationShelter/

Files follow the Smart Data Models layout: `schema.json` (key-values representation, with `x-ngsi`, `x-iri` and optional `x-personal-data` annotations), `catalog.yaml` (Japanese and English descriptions), `examples/`, `mapping/` where a corresponding standard exists, `notes.yaml`, `ADOPTERS.yaml`.
