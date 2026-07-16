# Ngaturi — Digital Invitation Platform

Ngaturi follows a frontend-first workflow. TASK-FE-001 provides a standalone Next.js prototype backed by validated dummy JSON and versioned browser storage; backend invitation work remains deferred until the frontend flow and data contract are reviewed.

The completed Go authentication service and PostgreSQL migration remain in `apps/backend`, but frontend integration is deferred. The former OpenAPI contract is preserved under `contracts/archive/` as TASK-002 history and is not an active source of truth.

## Knowledge Tooling

1. Copy `.env.example` to `.env` and configure local tooling.
2. Run `make knowledge-up`.
3. Install `tools/knowledge/requirements.txt`.
4. Run `make knowledge-index` and `make knowledge-health`.

Read `AGENTS.md`, then `docs/PROJECT_INDEX.md`, before starting a task. Do not begin backend invitation integration until a separate task is approved.

## Frontend Prototype

Requires Node.js 20.9 or newer. The verified development toolchain uses Node.js 24 LTS.

```bash
cd apps/frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Demo accounts are `admin@demo.local` / `admin-demo` and `user@demo.local` / `user-demo`. These credentials and the client-side route guards are development conveniences, not production authentication or authorization.
