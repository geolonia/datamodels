---
title: Contributing
description: How to take part. The forms to propose a model, list an extension or a site, or tell us about another catalog, and what happens next. Stages, pull request steps, sign-off (DCO)
---

# Contributing

Anyone can take part: a company, a municipality or a single person. The same rules apply to everyone. Japanese and English are both fine.

To ask for something, use the issue form that fits. An issue form is a page on GitHub with fields to fill in. You need a free GitHub account ([sign up](https://github.com/signup)). Each section below says when to use a form, what it asks and what happens next.

Nothing goes from a form straight onto the site. A maintainer checks your request first. Then the change goes into the catalog in a pull request (a proposed change to the catalog's files) that passes the automatic checks and a review.

Issues are public: never write passwords, API keys, tokens or login URLs in them.

For a question, a bug or an idea, open a plain [issue](https://github.com/geolonia/datamodels/issues/new). "I do not understand this attribute" is welcome too.

<!-- One section per issue form (.github/ISSUE_TEMPLATE): when to use it, what it asks, what happens next. -->

## Propose a model or attributes {#model-proposal}

Use the model proposal form for a new model, or for new attributes that most users of a model need. You do not need to write a schema.

The catalog only publishes models that rest on an existing standard (a government guideline, Smart Data Models, an RFC and so on) and describe data that exists today. The details are in [Rules for models](/en/guide/rules). A model that only your project needs can go on your own site instead ([Your own data models](/en/guide/own-models)). To add attributes for yourself only, see [Adding attributes](/en/guide/extend).

The form asks what one record represents, who holds such data today and roughly how much, and the standard the model rests on (if none fits, say why). If you know them, add a second organisation that would use the model, and a sample record. After you open the issue, a comment lists similar models that already exist: check whether one of them can be used or extended.

What happens next: we discuss the proposal in the issue. Then you or a maintainer write the model in a pull request ([Pull request steps](#pull-request-steps)); you do not need to write code yourself. Once it is merged, the model is published as a draft. It becomes stable when two different organisations use it in their own systems ([Stages and who decides](#stages-and-who-decides)).

<svg class="flow-diagram" viewBox="0 0 460 120" role="img" aria-label="A model goes from proposal (an issue) to draft (merged into the catalog) to stable (two independent implementations) to deprecated (no longer for new work, still published)." xmlns="http://www.w3.org/2000/svg"><defs><marker id="lc-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs><rect class="box" x="10" y="10" width="104" height="58" rx="10"/><text class="t" x="62.0" y="35">Proposal</text><text class="s" x="62.0" y="55">an issue</text><line class="a" x1="114" y1="39" x2="120" y2="39" marker-end="url(#lc-ah)"/><rect class="box" x="122" y="10" width="104" height="58" rx="10"/><text class="t" x="174.0" y="35">Draft</text><text class="s" x="174.0" y="55">in the catalog</text><line class="a" x1="226" y1="39" x2="232" y2="39" marker-end="url(#lc-ah)"/><rect class="box main" x="234" y="10" width="104" height="58" rx="10"/><text class="t" x="286.0" y="35">Stable</text><text class="s" x="286.0" y="55">ready to rely on</text><line class="a" x1="338" y1="39" x2="344" y2="39" marker-end="url(#lc-ah)"/><rect class="box" x="346" y="10" width="104" height="58" rx="10"/><text class="t" x="398.0" y="35">Deprecated</text><text class="s" x="398.0" y="55">still published</text><text class="s" x="118.0" y="92">review, merge</text><text class="s" x="230.0" y="92">2 organisations</text><text class="s" x="342.0" y="92">not for new work</text></svg>

[Open the model proposal form](https://github.com/geolonia/datamodels/issues/new?template=model-proposal.yml)

## List your extension {#extension}

Did your organisation add attributes to a catalog model? Then use the extension form to show them on the model's page, under "Built on by others". Others who need an attribute with the same meaning can reuse your name, so your data and theirs fit together. If you publish your models on a site made with the [toolkit](/en/toolkit/), you need no form: list your site instead ([next section](#site-listing)), and the model page shows its models by itself.

The form asks for the model you extended (for example `task/Task`), your organisation's name in Japanese and English, and each added attribute with its name, IRI and meaning. An IRI is a web address that names an attribute: use one under a domain you control, such as your organisation's website. It also asks for your @context and the version you built on. You confirm that you speak for the organisation, and that anyone may reuse the text (CC0 1.0). When you open the form from the model page (the link "list your extension"), the model is already filled in. New to @context? See [Adding attributes](/en/guide/extend). The [extension builder](/en/guide/builder) makes the @context for you.

What happens next: a maintainer checks that you speak for the organisation. A maintainer (or you, if you like) adds the entry in a pull request, and automatic checks catch mistakes, such as a name that clashes with an attribute of the model. Once it is merged, your organisation shows on the model page and in `catalog.json` within minutes. The attributes are listed as you report them: datamodels.jp does not review their design. An example of a filled-in form: [#189](https://github.com/geolonia/datamodels/issues/189).

[Open the extension form](https://github.com/geolonia/datamodels/issues/new?template=extension-report.yml)

## List your data model site {#site-listing}

Do you publish your own data models on a site made with the [toolkit](/en/toolkit/) ([Starting a site](/en/toolkit/start))? Then use the site listing form to put the site on the list of [Data model sites](/en/guide/sites). If a model of your site builds on a catalog model, that model's page shows it too, under "Built on by others", with the attributes it adds.

The form asks for the site's URL, the URL of its `catalog.json`, and its name in Japanese and English (the publisher name in `catalog.json`). You confirm that you run the site, or that you ask on behalf of the people who run it. You also agree that datamodels.jp lists the site and its models. When the site moves or closes, tell us in an issue.

What happens next: a maintainer adds the site to the list in a pull request. The pull request also reads the site's `catalog.json`, and a review checks what was read. datamodels.jp does not review the models themselves: each site decides about its own.

[Open the site listing form](https://github.com/geolonia/datamodels/issues/new?template=site-listing.yml)

## Tell us about another catalog {#catalog}

Do you know a catalog of data models or vocabularies that is missing on [Other data model catalogs](/en/guide/catalogs)? Then tell us with the catalog form. A standard layout for data, such as the municipal standard open datasets, counts too. It can be global, Japanese, or from one organisation. Anyone must be able to read it without a login or a contract.

The form asks for the catalog's name, its page, who publishes it, its scope, what it covers and in which formats, how it relates to datamodels.jp, and its licence. Not sure about a field? Write what you know, or "unknown". The maintainer can ask.

What happens next: a maintainer looks at the catalog and may ask you a question in the issue. If it fits, a pull request adds it to the page.

[Open the catalog form](https://github.com/geolonia/datamodels/issues/new?template=catalog-report.yml)

## Changing the files yourself {#pull-requests}

The rest of this page is for people who change the catalog's files themselves in a pull request, and for maintainers. To send a request, the forms above are all you need.

<!-- The rest lives in CONTRIBUTING.md at the repository root, the one source for GitHub and this page. -->
<!--@include: ../../../CONTRIBUTING.md#en-->
