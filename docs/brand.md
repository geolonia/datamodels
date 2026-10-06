# datamodels.jp — Brand guide

Version 1.0 · 2026-10-06 · Applies to the site, the repository, share cards and documents.

In this repository: the palette and fonts are at the top of `site/.vitepress/theme/custom.css`, IBM Plex is self-hosted from `@fontsource` (imported in `site/.vitepress/theme/index.ts`), and the share card source is `site/og-card.svg`.

## 1. Idea

datamodels.jp publishes data models: records made of keys and values. The mark is
three key/value rows — the smallest picture of a schema — and one value is a red
circle. The circle is the hinomaru (Japan) and the one thing this catalog adds to
existing standards: the row the others do not have. Everything else is ink.

Read it as: *a document, with Japan in it.*

## 2. The mark

Files (in `site/public/`): `logo-mark.svg` (light surfaces), `logo-mark-dark.svg`
(dark surfaces), `favicon.svg` (tile, for browser tabs and app icons), with
`favicon-32.png` and `apple-touch-icon.png` as raster fallbacks.

Geometry (64-unit grid, do not redraw by eye):

| Element | x | y | w | h | note |
|---|---|---|---|---|---|
| bar 1 | 0 | 4 | 40 | 9 | rx 4.5 |
| square 1 | 50 | 6 | 9 | 9 | stroke 4, no fill |
| bar 2 | 0 | 27.5 | 28 | 9 | rx 4.5 (shorter) |
| circle | cx 46 | cy 32 | r 10 | | the only red |
| bar 3 | 0 | 51 | 40 | 9 | rx 4.5 |
| square 2 | 50 | 49 | 9 | 9 | stroke 4, no fill |

Rules
- Minimum size 16 px (bare mark) / 16 px (tile). Below 24 px prefer the tile.
- Clear space: half the mark's height on every side.
- The circle is always a perfect circle and always red. Never recolour the ink
  bars red, never make the circle a square, never add a fourth row.
- Do not rotate, outline, add gradients, shadows or a second colour.
- On photographs or coloured surfaces use the tile.

## 3. Wordmark and lockup

Wordmark: `datamodels.jp`, IBM Plex Sans SemiBold (600), letter-spacing −0.02 em,
always lower-case, always with `.jp`. Fallback: system sans-serif.

Lockup: mark, gap, wordmark; mark height = 1.5 × the wordmark's cap height
(24 px mark with 16 px text; 32 px with 22 px). Vertically centred.
No tagline inside the lockup.

## 4. Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| ink | #2a2521 | #efe8dc | text, bars, buttons |
| ink-2 | #5a5047 | #a89d8f | secondary text |
| ink-3 | #8a7f72 | #7a7065 | hints, placeholders |
| paper | #faf7f1 | #1d1a17 | page background |
| paper-2 | #f1ece2 | #2a2521 | sidebar, cards, code |
| line | #e4ddd0 | #332e29 | dividers |
| border | #cfc6b8 | #4a433b | inputs, outline buttons |
| shu (red) | #c8321f | #e5543f | the dot, links, versions, numerals |

Red is reserved. It appears on the dot, on links, on version strings, on section
numerals and small badges. Buttons are ink. Never fill a surface larger than a
badge with red; never set body text in red.

On the site:
- The home headline ends with the dot: its full stop (。 / .) is drawn as a red
  circle (`.VPHero .text .dot`).
- The main button is filled ink; the others are ink outlines (border) that turn
  red on hover, like a link.
- The pre-release banner is ink on paper-2 with a small red dot.

Status badges keep VitePress semantics (draft = info, stable = tip, deprecated =
danger); `tip` inherits the brand red.

## 5. Typography

- Latin UI / headings: IBM Plex Sans 400 / 500 / 600 / 700
- Japanese: Hiragino Sans → Noto Sans JP (system first; no web font needed for JA)
- Code, URLs, type names, versions: IBM Plex Mono 400 / 500 / 600

Headings in Japanese use `font-feature-settings: 'palt'`. Type names
(`EvacuationSite`) are always monospace, also in prose.

## 6. Voice

Short sentences. Both languages carry the same weight: never a JA headline with an
EN afterthought or vice versa. Say what the catalog does, not what it is
("変わらない URL で提供します", not "a comprehensive platform").

## 7. Share card

`og-card.svg` → render to `og-image.png` at 1200 × 630:

    rsvg-convert -w 1200 -h 630 -o site/public/og-image.png site/og-card.svg

Paper background, lockup top-left, JA title, EN subtitle, one mono line in red.

## 8. Do not

- Add a graph / network / globe to the mark
- Put the mark in a circle
- Use the old green (#0d5b4e) or the VitePress indigo anywhere
- Pair the mark with Geolonia's logo in one lockup (the catalog is product-neutral;
  Geolonia is credited in the footer text)
