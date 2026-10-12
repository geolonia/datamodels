---
layout: home
# The browser tab and search results: the name and what it is (titleTemplate: false, no " | datamodels.jp").
title: "datamodels.jp: data models that work in Japan"
titleTemplate: false

hero:
  # The headline carries the page; the mark and name are in the navigation (docs/brand.md).
  name: ''
  # HTML: "Data models" and the full stop (the mark's dot) are red (docs/brand.md).
  text: <span class="accent">Data models</span> that work in Japan, at URLs that never <span class="nowrap">change<span class="dot">.</span></span>
  tagline: Published as JSON Schemas, JSON-LD @context files and vocabularies. Use them with plain JSON, as linked data, or with any NGSI-LD broker.
  # Records from many systems linked to the shared definitions; one branch adds its own attribute (#167).
  image:
    light: /hero-illustration.svg
    dark: /hero-illustration-dark.svg
    alt: Records from several systems linked to shared definitions, with one system adding an attribute of its own on top
  actions:
    - theme: brand
      text: All data models
      link: /en/models/
    - theme: alt
      text: Using the models
      link: /en/guide/use
    - theme: alt
      text: Contribute
      link: /en/guide/contribute

features:
  - title: Made for Japan
    details: Already use a Japanese standard, such as the municipal standard open datasets, the Essential Elements of Information (EEI), or the shelter data of the Geospatial Information Authority of Japan (GSI)? Find the model that matches it.
    link: /en/guide/standards
    linkText: Standards covered
  - title: Publish your city's list
    details: Turn a CSV list you publish, such as evacuation sites or AED locations, into JSON that follows a model, and publish it next to the CSV.
    link: /en/guide/publish
    linkText: Publishing your list
  - title: Convert your data
    details: Turn a CSV list into entities of a model, each checked against the model's JSON Schema.
    link: /en/toolkit/convert
    linkText: Converting your data
  - title: Extend, do not duplicate
    details: Reuses Smart Data Models, NGSI-LD and schema.org where they fit. Add your own attributes on top.
    link: /en/guide/extend
    linkText: Adding attributes
  - title: URLs that never change
    details: After the official launch, published versioned @context files, JSON Schemas and vocabularies are never changed or removed, so links to them keep working.
    link: /en/guide/urls
    linkText: URLs and versions
  - title: Publish your own
    details: Models that only you need can go on a site of your own, with URLs that never change. Made with the open-source toolkit.
    link: /en/toolkit/
    linkText: Toolkit
  - title: Built together
    details: Models for common needs, improved by the people who use them. Proposals are welcome.
    link: /en/guide/contribute
    linkText: Contributing
---
