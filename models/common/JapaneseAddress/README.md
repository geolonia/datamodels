# JapaneseAddress

日本の住所 / Japanese address (value type)

A Japanese postal address as the value of an address Property. schema.org PostalAddress terms where the meaning matches, plus the Japanese structure (machiaza, chome, banchi, go), JIS and local-government codes, the Address Base Registry town id and the residential-indication flag. Every field is optional; addressText alone is acceptable when the address cannot be structured.

address 属性の値として使う日本の住所。意味が同じ項目は schema.org の PostalAddress の語を使い、日本固有の構造（町字・丁目・番地・号）、JIS コードと全国地方公共団体コード、アドレス・ベース・レジストリの町字ID、住居表示フラグを追加したもの。どの項目も任意。構造化できない場合は addressText だけでもよい。

- IRI: `https://datamodels.jp/ns/common/JapaneseAddress`
- Context: `https://datamodels.jp/context/common/v1.jsonld` (alias), `https://datamodels.jp/context/common/v1.0.0.jsonld` (exact)
- Schema: `https://datamodels.jp/schema/common/JapaneseAddress/v1.json` (alias), `https://datamodels.jp/schema/common/JapaneseAddress/v1.0.0.json` (exact)
- Page: https://datamodels.jp/models/common/JapaneseAddress/

Files follow the Smart Data Models layout: `schema.json` (key-values representation, with `x-ngsi`, `x-iri` and optional `x-personal-data` annotations), `catalog.yaml` (Japanese and English descriptions), `examples/`, `mapping/` where a corresponding standard exists, `notes.yaml`, `ADOPTERS.yaml`.
