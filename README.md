# Ngaturi — Digital Invitation Platform

Ngaturi now follows a frontend-first workflow. The next active slice is a standalone Next.js prototype backed by dummy JSON and versioned browser storage; backend invitation work resumes only after its flow and data contract are approved.

The completed Go authentication service and PostgreSQL migration remain in `apps/backend`, but frontend integration is deferred. The former OpenAPI contract is preserved under `contracts/archive/` as TASK-002 history and is not an active source of truth.

## Knowledge Tooling

1. Copy `.env.example` to `.env` and configure local tooling.
2. Run `make knowledge-up`.
3. Install `tools/knowledge/requirements.txt`.
4. Run `make knowledge-index` and `make knowledge-health`.

Read `AGENTS.md`, then `docs/PROJECT_INDEX.md`, before starting a task. The next ready task is TASK-FE-001; this rebaseline does not implement it.
