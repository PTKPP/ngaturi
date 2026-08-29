# Template packages

Template production adalah paket build-time yang self-contained di `src/templates/<template-key>/`. Folder infrastruktur (`shared/`, registry, renderer, dan types) bukan paket template.

Satu paket template minimal menyediakan:

- `manifest.ts` untuk key/version, category, module composition, dan section order;
- `Template.tsx` untuk renderer;
- `themes.ts` untuk preset dan allowlist token visual milik template;
- `index.ts` yang mengekspor `templateModule` melalui `defineTemplate()`;
- renderer section, asset registry, dan test terarah.

`npm run templates:generate` memindai folder bernama aman yang memiliki `index.ts`, `manifest.ts`, `Template.tsx`, dan `themes.ts`, lalu menghasilkan `generated-registry.ts` berisi import statis. Generator berjalan sebelum dev, lint, typecheck, test, dan build. Tidak ada filesystem discovery di runtime, `eval`, remote module, uploaded code, atau arbitrary dynamic import.

Template baru yang hanya memakai invitation module existing tidak memerlukan perubahan registry, application service, repository, route, editor router, switch/case global, atau adapter Supabase. Developer cukup membuat paket lengkap `templates/<template>/`, menjalankan `templates:generate`/`templates:check`, dan menambah migration katalog forward-only bila template ingin tersedia untuk create/switch. Migration tersebut menambah data katalog, bukan mengubah database logic. Fixture parity dan test paket tetap wajib.

`availability: "production"` membuat template dapat dipilih untuk undangan baru. `availability: "compatibility"` mempertahankan render/edit undangan lama tanpa menawarkan template tersebut untuk create atau switch baru.

Template ID yang sudah masuk production tidak boleh di-rename lagi. Hanya display name dan deskripsi yang boleh berubah; key/version tetap menjadi referensi immutable untuk invitation tersimpan.
