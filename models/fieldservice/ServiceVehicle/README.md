# ServiceVehicle

作業車両 / Service vehicle

One vehicle used for the work, as planning sees it: capacity, skills, start and end depot and working hours, so it maps directly to a vehicle of route optimisation (VRP) software. A subclass of Smart Data Models FleetVehicle (one vehicle of a fleet); the physical vehicle (plate and the like) is the Vehicle that vehicle points to.

作業に使う車両 1 台を、計画に使う形で表します。積載量、技能、出発と帰着の拠点、働ける時間で、ルート最適化（VRP）のソフトウェアの vehicle にそのまま渡せます。Smart Data Models の FleetVehicle（車隊の中の 1 台）のサブクラスで、車両そのもの（ナンバーなど）は vehicle で Vehicle を指します。

- Type IRI: `https://datamodels.jp/ns/fieldservice/ServiceVehicle`
- Context: `https://datamodels.jp/context/fieldservice/v1.jsonld` (version alias), `https://datamodels.jp/context/fieldservice/v1.0.0.jsonld` (exact)
- Schema: `https://datamodels.jp/schema/fieldservice/ServiceVehicle/v1.json` (version alias), `https://datamodels.jp/schema/fieldservice/ServiceVehicle/v1.0.0.json` (exact)
- Page: https://datamodels.jp/models/fieldservice/ServiceVehicle/

Files follow the Smart Data Models layout: `schema.json`, `catalog.yaml` (Japanese and English descriptions), `examples/`, `notes.yaml`, `ADOPTERS.yaml`. Writing examples: https://datamodels.jp/guide/rules#examples
