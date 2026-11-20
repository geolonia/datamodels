# Conventions

Model rules: https://datamodels.jp/en/guide/rules and README "Adding or changing a model". Prose rules: CONTRIBUTING.md (textlint, ja spacing, write ja for ja readers). Not repeated here.

Code:
- ESM `.mjs`, Node built-ins first; logic in `scripts/lib/`, thin CLI in `scripts/`.
- Tests are `test/<topic>.test.mjs`, mostly named after the lib module (not 1:1). Add or extend the closest one.
- Every model attribute needs a context term and ja/en descriptions; never redefine core-context terms (e.g. `status`).
- Commits need DCO sign-off (`git commit -s`).
