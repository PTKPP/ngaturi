# Implementation Plan

## Baseline Status

| Task | Status | Result |
|---|---|---|
| TASK-001 — Project Foundation | Completed | Repository, documentation, and Chroma tooling established under the original workflow. |
| TASK-002 — Go Authentication | Completed | Authentication service, PostgreSQL migration, tests, rotation, and logout verified. Archived OpenAPI is historical evidence only. |
| TASK-003 — Backend Invitation Core (original) | Superseded / paused | Must not resume until frontend flow and dummy/domain contract are approved. |

## Frontend-First Sequence

1. **TASK-FE-001:** standalone mock vertical slice.
2. Review frontend flow, schemas, fixtures, ownership, and template extension model.
3. Define normalized backend persistence and mapping from approved frontend shape.
4. Replace mock repositories with API repositories; integrate preserved authentication.
5. Add deferred production features only through new approved tasks.

## TASK-FE-001 — Frontend Foundation and Mock Vertical Slice

**Status:** Ready

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
- Keep UI responsive/mobile-first; visual polish is not final.

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
  themes/elegant-gold/{index.ts,Template.tsx,manifest.ts,styles.module.css,components,assets,scripts}/
  themes/minimal-white/{index.ts,Template.tsx,manifest.ts,styles.module.css,components,assets,scripts}/
```

Themes are build-time modules, registered explicitly by key/version, and accept `InvitationTemplateProps`. They cannot read repositories/storage, call backends, use `eval`/remote scripts, or define separate invitation data.

### Rules

- No backend/API/OpenAPI usage and no Go changes.
- Components never access `localStorage`; seed runs only for missing keys and never overwrites edits.
- Use `ngaturi:mock:v1:{users,session,invitations,templates}` and provide development-only reset.
- Slug is unique; user edits only owned invitations; admin uses owner features but cross-user editing is not implemented.
- Guest sees published invitations only and cannot mutate data.
- Adding a template requires a theme folder, manifest/component/assets, explicit registry entry, dummy catalogue entry, and preview test—not editor changes.

### Acceptance Criteria

- Frontend runs without backend; first load seeds data and reload preserves edits.
- Admin and user demo login work; admin can create a dummy user.
- Owner creates an invitation, selects either template, edits minimal fields, and previews current data.
- Publish exposes `/{slug}`; draft/inactive invitations stay unavailable to guest.
- Duplicate slug and foreign-owner edits are rejected; guest cannot mutate or access dashboards.
- Fixtures validate against runtime schemas; templates receive props and do not access repositories/storage.
- `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` succeed.

### Out of Scope

Backend auth integration, APIs, PostgreSQL invitation schema, production SSR, media/object storage, RSVP, guestbook, payment, admin impersonation/cross-user editing, final design, and production deployment.

### Required Completion Report

Report frontend structure, schemas, fixtures, repository adapters, routes/access, themes, tested flow, lint/typecheck/test/build results, localStorage limitations, and remaining TBD rules.
