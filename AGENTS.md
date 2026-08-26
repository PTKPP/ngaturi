# Agent Workflow

## Source of truth

1. `docs/PRODUCT.md` untuk aktor, flow, dan aturan bisnis.
2. `docs/ROADMAP.md` untuk pekerjaan aktif dan acceptance criteria.
3. `docs/ARCHITECTURE.md` untuk boundary dan desain teknis.
4. `apps/frontend/src/domain/` dan schema renderer untuk kontrak executable.
5. `supabase/migrations/` untuk database, constraint, grants, RLS, RPC, dan seed.
6. `contracts/dummy-data/` untuk fixture test/dev; Git mengalahkan Chroma bila berbeda.

Sebelum mengubah kode, periksa status/diff, baca file terkait, dan ambil 4–6 chunk Chroma bila servicenya tersedia. Jangan memakai OpenAPI arsip sebagai kontrak aktif.

## Aturan implementasi

- Next.js adalah UI dan application backend; Supabase menyediakan PostgreSQL, Auth, dan Storage. Jangan menambah Fastify atau fungsi Go. `apps/backend` adalah auth lama di luar flow undangan aktif.
- Mutation melewati Server Action/Route Handler, application service, authorization, repository, lalu Supabase. Komponen dan renderer tidak boleh mengakses Supabase, SQL, repository, atau `localStorage`.
- Domain hanya memuat field undangan stabil; setiap renderer mempunyai schema/default/editor/migrations dan registry eksplisit. Dilarang memakai `eval`, remote script, arbitrary CSS, schema runtime user, atau upload executable.
- Perubahan template hanya pada draft, mengonversi field kompatibel, dan meminta konfirmasi bila data dibuang. Tema tidak mengubah struktur atau konten.
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
