---
title: Guides
description: How to use the catalog's models and publish a municipality's list, how to adapt one (more attributes, your own names), how to contribute, how to publish your own models, URLs and versions
---

# Guides

What the words on this site mean is in [Terms](#terms).

## Which page do I need? {#which}

First check whether a catalog model fits your data. If it does not fit as it is, a small change may be enough.

<svg class="flow-diagram" viewBox="0 0 460 296" role="group" aria-label="Which page to read. If a catalog model fits as it is, use it. If only the names differ, use your own names (aliases). If you need a few more attributes, add them (an extension). If nothing fits, publish on your own site or propose a model to the catalog." xmlns="http://www.w3.org/2000/svg"><defs><marker id="wh-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="10" y="8" width="230" height="56" rx="10"/><text class="t" x="125" y="41">Does a model fit as it is?</text><line class="a" x1="240" y1="36" x2="282" y2="36" marker-end="url(#wh-ah)"/><text class="l" x="246" y="29">yes</text><a href="/en/guide/use"><rect class="box main" x="286" y="8" width="164" height="56" rx="10"/><text class="t" x="368" y="32">Use a model</text><text class="s" x="368" y="51">Using the models</text></a><line class="a" x1="125" y1="64" x2="125" y2="80" marker-end="url(#wh-ah)"/><text class="l" x="133" y="77">no</text><rect class="box" x="10" y="82" width="230" height="56" rx="10"/><text class="t" x="125" y="115">Only the names differ?</text><line class="a" x1="240" y1="110" x2="282" y2="110" marker-end="url(#wh-ah)"/><text class="l" x="246" y="103">yes</text><a href="/en/guide/names"><rect class="box main" x="286" y="82" width="164" height="56" rx="10"/><text class="t" x="368" y="106">Your own names</text><text class="s" x="368" y="125">aliases</text></a><line class="a" x1="125" y1="138" x2="125" y2="154" marker-end="url(#wh-ah)"/><text class="l" x="133" y="151">no</text><rect class="box" x="10" y="156" width="230" height="56" rx="10"/><text class="t" x="125" y="189">Need a few more attributes?</text><line class="a" x1="240" y1="184" x2="282" y2="184" marker-end="url(#wh-ah)"/><text class="l" x="246" y="177">yes</text><a href="/en/guide/extend"><rect class="box main" x="286" y="156" width="164" height="56" rx="10"/><text class="t" x="368" y="180">Adding attributes</text><text class="s" x="368" y="199">an extension</text></a><line class="a" x1="125" y1="212" x2="125" y2="228" marker-end="url(#wh-ah)"/><text class="l" x="133" y="225">no</text><rect class="box d" x="10" y="230" width="440" height="58" rx="10"/><text class="t" x="230" y="254">Nothing fits</text><a href="/en/guide/own-models"><text class="s k" x="120" y="275">publish on your own site</text></a><text class="s" x="230" y="275">or</text><a href="/en/guide/contribute#model-proposal"><text class="s k" x="340" y="275">propose a model</text></a></svg>

## Use a model

- [Tutorial: from a CSV file to a map](/en/guide/tutorial): one real open-data file converted into a model, step by step. An optional second part loads it into a broker, queries it and shows it on a map.
- [Publishing your list](/en/guide/publish): convert a municipality's CSV list into JSON that follows a model, and publish it as open data next to the CSV.
- [Using the models](/en/guide/use): validate JSON with the catalog models, send it to an NGSI-LD broker, and use it as linked data.
  - [Adapters](/en/adapters/): what each file in a model page's Download row is, how to use it and where to get it.
  - [Using a spreadsheet (CSV)](/en/guide/csv): fill in the CSV template, check it with frictionless and convert it into entities.
  - [Using PostgreSQL / PostGIS](/en/guide/postgis): create a model's table, add a row and query by distance.
  - [Extracting data with AI](/en/guide/ai-extraction): take entities out of an e-mail or a PDF with the AI schema.
  - [Use with GeonicDB](/en/guide/geonicdb): register a model in GeonicDB, then create and query entities.

## Adapt a model

- [Adding attributes](/en/guide/extend): add attributes of your own to a model without copying it (an extension). The extension builder on the page makes the files in the browser.
- [Your own names](/en/guide/names): use your own names for attributes and types without changing the model (aliases).

## Add to the catalog

- [Contributing](/en/guide/contribute): how to take part. The forms to propose a model, list an extension or a site, or tell us about another catalog, and what happens next.
- [Rules for models](/en/guide/rules): what the catalog accepts, when to define a new type, the rules, mapping to standards, writing examples, and the stages of a model.

## Models outside the catalog

- [Your own data models](/en/guide/own-models): where to publish a model that does not belong in this catalog: your own site, or Smart Data Models.
- [Your own site (Toolkit)](/en/toolkit/): publish your models with fixed URLs on a site of your own, step by step, and convert CSV lists.

## Reference

- [Standards covered](/en/guide/standards): the standards the models map, such as the municipal standard open datasets or the Essential Elements of Information (EEI), each with its model.
- [Mapping files](/en/guide/mapping): which field of a standard matches which attribute of a model. Where to find them and what they say.
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
