# Threat-model pilot: lessons from the second run

Date: 2026-10-16. The first draft of [`threat-model.md`](../threat-model.md)
(with `threat-model.yaml` and `threat-model.json`) was produced with the
Alpha-Omega `threat-model` plugin, version 1.2.1 at commit `192fd60`
(https://github.com/alpha-omega-security/threat-model, MIT), the same commit
as the first pilot, a small Cloudflare Workers service, in draft-first mode:
the agent wrote version 1 from the public artifacts and collected 24
questions for the maintainer in §1.18. This run used Claude Opus 5.5 for the
draft, so the two pilots can be compared (the first used Claude Fable 5.1).
The maintainer answered all 24 questions in one batch on 2026-10-16,
accepting every proposed answer; the model's status is now *accepted* and its
triage policy stays `strict`. The toolkit (geolonia/datamodels-toolkit) is
a separate pilot and is named as a sibling model in §1.1.

## Time spent

Wall time by the session clock (JST), from the start of the session to the
draft pull request.

| Phase | Agent wall time | Notes |
|---|---|---|
| Read the plan, the first pilot's note and model; install the skill; read its references | about 5 min | The `/plugin` commands were not available in the session, so `skills/` was copied into `.claude/skills/` (not committed). HEAD of the plugin repository is still `192fd60`. |
| Recon and surface pass (`worker/`, `scripts/lib/`, the toolkit's `check`, the workflows, `wrangler.jsonc`, `public/`, the docs, GitHub branch rules and issues) | about 5 min | About 3,000 lines of scripts and 900 lines of Worker, plus the toolkit's check code. |
| Draft the prose | about 6 min | 14,800 words; the validator warns about length, as in the first pilot. |
| Backtest, sidecar, JSON export, validator loop | about 7 min | Four validator rounds; see "What did not fit". |
| Lessons note, commit, draft pull request | about 5 min | |
| Maintainer: answer the 24 questions | one batch on 2026-10-16 | Every proposed answer accepted, relayed by the session that started this one. |
| Apply the wave: promote tags, two new properties and one new disclaimer, retire §1.18, re-route the backtest, regenerate the companions, add `SECURITY.md` | about 10 min | One validator round. |
| **Total** | **about 40 min agent time, plus the maintainer's reading** | |

The first pilot took about 40 minutes for the draft. Both runs were fast for
the same reason: the docs and the source comments already state most of the
contract, so most claims could be tagged **documented**. The first draft
counted 201 documented, 0 maintainer, 40 inferred and 12 assumption tags;
after the wave, 201 documented and 59 maintainer (0 inferred, 0 assumption);
after the self-review corrections, 198 documented and 64 maintainer, because
five claims that cited a document reaching less far than the claim are now
tagged as maintainer rulings. All are counted as the validator counts.

## What the brief and the repository disagreed on

Three facts in the task brief had changed by the bound commit (`e554242`,
2026-10-14). The model describes the repository as it is:

- **The hash manifest is gone.** `published-manifest.json` was retired on
  2026-10-14 (#226). Immutability now rests on the release snapshots in
  `models/<subject>/releases/`, `datamodels check --base --all-released` in the
  pull-request job, and `npm run check:live` after a deploy. Nothing replaced
  the manifest for consumers, so there is no published digest (Q9).
- **There is a validation API of sorts.** The MCP server at `/mcp` (#223)
  has a `validate` tool, and `/ns/*` does content negotiation (#196), while
  `docs/design.md` still lists both as non-goals for 1.0.0 (Q2). The model
  covers the MCP server as a component family of its own.
- **The immutability check does not block a merge.** Two organisation
  rulesets apply to `main`. "main-protection" requires one approval, approval
  of the last push, code-owner review and resolved threads, forbids deletion
  and non-fast-forward pushes, and allows bypass by a repository role and one
  team. "security-suite" requires the organisation's Security Suite workflow
  (zizmor, betterleaks, pinact, bumblebee). No check from this repository's
  own workflows is required, so the "Build and dry-run deploy" job, which runs
  the comparison of published versions, can be red at merge time (Q7). This
  came from the GitHub API, not from the repository. The first draft and Q7
  said "no status check is required", read from the classic branch
  protection, whose list of required checks is empty; the self-review caught
  that the organisation ruleset does require the Security Suite.

One finding came from reading the toolkit: during the pre-release, its
`--base` comparison turns a change to **any** release snapshot into a note,
while the README says only the current version may be corrected (Q4).

## Questions: reused from the first pilot, and new for a data catalogue

The first pilot's note tabulated ten generic questions for hosted services.
These applied here, reworded:

| First pilot's generic question | Used here as | Fit |
|---|---|---|
| Attacker-controlled input to an LLM prompt | Q17 (text in model files reaches agents through `llms.txt`, `catalog.json` and MCP) | Turned around: the catalogue is the source of the text, not the LLM's operator. |
| Client-supplied outbound URL | Q13 (`$ref` targets that consumers' validators follow); the MCP server's no-outbound claim is documented and needed no question | Turned around: the outbound fetch happens at the consumer. |
| MCP endpoint and OAuth | Q20 (bounds and threshold), Q21 (logs) | No OAuth here; the endpoint is anonymous by design. |
| A separate component family with its own adversary | Q1 (toolkit as sibling model), Q12 (organisation workflow outside the model) | Direct fit. |
| What an audit log proves | Q21 (what the Worker logs) | Partial: there is no decision log, only platform logs. |
| Deployment shape and multi-tenancy | Q11 (Workers Builds as the supply chain), Q23 (operator configuration outside the repository) | Partial: one deployment, no tenants. |
| Request size | Q16 (contributed file limits), Q20 (MCP request limits) | Direct fit, twice. |
| Model output as untrusted input to a policy | not used | No model in the loop. |
| Per-client credentials and their scope | not used as a question | No credentials; `D-NO-AUTHENTICATION` is documented. |
| Public data as facts | not used as a question | Closest is the node listings, which are documented as reviewed snapshots. |

From the skill's own bank: wave 1's scope, configuration support and side
effects (Q1, Q3, Q5) and the coexistence question (Q6).

New questions written for a data catalogue (candidates for the Geolonia
question-bank extension, same proposed-answer style):

| Area | datamodels question | Generic form for the extension |
|---|---|---|
| Design doc versus code | Q2 | "We believe the code and the user-facing pages are the current contract where the design document's non-goals disagree." |
| Pre-release mutability | Q3, Q4 | "We believe published files may still change until the launch flag flips, and that consumers were told; which versions may change, and is that enforced or only reviewed?" |
| Merge as publication | Q7 | "We believe merging publishes; which checks must be green, and can anyone bypass them?" |
| What is immutable | Q8 | "We believe only exact-version files are immutable; examples, indexes and generated files may change with any build." |
| Verifying bytes | Q9 | "We believe consumers have no signature or digest; the repository is the reference copy." |
| Permanence of identifiers | Q10 | "We believe IRIs are an operator commitment, not an uptime promise." |
| Imports from other sites | Q14 | "We believe published contexts import only this catalogue's contexts, because an import from elsewhere lets that site change the meaning of stored data." |
| Redefinition of a standard's core terms | Q15 | "We believe redefining a protected core term fails in processors, so it is correctness-only." |
| Third-party text on the site | Q18 | "We believe reviewed contributor text is escaped and unreviewed listing text is reduced to plain text." |
| Caches inside the IRI resolver | Q19 | "We believe a cached version index may be stale for a while after a release." |
| Privacy markers in schemas | Q22 | "We believe a personal-data marker promises nothing about handling." |
| Re-binding at a launch | Q24 | "We believe the model is bound to a commit and re-run at the launch." |

## What did not fit a data catalogue

- **The consumer is the integrator, but also the victim.** The skill's
  attacker model assumes inputs flow into the project. Here, the dangerous
  direction is outward: a merged schema with a catastrophic `pattern`, a
  remote `$ref` or an instruction to an agent harms the consumer's processor,
  not the catalogue. The model handles it with a §1.7 row for "the published
  files as input to the consumer's processors" and silence-based §1.12
  disclaimers (`D-CONTRIBUTED-FILE-LIMITS`, `D-AGENT-TEXT`). A data-catalogue
  profile of the skill would want a "what a published file can do to its
  reader" dimension.
- **The dimensions.** As in the first pilot, recursive topology,
  serialization, lifecycle and concurrency are mostly not applicable to
  static files; two project-specific dimensions were added:
  `x-version-immutability` and `x-agent-instructions`.
- **Supply chain is the contract.** The skill says supply-chain hygiene is
  not model content. For a catalogue whose promise is "these bytes never
  change", who can change what reaches the edge *is* the contract, so the
  pull-request path, Workers Builds and the zone rules became a component
  family (`supply-chain`). Action pinning and dependency freshness stayed
  out.
- **Configuration outside the repository.** The branch rules (Q7), the
  Workers Builds settings and the Browser Integrity Check rule (Q23) decide
  whether the claims hold, but none is in a file a reader of the repository
  can see. The model cites `docs/deployment.md` where it describes them; the
  branch rules and the fork-build setting rest on maintainer rulings
  (2026-10).
- **Length.** About 14,200 words in the accepted model (`wc -w`; the first
  draft had 14,800) against the 3 to 8 pages the skill asks for. The
  contract-dimension matrix (6 families × 8 dimensions + 2) and the 41-row
  input table are most of it. The same per-family appendix the first pilot
  asked for would help here.
- **The validator's §1.11 parser.** It splits properties on top-level
  bullets. Properties written as bold paragraphs with sub-bullets for symptom,
  tier and voids were read as separate units, so every property "failed to
  state what voids it". Writing each property as one top-level bullet fixed it.
  Worth a note upstream: the format is not documented.
- **The JSON exporter** again needs hand completion: it takes the first
  paragraph of §1.2 as the description and labels every trust boundary
  `inferred` with empty text. A small script sets both after each export
  (§1.19 says so). Its `dispositions` array has nine values, because the
  plugin's `schema.json` allows exactly nine and has none for
  `OUT-OF-MODEL: dependency-contract`; §1.19 records that the prose and the
  YAML carry all ten.
- **The backtest** had a small real corpus this time: two fixed cache-header
  defects (#6, and #116 fixed by #128). Both route `VALID` against
  `P-HEADERS`. The other 21 cases are synthesized. In the first draft two
  routed to `MODEL-GAP` (the unresolved rows of Q13 and Q19) and six
  escalated; after the wave, the stale-major case closes against
  `D-NEGOTIATION-STALE-MAJOR`, the external-`$ref` case routes `VALID` against
  the new `P-REFS-CATALOG-ONLY`, and the escalations close because the
  maintainer stated those limits. 17 of 23 close, none by a widened
  disclaimer.
- **The secret scanner.** The first pilot's false positive ("login" followed
  by backticked file names) was avoided by checking the wording by hand; no
  scanner was available locally. The pull request's betterleaks check passed
  on the first commit.

## The questions of the first draft and their answers

All 24 were answered on 2026-10-16 with the proposed answer. The ratified
claims carry *(maintainer, 2026-10)* in `threat-model.md`, and §1.18 is now
marked not applicable. The list is kept here as the record of what was
asked, since the skill deletes answered questions from the model. What the
answers changed beyond promoting tags:

- Q4 and Q7: `P-PUBLISHED-IMMUTABLE` now says that a change to an older
  release before the launch, and any merged change to a published file after
  it, is `VALID` however it got in.
- Q9, Q10, Q16, Q17, Q22: the five disclaimers that rested on silence are
  stated limits now, so they can close reports.
- Q13: new property `P-REFS-CATALOG-ONLY` (correctness-only, kept by review).
- Q14: new property `P-CONTEXT-IMPORTS-CATALOG` (security-critical, enforced
  by CI).
- Q19: new disclaimer `D-NEGOTIATION-STALE-MAJOR` (correctness-only).
- Q6: `SECURITY.md` added, linking the model.

**Wave 1 — scope, configuration, side effects**

- Q1 Scope: six families in one model; toolkit a sibling; site prose, the
  GeonicDB export CLI, tests, node sites and `models.geonicdb.com` out.
  Proposed: yes.
- Q2 `docs/design.md` non-goals are superseded by `/ns/*` negotiation and the
  MCP `validate` tool; `validate` is advisory, not a validation service.
  Proposed: yes.
- Q3 `prerelease: true` is supported until the launch; a current-version
  correction before it is by design. Proposed: yes.
- Q4 Before the launch, "older releases are never corrected" is enforced by
  review only (CI notes any snapshot change); such a change is `VALID`.
  Proposed: yes to both.
- Q5 Side effects: the Worker fetches only its assets and writes nothing; the
  production build is offline apart from `npm ci`; the pull-request check
  fetches the live site and remote references; a network attacker is out of
  scope (TLS at Cloudflare). Proposed: yes.
- Q6 Reporting: the organisation's default `SECURITY.md` and private
  vulnerability reporting; no earlier threat model to absorb. Proposed: yes.

**Wave 2 — integrity, permanence, supply chain**

- Q7 No status check is required on `main` and bypass is possible; the
  immutability guard relies on maintainers; after the launch any merged change
  to a published file is `VALID`. Proposed: yes to both. (Corrected after the
  answer: the organisation's Security Suite is required; no check from this
  repository's workflows is. The substance of the answer is unchanged.)
- Q8 Immutability covers exact-version contexts, vocabularies and schemas
  only. Proposed: yes.
- Q9 No signature or digest since the manifest was retired; make it a stated
  limit. Proposed: yes, security-critical.
- Q10 `P-IRI-RESOLVES` is an operator commitment, not uptime; no mirror.
  Proposed: yes, correctness-only.
- Q11 Workers Builds runs every locked package with deploy rights; a
  malicious package is `dependency-contract`; platforms and Geolonia's
  accounts are trusted. Proposed: yes.
- Q12 The CI-token property covers the four workflows here; the organisation's
  security-suite workflow is outside. Proposed: yes.

**Wave 3 — what a contributed file can do to a consumer**

- Q13 `$ref` targets: (a) claim "catalogue schemas or local pointers only",
  kept by review, or (b) disclaim. Proposed: (a).
- Q14 Context imports only from the catalogue (enforced by CI): claim it,
  security-critical. Proposed: yes.
- Q15 Core-term redefinition is correctness-only. Proposed: yes.
- Q16 No limits on contributed file size, nesting, `$ref` count, import depth
  or `pattern` complexity: stated limit, consumers bound their processors.
  Proposed: yes, security-critical.
- Q17 Text reaches agents unfiltered: stated limit, review is the only
  control. Proposed: yes, security-critical.
- Q18 Reviewed contributor text on pages is correctness-only; unreviewed
  listing text is security-critical. Proposed: yes.

**Wave 4 — the Worker, MCP, personal data, operator rules, meta**

- Q19 The IRI Worker's cached majors can be stale after a major release:
  disclaim as correctness-only, or claim the 303 always names the current
  major. Proposed: disclaim.
- Q20 `P-MCP-BOUNDED` is correctness-only; threshold "more than tens of
  milliseconds of CPU inside the limits is a bug". Proposed: yes.
- Q21 The code logs only internal errors; Workers observability keeps request
  metadata such as the client address. Proposed: yes.
- Q22 `x-personal-data` promises nothing about handling: stated limit, false
  friend. Proposed: yes, security-critical.
- Q23 The BIC rule, Workers Builds settings and the custom domain are operator
  configuration; a missing rule is an availability bug; `check:live` is run by
  hand. Proposed: yes.
- Q24 Bind to `e554242`, keep `strict`, re-bind at the launch. Proposed: yes.

## Self-review corrections (2026-10-17)

A self-review of the accepted model (a fresh agent, `code-review-expert
--report`, head `825788b`) found no blocking problem and eleven corrections,
all applied: `datamodel.jp` is not registered, as the model had claimed it
was; the organisation's rulesets on `main` described fully (above); the
Security Suite named as outside the model; a non-OK read of `catalog.json` is
cached as empty in the IRI Worker (added to `D-NEGOTIATION-STALE-MAJOR`);
search counts and one stale search result corrected; fork builds tagged as a
maintainer ruling about a dashboard setting; the JSON's folding of maintainer
into documented explained in §1.19; and labels that still said "draft".

## Candidate issues (not in the model)

The model describes the catalogue as it is. These came up while reading and
belong in issues, not in the threat model:

1. Make "Build and dry-run deploy" a required status check on `main` (next to
   the organisation's Security Suite), so the comparison of published versions
   blocks a merge (Q7).
2. In the toolkit: during the pre-release, let the `--base` comparison accept
   corrections only for the current version, as the README says (Q4).
3. A catalogue rule that a schema's `$ref` points to `https://datamodels.jp/`
   or inside the file, and a problem instead of a note when such a schema
   cannot be compiled offline (Q13).
4. Size, nesting and `pattern` limits for contributed files, or a documented
   decision not to have them (Q16).
5. Update `docs/design.md`: the non-goals, "Term IRIs resolve ... No content
   negotiation in 1.0.0" and the "Hosting" paragraph about Worker scripts
   (Q2).
6. Decide whether consumers get digests or signatures, or a documented
   pointer to the release snapshots as the reference copy (Q9).
7. Document what `x-personal-data` means and does not mean (Q22).
8. Run `npm run check:live` automatically after a deploy (Q23).
9. ~~A `SECURITY.md` in the repository that links this model, as the first
   pilot did after its wave (Q6).~~ Done in this pull request.
10. Refresh the IRI Worker's cached subject majors, or accept the stale
    window in writing (Q19).
11. Upstream to Alpha-Omega: document the §1.11 bullet format the validator
    expects; let the exporter read §1.1's description paragraph and §1.4; a
    data-catalogue profile with a "what a published file can do to its reader"
    dimension.
12. For `geolonia/skills`: the data-catalogue questions in the table above,
    next to the first pilot's hosted-service questions.
13. Register `datamodel.jp` as the typo guard `docs/design.md` names, or
    remove it from the design document; it is not registered (JPRS whois,
    2026-10-17).

## Files

- `threat-model.md` — the prose model (canonical).
- `threat-model.yaml` — the sidecar (`threat-model-sidecar/v2`), bound to the
  prose by SHA-256.
- `threat-model.json` — the flat export (`schema.json`, spec 1), with
  `description` and `trust_boundaries` completed by hand.
- `SECURITY.md` — the reporting channel (private vulnerability reporting) and
  how reports are triaged against the model.
- `.threat-model/backtest.md` — producer-side routing table, ignored by git
  and not in the repository, as the skill asks; only the aggregate figures in
  §1.1 are published.
- The skill itself lives in `.claude/skills/` in the working tree and is not
  committed; reinstall it with `/plugin marketplace add
  alpha-omega-security/threat-model` and `/plugin install
  threat-model@threat-model`, or copy the `skills/` folder from the plugin
  repository at commit `192fd60`.

To re-validate after a change: the validator is not in this repository. It is
`tests/harness/validate_model.py` in the plugin repository
(https://github.com/alpha-omega-security/threat-model) at commit `192fd60`,
and needs Python with PyYAML. Run it from that checkout, with paths into this
repository (here `../datamodels`):

```bash
git clone https://github.com/alpha-omega-security/threat-model.git
```

```bash
cd threat-model && git checkout 192fd60
```

```bash
python tests/harness/validate_model.py ../datamodels/threat-model.md ../datamodels/threat-model.yaml --json-report ../datamodels/threat-model.json --source-root ../datamodels
```
