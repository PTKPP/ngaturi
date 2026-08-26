# Roadmap

## Current — production architecture verification

- Terapkan migrasi pada Supabase lokal, jalankan reset bersih, dan tambah database/RLS tests untuk quota race, duplicate slug, ownership, serta guest published-only.
- Hubungkan environment development, bootstrap admin secara terkontrol, dan smoke test login → route → create → edit → preview → publish → guest.
- Acceptance: lint/typecheck/unit/build lulus; registry/seed parity lulus; production tidak memakai persistence browser; draft/media private tidak bocor; editor/publik tidak overflow pada 360/390 px.

## Next

- Tambah UI upload/replace/delete memakai `InvitationMediaService`, `next/image`, alt text, dan job rekonsiliasi orphan.
- Tambah recovery/invite password, audit log, observability, serta E2E tests terhadap Supabase lokal.
- Putuskan TBD di `PRODUCT.md` sebelum custom domain, analytics, RSVP, atau editing lintas user.
