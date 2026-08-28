# Media Operations runbook

## Deployment dan konfigurasi

Deployment Ngaturi saat ini memakai PM2, sehingga pilihan utama adalah app `ngaturi-media-cleanup` pada `ecosystem.config.cjs`. App menjalankan scheduler tunggal dan menunggu run selesai sebelum menghitung interval berikutnya. Jalankan melalui flow yang sama dengan frontend:

```bash
make pm2-start
pm2 logs ngaturi-media-cleanup
```

Default interval adalah 300000 ms (5 menit). Environment lengkap tersedia di `.env.example`. Untuk Supabase non-lokal, operator wajib menetapkan `MEDIA_CLEANUP_ALLOW_REMOTE=true`; service-role key tetap server-only. `MEDIA_CLEANUP_RUN_LOCK_LEASE` harus minimal sepanjang claim lease dan default 30 menit.

Cron hanya alternatif bila PM2 scheduler tidak digunakan. Gunakan one-shot command dan host lock; distributed database lock tetap menjadi defense in depth:

```cron
*/5 * * * * cd /srv/ngaturi/apps/frontend && flock -n /tmp/ngaturi-media-cleanup.lock npm run media:cleanup >> /var/log/ngaturi-media-cleanup.log 2>&1
```

Jangan menjalankan PM2 scheduler dan cron bersamaan. Jika tidak sengaja terjadi, run kedua menghasilkan event `media_cleanup_run_skipped_overlap` dan keluar sukses tanpa mengambil batch.

## Logs dan indikator

Setiap baris stdout/stderr adalah JSON. Event utama: `media_cleanup_run_started`, `media_cleanup_run_completed`, `media_cleanup_run_skipped_overlap`, dan `media_cleanup_run_failed`. Completion memuat `claimed`, `deleted`, `failed`, `retried`, `retryExhausted`, `orphanDetected`, `durationMs`, hasil reconciliation, dan snapshot metrics.

Alarm ringan yang disarankan:

- exit code one-shot non-zero atau event failed/degraded berulang tiga run;
- `retryExhausted > 0`;
- status `delete_pending` terus bertambah sementara `deleted` tidak bertambah;
- temporary/confirmed orphan melonjak di luar pola upload normal;
- run duration mendekati run-lock lease.

## Remediation

### Worker gagal berulang

Periksa event `media_cleanup_run_failed`, konektivitas Supabase, izin service role, dan health Storage. Jangan mengubah status media manual. Setelah dependency pulih, jalankan satu one-shot `npm run media:cleanup`; retry dan missing-object handling bersifat idempotent.

### Stuck claim

Bandingkan `cleanup_claimed_at` dengan `MEDIA_CLEANUP_LEASE_TIMEOUT`. Worker yang crash tidak perlu di-unlock manual: claim menjadi eligible setelah lease. Jika claim tidak bergerak setelah dua lease, periksa apakah scheduler masih hidup dan apakah `attempt_count` sudah mencapai maksimum sebelum mempertimbangkan koreksi SQL terkontrol.

### DELETE_PENDING menumpuk

Periksa `retryExhausted`, `cleanup_failure_reason`, `last_attempt_at`, dan Storage health. Naikkan batch/concurrency hanya setelah memastikan latency Storage stabil. Jangan mengubah row menjadi `deleted`; hanya completion RPC boleh melepas hard quota.

### Orphan meningkat

Temporary orphan selama grace period adalah normal. Lonjakan confirmed orphan mengindikasikan editor gagal menyimpan reference atau upload ditinggalkan. Periksa log save invitation dan upload sebelum mengubah grace period. Worker selalu melakukan reference recheck terakhir.

### Storage dan database tidak sinkron

Object yang hilang untuk `delete_pending` aman dan akan difinalisasi sebagai tombstone. Object hilang untuk `ready`, atau object tersisa setelah metadata `deleted`, memerlukan rekonsiliasi terkontrol: identifikasi `media_id`, invitation owner, reference content terbaru, dan seluruh paths; simpan bukti sebelum tindakan. Jangan menghapus object `ready` hanya berdasarkan umur dan jangan membuat reference baru ke media non-ready.
