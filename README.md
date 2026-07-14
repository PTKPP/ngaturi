# Ngaturi — Digital Invitation Platform

Fondasi API-first untuk platform undangan digital. Repository ini berisi kontrak, dokumentasi, knowledge base ChromaDB, serta backend autentikasi awal untuk mendukung pekerjaan frontend dan backend secara paralel.

Backend Go untuk autentikasi pemilik berada di `apps/backend`. Terapkan migration `apps/backend/migrations/000001_auth.up.sql` pada PostgreSQL, set `DATABASE_URL` dan `JWT_SECRET`, lalu jalankan `go run ./cmd/api` dari direktori tersebut. Endpoint yang tersedia adalah register, login, refresh token, dan logout sesuai kontrak OpenAPI.

## Mulai

1. Salin `.env.example` menjadi `.env` dan sesuaikan jika diperlukan.
2. Jalankan `make knowledge-up`.
3. Instal dependensi Python: `python -m pip install -r tools/knowledge/requirements.txt`.
4. Jalankan `make knowledge-index`, lalu `make knowledge-health`.

Lihat `AGENTS.md` untuk workflow agent dan `docs/PROJECT_INDEX.md` untuk peta source of truth.
