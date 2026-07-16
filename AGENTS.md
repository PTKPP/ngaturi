# Agent Workflow

## Active Source of Truth

For frontend-first work, use this order:

1. `docs/FEATURES.md` — flow and business rules.
2. `docs/IMPLEMENTATION_PLAN.md` — active task order and acceptance.
3. `apps/frontend/src/domain/` — executable schemas and types after TASK-FE-001 creates them.
4. `contracts/dummy-data/` — agreed fixtures and cross-feature examples.
5. `docs/SYSTEM_DESIGN.md` — architecture and boundaries.
6. `docs/PRD.md` — product scope and actors.
7. `docs/DECISIONS.md` — accepted decisions.

`docs/DATABASE_DESIGN.md` remains authoritative only for completed authentication persistence. Archived OpenAPI files are history, not an active contract. ChromaDB is a derived index; Git wins on conflict.

## Starting a Task

1. Read this file and `docs/PROJECT_INDEX.md`.
2. Identify the active task, feature, affected frontend domain, fixture, and test.
3. Retrieve 4–6 focused Chroma chunks for business flow, task acceptance, domain/dummy contract, and architecture.
4. Open exact files only when retrieval is incomplete, conflicting, or an edit is imminent.

Do not retrieve or consult archived OpenAPI for new features.

## Implementation Rules

- Keep to the active task and mark unknown product choices as TBD.
- Frontend tasks must not change the Go backend or create APIs.
- Do not create backend invitation storage or endpoints until the frontend model and flow are approved.
- When a frontend domain schema changes, update its dummy fixtures and tests together.
- Runtime schemas produce TypeScript types; UI state never belongs in invitation domain data.
- Components and templates use repositories/props, never `localStorage` directly.
- Templates are build-time modules in an explicit registry; no `eval`, remote scripts, or arbitrary uploaded code.
- Preserve owner isolation. Admin cross-user invitation editing remains TBD.
- Run relevant tests and reindex after active docs or dummy contracts change.
- Never index application source, archives, `.env`, credentials, private keys, production data, or build output.
- Semua frontend wajib mobile-first dengan viewport dasar 360 px.
- Mulai styling dari mobile, kemudian tambahkan breakpoint untuk tablet dan desktop.
- Jangan membuat desktop layout terlebih dahulu lalu mengecilkannya.
- Halaman tidak boleh memiliki horizontal overflow pada viewport mobile.
- Tombol dan kontrol interaktif utama memiliki area sentuh minimal sekitar 44x44 px.
- Jangan membuat interaksi yang hanya dapat digunakan melalui hover.
- Form dan halaman pengaturan menggunakan satu kolom pada mobile secara default.
- Fixed header, bottom navigation, dan floating action harus memperhitungkan safe area.
- Halaman undangan publik harus nyaman dibaca dan digunakan dengan satu tangan.

## Completion Report

Report task ID, Chroma queries/context, source files checked, files changed, fixtures/schema impact, tests/results, and unresolved risks or conflicts. Do not claim alignment without retrieval or targeted source checks.
