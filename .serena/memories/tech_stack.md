# Tech stack

Versions: see package.json (`engines`, `packageManager`) and `.node-version`; do not restate here.

- Plain ESM JavaScript (`.mjs`, no TypeScript build) + JSON/YAML/JSON-LD data. VitePress (Vue) only for `site/`.
- Tests: built-in `node --test`, no framework.
- Deploy: Cloudflare Workers via wrangler (`wrangler.jsonc`).
- `@geolonia/datamodels` is the sibling repo datamodels-toolkit, consumed as a pinned npm version (not a workspace link); toolkit behaviour changes need a version bump here.

Serena: auto-detection picks `vue` (from site/.vitepress) and starts no useful LSP for the `.mjs` code. `.serena/project.yml` is set to `typescript`, which covers JS/.mjs.
