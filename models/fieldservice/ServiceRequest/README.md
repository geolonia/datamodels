# ServiceRequest

訪問の依頼 / Service request

A request for work at a place: collecting bulky or disaster waste, a delivery, a repair, an inspection. It says what (items and how many), where, and when (time windows, and how much the requester needs that day), with the service time, the amount and the skills it needs, so it maps directly to a job of route optimisation (VRP) software. It holds no name or contact of the requester; requester points to another entity when needed.

ある場所での作業の依頼です。粗大ごみや災害ごみの収集、配達、修理、点検などにあたります。何を（品目と数）、どこで、いつ（時間の幅と、その日がどれだけ必要か）を表し、作業時間、量、必要な技能も持つので、ルート最適化（VRP）のソフトウェアの job にそのまま渡せます。依頼した人の名前や連絡先は持たず、必要なら requester で別のエンティティを指します。

- Type IRI: `https://datamodels.jp/ns/fieldservice/ServiceRequest`
- Context: `https://datamodels.jp/context/fieldservice/v1.jsonld` (version alias), `https://datamodels.jp/context/fieldservice/v1.0.0.jsonld` (exact)
- Schema: `https://datamodels.jp/schema/fieldservice/ServiceRequest/v1.json` (version alias), `https://datamodels.jp/schema/fieldservice/ServiceRequest/v1.0.0.json` (exact)
- Page: https://datamodels.jp/models/fieldservice/ServiceRequest/

Files follow the Smart Data Models layout: `schema.json`, `catalog.yaml` (Japanese and English descriptions), `examples/`, `notes.yaml`, `ADOPTERS.yaml`. Writing examples: https://datamodels.jp/guide/rules#examples
