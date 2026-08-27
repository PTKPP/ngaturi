# Agent Workflow

## Source of truth

1. `docs/PRODUCT.md` untuk aktor, flow, dan aturan bisnis.
2. `docs/ROADMAP.md` untuk pekerjaan aktif dan acceptance criteria.
3. `docs/ARCHITECTURE.md` untuk boundary dan desain teknis.
4. `apps/frontend/src/domain/`, `invitation-categories/`, `invitation-modules/`, `templates/`, dan `themes/` untuk kontrak executable.
5. `supabase/migrations/` untuk database, constraint, grants, RLS, RPC, dan seed.
6. `contracts/dummy-data/` untuk fixture test/dev; Git mengalahkan Chroma bila berbeda.

Sebelum mengubah kode, periksa status/diff, baca file terkait, dan ambil 4–6 chunk Chroma bila servicenya tersedia. Jangan memakai OpenAPI arsip sebagai kontrak aktif.

## Aturan implementasi

- Next.js adalah UI dan application backend; Supabase menyediakan PostgreSQL, Auth, dan Storage. Jangan menambah Fastify atau fungsi Go. `legacy/go-auth-backend` adalah arsip di luar flow undangan aktif.
- Mutation melewati Server Action/Route Handler, application service, authorization, repository, lalu Supabase. Komponen dan renderer tidak boleh mengakses Supabase, SQL, repository, atau `localStorage`.
- Domain hanya memuat metadata undangan stabil. Kategori memiliki kapabilitas; modul memiliki schema/default/editor/migrasi; template memiliki komposisi/renderer; tema hanya preset token visual tervalidasi. Dilarang memakai `eval`, remote script, arbitrary CSS, schema runtime user, atau upload executable.
- Perubahan template hanya pada draft dan kategori yang sama. Pertahankan data modul yang tidak dirender; jangan membuang data diam-diam. Tema tidak mengubah struktur atau konten.
- Perubahan schema harus bersama fixture dan test. Pertahankan isolasi owner; admin tidak mengedit konten undangan user lain.
- SQL migration adalah satu-satunya cara mengubah schema. Ownership, uniqueness, quota, dan publication harus diperkuat constraint/RLS.

## Security

- Jangan mengekspos `SUPABASE_SERVICE_ROLE_KEY` ke browser, log, fixture, atau `NEXT_PUBLIC_*`.
- Jangan percaya role, owner, quota, status akun, atau route dari browser. Otorisasi ulang setiap mutation.
- Guest hanya memperoleh undangan published melalui fungsi sempit; tidak ada anonymous SELECT draft.
- Storage private dengan path `{owner_uuid}/{invitation_uuid}/{random_uuid}.ext`; MIME/ukuran divalidasi server. Media publik hanya melalui ID terkendali untuk invitation published.
- Pertahankan Next Image Optimization; jangan tambah global `<img>`, wildcard host, URL proxy arbitrer, atau `unoptimized`.

## Mobile-first dan verifikasi

- Mulai styling pada 360 px; tidak ada horizontal overflow pada 360/390 px. Kontrol utama sekitar 44x44 px, tanpa hover-only; form satu kolom di mobile dan fixed UI menghormati safe area.
- Jalankan lint, typecheck, seluruh test, build, pencarian referensi stale, `git diff --check`, dan database reset/test bila Supabase CLI tersedia. Reindex Chroma hanya untuk docs/fixture aman bila servicenya tersedia.
- Laporan menyebut task, query/konteks Chroma atau kegagalannya, file diperiksa/diubah, dampak schema/fixture, hasil test, dan risiko/TBD.

## Aturan menambah template

Template baru wajib memenuhi seluruh aturan berikut:

1. Gunakan key global yang unik, stabil, dan version eksplisit.
2. Ikat ke tepat satu category/version melalui typed manifest.
3. Deklarasikan supported, required, optional, dan default-enabled modules.
4. Gunakan hanya modul yang diizinkan kategori dan sertakan semua modul wajib kategori.
5. Reuse schema, default, editor, validation, dan migration milik modul; jangan mendefinisikan ulang schema semantik di template.
6. Deklarasikan section terurut dan sediakan renderer template-owned untuk setiap section.
7. Sediakan theme schema/version dan minimal satu preset default yang valid.
8. Referensikan hanya font, ornament, background, pattern, dan asset yang terdaftar; raw CSS, HTML, JavaScript, serta URL asset arbitrer dilarang.
9. Pertahankan aksesibilitas, reduced motion, private-media path terkendali, dan `next/image`.
10. Buktikan mobile 360 px dan 390 px tanpa horizontal overflow.
11. Saat kontrak konten berubah, tambahkan compatibility migration yang mempertahankan data undangan lama.
12. Ekspor `templateModule` dari paket agar generator membuat registry import statis; daftarkan katalog database melalui migration forward-only baru.
13. Pertahankan parity frontend/database dan tambahkan test registry, renderer, schema, theme, migration, switching, preservation, serta mobile.
14. Jalankan lint, typecheck, seluruh test, build, audit dependency, dan `git diff --check` sebelum selesai.
