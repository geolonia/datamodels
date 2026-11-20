# Commands

Full list with explanations: README.md "Commands". Non-obvious distinctions:
- `pnpm run dev` = build + `wrangler dev` (serves the real Worker); `pnpm run site:dev` = VitePress only, for editing site pages.
- `pnpm run check` = build + `datamodels check --offline --all-released` + wrangler dry-run deploy. Fails if a release snapshot differs from sources.
- `pnpm run validate:models` = fastest feedback while editing a model (lists TODOs).
- `pnpm run new-model -- <subject> <Type> [--value]` scaffolds; don't create model folders by hand.
- `pnpm exec datamodels release <subject>` is maintainer-only; don't run it unasked.

Darwin: nothing special; scripts are cross-platform Node.
