---
title: Listing your extension
description: Show the attributes you added to a model on its page, so others can reuse your names. The form, field by field, with an example
---

# Listing your extension

Did your organisation add attributes to a model of this catalog? Then you can show them on the model page, under "Extended by". When someone else needs an attribute with the same meaning, they can use your name instead of making a new one, and your data and theirs fit together.

You fill in a form. It costs nothing, you need no programming, and nobody judges your attributes. You need a GitHub account.

## What you need {#before}

- **A GitHub account.** [Sign up](https://github.com/signup) if you do not have one.
- **The model you extended**, for example `task/Task`.
- **The attributes you added**: for each one, its name, its IRI and what it means.
- **Your @context**: its URL, or the @context you write inside your data.

New to these words?

- An **attribute** is one item in your data, such as `name` or `category`.
- An **IRI** is a web address that names an attribute, so that everyone means the same thing by it. Use an address under your own domain, for example `https://gtt-project.org/ns/fiware#category`.
- The **@context** is a short file that connects each attribute name to its IRI. [Adding attributes](/en/guide/extend) shows how to write one, and the [extension builder](/en/guide/builder) makes it for you.

## Fill in the form {#form}

Open the form from the model page with the link "List your extension": the model is then filled in. You can also open the [empty form](https://github.com/geolonia/datamodels/issues/new?template=extension-report.yml). Japanese or English are both fine.

| Field | What to write | Example (GTT Project) |
|---|---|---|
| Model you extended | The subject and the type, with a `/` between them | `task/Task` |
| Organisation | Your organisation's name in Japanese and in English | `GTT プロジェクト / GTT Project` |
| Added attributes | One line per attribute: name, IRI, meaning (Japanese / English), separated by commas | `category, https://gtt-project.org/ns/fiware#category, 課題のカテゴリー名 / The issue category name` |
| @context | The URL of your @context, or the @context you write inside your data | `https://gtt-project.org/ns/fiware-task.jsonld` |
| Version it builds on | The version of the subject, shown on the subject page | `1.0.0` |
| Organisation or project page (optional) | A page about your organisation or about the extension | `https://gtt-project.org/ns/fiware.html#task-profile` |
| Public data (optional) | Where people can see your data, if it is public | (empty) |
| Consent | Tick both boxes: you speak for the organisation, and the text may be reused by anyone (CC0 1.0) | both ticked |

The issue is public. Never write API keys, passwords, tokens or login URLs in it.

Then click "Create".

## What happens next {#next}

1. A maintainer checks that you speak for the organisation, and may ask you a question in the issue.
2. A maintainer, or you, adds the entry to the catalog with a pull request. Automatic checks make sure your names do not clash with the model's attributes and that the IRIs are not datamodels.jp addresses. They do not check that the domain is yours: that is what the consent box is for.
3. When it is merged, your organisation appears under "Extended by" on the model page and in `catalog.json`, within minutes.

Your entry is shown as you reported it. datamodels.jp does not check whether the attributes are well designed. To change or remove an entry later, say so in a new [issue](https://github.com/geolonia/datamodels/issues).

## Example: GTT Project {#example}

GTT Project's plugin for Redmine sends issues to NGSI-LD brokers as Task entities. Task has no attribute for the issue category, so GTT added one: `category`.

- Its @context, [fiware-task.jsonld](https://gtt-project.org/ns/fiware-task.jsonld), takes the catalog's task @context and adds `category`.
- GTT reported it in [#189](https://github.com/geolonia/datamodels/issues/189), and [#190](https://github.com/geolonia/datamodels/pull/190) added it to the catalog.
- It is now listed on the [Task page](/en/models/task/Task/#extensions).

## Useful for everyone? {#propose}

If an attribute would help most users of the model, propose it for the catalog itself. See [Contributing](/en/guide/contribute).
