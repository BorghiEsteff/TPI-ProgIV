# DESIGN.md — CineTrack Visual System (Light Editorial + Dark Plum Chrome)

## Aesthetic Direction
**Luminous Cinephile Notebook** — crisp white (`#FFFFFF`) and ultra-soft lavender (`#FAF7FD`) reading surfaces framed by a deep plum navbar and footer (`#180828`), with royal violet primary actions (`#5B0EA6`) and restrained orchid accents (`#AE1EC4`).

## Color Tokens
- **Canvas & Surfaces (Light):** `--bg-primary: #FFFFFF`, `--bg-secondary: #FAF7FD`, `--bg-surface: #FFFFFF`, `--bg-elevated: #F4ECF9`
- **Navbar & Footer Chrome (Dark):** `--bg-chrome-dark: #180828` (`#EDE2F7` text, `#C55AD6` active underline)
- **Typography:** `--text-primary: #180828`, `--text-secondary: #4A3560`, `--text-muted: #7B6394`
- **Brand & Accents:** `--brand-primary: #5B0EA6`, `--brand-primary-hover: #4B0A8A`, `--brand-soft: #EDE2F7`, `--brand-accent: #AE1EC4`
- **Borders & Shadows:** `--border-subtle: #E6D9F2`, `--border-focus: #935FD3`, `--shadow-card: 0 4px 16px rgba(24, 8, 40, 0.06)`, `--shadow-card-hover: 0 8px 24px rgba(91, 14, 166, 0.12)`
- **Filter Bar Tokens:** `--filter-surface: #EDE2F7`, `--filter-border: #D3B9EC`, `--filter-shadow: 0 4px 16px rgba(91, 14, 166, 0.08)`
- **Poster Contour (2:3 Carteleras & Fallback):** Pseudo-element `::after` (`pointer-events: none`) with `1.5px solid rgba(147, 95, 211, 0.42)`, outer soft glow `0 0 14px rgba(91, 14, 166, 0.16)` and subtle edge light `inset 0 0 12px rgba(174, 30, 196, 0.08)`, subtly intensified on hover/`focus-within` without blurring `<img>`.
- **Semantic Accents:** Error `#F26D85`, Gold/Stars `#F5C842`, Teal/Success `#38D9C0`, Sky/Info `#4DB8F5`
