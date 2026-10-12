---
title: Starting a site
description: Start a site of your own for your data models (a node) with the init command of datamodels-toolkit, and publish it on GitHub Pages and your own domain
---

# Starting a site

This page starts a site of your own for your data models, a node, and publishes it: from the first command to your own domain. Not sure yet whether you need one? See [Your own data models](/en/guide/own-models).

The result looks like [models.gtt-project.org](https://models.gtt-project.org/): `catalog.json`, the `@context`, JSON Schemas, a vocabulary, examples, and a page for every type and attribute.

## What you need {#before}

- [Node.js](https://nodejs.org/) 24 or later. The commands run with `npx`; there is nothing to install.
- A GitHub account, for GitHub Pages.
- A domain or subdomain you control, such as `models.example.org` (recommended, [step 3](#domain)).

## 1. Start the node {#init}

```bash
npx @geolonia/datamodels@0.3.10 init my-models
cd my-models
```

`init` asks a few questions:

- **Base URL:** where the node will be, for example `https://models.example.org`. It is part of every IRI the node publishes, so **choose it once**: you cannot change it after you publish. A `https://<account>.github.io/<repository>` address works too, but then your IRIs depend on the name of your GitHub account. For IRIs that outlive the domain, use a [w3id.org address](#w3id).
- **IRI form:** `hash` (the default) makes IRIs such as `/ns/road#RoadPatrol`, which work on any static host, GitHub Pages included. `slash` makes `/ns/road/RoadPatrol`, which needs w3id.org or a server that redirects.
- **Languages:** for example `ja,en`. One is enough.
- **Publisher:** your organisation's name and website.
- **Licence:** `CC0-1.0` lets anyone use the models without conditions, like this catalog.
- **The first subject:** a group of models that share one `@context`, for example `road`. Its name is part of the IRIs too.

It writes `node.yaml` (the settings), `models/road/` (the subject), a README, `.gitignore`, `LICENSE` (the licence text for CC0-1.0 and CC-BY-4.0; for another licence, add the text yourself), the workflow that publishes the node, and a Dependabot configuration that proposes new toolkit releases. A licence file under another name (`LICENSE.md`, `LICENSE.txt`, `COPYING`) counts as `LICENSE`.

It also works in an existing repository, for example one made by a scaffolder: it adds only the files that are missing, never overwrites one, and adds its lines to an existing `.gitignore`. It lists what it added and what it kept.

The options give the answers, so `init` can run in a script or in CI. There it never asks: a missing answer is a usage error. Without an answer, the defaults are hash IRIs, English and CC0-1.0.

```bash
npx @geolonia/datamodels@0.3.10 init my-models \
  --base-url https://models.example.org --iris hash --languages ja,en \
  --publisher "Example Inc." --publisher-url https://example.org/ \
  --license CC0-1.0 --subject road --yes
```

With the [GitHub CLI](https://cli.github.com/) (`gh`), add `--github my-org/my-models`: `init` then also creates that public repository, pushes the files and turns on GitHub Pages ([step 2](#publish)). In a folder whose remote is already that repository, it keeps the remote and only sets Pages to deploy from GitHub Actions. A remote to another repository is refused. Without a remote, it commits only the files `init` wrote, and pushes them. In a folder that is not a git repository yet, it stops when the folder has other files. In a git repository without a remote, it stops on uncommitted changes or a branch other than `main`; files you already committed are pushed with their history.

## 2. Publish on GitHub Pages {#publish}

If you started with `--github`, the repository exists: commit your models and other changes, and push them.

Otherwise, create an empty repository on GitHub (without a README or any other file) and push the folder to its `main` branch, with your repository's name instead of `my-org/my-models`:

```bash
git init -b main
git add .
git commit -m "Start the data model site"
git remote add origin https://github.com/my-org/my-models.git
git push -u origin main
```

Then, in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.

From then on, every push to `main` builds the node and publishes it. Until you set up your domain, the site is at `https://<account>.github.io/<repository>/`.

## 3. Your domain {#domain}

1. At your DNS provider, add a CNAME record from your subdomain to `<account>.github.io`, for example `models` → `my-org.github.io`.
2. In **Settings → Pages**, enter the domain under **Custom domain**. When GitHub has its certificate (minutes to an hour), turn on **Enforce HTTPS**.

It is worth [verifying the domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages) for your account or organisation, so nobody else can publish a site on it.

## 4. A permanent address (optional) {#w3id}

Your IRIs contain your domain, so they last as long as you keep the domain. If the models may outlive it (a project that ends, a team that moves), take an address from [w3id.org](https://w3id.org/), a free redirect service run by the W3C Permanent Identifier Community Group. `https://w3id.org/<name>/` forwards to wherever the node is; when the node moves, only the redirect changes.

Decide before you publish: the base URL is part of every IRI.

1. Choose a name: lower-case letters, digits and hyphens, not a generic word, for example `my-org-models`. Check that it is free in [`ids/`](https://github.com/perma-id/w3id.org/tree/master/ids), including other cases (`ids/Foo/` and `ids/foo/` cannot both exist). A personal node goes under the shared [`/people/`](https://github.com/perma-id/w3id.org/tree/master/ids/people) space (`https://w3id.org/people/<name>/`), not a name of its own.
2. In [step 1](#init), give `https://w3id.org/my-org-models` as the base URL, and publish the node at your domain ([steps 2](#publish) and [3](#domain)). The site itself stays there; every link and IRI the node publishes goes through w3id.org, so they work once the redirect is in place.
3. Open a pull request to [perma-id/w3id.org](https://github.com/perma-id/w3id.org) that adds `ids/my-org-models/.htaccess` with your contact and the redirect:

   ```apache
   # # /my-org-models/
   #
   # https://w3id.org/my-org-models/ redirects to https://models.example.org/
   #
   # ## Contact
   # This space is administered by:
   #
   # Your Name
   # you@example.org
   # GitHub username: your-account

   RewriteEngine on
   RewriteRule ^(.*)$ https://models.example.org/$1 [R=302,L]
   ```

   The rule keeps the path, so `https://w3id.org/my-org-models/ns/road` opens `https://models.example.org/ns/road`, and every IRI and file of the node works through it. Use 302, not 301: browsers keep a 301 forever, so you could not move the node later. The reviewers check that the target is online, which is why the node is published first. Read [Creating an identifier](https://w3id.org/docs/guides/create-an-id) before you open the pull request.

Hash IRIs work through the redirect: the part after `#` stays in the browser, so `https://w3id.org/my-org-models/ns/road#RoadPatrol` opens the right row of the page.

## Other hosts {#other-hosts}

A node is plain files, so it can also go on a host other than GitHub Pages, such as Cloudflare Pages or Netlify: see [Other hosts](/en/toolkit/hosts).

Once the site is there, go on with [Your site's models](/en/toolkit/models).
