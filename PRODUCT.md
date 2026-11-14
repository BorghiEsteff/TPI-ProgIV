# PRODUCT.md — CineTrack

## Product Identity
CineTrack is a personal cinema and series tracking notebook paired with a curated public catalog. It strictly separates **Mi CineTrack** (each user's private diary: watch platform, HH:MM:SS progress, status, favorites, star ratings, personal notes, and AI recommendations) from the **Catálogo Público** (shared canonical `MediaItem` entries moderated by admins).

## Target Audience & Use Scene
- **Audience:** Film and TV series enthusiasts who want a calm, distraction-free personal viewing journal plus a reliable shared catalog.
- **Usage Mode:** **Operate & Read** — high scanability, clear separation between public shared metadata and private personal annotations, zero social-feed noise on personal notes.

## Core Surfaces
1. **Catálogo Público (`/`)**: Search, filter by type (`PELICULA` / `SERIE`), filter by category/genre (`16` base genres), switch between REST and GraphQL, paginate cleanly.
2. **Detalle de Obra (`/media/:id`)**: 2:3 poster, synopsis, genres, seasons/episodes, public community reviews with spoiler toggles, and WatchRoom entry.
3. **Mi CineTrack (`/my-tracking`)**: Private diary with status tabs, HH:MM:SS time tracker, private star rating & notes, private merge-collision reconciliation, and pagination.
4. **Proponer Obra (`/new-entry`) & Mis Propuestas (`/my-submissions`)**: Submit new works (URL or local poster upload + 1–5 genres) with live duplicate hints and pending-category editing.
5. **Moderación (`/admin/submissions`, `/admin/media/:id`)**: Sanitized admin queue (no private user notes/authors), duplicate candidate matching, genre inheritance/override, publish/merge/reject.
6. **Recomendaciones IA (`/recommendations`) & WatchRoom (`/watch-rooms/:id`)**: Personalized recommendations without leaking private notes, plus synchronized watch rooms.

## Product Rules
- **Private vs. Public Boundary:** Personal ratings, comments, watch platform, and progress never appear in public catalog cards or admin moderation queues.
- **No Fake Visuals:** Poster slots use strict 2:3 aspect ratios (`aspect-ratio: 2 / 3; object-fit: cover`) with clean editorial fallback when absent.
