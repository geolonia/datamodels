# Security policy

## Reporting a vulnerability

Report security problems privately through GitHub's private vulnerability
reporting for this repository:
https://github.com/geolonia/datamodels/security/advisories/new

Do not open a public issue for a security problem. The catalogue holds no
private data; if a report needs an example, use the published models and
invented values.

## How reports are handled

This repository has a threat model, [`threat-model.md`](threat-model.md),
that states what datamodels.jp promises to the people and programs that use
its files (for example, that a published exact version never changes after
the official launch), what it deliberately does not promise, and what
consumers and the operator own. A report is triaged against it:

- A report that violates a property the model claims (§1.11) is a valid
  finding and is fixed.
- A report about something the model states it does not provide (§1.12),
  about code it marks out of scope (§1.3), or about an adversary it excludes
  (§1.10) is answered by citing the section that says so.
- A report that fits none of the model's dispositions (§1.17) means the
  model is incomplete, and the model is revised.

The model is bound to a commit (see its §1.1 header) and is revised when one
of the conditions in its §1.16 happens, the official launch among them.
`threat-model.yaml` and `threat-model.json` are machine-readable companions
derived from it; the prose is authoritative.

The `datamodels` command, its GitHub Action and the generic adapters are
maintained in [geolonia/datamodels-toolkit](https://github.com/geolonia/datamodels-toolkit);
report problems in them there.

## Supported versions

The catalogue is deployed from `main`; fixes land there and reach
datamodels.jp with the next deploy. Published model versions are not patched
in place after the official launch: a fix to a model is a new version
([URLs and versions](https://datamodels.jp/en/guide/urls)).
