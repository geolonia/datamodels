# Task

タスク / Task

A tracked unit of work: a ticket or issue in a tracker, a calendar to-do, a municipal work order. State and priority follow RFC 8984 (JSCalendar); the source system's own status name and kind are kept in statusLabel and subtype. Location may be any geometry.

追跡される作業単位。課題管理システムの「チケット」「Issue」、カレンダーの ToDo、自治体の作業指示など。状態と優先度の値域は RFC 8984（JSCalendar）に合わせ、元システム固有の状態名や種別は statusLabel と subtype に保持する。位置は任意のジオメトリ。

- Type IRI: `https://datamodels.jp/ns/task/Task`
- Context: `https://datamodels.jp/context/task/v1.jsonld` (alias), `https://datamodels.jp/context/task/v1.0.0.jsonld` (exact)
- Schema: `https://datamodels.jp/schema/task/Task/v1.json` (alias), `https://datamodels.jp/schema/task/Task/v1.0.0.json` (exact)
- Page: https://datamodels.jp/models/task/Task/

Files follow the Smart Data Models layout: `schema.json` (key-values representation, with `x-ngsi`, `x-iri` and optional `x-personal-data` annotations), `catalog.yaml` (Japanese and English descriptions), `examples/`, `mapping/` where a corresponding standard exists, `notes.yaml`, `ADOPTERS.yaml`.
