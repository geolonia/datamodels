# Adapters

The catalog itself (contexts, schemas, examples, vocabularies, pages) is independent of any product. An adapter turns catalog models into files a particular broker or tool consumes, and is published next to the catalog under `/adapters/<name>/`.

Rules:

- The core (`scripts/`, `models/`) never imports from `adapters/`. `scripts/build.mjs` discovers every `adapters/<name>/index.mjs` and calls it.
- An adapter only adds files. It cannot change a context, a schema or an IRI.
- Adapter output is generated on every build and is not part of the immutability manifest; pin the catalog version, not an adapter file.

Interface of `index.mjs` (default export):

| Member | Meaning |
|---|---|
| `name` | directory name and URL segment |
| `label` | `{ ja, en }` shown on model pages |
| `note` | optional `{ ja, en }` one-line explanation shown next to the link |
| `guide` | optional site path of the adapter's guide page |
| `urlFor(subject, model)` | absolute URL of the file for this model, or `null` |
| `content(subject, model)` | file content for that URL |

Adapters today: [`geonicdb`](geonicdb/) (GeonicDB Custom Data Model bodies and the `export.mjs` CLI for tenant-specific variants).
