# JapaneseAddress

日本の住所 / Japanese address (value type)

A Japanese postal address as the value of an `address` Property: schema.org PostalAddress fields where the meaning matches, plus the Japanese structure (machiaza, chome, banchi, go), the JIS and local-government codes, the Address Base Registry town id and the residential-indication flag.

- IRI: `https://models.geonicdb.com/ns/common/JapaneseAddress`
- Context: `https://models.geonicdb.com/context/common/v1.jsonld` (alias), `https://models.geonicdb.com/context/common/v1.0.0.jsonld` (exact)
- Schema: `https://models.geonicdb.com/schema/common/JapaneseAddress/v1.json`
- Page: https://models.geonicdb.com/models/common/JapaneseAddress/

Use from an entity schema:

```json
"address": {
  "$ref": "https://models.geonicdb.com/schema/common/JapaneseAddress/v1.0.0.json",
  "x-ngsi": { "type": "Property", "model": "https://models.geonicdb.com/ns/common/JapaneseAddress" },
  "x-iri": "https://schema.org/address"
}
```

and import the common context in the subject context: `["https://models.geonicdb.com/context/common/v1.0.0.jsonld", { ... }]`.
