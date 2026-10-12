---
title: Guides
description: How to use the catalog's models, add attributes, URLs and versions, how to contribute, and how to publish your own models
---

# Guides

What the words on this site mean is in [Terms](#terms).

## Use the models

- [Tutorial: from a CSV file to a map](/en/guide/tutorial): one real open-data file converted into a model, loaded into a broker, queried and shown on a map, step by step.
- [Using the models](/en/guide/use): validate JSON with the catalog models, send it to an NGSI-LD broker, and use it as linked data.
  - [Using a spreadsheet (CSV)](/en/guide/csv): fill in the CSV template, check it with frictionless and convert it into entities.
  - [Using PostgreSQL / PostGIS](/en/guide/postgis): create a model's table, add a row and query by distance.
  - [Extracting data with AI](/en/guide/ai-extraction): take entities out of an e-mail or a PDF with the AI schema.
  - [Use with GeonicDB](/en/guide/geonicdb): register a model in GeonicDB, then create and query entities.
- [Mapping files](/en/guide/mapping): which field of a standard matches which attribute of a model. Where to find them and what they say.
- [Adding attributes](/en/guide/extend): add attributes of your own to a model without copying it.
- [Extension builder](/en/guide/builder): make the files for your own attributes in the browser.
- [Your own names](/en/guide/names): use your own names for attributes and types without changing the model.

## Add to the catalog

- [Contributing](/en/guide/contribute): how to take part. The forms to propose a model, list an extension or a site, or tell us about another catalog, and what happens next.
- [Rules for models](/en/guide/rules): when to define a new type, the rules, mapping to standards, writing examples.

## Models outside the catalog

- [Your own data models](/en/guide/own-models): where to publish a model that does not belong in this catalog: your own site, or Smart Data Models.
- [Your own site (Toolkit)](/en/toolkit/): publish your models with fixed URLs on a site of your own, step by step, and convert CSV lists.

## Reference

- [Standards covered](/en/guide/standards): the standards the models map, such as the municipal standard open datasets or the Essential Elements of Information (EEI), each with its model.
- [URLs and versions](/en/guide/urls): which URL to use, what never changes, versions and deprecation.
- [Other data model catalogs](/en/guide/catalogs): catalogs of data models in the world and in Japan, worth checking before you propose.
- [Data model sites](/en/guide/sites): the sites that publish their own data models and that datamodels.jp knows, one row each, with the catalog models they build on.

## Terms {#terms}

The site uses these words with these meanings:

- **model**: which attributes one kind of data (a type) has, and what they mean. Published as an @context, a JSON Schema and examples.
- **entity**: one record of data. One evacuation site is one entity.
- **attribute**: one item of an entity, such as its name, its location or the hazards it covers.
- **subject**: a group of related models with its own namespace and versions, such as `disaster` or `transportation`. URLs and commands write it as `<subject>`.
- **@context**: a file that works like a dictionary: it links short names (such as `hazardTypes`) to IRIs.
- **IRI**: a name for a type or an attribute that is unique on the whole web, such as `https://datamodels.jp/ns/disaster/hazardTypes`.
- **key-values form**: plain JSON with attribute names and their values. The JSON Schema validates data in this form.
- **normalized form**: the form you send to an NGSI-LD broker. Each attribute also says its kind, such as Property or Relationship.
- **validation**: checking that data follows a JSON Schema or similar rules.
- **mapping file**: a file that says which field of a standard or of your own list matches which attribute of a model ([Mapping files](/en/guide/mapping)).
- **extension**: a small @context you publish to add your own attributes to a catalog model; technically, a profile of the model ([Adding attributes](/en/guide/extend)). The toolkit's `extend` command is something else: it makes a new model on your own site that builds on a catalog model.
- **alias**: your own name for a catalog type or attribute, with the same meaning ([Your own names](/en/guide/names)).
- **version alias**: a URL with only the major version, such as `v1.jsonld`. It points to the latest compatible version ([URLs and versions](/en/guide/urls)).
