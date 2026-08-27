# Roadmap

## Current - Daztore production foundation

- Pertahankan `daztore-inv1@1` sebagai satu-satunya template untuk create production; dua template lama compatibility-only.
- Terapkan seluruh migrasi pada Supabase lokal dan uji forward migration dari invitation content v1.
- Smoke test create Daztore -> module editor -> preview -> publish -> guest, termasuk viewport 360/390 px.
- Implementasikan Phase 1 media owner dari `DAZTORE_PRODUCTION_READINESS.md` tanpa memindahkan persistence ke renderer.

## Next

- Tambah UI upload/replace/delete memakai application media service, `next/image`, alt text, dan job rekonsiliasi orphan.
- Tambah recovery/invite password, audit log, observability, serta E2E tests terhadap Supabase lokal.
- Tambah template kategori khitan/aqiqah/birthday/corporate sebelum kategori tersebut dapat dipilih untuk create production.
- Putuskan TBD di `PRODUCT.md` sebelum custom domain, analytics, RSVP transaksional, atau editing lintas user.
