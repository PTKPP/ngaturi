# Project Index

Read this after `AGENTS.md`; retrieve only the source relevant to the task.

| Document | Used for / source of truth | Retrieval keywords |
|---|---|---|
| `PRD.md` | Product goals and MVP scope | MVP, user, scope, out of scope |
| `SYSTEM_DESIGN.md` | Architecture and data flows | SSR, template, upload, cache |
| `DATABASE_DESIGN.md` | Tables, constraints, indexes | UUID, slug, RSVP, unique, migration |
| `FEATURES.md` | Feature flow and business rules | publish, RSVP, guestbook, gallery |
| `IMPLEMENTATION_PLAN.md` | Phase/task order | TASK, phase, dependency |
| `TEST_PLAN.md` | Test strategy and scenarios | contract, E2E, security, duplicate |
| `DECISIONS.md` | Accepted architecture decisions | DEC, PostgreSQL, ChromaDB |
| `../contracts/openapi.yaml` | API request and response contract | operationId, endpoint, schema |
| `../contracts/examples/` | Valid contract examples | response, error, RSVP |

## Retrieval Routing

| Change | Retrieve first |
|---|---|
| Endpoint/UI data | API operation and response schema |
| Persistence/migration | Database table plus related feature |
| Feature behavior | Feature section plus acceptance criteria |
| Task planning | Implementation phase and dependencies |
| Architecture | System design plus decisions |

Git files are authoritative. ChromaDB is a searchable derived index.
