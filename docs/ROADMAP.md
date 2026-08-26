# Roadmap

## Current - verifikasi arsitektur Category/Module/Template/Theme

- Terapkan seluruh migrasi pada Supabase lokal dan uji forward migration dari database yang sudah memiliki invitation content v1.
- Smoke test category filter -> template/theme filter -> create -> module editor -> same-category template switch -> preview -> publish -> guest.
- Acceptance: registry kategori/modul/template/tema dan katalog SQL parity; adapter v1 dan v2 render setara; inactive module data tidak hilang; cross-category switch ditolak; override tema unsafe fallback; lint/typecheck/unit/build lulus; production tidak memakai persistence browser; editor/publik tidak overflow pada 360/390 px.

## Next

- Tambah UI upload/replace/delete memakai `InvitationMediaService`, `next/image`, alt text, dan job rekonsiliasi orphan.
- Tambah recovery/invite password, audit log, observability, serta E2E tests terhadap Supabase lokal.
- Tambah template kategori khitan/aqiqah/birthday/corporate sebelum kategori tersebut dapat dipilih untuk create production.
- Putuskan TBD di `PRODUCT.md` sebelum custom domain, analytics, RSVP transaksional, atau editing lintas user.
