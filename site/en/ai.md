---
title: AI and agents
description: How AI is used to make datamodels.jp, and what AI agents and tools can use
---

# AI and agents

## How this site is made

Much of the site's content (models, notes and pages) was drafted with AI assistance. People decide what goes into the catalog: a new subject, a new major version or a model becoming stable is decided by a small group, in the issue or pull request concerned ([Contributing](/en/guide/contribute)). Before anything is published, CI checks every model and example against its schema and the catalog's rules, and the site's links.

If something is wrong, please [open an issue](https://github.com/geolonia/datamodels/issues).

## For AI agents and tools

This site is meant for people and for assistants alike. Search, AI answers and AI training may all use it; `robots.txt` says so with [content signals](https://contentsignals.org).

- **Start here:** [/llms.txt](/llms.txt), a short index of the guides and every model, in English.
- **Every model with all its URLs:** [catalog.json](/catalog.json).
- **Check what you write:** validate data against the model's JSON Schema (`/schema/<subject>/<Type>/v1.json`). The examples (`/examples/…`) are valid data to start from.
- **Meaning:** every type and attribute IRI under `https://datamodels.jp/ns/` opens its documentation.
- **Stable URLs:** published versions never change ([URLs and versions](/en/guide/urls)), so a URL you cite stays correct. Until the official launch (pre-release), published versions may still be corrected in place.

Machine-readable files (schemas, @context files, vocabularies, examples) are CC0 1.0; text, such as these pages and the models' notes, is CC BY 4.0 ([Licences](/en/LICENSE-CONTENT)).
