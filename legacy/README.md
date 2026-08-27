# Legacy code

Folder ini berada di luar runtime dan build production Ngaturi.

- `go-auth-backend/` adalah implementasi autentikasi Go lama. Ia tidak dipanggil Next.js, tidak dijalankan PM2, dan hanya dapat dibangun secara eksplisit dengan `make legacy-backend-build`.
- `frontend-browser-demo/` adalah snapshot mock repository, localStorage runtime, service sinkron, dan test prototipe lama. Kode ini tidak termasuk `tsconfig`, lint, test, atau bundle frontend production.

Jangan menambahkan dependency dari `apps/frontend/src/` menuju folder ini. Fitur baru harus mengikuti alur Next.js Server Action/Route Handler -> Application Service -> ApplicationRepository -> Supabase.
