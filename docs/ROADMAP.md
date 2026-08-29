# Roadmap

## Current - Wedding Default production foundation

- Pertahankan `wedding-default@1` sebagai satu-satunya template untuk create production; dua template lama compatibility-only.
- Pertahankan reset migration Supabase lokal dan forward migration dari invitation content v1 sebagai regression gate.
- Full browser E2E create Wedding Default -> 14 module editor -> media/Gift/Video/Maps -> preview -> publish -> RSVP/Wishes/moderation lulus pada Playwright Chromium 360x800, 390x844, dan 1440x900.
- Image workflow dan Media Lifecycle sudah tervalidasi terhadap Supabase lokal dan browser nyata, termasuk Couple/Gallery upload, replace, delete, reorder, retry, serta failure state.
- Scheduler Media Operations dan hard quota atomik sudah tersedia; operasionalkan alert delivery dan review nilai quota berdasarkan pemakaian production.
- User Audio untuk `wedding-default` sudah memakai signed direct upload, lifecycle/quota/cleanup media yang sama, controlled private delivery, dan music controller Cover yang sudah ada; lengkapi smoke test MP3/M4A pada Safari iOS, Chrome Android, dan desktop browser production target.
- RSVP `wedding-default` sudah memakai tabel khusus, Server Action, service/repository, RPC service-role-only, idempotency, rate limit atomik, form guest tanpa reload, dan owner summary; kalibrasi rate limit dari metrics production dan tambahkan pagination UI bila respons melebihi 100.
- Wishes `wedding-default` sudah memakai tabel khusus, pending-by-default moderation, Server Action/service/repository, RPC service-role-only, idempotency, rate limit atomik, approved-only cursor pagination, serta dashboard owner berfilter dan optimistic concurrency.
- Gift `wedding-default` sudah memakai `gift@2` terstruktur untuk bank, e-wallet, dan alamat hadiah fisik; editor reusable mendukung add/remove/reorder, masking/reveal/copy, validation, serta compatibility text `gift@1`.
- Video/Maps sudah memakai `video@2`, `event@2`, dan `maps@2` dengan provider allowlist, canonical ID/URL, migration legacy inert, explicit embed consent, fallback link, dan telemetry ringan.

## Next

- Tambah smoke lintas-engine/device fisik untuk Safari iOS, Chrome Android, serta kebijakan codec audio sebelum memperluas target browser resmi.
- Tambah alert delivery ringan untuk retry exhausted, backlog, dan drift Storage/DB berdasarkan runbook Media Operations.
- Tambah recovery/invite password, audit log, observability, serta E2E tests terhadap Supabase lokal.
- Tambah template kategori khitan/aqiqah/birthday/corporate sebelum kategori tersebut dapat dipilih untuk create production.
- Putuskan TBD di `PRODUCT.md` sebelum custom domain, analytics, RSVP transaksional, atau editing lintas user.
