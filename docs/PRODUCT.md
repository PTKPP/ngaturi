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

Guest lookup mengembalikan hanya invitation published. Storage private; media publik memakai ID terkendali yang membuktikan invitation published. Upload dibatasi JPEG, PNG, WebP, atau AVIF maksimal 10 MB. Delete/replace membersihkan object dan metadata; kegagalan antara Storage dan PostgreSQL dicatat sebagai cleanup operasional karena tidak ada transaksi lintas layanan.

## TBD

- Reset/invite password dan email provider produksi.
- Retensi dan job rekonsiliasi orphan media.
- Audit log admin serta redirect historis slug.
- Custom domain, analytics, RSVP, hadiah transaksional, dan editing lintas user.
