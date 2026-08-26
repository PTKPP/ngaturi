# Product

## Aktor

- Guest tidak login dan hanya membaca undangan `published` melalui slug publik.
- User mengelola undangan miliknya, memilih route, template, dan tema, lalu preview/publish/unpublish.
- Admin mengelola user, status akun, kuota route, preassignment route, dan reassignment slug terkonfirmasi. Admin mengelola konten hanya bila menjadi owner; editing lintas user di luar scope.

## Route dan kuota

Slug dinormalisasi menjadi huruf kecil, angka, dan dash; unik global; dan tidak boleh memakai route aplikasi. Route mempunyai satu owner, tetap memakai kuota walau belum digunakan, dan terhubung ke maksimal satu invitation. User memilih preassigned route kosong atau mengklaim route baru dalam kuota. User tidak dapat mengganti slug. Reassignment admin hanya mengubah slug—owner, konten, template, tema, dan status tetap—tanpa redirect slug lama.

## Lifecycle undangan

Invitation dibuat `draft`, dapat dipreview owner, dan hanya tampil ke guest setelah `published`. Unpublish menghasilkan `inactive`; invitation dapat kembali ke draft untuk perubahan struktural. Published timestamp hanya ada ketika published. Create, load, edit, preview, publish, dan public render memvalidasi template key/version, content schema version, dan content.

## Template, tema, dan konten

Template adalah renderer struktural build-time: `minimal-white@1`, `elegant-gold@1`, dan `daztore-inv1@1`. Setiap modul memiliki schema, default, editor, migrasi, konversi, dan renderer. Editor utama merutekan editor melalui registry.

Tema adalah preset token visual tervalidasi untuk tepat satu versi template. Tema tidak mengubah struktur, perilaku, konten, owner, route, atau publication. Perubahan template hanya saat draft: field kompatibel dikonversi, field target kosong memakai default, dan pembuangan field lain memerlukan konfirmasi.

Konten memuat teks, pasangan, acara terurut, setting, dan referensi media. Binary/base64, UI state, schema user, arbitrary CSS, remote script, serta kode upload bukan bagian JSONB invitation.

## Publication dan media

Guest lookup mengembalikan hanya invitation published. Storage private; media publik memakai ID terkendali yang membuktikan invitation published. Upload dibatasi JPEG, PNG, WebP, atau AVIF maksimal 10 MB. Delete/replace membersihkan object dan metadata; kegagalan antara Storage dan PostgreSQL dicatat sebagai cleanup operasional karena tidak ada transaksi lintas layanan.

## TBD

- Reset/invite password dan email provider produksi.
- Retensi dan job rekonsiliasi orphan media.
- Audit log admin serta redirect historis slug.
- Custom domain, analytics, RSVP, hadiah transaksional, dan editing lintas user.
