# Done checklist

Must pass (CI runs the same): `pnpm run check`, `pnpm test`.
Also, when relevant:
- changed a model → `pnpm run validate:models`; bump the subject version if a published file changes.
- changed site ja pages → `pnpm run lint:ja`; changed ja or en page → `pnpm run check:languages`.
- changed build output → `pnpm run dist:diff` to see what changes in dist/.
