# Architecture

## Boundary aktif

Next.js App Router menangani SSR, UI, Server Actions, Route Handlers, validasi, application services, dan repository adapters. Supabase menyediakan PostgreSQL, cookie-backed Auth SSR, dan private Storage. Implementasi Go lama diisolasi pada `legacy/go-auth-backend/` dan bukan dependency flow invitation aktif.

Mutation mengalir dari form/client component ke Server Action/Route Handler, authorization dan service di `application/`, interface `repositories/contracts/`, adapter `repositories/supabase/`, lalu RLS/RPC/constraint PostgreSQL. Renderer hanya menerima props tervalidasi. Mock hanya adapter test/development eksplisit.

## Auth dan authorization

`@supabase/ssr` membuat browser/server client; `proxy.ts` me-refresh cookie dan server memakai `auth.getClaims()` sebelum mengambil profile. Role berasal dari `profiles`, bukan browser metadata. Layout melakukan guard server; mutation mengulang pemeriksaan actor/role/ownership; RLS dan PostgreSQL function menegakkan boundary sama. Service-role client hanya pada module `server-only` untuk admin user management dan media publik terfilter.

## Data model dan JSONB

`profiles` mereferensikan `auth.users`; `invitation_routes` mempunyai slug unik dan owner; katalog kategori menyimpan kapabilitas; katalog template terikat kategori dan menyimpan komposisi modul/section; katalog tema menyimpan preset aman. `invitations` menyimpan owner/route/category/template/theme, override tema tervalidasi, content schema version, status/timestamps, dan `content JSONB NOT NULL`; `invitation_media` menyimpan kind/purpose, lifecycle original, fingerprint, metadata image/audio, dan `invitation_media_variants` hanya menyimpan thumbnail, medium, serta large untuk image.

Composite FK `(route_id, owner_id)` mencegah mismatch owner. Composite theme/template FK mencegah tema lintas template. Trigger route mengunci profile `FOR UPDATE` sebelum menghitung route sehingga klaim serentak tidak melampaui kuota; unique slug menyelesaikan race slug. RPC membuat route+invitation atomik. Tidak ada GIN content karena belum ada query JSONB.

## Kontrak Category -> Module -> Template -> Theme

Base invitation mengetahui metadata aplikasi stabil dan content object opaque. `invitation-categories/` menyatakan kapabilitas semua modul secara eksplisit. `invitation-modules/definitions/` memiliki schema/default/editor capability/migrasi semantik; core content mengelola envelope v2. Paket `templates/<key>/` memiliki manifest, renderer, section declaration, theme policy, dan preset. Generator build-time menghasilkan import statis; template mengonsumsi modul tanpa memiliki schema bisnis. `themes/` dan `invitation-design/` memvalidasi override, allowlist asset/font, dan fallback.

Load/render menerima content v1 melalui adapter in-memory. Mutation yang mengubah konten atau publish menulis v2. Switch template draft satu kategori memakai envelope yang sama, menambah default modul tujuan, dan tidak menghapus modul sumber. Composite foreign key memastikan invitation, category, dan template tetap cocok; trigger menolak perubahan kategori implisit.

## Public SSR dan Storage

Guest lookup memakai `SECURITY DEFINER get_published_invitation_by_slug` dengan `search_path=''`, input tervalidasi, return terkontrol, dan execute-only grant. Storage bucket private dan policy insert hanya menerima path original/variant yang sudah disiapkan metadata `uploading`. Path immutable memakai `{owner}/{invitation}/{media}/original|variants/{random}` dan signed token dibuat dengan `upsert=false`.

Browser menghitung SHA-256, membaca dimensi, menghasilkan WebP sekitar 400/900/1600 px tanpa upscale, dan melakukan direct signed upload original + variant. Application service hanya menerima metadata, memverifikasi actor/ownership/MIME/size/dimensi/alt, lalu repository menyiapkan signed slot. Finalisasi bergerak `uploading -> processing -> ready`; RPC mengunci row dan mencocokkan seluruh object Storage dengan path, MIME, ukuran, serta rencana dimensi sebelum `ready`.

