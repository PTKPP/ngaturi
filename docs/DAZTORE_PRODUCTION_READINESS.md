# Daztore production readiness

## Scope dan boundary

`daztore-inv1@1` adalah template pertama yang ditawarkan untuk create production. `minimal-white@1` dan `elegant-gold@1` tetap dapat merender undangan tersimpan, tetapi berstatus compatibility-only pada registry build-time.

Data konfigurasi section disimpan dalam invitation content JSONB v2. Save/publish berjalan melalui Server Action, `InvitationApplicationService`, `ApplicationRepository`, adapter Supabase, lalu RLS/constraint. Public renderer hanya menerima hasil RPC invitation published. Renderer template tidak mengakses repository, Supabase, storage, `localStorage`, atau script runtime eksternal.

## Audit 14 section

| Section | Schema/content | Editor | Renderer | Persistence dan authorization | Status production |
| --- | --- | --- | --- | --- | --- |
| Cover | `cover@1`: eyebrow dan title | Ada | Cover interaktif, recipient tersanitasi | JSONB owner-only; public hanya published | Baseline siap |
| Greeting | `greeting@1`: text | Ada | Ada | JSONB owner-only | Baseline siap |
| Couple | `couple-profile@1`: dua partner, parents, media ID | Upload/replace/delete dan alt text | Ada, `next/image`, fallback terdaftar | JSONB media ID + metadata/variant owner-scoped | Image workflow siap; browser E2E lokal masih diperlukan |
| Quote | `quote@1`: text | Ada | Ada | JSONB owner-only | Baseline siap |
| Event | `event@1`: daftar acara berurutan | Ada | Ada, calendar URL dihitung | JSONB owner-only | Baseline siap; validasi timezone perlu diperketat |
| Countdown | `countdown@1`: label, target dari event | Ada | Ada dan cleanup timer teruji | JSONB owner-only | Baseline siap |
| Love Story | `love-story@1`: text | Ada | Ada | JSONB owner-only | Baseline siap |
| Gallery | `gallery@1`: ordered media IDs | Multiple upload, reorder, alt, replace, delete | Variant large + Next Image Optimization | Content owner-only; lifecycle media/RPC/RLS | Image workflow dan cleanup lifecycle siap; browser E2E lokal masih diperlukan |
| Video | `video@1`: URL | Ada | YouTube/Vimeo HTTPS allowlist | URL di JSONB owner-only | Parsial: belum ada consent/privacy dan preview metadata |
| RSVP | Konfigurasi enablement + response schema relasional | Toggle + owner summary/list | Form guest tanpa reload | Table khusus, Server Action, service/repository, RPC/RLS | Baseline production siap; browser E2E dan kalibrasi rate limit production tersisa |
| Gift | `gift@1`: text bebas | Ada | Ada, copy dengan fallback | JSONB owner-only | Parsial: belum structured account/payment model |
| Wishes | Konfigurasi enablement saja | Toggle saja | Placeholder eksplisit | Belum ada message table/repository/action/moderation | Belum fungsional |
| Maps | Label modul + HTTPS `mapUrl` pada event | Ada | Link eksternal aman | JSONB owner-only | Baseline siap; provider/domain policy perlu difinalkan |
| Closing | `closing@1`: text | Ada | Ada | JSONB owner-only | Baseline siap |

Music bukan section visual ke-14, tetapi menjadi bagian experience shell. Preset audio lokal dan custom MP3/M4A, signed direct upload, lifecycle/quota/cleanup reuse, autoplay setelah gesture, pause/resume, controlled delivery, failure handling, dan no-restart rerender sudah teruji terhadap Supabase lokal.

## Gap lintas modul

1. **Media image**: signed direct upload, browser WebP 400/900/1600, original preservation, SHA-256 deduplication, Couple/Gallery UI, alt/reorder/replace/delete, variant metadata, private paths, object verification, timeout reconciliation, orphan grace/recheck, retry terbatas, scheduler anti-overlap, hard quota, structured logs, metrics, dan usage counter tersedia. Belum ada external alert delivery atau verified server-side decode/scan.
2. **Audio user**: workflow MP3/M4A tersedia tanpa transcoding; gap tersisa adalah browser/codec smoke production dan verified server-side byte probe bila threat model membutuhkannya.
3. **RSVP**: guest command, application service, repository, table/RLS, service-role RPC, idempotency, rate limit, owner list, dan aggregate attendance tersedia. Gap tersisa adalah E2E browser, kalibrasi anti-spam production, pagination UI di atas 100 respons, dan kebijakan export/retention.
4. **Wishes**: tidak ada persistence guest, moderation/status, rate limit, abuse handling, atau pagination.
5. **Gift**: informasi masih teks bebas. Belum ada schema rekening/e-wallet terstruktur, masking, validation, atau keputusan eksplisit apakah transaksi pembayaran di luar scope.
6. **Gallery/video/maps**: gallery sudah memakai workflow media; video/maps memakai URL eksternal dan membutuhkan kebijakan provider, privacy, error telemetry, serta E2E mobile.
7. **Cleanup storage**: lifecycle worker sudah menangani stale upload/processing, `failed`, unreferenced `ready`, dan `delete_pending` dengan reference recheck, grace period, bounded retry, distributed run lock, PM2 scheduler, tombstone, hard quota counters, structured logs, metrics, dan remediation runbook. Gap tersisa adalah external alert delivery dan kalibrasi quota production.

## Urutan phase implementasi

### Phase 1 - owner media workflow

- Selesai pada migration `202608270002_daztore_image_media_workflow.sql`: signed direct upload, tiga variant WebP, Couple/Gallery editor, alt/reorder/replace/delete, dan controlled delivery.
- Bukti Supabase local reset serta browser E2E tetap diperlukan sebelum rollout production.

### Phase 2 - media lifecycle

- Selesai pada migration `202608270003_image_media_lifecycle.sql`: reconciliation, orphan grace/recheck, concurrent claim, bounded retry, idempotent Storage cleanup, tombstone, metrics, dan usage view.
- Scheduler PM2, structured logging, runbook, dan hard quota selesai pada migration `202608280001_media_operations_hard_quota.sql`. Tambahkan external alert delivery dan kalibrasi nilai quota dari metrics production. Verifikasi fingerprint/dimensi output secara server-side bila threat model membutuhkan proteksi dari owner client yang dimodifikasi.

### Phase 3 - user audio

- Selesai: audio MIME/signature/duration/size validation, quota/lifecycle/cleanup reuse, custom source, dan controlled resolver yang tetap membutuhkan user gesture.

### Phase 4 - RSVP dan wishes

- RSVP selesai dan terpisah dari invitation JSONB: command/schema, service/repository, table/RLS, narrow service-role RPC, idempotency, rate limiting, serta owner read model tersedia.
- Wishes masih perlu persistence, moderation, pagination, dan abuse handling sendiri; jangan memakai tabel atau rate-limit identity RSVP sebagai model data Wishes.

### Phase 5 - structured gift dan external embeds

- Putuskan scope hadiah transaksional. Untuk informational-only, gunakan schema akun terstruktur dan masking.
- Finalisasi allowlist provider video/maps, consent/privacy copy, fallback, dan observability.

### Phase 6 - production evidence

- Jalankan Supabase local reset dan forward-migration test, HTTP smoke create/edit/preview/publish/public, media lifecycle test, guest interaction abuse tests, serta viewport 360/390 E2E.
- Baru setelah bukti ini tersedia, tandai RSVP/wishes/audio upload sebagai fungsional production.
