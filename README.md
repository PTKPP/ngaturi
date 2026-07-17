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

The explicit template registry includes `elegant-gold@1`, `minimal-white@1`, and the local React port `daztore-inv1@1`; every theme consumes the same validated invitation contract.

For mobile verification over LAN, bind the dev server to `0.0.0.0` and allow only the machine address in use, for example: `NGATURI_ALLOWED_DEV_ORIGINS=192.168.1.10 npm run dev -- --hostname 0.0.0.0`.

## Menjalankan Frontend dan Backend dengan PM2

PM2 menjalankan frontend dan backend sebagai proses terpisah; frontend prototype tetap memakai dummy data browser dan belum memanggil backend. Siapkan dependency frontend, PostgreSQL beserta migration authentication, `.env` dengan `DATABASE_URL` dan `JWT_SECRET`, serta PM2 pada host:

```bash
cd apps/frontend && npm install
cd ../..
npm install --global pm2
test -f .env || cp .env.example .env # lalu ganti nilai development secret
make pm2-start
```

`make pm2-start` membangun Next.js production output dan binary Go lokal di `.runtime/`, lalu menjalankan `ngaturi-frontend` pada `FRONTEND_HOST:FRONTEND_PORT` (default `0.0.0.0:3000`) dan `ngaturi-backend` pada `HTTP_ADDR` (default `:8080`). PostgreSQL dan migration tidak dikelola oleh PM2.

```bash
make pm2-status
make pm2-logs
make pm2-reload
make pm2-stop
make pm2-delete
```

Setelah proses tervalidasi pada host deployment, gunakan `pm2 save`; konfigurasi startup service PM2 tetap mengikuti init system host tersebut.