Gambar memakai same-origin `/api/public-media/{uuid}?variant=large`. Custom music memakai `/api/public-audio/{uuid}`, yang hanya mengeluarkan redirect signed berumur pendek setelah membuktikan media `ready`, direferensikan invitation published, atau request berasal dari owner untuk preview. Audio MP3/M4A diinspeksi MIME, signature awal, size, duration, dan SHA-256 di browser; RPC memvalidasi ulang metadata dan Storage MIME/size sebelum `ready`. Delete memakai `delete_pending`; RPC mengunci invitation, memeriksa `updated_at`, dan menolak media yang masih direferensikan JSONB. Tidak ada delete Storage dari browser.

Media Lifecycle berjalan sebagai worker server terpisah melalui `MediaCleanupService`, kontrak repository, adapter Supabase Storage, dan RPC service-role sempit. Rekonsiliasi memeriksa referensi content terbaru sebelum memindahkan stale upload/processing, failed, atau ready orphan. Claim batch memakai `FOR UPDATE SKIP LOCKED`, claim token, worker ID, dan lease agar beberapa worker aman berjalan bersamaan. Deletion menghapus variant sebelum original; object yang sudah hilang bukan kegagalan. Retry dibatasi, memakai backoff dan reason, sedangkan metadata selesai menjadi tombstone `deleted`. View usage dan RPC metrics menjadi fondasi quota serta observability tanpa memberi browser akses cleanup.

Scheduler PM2 menjalankan service yang sama secara berurutan. Distributed run lock dengan expiry mencegah overlap lintas process/deployment; lock tidak menggantikan claim/lease per media. Crash setelah sebagian object terhapus aman karena Storage deletion idempotent dan claim dapat direbut kembali setelah lease. Setiap run menulis JSON log terstruktur dengan outcome, duration, reconciliation, dan metrics.

Hard quota image memakai reservation konservatif original plus ceiling tiga variant; audio mereservasi ukuran original karena tidak ditranscode. Trigger database memegang advisory transaction lock per owner dan mengubah counter owner/invitation secara atomik sebelum signed token dibuat. Reservation image berubah menjadi byte aktual setelah keempat object diverifikasi; audio tetap sebesar original. Semua status selain `deleted` dihitung dan transition cleanup ke tombstone melepaskan counter tepat sekali. `media_kind` serta `media_purpose` membedakan couple, gallery, dan invitation music tanpa memakai content JSON untuk accounting.

RSVP memakai `invitation_rsvps` terpisah dari JSONB content. Client memanggil Server Action, application service melakukan schema validation/normalization, repository server-only memakai service-role client, lalu RPC sempit memverifikasi invitation published dan owner account aktif. Anonymous/authenticated tidak mendapat grant tabel atau RPC. Unique `(invitation_id, client_submission_id)` dan request hash membuat retry/double-click idempotent serta menolak penggunaan ID yang sama untuk payload berbeda. Rate-limit row per source dan invitation diubah atomik dalam transaksi submission; source berasal dari HMAC IP/proxy identity dan user agent yang hanya dihitung server. Owner list/summary memakai RPC dengan `owner_id` eksplisit dan projection yang tidak memuat hash internal.

Wishes memakai boundary setara melalui `invitation_wishes`, tetapi mempunyai rate counter sendiri agar abuse pada ucapan tidak mengurangi kapasitas RSVP. Submission guest selalu `pending`. Public Server Action memanggil projection RPC service-role-only yang mensyaratkan invitation published, memfilter `approved`, tidak mengembalikan status/fingerprint, dan memakai cursor `(created_at,id)` dengan page size 10. Owner list dipisahkan per status dan dibatasi 50 row per halaman. Moderation RPC mengunci wish, memverifikasi owner aktif, dan mencocokkan `expected_updated_at`; keputusan concurrent yang stale ditolak sementara retry ke status yang sama idempotent.

Gift adalah capability module reusable, bukan service atau route khusus template. `gift@2` memiliki schema, default, editor, validation, dan migrator `gift@1 {text}` sendiri di `invitation-modules`. Module version berubah independen dari content envelope v2; parse/save/publish menaikkan `moduleVersions.gift` setelah migrasi tanpa SQL atau rewrite massal. Compatibility projection mengubah data terstruktur menjadi teks hanya untuk renderer template lama, sedangkan Daztore membaca struktur module secara langsung. Enablement tetap di `moduleState.gift`; data alamat fisik yang tersimpan tetapi disabled tidak masuk renderer public.

## Portability

Service bergantung pada interface async `ApplicationRepository`; detail RPC ada di adapter. Application backend dapat diekstrak ke Fastify kelak tanpa memindahkan renderer/UI, sementara constraint dan RLS tetap defense in depth.
