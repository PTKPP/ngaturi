# Ngaturi

Ngaturi adalah platform undangan digital mobile-first. Arsitektur aktif memakai Next.js 16 untuk UI dan application backend, serta Supabase untuk PostgreSQL, Auth, dan Storage. Kode Go dan browser demo lama diisolasi di `legacy/` dan tidak termasuk jalur aktif atau build frontend.

## Menjalankan lokal

1. Salin nama variabel dari `.env.example` ke `apps/frontend/.env.local` dan isi URL serta publishable key proyek Supabase. `SUPABASE_SERVICE_ROLE_KEY` hanya boleh tersedia di server dan diperlukan untuk pembuatan user admin serta endpoint media publik terkendali.
2. Terapkan migrasi berurutan dari `supabase/migrations/` ke proyek lokal atau proyek yang memang Anda berwenang ubah.
3. Dari `apps/frontend`, jalankan `npm install` lalu `npm run dev`.

Jangan commit `.env.local` atau key. Jangan memakai service-role key pada variabel `NEXT_PUBLIC_*`.

## Perintah frontend

```bash
cd apps/frontend
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

Jika Supabase CLI dan Docker tersedia, jalankan `supabase db reset` dari root untuk memverifikasi migrasi pada database bersih. Tidak ada perintah deploy atau perubahan proyek remote yang dijalankan otomatis.

`make app-build` dan konfigurasi PM2 aktif menjalankan frontend Next.js serta scheduler `ngaturi-media-cleanup`. Worker berjalan berurutan setiap lima menit secara default dan memakai distributed run lock; set `MEDIA_CLEANUP_ALLOW_REMOTE=true` hanya pada environment production yang memang berwenang memakai project tersebut. `make legacy-backend-build` tersedia untuk verifikasi eksplisit arsip Go, tetapi service tersebut tidak dijalankan oleh konfigurasi PM2 aktif. Lihat `docs/MEDIA_OPERATIONS_RUNBOOK.md` untuk konfigurasi, alternatif cron, dan remediation.

## Status

- Arsitektur undangan memisahkan Category (tipe bisnis), Module (schema/default/editor/migrasi semantik), Template (komposisi/renderer), dan Theme (token visual aman).
- `daztore-inv1@1` adalah template create production. `minimal-white@1` dan `elegant-gold@1` tetap compatibility-only untuk undangan tersimpan.
- Template adalah paket self-contained di `apps/frontend/src/templates/<key>/`; registry import statis dihasilkan saat build.
- Adapter v1 tetap membaca undangan lama. Save konten/publish menormalisasi ke v2; ganti template satu kategori mempertahankan modul yang tidak aktif dan ganti kategori ditolak.
- Production memakai Supabase SSR cookie auth, repository server, Server Actions, RLS, RPC atomik, dan private Storage.
- Mock browser/localStorage lama berada di `legacy/frontend-browser-demo/` dan tidak termasuk source, test, atau bundle production.
- SQL di `supabase/migrations/` adalah sumber kebenaran database; registry TypeScript adalah sumber kebenaran kategori, modul, template, dan tema build-time.

Lihat `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, dan `docs/DAZTORE_PRODUCTION_READINESS.md`.
