---
title: AI and agents
description: How AI is used to make datamodels.jp, and what AI agents and tools can use
---

# AI and agents

## How this site is made

Much of the site's content (models, notes and pages) was drafted with AI assistance. People decide what goes into the catalog: a new subject, a new major version or a model becoming stable is decided by a small group, in the issue or pull request concerned ([who decides](https://github.com/geolonia/datamodels/blob/main/CONTRIBUTING.md#stages-and-who-decides)). Before anything is published, CI checks every model and example against its schema and the catalog's rules, and the build fails when a link inside the site points to a page that does not exist. The place on the page (the part after `#`) is not checked.

If something is wrong, please [open an issue](https://github.com/geolonia/datamodels/issues).

## For AI agents and tools

This site is meant for people and for assistants alike. Search, AI answers and AI training may all use it; `robots.txt` says so with [content signals](https://contentsignals.org).

- **Start here:** [/llms.txt](/llms.txt), a short index of the guides and every model, in English.
- **No web access?** Use the [MCP server](#mcp-server).
- **Every model with all its URLs:** [catalog.json](/catalog.json).
- **Check what you write:** validate data against the model's JSON Schema (`/schema/<subject>/<Type>/v1.json`). The examples (`/examples/…`) are valid data to start from.
- **Meaning:** every type and attribute IRI under `https://datamodels.jp/ns/` opens its documentation.
- **Stable URLs:** published versions never change ([URLs and versions](/en/guide/urls)), so a URL you cite stays correct. Until the official launch (pre-release), published versions may still be corrected in place.

Machine-readable files (schemas, @context files, vocabularies, examples) can be used without conditions. The licences of the text and the code: [Licences](/en/LICENSE-CONTENT).

## MCP server {#mcp-server}

An agent that cannot open web pages or this repository can still use the catalog, through MCP (Model Context Protocol). The server is at `https://datamodels.jp/mcp`. It needs no login, only reads, and answers from the files of this site.

- `search_models`: find models by words, in English or Japanese.
- `get_model`: one model: its JSON Schema with the schemas it refers to, the @context URL, an example, every attribute with its IRI, and the URLs of its files.
- `find_attribute`: find an existing attribute to reuse, by its name or its meaning.
- `validate`: check one entity, plain JSON (key-values) or NGSI-LD normalized, against a model.

Add it to an MCP client that supports remote servers (Streamable HTTP). For example:

```json
{
  "mcpServers": {
    "datamodels": {
      "type": "http",
      "url": "https://datamodels.jp/mcp"
    }
  }
}
```

In Claude Code: `claude mcp add --transport http datamodels https://datamodels.jp/mcp`.
