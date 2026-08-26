# Architecture

## Boundary aktif

Next.js App Router menangani SSR, UI, Server Actions, Route Handlers, validasi, application services, dan repository adapters. Supabase menyediakan PostgreSQL, cookie-backed Auth SSR, dan private Storage. `apps/backend` (Go) tetap utuh sebagai auth lama dan bukan dependency flow invitation aktif.

Mutation mengalir dari form/client component ke Server Action/Route Handler, authorization dan service di `application/`, interface `repositories/contracts/`, adapter `repositories/supabase/`, lalu RLS/RPC/constraint PostgreSQL. Renderer hanya menerima props tervalidasi. Mock hanya adapter test/development eksplisit.

## Auth dan authorization

`@supabase/ssr` membuat browser/server client; `proxy.ts` me-refresh cookie dan server memakai `auth.getClaims()` sebelum mengambil profile. Role berasal dari `profiles`, bukan browser metadata. Layout melakukan guard server; mutation mengulang pemeriksaan actor/role/ownership; RLS dan PostgreSQL function menegakkan boundary sama. Service-role client hanya pada module `server-only` untuk admin user management dan media publik terfilter.

## Data model dan JSONB

`profiles` mereferensikan `auth.users`; `invitation_routes` mempunyai slug unik dan owner; katalog menyimpan template/tema aman; `invitations` menyimpan owner/route/template/theme, content schema version, status/timestamps, dan `content JSONB NOT NULL`; `invitation_media` hanya metadata/path.

Composite FK `(route_id, owner_id)` mencegah mismatch owner. Composite theme/template FK mencegah tema lintas template. Trigger route mengunci profile `FOR UPDATE` sebelum menghitung route sehingga klaim serentak tidak melampaui kuota; unique slug menyelesaikan race slug. RPC membuat route+invitation atomik. Tidak ada GIN content karena belum ada query JSONB.

## Template contract

Base invitation mengetahui field aplikasi stabil dan content object opaque. Registry memilih modul berdasarkan key/version; modul memvalidasi content schema version dan Zod content pada create/load/edit/preview/publish/render. Editor router dipilih dari registry. Schema tidak berasal dari user.

## Public SSR dan Storage

Guest lookup memakai `SECURITY DEFINER get_published_invitation_by_slug` dengan `search_path=''`, input tervalidasi, return terkontrol, dan execute-only grant. Storage bucket private dan policy membatasi folder owner/invitation. Gambar memakai same-origin `/api/public-media/{uuid}` setelah membuktikan media ready dan invitation published, kompatibel dengan Next Image Optimization tanpa wildcard remote host.

Upload object dan insert metadata bukan transaksi lintas layanan. Service menghapus object bila insert gagal. Saat delete, object dihapus sebelum row; kegagalan delete row memerlukan retry cleanup metadata. Job rekonsiliasi menjadi pekerjaan berikutnya.

## Portability

Service bergantung pada interface async `ApplicationRepository`; detail RPC ada di adapter. Application backend dapat diekstrak ke Fastify kelak tanpa memindahkan renderer/UI, sementara constraint dan RLS tetap defense in depth.
