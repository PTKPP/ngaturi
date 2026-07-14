# Implementation Plan

| Phase | Goal, dependencies, main tasks | Acceptance / required test | Out of scope |
|---|---|---|---|
| 1 — Project Foundation | **TASK-001** repository/docs/contract/RAG foundation. No dependency. | OpenAPI valid; knowledge tests pass. | Application features |
| 2 — Authentication | **TASK-002** Go module, user migration, token/session endpoints; depends Phase 1. | Auth/ownership integration tests. | Recovery/verification TBD |
| 3 — Invitation Core | **TASK-003** invitation/template/event migrations and owner CRUD; depends TASK-002. | Slug/ownership/validation tests. | Media upload |
| 4 — Public Invitation and Template Rendering | **TASK-004** public query, frontend registry, SSR page; depends TASK-003. | Published opens; draft/missing/unknown template handling. | Cache rollout |
| 5 — Media and Gallery | **TASK-005** storage adapter, signed upload flow, asset metadata; depends TASK-003. | No blobs; authorization/order tests. | Transform pipeline TBD |
| 6 — Guest Management | **TASK-006** guest token generation/hash and CRUD; depends TASK-003. | Ownership/token/limit tests. | Bulk import TBD |
| 7 — RSVP and Guestbook | **TASK-007** atomic RSVP and moderated/rate-limited guestbook; depends TASK-004/006. | Duplicate RSVP, invalid token, spam tests. | Analytics |
| 8 — Production Readiness | **TASK-008** observability, backup, security/load testing, cache policy; depends 2–7. | Load/security/restore checks. | Monetization |
| 9 — Monetization | **TASK-009** package/payments; non-MVP. | TBD. | MVP delivery |

Each task updates the OpenAPI contract first when API behavior changes, then implements and tests a reviewable vertical slice. Do not start a phase until its dependencies and relevant acceptance tests are satisfied.
