# Roadmap

## Current - Daztore production foundation

- Pertahankan `daztore-inv1@1` sebagai satu-satunya template untuk create production; dua template lama compatibility-only.
- Pertahankan reset migration Supabase lokal dan forward migration dari invitation content v1 sebagai regression gate.
- Smoke test create Daztore -> module editor -> preview -> publish -> guest, termasuk viewport 360/390 px.
- Image workflow dan Media Lifecycle sudah tervalidasi terhadap Supabase lokal; lengkapi smoke test Couple/Gallery dengan browser nyata pada viewport 360/390 px.
- Scheduler Media Operations dan hard quota atomik sudah tersedia; operasionalkan alert delivery dan review nilai quota berdasarkan pemakaian production.
- User Audio untuk `daztore-inv1` sudah memakai signed direct upload, lifecycle/quota/cleanup media yang sama, controlled private delivery, dan music controller Cover yang sudah ada; lengkapi smoke test MP3/M4A pada Safari iOS, Chrome Android, dan desktop browser production target.

## Next

- Implementasikan persistence dan authorization RSVP sebagai fase berikutnya tanpa mencampurkannya ke lifecycle media.
- Tambah alert delivery ringan untuk retry exhausted, backlog, dan drift Storage/DB berdasarkan runbook Media Operations.
- Tambah recovery/invite password, audit log, observability, serta E2E tests terhadap Supabase lokal.
- Tambah template kategori khitan/aqiqah/birthday/corporate sebelum kategori tersebut dapat dipilih untuk create production.
- Putuskan TBD di `PRODUCT.md` sebelum custom domain, analytics, RSVP transaksional, atau editing lintas user.
