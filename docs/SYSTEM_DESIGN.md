# System Design

## Components

| Component | Responsibility |
|---|---|
| Next.js App Router | SSR public pages, owner UI, template registry, client-only interactions |
| Go REST API | Authentication, authorization, business rules, validation, persistence orchestration |
| PostgreSQL | Transactional application source of truth |
| S3-compatible storage | Original/derived media objects; database stores metadata and object keys |
| ChromaDB | Internal derived documentation index for agents only |

## Public Invitation Flow

1. Visitor requests `/{slug}` (optionally with a guest token).
2. Next.js SSR calls `getPublicInvitation` in Go.
3. Go returns only published public invitation data, `template_key`, and `template_version`.
4. Next.js selects the matching local template using its registry and SSR-renders it.
5. Music, countdown, interactive gallery, RSVP, guestbook, copy actions, and section navigation hydrate as Client Components.

Backend never sends template source code. An absent registry entry is a controlled frontend error and must be monitored.

## Other Flows

- **Upload:** owner requests/uses authorized upload flow (TBD endpoint), writes to object storage, then API persists metadata; no media blob is stored in PostgreSQL.
- **RSVP:** public API validates published invitation and optional guest token, then atomically upserts registered guest RSVP under its unique constraint.
- **Template registry:** frontend maps stable `(key, version)` to dynamically imported code. Backend validates a template reference against its template catalogue.

## Cache and Risks

Initial public SSR is correctness-first. Later, cache published public payloads/pages and invalidate on publish or content change; never serve a draft from cache. Main risks are slug enumeration, guest-token leakage, media access control, spam, template-version mismatch, and duplicate RSVP. Mitigate with authorization, opaque tokens, signed uploads, rate limits/moderation, registry compatibility checks, and constraints.

Chroma is private Docker infrastructure with persistence; it is not an application runtime dependency, authorization system, or replacement database.
