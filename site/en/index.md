---
layout: home

hero:
  name: datamodels.jp
  text: Data models that work in Japan
  tagline: Data models that work in practice in Japan, as JSON Schemas, JSON-LD @context files and vocabularies at URLs that never change. Ready to use with NGSI-LD. Existing standards are extended, not copied
  actions:
    - theme: brand
      text: All data models
      link: /en/models/
    - theme: alt
      text: Propose a model
      link: https://github.com/geolonia/datamodels/issues/new?template=model-proposal.yml
    - theme: alt
      text: catalog.json
      link: /catalog.json
    - theme: alt
      text: GitHub
      link: https://github.com/geolonia/datamodels

features:
  - title: Extend, do not duplicate
    details: Types and attributes from Smart Data Models, NGSI-LD and schema.org are reused where they fit. Where nothing fits, the catalog publishes its own type and records why. The guide shows how.
    link: /en/guide/extend
    linkText: Extending models
  - title: URLs that never change
    details: Published versioned @context files and JSON Schemas are never modified or removed. The guide says which URL to use when.
    link: /en/guide/urls
    linkText: The URL contract
  - title: Any system
    details: Every example is validated in CI. The JSON Schemas validate plain JSON, the JSON-LD contexts turn it into linked data (RDF), and NGSI-LD brokers take it as it is. No particular product is needed.
    link: /en/guide/use
    linkText: Using the models
  - title: Other catalogs
    details: Smart Data Models, the Digital Agency's GIF and municipal standard open datasets, and more, and how this catalog relates to them.
    link: /en/guide/catalogs
    linkText: Other data model catalogs
---

If you know the standard your data follows (the municipal standard open datasets, EEI, GSI's shelter data and more), [Standards mapped](/en/models/standards/) leads to the matching model.
