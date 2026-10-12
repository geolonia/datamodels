---
title: Other hosts
description: Publish a node of datamodels-toolkit on Cloudflare Pages, Netlify or another static host instead of GitHub Pages
---

# Other hosts

The workflow that `init` writes publishes the node on GitHub Pages ([Starting a site](/en/toolkit/start#publish)). `build` writes plain files, though, so the node can go on any static host. This page says what such a host must do, which files `build` writes for it, and how to publish on Cloudflare Pages and Netlify.

## What the host must do {#rules}

GitHub Pages does these by itself. Another host must do them too:

- Send each file with its content type (the table below).
- Send `Access-Control-Allow-Origin: *`, so that browsers and JSON-LD processors on other sites can read the contexts and schemas.
- Answer an address without a page with `404.html` and the status 404.
- With slash IRIs, redirect each IRI to its page.

| Files | Content type |
|---|---|
| `context/`, `vocab/`, `example-normalized.jsonld` | `application/ld+json` |
| `schema/` | `application/schema+json` |
| `catalog.json`, `example.json`, the Table Schema and AI files | `application/json` |
| `mapping/` | `application/yaml` |
| `adapters/csv/` | `text/csv` |
| `adapters/postgis/` | `application/sql` |
| `llms.txt` | `text/plain` |

## The files build writes for it {#files}

`build` writes these rules into the site as two files:

- `_headers`, always: CORS for every file, `X-Content-Type-Options: nosniff`, and the content types above.
- `_redirects`, only with slash IRIs: one redirect (302) per IRI. With 302, not 301, the node can still change where its IRIs lead.

Cloudflare Pages, Cloudflare Workers static assets and Netlify read both files from the folder they publish. They also serve `404.html` by themselves; Workers need `"not_found_handling": "404-page"`. A Worker script does not read these files.

Cloudflare reads at most 2,000 redirects. A node has one per type and per attribute it mints, and `build` prints a note when there are more: add the rest as Bulk Redirects in Cloudflare, or use hash IRIs.

GitHub Pages ignores both files. On another host, such as a web server or object storage behind a CDN, set the same rules in its configuration; the two files list them.

To see the site as Cloudflare would serve it, on your computer:

```bash
npx wrangler pages dev _site
```

## In the workflow {#workflow}

Start from the workflow that `init` wrote (`.github/workflows/publish.yml`). Keep the `check` job, and replace the `publish` job with one of the jobs below. In it, the Action only checks and builds (`deploy: 'false'`), and the next step publishes the folder in the Action's `site` output (v0.3.7 or later).

The repository needs one secret, a token for the host. The workflow passes nothing else secret.

### Cloudflare Pages {#cloudflare-pages}

Once:

1. Create the project: `npx wrangler pages project create my-models --production-branch main`.
2. Create an API token with the permission **Cloudflare Pages: Edit**, and add it as the repository secret `CLOUDFLARE_API_TOKEN`.
3. Add your Cloudflare account ID as the repository variable `CLOUDFLARE_ACCOUNT_ID`.
4. For your own domain, add it under **Custom domains** in the project.

The publish job:

```yaml
  publish:
    # Only main: a manual run (workflow_dispatch) can pick another branch.
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
    concurrency:
      group: publish
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - id: node
        # The same pin as in the check job: init writes it, upgrade moves it.
        uses: geolonia/datamodels-toolkit@<commit SHA> # vX.Y.Z
        with:
          deploy: 'false'
      - uses: cloudflare/wrangler-action@953926a2e2182532811c01a25e53647d93bf07c0 # v4.1.3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}
          command: >-
            pages deploy ${{ steps.node.outputs.site }}
            --project-name=my-models --branch=main
```

### Netlify {#netlify}

Once:

1. Create the site in Netlify.
2. Add a personal access token as the repository secret `NETLIFY_AUTH_TOKEN`.
3. Add the site's ID (**Site configuration → Site details**) as the repository variable `NETLIFY_SITE_ID`.

The publish job is the one for [Cloudflare Pages](#cloudflare-pages), with this step instead of `wrangler-action`:

```yaml
      - name: Deploy to Netlify
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ vars.NETLIFY_SITE_ID }}
          SITE: ${{ steps.node.outputs.site }}
        run: >-
          npx --yes netlify-cli@27.10.2 deploy --dir "$SITE"
          --site "$NETLIFY_SITE_ID" --prod --no-build
```
