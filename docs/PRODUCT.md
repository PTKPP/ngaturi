# Product

## Aktor

- Guest tidak login dan hanya membaca undangan `published` melalui slug publik.
- User mengelola undangan miliknya, memilih route, template, dan tema, lalu preview/publish/unpublish.
- Admin mengelola user, status akun, kuota route, preassignment route, dan reassignment slug terkonfirmasi. Admin mengelola konten hanya bila menjadi owner; editing lintas user di luar scope.

## Route dan kuota

Slug dinormalisasi menjadi huruf kecil, angka, dan dash; unik global; dan tidak boleh memakai route aplikasi. Route mempunyai satu owner, tetap memakai kuota walau belum digunakan, dan terhubung ke maksimal satu invitation. User memilih preassigned route kosong atau mengklaim route baru dalam kuota. User tidak dapat mengganti slug. Reassignment admin hanya mengubah slug—owner, konten, template, tema, dan status tetap—tanpa redirect slug lama.

## Lifecycle undangan

Invitation dibuat `draft`, dapat dipreview owner, dan hanya tampil ke guest setelah `published`. Unpublish menghasilkan `inactive`; invitation dapat kembali ke draft untuk perubahan struktural. Published timestamp hanya ada ketika published. Create, load, edit, preview, publish, dan public render memvalidasi template key/version, content schema version, dan content.

## Kategori, modul, template, tema, dan konten

Kategori adalah tipe bisnis undangan dan sumber kapabilitas modul. Registry awal mencakup `wedding`, `khitan`, `aqiqah`, `birthday`, dan `corporate`, masing-masing dengan modul `required`, `default`, `optional`, atau `unsupported`. Template selalu terikat ke tepat satu versi kategori.

Modul memiliki data semantik reusable, schema, default, editor, dan migrasi sendiri. Template tidak mendefinisikan ulang data pasangan/acara/konten; template hanya menentukan urutan section dan renderer build-time. `daztore-inv1@1` adalah template create production untuk `wedding@1`; `minimal-white@1` dan `elegant-gold@1` dipertahankan sebagai compatibility renderer untuk data lama.

Tema adalah preset token visual tervalidasi untuk tepat satu versi template. Warna, font, ornament, background, dan border hanya dapat memakai token/ID allowlist; raw CSS/HTML/JS dan URL tema arbitrer ditolak. Tema tidak mengubah struktur, perilaku, konten, owner, route, atau publication.

Perubahan template hanya saat draft dan hanya dalam kategori yang sama. Modul kompatibel dipakai langsung, modul baru memperoleh default, dan data modul yang tidak dirender tetap tersimpan sebagai inactive data. Perubahan lintas kategori ditolak; migrasi kategori di masa depan harus berupa operasi versi eksplisit.

Konten schema v2 disimpan sebagai JSON modul dan status enablement. Adapter v1 membaca bentuk wedding lama tanpa rewrite destruktif; field lama tak dikenal dipertahankan di extension compatibility. Binary/base64, UI state, schema user, arbitrary CSS, remote script, serta kode upload bukan bagian JSONB invitation.

## Publication dan media

Guest lookup mengembalikan hanya invitation published. Storage private; media publik memakai ID terkendali yang membuktikan invitation published. Upload image dibatasi JPEG, PNG, WebP, atau AVIF maksimal 10 MB dan 40 megapiksel. Audio musik undangan menerima MP3 atau M4A/AAC browser-compatible maksimal 15 MB dan 15 menit tanpa transcoding. Browser mengunggah original serta variant image melalui signed upload path; file besar tidak melewati Next.js. Content hanya menyimpan media ID.

Lifecycle media adalah `uploading -> processing -> ready` atau `failed`. Audio memakai row, quota reservation, claim/lease, tombstone, dan cleanup yang sama dengan image, tetapi tidak membuat variant. Delete/replace menghapus referensi content terlebih dahulu, lalu menandai metadata `delete_pending` dengan optimistic invitation version check. Object tidak dihapus sinkron oleh editor. Worker server melakukan rekonsiliasi timeout dan orphan, mengklaim batch dengan lease, menghapus variant bila ada lalu original secara idempotent, dan mempertahankan metadata sebagai tombstone `deleted` untuk audit serta accounting.

Media `ready` yang belum direferensikan mula-mula ditandai sebagai temporary orphan. Worker hanya mengubahnya menjadi confirmed orphan setelah grace period dan pemeriksaan ulang terhadap content invitation terbaru. Kegagalan cleanup memakai retry terbatas dengan backoff dan failure reason; object Storage yang sudah hilang dianggap hasil idempotent.

Hard media quota dihitung dari reservation byte metadata, bukan content JSON. `uploading`, `processing`, `ready`, `failed`, dan `delete_pending` tetap aktif terhadap quota; hanya tombstone `deleted` yang melepaskan kapasitas. Default adalah 500 MiB per user, 200 MiB per invitation, dan 30 image gallery per invitation. Database mengunci counter owner secara atomik sebelum membuat metadata yang dapat memperoleh signed upload path.

RSVP guest disimpan pada tabel relasional khusus, bukan content invitation. Guest dapat mengirim nama 2–100 karakter, status hadir/tidak hadir, 1–10 tamu bila hadir, dan catatan opsional maksimal 500 karakter hanya untuk invitation published milik akun aktif. Server Action memvalidasi dan menormalisasi input; RPC service-role-only menegakkan idempotency UUID serta rate limit atomik 5 submission per sumber dan 100 per invitation setiap 10 menit. Anonymous dan authenticated browser tidak mempunyai akses tabel/RPC langsung. Owner memperoleh daftar terbaru dan summary hadir, tidak hadir, total tamu hadir, serta total respons melalui read model terotorisasi.

Wishes guest disimpan pada `invitation_wishes`, bukan content invitation. Guest dapat mengirim nama 2–100 karakter dan ucapan 2–1000 karakter hanya untuk invitation published milik akun aktif. Submission baru selalu `pending`; hanya `approved` yang masuk projection public ber-cursor maksimal 10 item per halaman. Server Action memakai fingerprint HMAC tepercaya, validasi/normalisasi server, UUID idempotency, dan rate limit atomik 5 submission per sumber serta 100 per invitation setiap 10 menit. Browser tidak mendapat akses tabel maupun RPC langsung. Owner dapat memfilter `pending`, `approved`, atau `rejected`, melihat summary per status, lalu approve/reject dengan optimistic concurrency.

## TBD

- Reset/invite password dan email provider produksi.
- Kebijakan override quota/admin UI dan alert delivery eksternal.
- Audit log admin serta redirect historis slug.
- Custom domain, analytics, hadiah transaksional, dan editing lintas user.
