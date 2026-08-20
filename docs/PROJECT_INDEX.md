# Project Index

Read this after `AGENTS.md`; retrieve only what the active task needs.

| Source | Active use | Retrieval keywords |
|---|---|---|
| `FEATURES.md` | Flows, roles, business rules | admin, user, guest, publish, preview |
| `IMPLEMENTATION_PLAN.md` | Task status, scope, acceptance | TASK-FE, dependency, test |
| `../apps/frontend/src/domain/` | Executable schema/type after TASK-FE-004 | user, route, quota, session, template, theme, invitation |
| `../contracts/dummy-data/` | Schema-v3 seed, fixtures, agreed frontend shape | dummy, route, theme, fixture, localStorage, migration |
| `SYSTEM_DESIGN.md` | Frontend architecture and future adapter swap | repository, registry, route |
| `PRD.md` | Current product scope and actors | frontend-first, MVP, role |
| `DECISIONS.md` | Accepted and superseded decisions | frontend-first, mobile-first, responsive, viewport, touch, safe-area |
| `DATABASE_DESIGN.md` | Completed auth persistence; future DB draft warning | users, auth_sessions, draft |

## Retrieval Routing

| UI, layout, or responsive behavior | `DECISIONS.md`, `SYSTEM_DESIGN.md`, and active task acceptance |
| Change | Retrieve first |
|---|---|
| Role or feature behavior | `FEATURES.md` plus task acceptance |
| Frontend data | domain schema plus matching users/routes/invitations fixture |
| Template or theme | registry rules in `SYSTEM_DESIGN.md` plus matching dummy catalogues |
| Task planning | `IMPLEMENTATION_PLAN.md` |
| Authentication maintenance | `DATABASE_DESIGN.md` and completed backend tests |

Archived contracts are historical only. Git is authoritative; ChromaDB is a searchable derived index.
