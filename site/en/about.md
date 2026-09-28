---
title: About this site
description: Operator, licences, disclaimer and privacy of datamodels.jp
---

# About this site

datamodels.jp is a catalog of data models that work in practice in Japan, published as JSON Schema and JSON-LD and ready to use with NGSI-LD. It is published as a product-neutral digital commons.

## Operator

The site is run by [Geolonia Inc.](https://www.geolonia.com/company/) (株式会社Geolonia).

- Questions, proposals and bug reports about the models: [GitHub issues](https://github.com/geolonia/datamodels/issues), in Japanese or English
- Anything else: [Geolonia's contact form](https://www.geolonia.com/contact/) (Japanese)

## Licences

- **Model files** (JSON Schemas, JSON-LD `@context` files, vocabularies, examples, `catalog.yaml`, mapping files, `catalog.json`, the published adapter files under `/adapters/…`): [CC0 1.0](/LICENSE-CONTENT), no conditions. Please keep the canonical URLs inside them when you copy them (`$id` in a schema, the `@context` URL, the type and attribute IRIs): a request, not a condition. They tell anyone who finds a copy that a newer version may exist.
- **Text** (the models' notes and `README.md` files, and the pages of this site): [CC BY 4.0](/LICENSE-CONTENT). When you use it, give credit, for example "Source: datamodels.jp (Geolonia Inc.), CC BY 4.0", with a link to the page you used, and say so if you changed it. Every page shows its URL at the top.
- A file that copies content from a CC BY standard (Smart Data Models, the GIF core schema and others) stays CC BY 4.0 as a whole; the model's `LICENSE.md` names the file and its source. Today nothing is copied: correspondences are recorded and IRIs reused.
- **Tooling code** (site, scripts, the adapter code in `adapters/`): [Apache-2.0](https://github.com/geolonia/datamodels/blob/main/LICENSE)
- IRIs from other vocabularies (Smart Data Models, schema.org, NGSI-LD and others) are only referenced here and belong to their publishers. Where a model derives from upstream material, its notes name the source.

## Disclaimer

- The models are provided as they are, without any warranty of accuracy, completeness or fitness for a particular purpose.
- Mappings to government and municipal standards are this catalog's reading of them; they are not endorsed by the agencies that publish those standards.
- This is a pre-release. Until the official launch, published versions may still be corrected in place. After the launch, the promise in [URLs that never change](/en/guide/urls) applies.

## Privacy

- No cookies, no analytics, no third-party scripts, and no forms.
- The site search runs in your browser and sends nothing. The appearance setting (light or dark) is stored in your browser only.
- The hosting provider (Cloudflare) processes ordinary access logs (IP address, browser type and similar) as far as needed to deliver the site.
- See also Geolonia's [privacy policy](https://www.geolonia.com/privacy/) (Japanese).

If analytics or similar tools are ever added, this page will say so first.
