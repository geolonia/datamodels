# EvacuationShelter

避難所運用状況 / Evacuation shelter operation

Operational overlay for one evacuation shelter. The shelter master data (name, location) is not included; it is referenced by externalShelterId. Only opening status and evacuee counts live here.

避難所の運用状況オーバーレイ1件。避難所そのもののマスタ（名称・位置）は含まず、外部の避難所データを externalShelterId で参照する。開設状況と避難者数だけを持つ。

- Type IRI: `https://models.geonicdb.com/ns/disaster/EvacuationShelter`
- Context: `https://models.geonicdb.com/context/disaster/v2.jsonld` (alias), `https://models.geonicdb.com/context/disaster/v2.0.0.jsonld` (exact)
- Schema: `https://models.geonicdb.com/schema/disaster/EvacuationShelter/v2.json`
- Page: https://models.geonicdb.com/models/disaster/EvacuationShelter/

Files follow the Smart Data Models layout: `schema.json` (key-values representation, with `x-ngsi`, `x-iri` and `x-geonicdb` annotations), `catalog.yaml` (Japanese and English descriptions), `examples/`, `notes.yaml`, `ADOPTERS.yaml`.
