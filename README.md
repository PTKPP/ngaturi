# Ngaturi

Ngaturi adalah platform undangan digital mobile-first. Arsitektur aktif memakai Next.js 16 untuk UI dan application backend, serta Supabase untuk PostgreSQL, Auth, dan Storage. Kode Go di `apps/backend` dipertahankan sebagai implementasi auth lama, tetapi tidak termasuk jalur aktif undangan dan tidak dipanggil frontend.

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

`make app-build` dan konfigurasi PM2 aktif hanya membangun/menjalankan frontend Next.js. `make backend-build` tetap tersedia untuk inspeksi legacy, tetapi service Go tidak dijalankan oleh konfigurasi PM2 aktif.

## Status

- Renderer aktif: `minimal-white@1`, `elegant-gold@1`, dan `daztore-inv1@1`.
- Setiap renderer memiliki schema, default, editor, migrasi/konversi, manifest, dan komponen sendiri.
- Production memakai Supabase SSR cookie auth, repository server, Server Actions, RLS, RPC atomik, dan private Storage.
- Mock browser lama hanya adapter test/development eksplisit dan tidak dipasang pada root layout production.
- SQL di `supabase/migrations/` adalah sumber kebenaran database; registry TypeScript adalah sumber kebenaran renderer build-time.

Lihat `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, dan `docs/ROADMAP.md`.
