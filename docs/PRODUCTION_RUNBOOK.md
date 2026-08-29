# Ngaturi production runbook

## Release gate

Rilis memakai artifact immutable dari commit yang telah lulus reset Supabase lokal, DB lint, seluruh integration test, Playwright pada 360x800, 390x844, dan 1440x900, lint, typecheck, full test, build, `templates:check`, serta `git diff --check`. Jangan menjalankan migration dari worktree yang belum melewati gate tersebut.

Environment production wajib lolos `npm run env:check:production` di `apps/frontend`. Pemeriksaan berhenti dengan exit code non-zero tanpa mencetak secret bila URL bukan HTTPS, key/secret kosong atau tidak aman, trusted proxy belum eksplisit, atau worker remote belum diakui. Nilai wajib:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, dan server-only `SUPABASE_SERVICE_ROLE_KEY`;
- `NEXT_PUBLIC_SITE_URL` berupa origin HTTPS tanpa path;
- `GUEST_SUBMISSION_RATE_LIMIT_SECRET` acak minimal 32 karakter dan berbeda dari service-role key;
- `NGATURI_TRUSTED_PROXY_HOPS` sesuai jumlah proxy tepercaya;
- `MEDIA_CLEANUP_ALLOW_REMOTE=true` dan konfigurasi lifecycle/quota pada `.env.example`.

Frontend tidak boleh dapat diakses langsung dari internet. Load balancer/reverse proxy harus menghapus header forwarding dari client lalu membentuk atau menambahkan `X-Forwarded-For`. Aplikasi mengambil alamat dari sisi kanan chain berdasarkan `NGATURI_TRUSTED_PROXY_HOPS`; `X-Real-IP` dan elemen kiri yang dapat dipalsukan tidak dipercaya. Salah konfigurasi menghasilkan fingerprint `unavailable`, sehingga rate limit menjadi konservatif dan harus memicu pemeriksaan operator.

## Build, migration, dan PM2

1. Ambil backup sesuai bagian berikut dan catat versi aplikasi serta migration terakhir.
2. Build frontend dengan `make frontend-build` atau `npm run build` di `apps/frontend`.
3. Review daftar migration lokal dan apply forward-only migration ke environment target melalui pipeline/operator Supabase yang telah diautentikasi. Jangan memakai reset pada production.
4. Jalankan smoke query katalog, grants/RLS, private bucket `invitation-media`, dan RPC media/RSVP/Wishes sebelum membuka traffic.
5. Jalankan `make pm2-start`. `ngaturi-frontend` memakai `start:production`, sedangkan `ngaturi-media-cleanup` memakai scheduler lifecycle yang sama dengan integration test.
6. Verifikasi `GET /api/health` bernilai 200 dan `GET /api/readiness` bernilai 200. Readiness memeriksa katalog Wedding Default dan private media bucket; response 503 menahan traffic.

Gunakan satu instance scheduler PM2. Database run lock dan claim lease mencegah overlap/corruption bila proses restart atau operator tanpa sengaja memulai runner kedua. Detail metrics dan remediation worker ada di `docs/MEDIA_OPERATIONS_RUNBOOK.md`.

## Security dan data boundary

Anon browser tidak memiliki CRUD tabel RSVP/Wishes/media. Semua mutation melewati Server Action, application service, repository, dan RPC service-role yang sempit. Regression local-Supabase menjadi gate untuk grants, RLS, published-only reads, ownership, private Storage, signed upload, quota, lifecycle, dan moderation.

Header global menolak framing aplikasi, object embed, MIME sniffing, camera/microphone/geolocation, dan membatasi `frame-src` ke YouTube no-cookie, Vimeo, serta Google Maps. CSP sengaja belum menetapkan `script-src` karena Next belum memakai nonce; ini adalah gap hardening lanjutan, bukan izin untuk menambah script pihak ketiga.

Default hard quota adalah 500 MiB media aktif per user, 200 MiB per invitation, 30 image gallery, 10 MiB per image, dan 15 MiB per audio. `UPLOADING`, `PROCESSING`, `READY`, `FAILED`, serta `DELETE_PENDING` menahan reservation; hanya tombstone `DELETED` atau cascade deletion tervalidasi yang melepas quota.

## Backup dan restore

Gunakan backup PostgreSQL/PITR dari provider Supabase sebagai sumber utama dan ekspor terjadwal yang mencakup schema, data, auth dependency, serta daftar object bucket private. Simpan manifest path, size, checksum, dan timestamp Storage bersama snapshot database agar pasangan DB/object dapat direkonsiliasi. Secret dan signed URL tidak masuk backup aplikasi.

Minimal setiap kuartal, restore backup ke project staging terisolasi, apply migration forward berikutnya, lalu jalankan smoke owner/public/media/RSVP/Wishes. Catat RPO/RTO aktual, row count penting, object sample checksum, dan hasil RLS. Backup yang belum pernah direstore bukan bukti recovery.

## Observability dan insiden

PM2 mengumpulkan stdout/stderr. Worker menghasilkan JSON terstruktur untuk started/completed/skipped/failed beserta claimed, deleted, failed, retried, orphan, dan duration. Readiness failure juga berupa JSON tanpa secret. Forward log ke sink terpusat dan alarmkan readiness 503, restart loop, retry exhausted, backlog `DELETE_PENDING`, confirmed orphan, serta durasi mendekati lease.

Untuk insiden public content, unpublish invitation terkait lebih dahulu. Untuk masalah aplikasi, hentikan traffic ke artifact baru dan jalankan artifact aplikasi sebelumnya yang kompatibel dengan schema terbaru. Migration database tidak di-down; siapkan migration koreksi forward-only. Jika release menulis kontrak data baru yang tidak dipahami artifact lama, gunakan maintenance/readiness 503 sampai artifact koreksi tersedia. Jangan menghapus object `READY` atau memodifikasi lifecycle status manual tanpa reference check dan bukti audit.
