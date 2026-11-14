# DESIGN.md — CineTrack Visual System

## Aesthetic Direction
**Editorial Cinephile Notebook** — warm paper surfaces (`#faf9f6`), crisp elevated cards (`#ffffff`), deep slate-ink typography (`#18181b`), muted warm-slate secondary text (`#52525b`), and restrained cinema-crimson (`#b91c1c` / `#991b1b`) + amber/cobalt functional accents. Clean hierarchy without neon gradients, heavy drop shadows, or clutter.

## Color Tokens
- `--ct-bg`: `#f6f4ef` (warm archival paper canvas)
- `--ct-surface`: `#ffffff` (elevated card surface)
- `--ct-surface-subtle`: `#f1efe9` (filter bars, subtle metadata bands)
- `--ct-ink`: `#18181b` (primary headings & body, contrast ≥ 14:1 on white)
- `--ct-ink-muted`: `#52525b` (secondary labels, metadata, contrast ≥ 7:1 on white)
- `--ct-accent`: `#b91c1c` (cinema crimson primary CTA & active accents)
- `--ct-accent-hover`: `#991b1b`
- `--ct-border`: `#e4e0d8` (hairline 1px editorial dividers)
- `--ct-focus`: `#1d4ed8` (high-visibility keyboard focus ring)

## Typography & Rhythm
- **Font Stack:** `'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` for clean UI legibility; tabular numerals (`font-variant-numeric: tabular-nums`) for `HH:MM:SS` timestamps, years, and counts.
- **Scale:** Compact, clear hierarchy (`h1` 1.75rem, `h2` 1.35rem, `h3` 1.1rem, body 0.95rem, meta 0.8125rem).
- **Spacing:** Consistent `1rem` / `1.5rem` grid gutters; generous breathing room around forms and cards.

## Component Rules
- **Poster Ratio:** `aspect-ratio: 2 / 3; object-fit: cover; width: 100%;` on catalog cards and detail headers so every poster aligns cleanly without distortion.
- **Touch Targets:** Interactive buttons, filter chips, and genre pills maintain `min-height: 44px` on touch/mobile viewports.
- **Motion:** Subtle 150ms transitions for hover/focus states; completely disabled under `@media (prefers-reduced-motion: reduce)`.
- **Accessibility:** Visible `:focus-visible` outline (`2px solid var(--ct-focus)`), semantic landmarks (`<main>`, `<nav>`), contrast ≥ 4.5:1 on body text and badges.
