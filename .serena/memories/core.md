# datamodels (datamodels.jp catalog)

Canonical docs (do not duplicate here): README.md (layout, commands, model workflow), CONTRIBUTING.md (ja/en; PR steps, DCO, extensions, proposal bundles), docs/design.md (URL contract, versioning, decisions), docs/deployment.md (Cloudflare), AGENTS.md (org policy, issue intake).

Source map beyond README's layout block:
- `scripts/*.mjs` = CLI entrypoints wired in package.json; shared logic in `scripts/lib/*.mjs`.
- Catalog-only validation rules: `scripts/lib/catalog-rules.mjs`; generic model checks come from `@geolonia/datamodels` (= datamodels-toolkit, pinned exact version) via `datamodels check`.
- `worker/` = Cloudflare Worker serving dist/ (+ MCP endpoint `mcp.mjs`, validate, rate limit).
- `adapters/<name>/` = per-tool outputs (geonicdb, postgis, csv, table-schema, ai); tests live beside them (`adapters/**/*.test.mjs`).
- `site/models`, `site/en/models` are generated; never hand-edit.

Invariants:
- Published files (`models/<subject>/releases/vX.Y.Z/`) are immutable except the pre-release exception in README; releases are a maintainer step.
- ja and en pages change together (`check:languages`).
- Schemas carry no product-specific keys.

Further: tech stack + Serena LSP quirk `mem:tech_stack`; commands `mem:suggested_commands`; style rules `mem:conventions`; done checklist `mem:task_completion`.
