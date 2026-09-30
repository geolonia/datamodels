# Deployment

How datamodels.jp is built and served. Operator notes, moved from the README.

Cloudflare Workers Builds watches this repository and deploys `main`; no credential lives in GitHub. Dashboard settings on the `datamodels` Worker, connected to `geolonia/datamodels`: build command `npm ci && npm run build:deploy`, deploy command `npx wrangler deploy`, preview command `npx wrangler preview`, root `/`, preview builds on (Settings → Build → Branch control → Enable Preview Builds). Every pull request then gets a Preview URL on workers.dev in a comment; `preview_urls` in `wrangler.jsonc` must stay `true`. The Worker was switched to Worker Previews once (Settings → Builds → Set up Worker Previews), which cannot be undone. The custom domain is declared in `wrangler.jsonc`. After a deploy, run `npm run check:live`.

Cloudflare's Browser Integrity Check, on by default, blocks Python's built-in HTTP client (user agent `Python-urllib`, error 1010), which tools such as rdflib use to fetch contexts. A configuration rule on the `datamodels.jp` zone (Rules → Configuration Rules, "Machine-readable files: no Browser Integrity Check") turns it off for these requests; human-readable pages keep it:

```
starts_with(http.request.uri.path, "/context/") or starts_with(http.request.uri.path, "/schema/") or starts_with(http.request.uri.path, "/vocab/") or starts_with(http.request.uri.path, "/examples/") or starts_with(http.request.uri.path, "/adapters/") or http.request.uri.path eq "/catalog.json" or http.request.uri.path eq "/llms.txt"
```

`npm run check:live` fetches those paths with that user agent and fails if the rule goes missing. Previews on workers.dev keep Cloudflare's default and are skipped unless `CHECK_MACHINE_UA=1` is set, which runs these checks there too (they can then fail with error 1010, since the rule is on the `datamodels.jp` zone only).

`models.geonicdb.com`, the pre-launch preview, is retired and must not answer. `wrangler deploy` does not detach a custom domain that disappears from `wrangler.jsonc`, so if it still responds, remove it under the Worker's Settings → Domains & Routes; that also deletes its DNS record.

