# Test Plan

## Active Frontend Scope

| Level | Scope |
|---|---|
| Domain | Zod validation, inferred types, fixture validity, slug/status rules |
| Repository | seed-once, persistence, reset, unique slug, owner isolation |
| Component | mock login, guards, editor, preview, template props |
| Flow | admin creates user; owner edits/publishes; guest opens published slug |
| Build | lint, typecheck, unit/component tests, production build |
| Knowledge | active-source whitelist, archive exclusion, sync/dedup, filters, context budget |

Required TASK-FE-001 scenarios: admin/user demo login, inactive/role guard rejection, first-load seed without overwrite, reload persistence, duplicate slug rejection, foreign-owner edit rejection, both registered templates, preview with latest data, published guest visibility, and draft/inactive guest denial. Templates must not access repositories or storage.

TASK-FE-002 adds unified fixture reference/uniqueness validation, event chronology and contiguous ordering, multi-event editor interaction, inactive-template rejection, publication transitions, catalogue/manifest equality, optional gift rendering, schema-version recovery, and 360/390 px editor/preview/public browser checks.

## Preserved Authentication Verification

Completed Go authentication retains unit, race, PostgreSQL migration/integration, refresh-rotation/reuse, logout, malformed token, and expiry tests. Frontend integration is deferred and these tests must not be removed.

## Future Scope

API contract/integration, normalized invitation persistence, production SSR/E2E, upload security, RSVP, guestbook, load, and deployment tests are defined only when their future tasks become active.

Run focused task tests followed by affected lint/typecheck/test/build and knowledge tests. Archived OpenAPI validation is not an active frontend gate.
