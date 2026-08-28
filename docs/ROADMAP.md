# Roadmap

## Current - Daztore production foundation

- Pertahankan `daztore-inv1@1` sebagai satu-satunya template untuk create production; dua template lama compatibility-only.
- Pertahankan reset migration Supabase lokal dan forward migration dari invitation content v1 sebagai regression gate.
- Smoke test create Daztore -> module editor -> preview -> publish -> guest, termasuk viewport 360/390 px.
- Image workflow dan Media Lifecycle sudah tervalidasi terhadap Supabase lokal; lengkapi smoke test Couple/Gallery dengan browser nyata pada viewport 360/390 px.
- Scheduler Media Operations dan hard quota atomik sudah tersedia; operasionalkan alert delivery dan review nilai quota berdasarkan pemakaian production.
- User Audio untuk `daztore-inv1` sudah memakai signed direct upload, lifecycle/quota/cleanup media yang sama, controlled private delivery, dan music controller Cover yang sudah ada; lengkapi smoke test MP3/M4A pada Safari iOS, Chrome Android, dan desktop browser production target.
- RSVP `daztore-inv1` sudah memakai tabel khusus, Server Action, service/repository, RPC service-role-only, idempotency, rate limit atomik, form guest tanpa reload, dan owner summary; kalibrasi rate limit dari metrics production dan tambahkan pagination UI bila respons melebihi 100.
- Wishes `daztore-inv1` sudah memakai tabel khusus, pending-by-default moderation, Server Action/service/repository, RPC service-role-only, idempotency, rate limit atomik, approved-only cursor pagination, serta dashboard owner berfilter dan optimistic concurrency.
- Gift `daztore-inv1` sudah memakai `gift@2` terstruktur untuk bank, e-wallet, dan alamat hadiah fisik; editor reusable mendukung add/remove/reorder, masking/reveal/copy, validation, serta compatibility text `gift@1`.
- Video/Maps sudah memakai `video@2`, `event@2`, dan `maps@2` dengan provider allowlist, canonical ID/URL, migration legacy inert, explicit embed consent, fallback link, dan telemetry ringan.

## Next

- Full browser E2E Video/Maps pada viewport 360/390 px dan browser production target, termasuk kondisi provider diblokir jaringan/CSP.
- Tambah alert delivery ringan untuk retry exhausted, backlog, dan drift Storage/DB berdasarkan runbook Media Operations.
- Tambah recovery/invite password, audit log, observability, serta E2E tests terhadap Supabase lokal.
- Tambah template kategori khitan/aqiqah/birthday/corporate sebelum kategori tersebut dapat dipilih untuk create production.
- Putuskan TBD di `PRODUCT.md` sebelum custom domain, analytics, RSVP transaksional, atau editing lintas user.
