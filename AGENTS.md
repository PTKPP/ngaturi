# Agent Workflow

## Source of Truth

1. `contracts/openapi.yaml` — API contract.
2. `docs/DATABASE_DESIGN.md` — persistence and constraints.
3. `docs/FEATURES.md` — flow and business rules.
4. `docs/IMPLEMENTATION_PLAN.md` — task order.
5. `docs/SYSTEM_DESIGN.md` — architecture.
6. `docs/PRD.md` — product scope.
7. `docs/DECISIONS.md` — accepted decisions.

ChromaDB is a derived index, never a source of truth. If retrieval conflicts with Git, use Git and reindex after correcting it.

## Starting a Task

1. Read this file and `docs/PROJECT_INDEX.md`.
2. Identify task ID, feature, affected contract, and persistence area.
3. Query Chroma separately for business rules, API contract, database constraints, and acceptance/tests. Use 4–6 chunks and configured context budget.
4. Open exact source files only if retrieval is incomplete, conflicts, or an edit is imminent. Do not read all docs by default.

Example:

```text
python tools/knowledge/search.py --query "TASK-014 public invitation business rules" --task-id TASK-014
python tools/knowledge/search.py --query "getPublicInvitation" --operation-id getPublicInvitation
```

## Implementation Rules

- Keep to the active task; mark unknown product choices as TBD.
- Update OpenAPI before changing request/response behavior; do not invent fields.
- Use migrations and database constraints for persistence changes and races; never rely only on SELECT-before-INSERT.
- Keep business logic out of Go HTTP handlers. Public templates are frontend code selected by `template_key` and `template_version`.
- Do not put media blobs in PostgreSQL.
- Run relevant tests and reindex after docs/contracts change.
- Never index secrets, `.env` files, credentials, private keys, production data, or application source code.
- Chroma failure may affect agent retrieval only, never invitation runtime or authorization.

## Completion Report

Report task ID, Chroma queries/context used, source files checked, application files changed, API contract changes, migrations, tests/results, and unresolved risks or conflicts. Do not claim alignment with documentation without retrieval or a targeted source check.
