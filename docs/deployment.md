# Deployment

How datamodels.jp is built and served. Operator notes, moved from the README.

Cloudflare Workers Builds watches this repository and deploys `main`; no credential lives in GitHub. Dashboard settings on the `datamodels` Worker, connected to `geolonia/datamodels`: build command `npm run build:deploy` (since 2026-10-26; before, `npm run build`), deploy command `npx wrangler deploy`, preview command `npx wrangler preview`, root `/`. Workers Builds installs the dependencies itself before the build command: with pnpm, because of `pnpm-lock.yaml`, in the version of `packageManager` in `package.json`. The build command also runs the release check (`datamodels check . --offline --all-released`), so a commit with a published version that lacks its snapshot fails to build and is not deployed. `main` does not require the pull-request CI check (`pnpm run check`), so this is the check that guards the deploy. Preview builds are off since 2026-10-26 (Settings → Build → Branch control): the preview comment on every pull request was noise. Cloudflare builds only `main`; pull requests are checked in GitHub CI, which also runs `wrangler deploy --dry-run`. `preview_urls` in `wrangler.jsonc` stays `true`, in case preview builds are turned on again. The Worker was switched to Worker Previews once (Settings → Builds → Set up Worker Previews), which cannot be undone. The custom domain is declared in `wrangler.jsonc`. After a deploy, run `pnpm run check:live`.

Cloudflare's Browser Integrity Check, on by default, blocks Python's built-in HTTP client (user agent `Python-urllib`, error 1010), which tools such as rdflib use to fetch contexts. A configuration rule on the `datamodels.jp` zone (Rules → Configuration Rules, "Machine-readable files: no Browser Integrity Check") turns it off for these requests; human-readable pages keep it:

```
starts_with(http.request.uri.path, "/context/") or starts_with(http.request.uri.path, "/schema/") or starts_with(http.request.uri.path, "/vocab/") or starts_with(http.request.uri.path, "/examples/") or starts_with(http.request.uri.path, "/adapters/") or starts_with(http.request.uri.path, "/mapping/") or http.request.uri.path eq "/catalog.json" or http.request.uri.path eq "/llms.txt" or http.request.uri.path eq "/mcp"
```

`/mcp` is the MCP server for AI agents (`worker/mcp.mjs`): MCP clients written in Python send a non-browser user agent too, so the check would block them.

`pnpm run check:live` fetches those paths with that user agent and fails if the rule goes missing. Previews on workers.dev keep Cloudflare's default and are skipped unless `CHECK_MACHINE_UA=1` is set, which runs these checks there too (they can then fail with error 1010, since the rule is on the `datamodels.jp` zone only).

`models.geonicdb.com`, the pre-launch preview, is retired and must not answer. `wrangler deploy` does not detach a custom domain that disappears from `wrangler.jsonc`, so if it still responds, remove it under the Worker's Settings → Domains & Routes; that also deletes its DNS record.

`/mcp` is rate-limited by the `MCP_LIMITER` binding in `wrangler.jsonc` (namespace `2230`, 100 requests a minute per client address, an IPv6 address by its /64, counted per Cloudflare location). It deploys with the Worker and is not shown or set in the dashboard; change it in `wrangler.jsonc` and keep `RATE_LIMIT` in `worker/limit.mjs` and the copy under `previews` (previews do not inherit bindings) the same.

Hosted connectors (custom connectors in claude.ai and Claude Desktop, ChatGPT) call `/mcp` from their providers' servers, so their users share a few addresses and one budget per Cloudflare location. Claude Code, Cursor and VS Code connect from the user's own address. Decided 2026-10-14: start with 100 requests a minute, check the Worker logs for 429 answers after launch, and raise the limit or add a separate limiter for the providers' published egress ranges if needed.
