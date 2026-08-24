# Implementation Plan

## Baseline Status

| Task | Status | Result |
|---|---|---|
| TASK-001 — Project Foundation | Completed | Repository, documentation, and Chroma tooling established under the original workflow. |
| TASK-002 — Go Authentication | Completed | Authentication service, PostgreSQL migration, tests, rotation, and logout verified. Archived OpenAPI is historical evidence only. |
| TASK-003 — Backend Invitation Core (original) | Superseded / paused | Must not resume until frontend flow and dummy/domain contract are approved. |

## Frontend-First Sequence

1. **TASK-FE-001:** standalone mock vertical slice.
2. **TASK-FE-002:** finalize frontend flow, schemas, fixtures, ownership, and template extension model.
3. **TASK-FE-003:** port the approved `daztore_inv1` visual experience as a local typed template renderer.
4. Define normalized backend persistence and mapping from approved frontend shape.
5. Replace mock repositories with API repositories; integrate preserved authentication.
6. Add deferred production features only through new approved tasks.

## TASK-FE-001 — Frontend Foundation and Mock Vertical Slice

**Status:** Completed

**Result:** Reopened login blocker fixed and re-verified. Strict Mode initialization now completes predictably; explicit storage/schema metadata, legacy migration, invalid-data recovery, runtime-null reset, persisted sessions, and user/admin redirects pass 32 automated tests plus Chromium desktop, 360 px, 390 px, and LAN verification.

**Dependency:** TASK-001 and accepted frontend-first decisions

**Backend dependency:** None

### Goal

Create a standalone Next.js prototype using dummy data and versioned `localStorage`:

```text
Admin creates user -> owner selects template -> edits invitation -> previews
-> publishes -> guest opens /{slug}
```

### Scope

- Initialize Next.js App Router with TypeScript; add lint, typecheck, test, and build scripts.
- Create Zod schemas with inferred types in `apps/frontend/src/domain/`: `user.ts`, `session.ts`, `template.ts`, `invitation.ts`, `index.ts`.
- Create and schema-validate `contracts/dummy-data/{users,templates,invitations}.json`.
- Implement `MockUserRepository`, `MockSessionRepository`, `MockInvitationRepository`, and `MockTemplateRepository` over namespaced/versioned storage.
- Add mock admin/user sessions and frontend route guards.
- Add simple admin/user dashboards, admin dummy-user management, invitation list/create/editor, preview, publish/unpublish, and development reset.
- Add explicit template registry and two simple themes: `elegant-gold@1`, `minimal-white@1`.
- Add public guest route `/{slug}` and unit/component tests for the vertical slice.
- Implement all routes, dashboards, editors, settings, previews, and public
  invitation themes using a mobile-first layout with a 360 px baseline viewport.
- Tablet and desktop layouts are progressive enhancements.

### Domain Contract

- `User`: `id`, `name`, `email`, `role (admin|user)`, `status (active|inactive)`, timestamps.
- `Template`: key/version/name/description/thumbnail/status/supported sections.
- `Invitation`: identity/owner/slug/title/template/status, couple, events, content, gallery, settings, timestamps.
- Couple uses `partnerOne` and `partnerTwo`; each has full name, nickname, parent names, and photo.
- Each event has id/type/title/date/times/timezone/venue/address/map/sort order.
- Content supports opening, quote, story, closing, and gift information without UI state.

### Minimal Editor

Edit title, both partner names, event date/time, venue name/address, opening/closing text, template, slug, and draft/published state.

### Template Layout

```text
apps/frontend/src/templates/
  registry.ts
  types.ts
  shared/{components,utilities}/
  renderers/elegant-gold/{index.ts,Template.tsx,manifest.ts,styles.module.css,components,assets,scripts}/
  renderers/minimal-white/{index.ts,Template.tsx,manifest.ts,styles.module.css,components,assets,scripts}/
```

Themes are build-time modules, registered explicitly by key/version, and accept `InvitationTemplateProps`. They cannot read repositories/storage, call backends, use `eval`/remote scripts, or define separate invitation data.

### Rules

- No backend/API/OpenAPI usage and no Go changes.
- Components never access `localStorage`; seed runs only for missing keys and never overwrites edits.
- Use `ngaturi:mock:v1:{users,session,invitations,templates}` and provide development-only reset.
- Slug is unique; user edits only owned invitations; admin uses owner features but cross-user editing is not implemented.
- Guest sees published invitations only and cannot mutate data.
- Adding a template requires a renderer folder, manifest/component/assets, explicit registry entry, dummy catalogue entry, and preview test—not editor changes.

### Acceptance Criteria

- Frontend runs without backend; first load seeds data and reload preserves edits.
- Admin and user demo login work; admin can create a dummy user.
- Owner creates an invitation, selects either template, edits minimal fields, and previews current data.
- Publish exposes `/{slug}`; draft/inactive invitations stay unavailable to guest.
- Duplicate slug and foreign-owner edits are rejected; guest cannot mutate or access dashboards.
- Fixtures validate against runtime schemas; templates receive props and do not access repositories/storage.
- `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` succeed.
- Login, dashboard, user management, invitation editor, preview, and public
  invitation are usable at viewport widths 360 px and 390 px.
