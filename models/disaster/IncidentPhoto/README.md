# IncidentPhoto

現地写真 / Incident photo

Metadata for one on-site photo attached to an incident report. The image stays in external storage; contentUrl points at it. A subclass of Attachment in the task subject.

通報に紐づく現地写真のメタデータ 1 件。画像本体は外部ストレージに置き、contentUrl で参照する。タスク管理サブジェクトの Attachment のサブクラス。

- Type IRI: `https://models.geonicdb.com/ns/disaster/IncidentPhoto`
- Subclass of: `https://models.geonicdb.com/ns/task/Attachment`
- Context: `https://models.geonicdb.com/context/disaster/v2.jsonld` (alias), `https://models.geonicdb.com/context/disaster/v2.1.0.jsonld` (exact)
- Schema: `https://models.geonicdb.com/schema/disaster/IncidentPhoto/v2.json`
- Page: https://models.geonicdb.com/models/disaster/IncidentPhoto/

Files follow the Smart Data Models layout: `schema.json` (key-values representation, with `x-ngsi`, `x-iri` and `x-geonicdb` annotations), `catalog.yaml` (Japanese and English descriptions), `examples/`, `notes.yaml`, `ADOPTERS.yaml`.
