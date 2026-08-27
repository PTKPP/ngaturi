# Daztore production readiness

## Scope dan boundary

`daztore-inv1@1` adalah template pertama yang ditawarkan untuk create production. `minimal-white@1` dan `elegant-gold@1` tetap dapat merender undangan tersimpan, tetapi berstatus compatibility-only pada registry build-time.

Data konfigurasi section disimpan dalam invitation content JSONB v2. Save/publish berjalan melalui Server Action, `InvitationApplicationService`, `ApplicationRepository`, adapter Supabase, lalu RLS/constraint. Public renderer hanya menerima hasil RPC invitation published. Renderer template tidak mengakses repository, Supabase, storage, `localStorage`, atau script runtime eksternal.

## Audit 14 section

| Section | Schema/content | Editor | Renderer | Persistence dan authorization | Status production |
| --- | --- | --- | --- | --- | --- |
| Cover | `cover@1`: eyebrow dan title | Ada | Cover interaktif, recipient tersanitasi | JSONB owner-only; public hanya published | Baseline siap |
| Greeting | `greeting@1`: text | Ada | Ada | JSONB owner-only | Baseline siap |
| Couple | `couple-profile@1`: dua partner, parents, media reference | Ada, tetapi media ID masih manual | Ada, `next/image`, fallback terdaftar | JSONB + referensi `invitation_media`; RLS tersedia | Parsial: upload/replace belum terhubung |
| Quote | `quote@1`: text | Ada | Ada | JSONB owner-only | Baseline siap |
| Event | `event@1`: daftar acara berurutan | Ada | Ada, calendar URL dihitung | JSONB owner-only | Baseline siap; validasi timezone perlu diperketat |
| Countdown | `countdown@1`: label, target dari event | Ada | Ada dan cleanup timer teruji | JSONB owner-only | Baseline siap |
| Love Story | `love-story@1`: text | Ada | Ada | JSONB owner-only | Baseline siap |
| Gallery | `gallery@1`: media references | Ada sebagai daftar ID manual | Ada, optimized image dan lazy loading | Metadata/storage/RLS ada | Parsial: upload, reorder, alt text, delete/replace belum terhubung |
| Video | `video@1`: URL | Ada | YouTube/Vimeo HTTPS allowlist | URL di JSONB owner-only | Parsial: belum ada consent/privacy dan preview metadata |
| RSVP | Konfigurasi enablement saja | Toggle saja | Placeholder eksplisit | Belum ada response table/repository/action | Belum fungsional |
| Gift | `gift@1`: text bebas | Ada | Ada, copy dengan fallback | JSONB owner-only | Parsial: belum structured account/payment model |
| Wishes | Konfigurasi enablement saja | Toggle saja | Placeholder eksplisit | Belum ada message table/repository/action/moderation | Belum fungsional |
| Maps | Label modul + HTTPS `mapUrl` pada event | Ada | Link eksternal aman | JSONB owner-only | Baseline siap; provider/domain policy perlu difinalkan |
| Closing | `closing@1`: text | Ada | Ada | JSONB owner-only | Baseline siap |

Music bukan section visual ke-14, tetapi menjadi bagian experience shell. Preset audio lokal, autoplay setelah gesture, pause/resume, failure handling, dan no-restart rerender sudah teruji. Upload audio user belum tersedia.

## Gap lintas modul

1. **Media image**: `InvitationMediaService`, repository contract/adapter, ownership lookup, private bucket, metadata table, public same-origin route, MIME/size/alt validation, dan RLS sudah ada. Belum ada Server Action/UI upload, lifecycle replace, image dimensions/variant metadata, atau rekonsiliasi orphan.
2. **Audio user**: registry hanya mengizinkan track paket. Bucket/policy saat ini image-only; belum ada MIME/duration/quota/transcode/scan, media kind, atau resolver audio milik invitation.
3. **RSVP**: tidak ada guest command, application service, repository contract, table, idempotency, rate limit, spam protection, owner dashboard, atau aggregate attendance.
4. **Wishes**: tidak ada persistence guest, moderation/status, rate limit, abuse handling, atau pagination.
5. **Gift**: informasi masih teks bebas. Belum ada schema rekening/e-wallet terstruktur, masking, validation, atau keputusan eksplisit apakah transaksi pembayaran di luar scope.
6. **Gallery/video/maps**: gallery belum punya workflow media; video/maps memakai URL eksternal dan membutuhkan kebijakan provider, privacy, error telemetry, serta E2E mobile.
7. **Cleanup storage**: upload rollback menangani insert metadata yang gagal, tetapi delete object dan row tidak atomik. Belum ada outbox/cleanup queue, retry worker, orphan scan, retention, atau operational metrics.

## Urutan phase implementasi

### Phase 1 - owner media workflow

- Tambahkan repository contract media dan application service yang memverifikasi actor serta ownership invitation sebelum storage mutation.
- Tambahkan Server Actions untuk upload/replace/delete image, editor gallery/couple photo, alt text, ordering, dan optimized preview.
- Pertahankan path private `{owner}/{invitation}/{uuid}` dan same-origin public media IDs.

### Phase 2 - media lifecycle dan audio

- Tambahkan media kind, image dimensions, processing/cleanup status, quota, dan cleanup queue melalui migration forward-only.
- Implementasikan retry/orphan reconciliation sebelum membuka audio upload.
- Tambahkan audio MIME/duration/size validation serta resolver yang tetap membutuhkan user gesture.

### Phase 3 - RSVP dan wishes

- Pisahkan guest submissions dari invitation JSONB.
- Tambahkan command/schema, application services, repository adapters, tables, RLS atau narrow security-definer RPC, idempotency, rate limiting, moderation, dan owner read models.

### Phase 4 - structured gift dan external embeds

- Putuskan scope hadiah transaksional. Untuk informational-only, gunakan schema akun terstruktur dan masking.
- Finalisasi allowlist provider video/maps, consent/privacy copy, fallback, dan observability.

### Phase 5 - production evidence

- Jalankan Supabase local reset dan forward-migration test, HTTP smoke create/edit/preview/publish/public, media lifecycle test, guest interaction abuse tests, serta viewport 360/390 E2E.
- Baru setelah bukti ini tersedia, tandai RSVP/wishes/audio upload sebagai fungsional production.