- No unintended horizontal overflow occurs on mobile.
- Primary actions remain visible or easily reachable without hover.
- Forms use a readable single-column layout on mobile.
- Buttons, navigation, dialogs, and form controls are touch-friendly.
- Fixed bottom elements account for device safe area.
- Layout remains usable at tablet and desktop widths.

### Out of Scope

Backend auth integration, APIs, PostgreSQL invitation schema, production SSR, media/object storage, RSVP, guestbook, payment, admin impersonation/cross-user editing, final design, and production deployment.

### Required Completion Report

Report frontend structure, schemas, fixtures, repository adapters, routes/access, themes, tested flow, lint/typecheck/test/build results, localStorage limitations, and remaining TBD rules.

## TASK-FE-002 — Frontend Domain dan Flow Finalization

**Status:** Completed

**Result:** Unified frontend contract, schema version 2 recovery, multi-event editor, catalogue/registry parity, story/gift rendering, ownership/publication safeguards, 42 automated tests, production build, and Chromium 360/390 px flow checks verified.

**Dependency:** TASK-FE-001

**Backend dependency:** None

### Goal

Approve an executable frontend contract and owner/public flow before backend invitation persistence is designed.

### Scope

- Validate users, templates, and invitations as one cross-referenced contract.
- Require unique user IDs/emails, template key/version pairs, invitation IDs/slugs, valid owners, and available template references.
- Require at least one event, unique event IDs/order, contiguous order from zero, and end time after start time.
- Let owners add, edit, reorder, and remove multiple events while preserving at least one event.
- Keep story and optional gift information in the shared invitation shape and render them through both templates.
- Keep the dummy template catalogue identical to explicit registry manifests.
- Preserve owner isolation, published-only guest access, and browser-local persistence.
- Bump browser `schemaVersion` for controlled recovery from the earlier contract.

### Acceptance Criteria

- Runtime schemas reject broken cross-fixture references, duplicates, invalid event order, and invalid event time ranges.
- Dummy fixtures pass the unified frontend contract and cover draft/published, multiple events, story, and optional gift display.
- The editor manages multiple ordered events at 360 px without placing UI-only state in domain data.
- Both registered templates render the same invitation contract, including enabled gift information.
- Owner, publication, duplicate-slug, inactive-template, and foreign-owner rules pass automated tests.
- `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` succeed.
- Editor, preview, and public invitation pass Chromium checks at 360 px and 390 px without horizontal overflow.

### Out of Scope / TBD

Backend/API/database design, Go auth integration, media upload, RSVP, guestbook, admin cross-user editing, and the public visibility policy when an owner account is later deactivated. Publication requires the finalized runtime schema and an active template; additional editorial completeness rules remain TBD.

## TASK-FE-003 — Daztore Invitation 1 Template

**Status:** Completed

**Result:** `daztore-inv1@1` is registered and catalogue-identical, renders the shared invitation contract through editor/preview/public flows, and passes 56 automated tests, production gates, and Chromium checks at 360×800, 390×844, 430×932, 768×1024, and 1440×900. No backend or archived OpenAPI source changed.

**Dependency:** TASK-FE-002

**Backend dependency:** None; backend integration must not start.

### Goal

Port the visual identity and guest experience of `daztore/daztore_inv1` into `daztore-inv1@1` as typed React components, scoped CSS, local assets, and the existing `InvitationTemplateProps` contract.

### Acceptance Summary

- Register a catalogue-identical `daztore-inv1@1` manifest with local thumbnail and assets.
- Render safe recipient presentation, interactive cover, user-triggered audio, timezone-aware countdown/calendar, all ordered events, conditional story/gallery/gift, closing, reveal animation, and adaptive bottom navigation.
- Preserve mobile-first layout, 44 px touch targets, safe areas, reduced motion, cleanup, owner/public flow, and generic editor selection.
- Copy no personal source data, original account/map/calendar values, Google Apps Script, CDN runtime, source deployment/management tooling, or backend code.
- Pass lint, typecheck, tests, build, diff hygiene, Chromium viewport checks, and healthy archive-free Chroma reindex before completion.

## TASK-FE-004 — Route Allocation, Quota, and Template-Theme Separation

**Status:** Implemented; validation evidence recorded in completion report.

**Dependency:** TASK-FE-003

**Backend dependency:** None; frontend-only mock repositories remain active.

### Scope

- Separate globally unique owner routes from invitation content and migrate browser schema 2 to 3 without discarding valid edits.
- Add admin-managed route quota, preassignment, confirmed reassignment, and service-layer authorization.
- Support user selection of unused preassigned routes or atomic claiming within quota; keep routes immutable in owner UI.
- Keep the three structural implementations under `templates/renderers/` and compatible typed visual presets under `themes/`, with default selection rules.
- Resolve public slugs through route to published invitation and retain one-browser prototype warnings.

### Acceptance

- Unified schemas validate route ownership/quota, route/invitation uniqueness, and active compatible template-theme selection in services.
- Admin, owner, guest, preview, migration, session invalidation, and mobile-first flows pass automated and viewport validation.
- No Go backend, migration, API integration, or archived OpenAPI source changes.
