# Template packages

Template production adalah paket build-time yang self-contained di `src/templates/<template-key>/`. Folder infrastruktur (`shared/`, registry, renderer, dan types) bukan paket template.

Satu paket template minimal menyediakan:

- `manifest.ts` untuk key/version, category, module composition, dan section order;
- `Template.tsx` untuk renderer;
- `themes.ts` untuk preset dan allowlist token visual milik template;
- `index.ts` yang mengekspor `templateModule` melalui `defineTemplate()`;
- renderer section, asset registry, dan test terarah.

`npm run templates:generate` memindai folder bernama aman yang memiliki `index.ts` dan `manifest.ts`, lalu menghasilkan `generated-registry.ts` berisi import statis. Generator berjalan sebelum dev, lint, typecheck, test, dan build. Tidak ada filesystem discovery di runtime, `eval`, remote module, uploaded code, atau arbitrary dynamic import.

Template baru tidak memerlukan perubahan registry, service, route, atau switch/case global. Ia tetap memerlukan migration data forward-only untuk memasukkan manifest dan preset ke katalog Supabase; migration tersebut menambah data katalog, bukan mengubah database logic. Fixture parity dan test paket tetap wajib.

`availability: "production"` membuat template dapat dipilih untuk undangan baru. `availability: "compatibility"` mempertahankan render/edit undangan lama tanpa menawarkan template tersebut untuk create atau switch baru.
