# System Design

## Frontend-First Prototype

```text
Next.js App Router
  -> repository interfaces
  -> mock repository adapters
  -> dummy JSON seed + versioned localStorage
  -> explicit template registry
```

Frontend does not call the backend. Seed initializes only missing versioned keys and never overwrites valid browser changes; explicit metadata controls migration and recovery. A development-only reset restores fixtures. UI components and templates do not access storage directly.

## Routes and Access

| Route | Actor |
|---|---|
| `/login` | admin or user mock session |
| `/admin`, `/admin/users`, `/admin/invitations` | admin only; invitations remain owner-scoped |
| `/dashboard/**` | admin and user |
| `/dashboard/invitations/[id]/preview` | invitation owner; admin cross-user access TBD |
| `/{slug}` | guest; published invitation only |

Drafts appear only in owner preview. Public pages have no edit controls. Prototype public rendering is client-side because its source is `localStorage`; production SSR is deferred, not cancelled.

## Domain and Repository Boundary

Zod schemas in `apps/frontend/src/domain/` produce the TypeScript types for `User`, `Session`, `Template`, and `Invitation`. `FrontendContractSchema` validates their cross-references and uniqueness as one executable contract. Invitation contains neutral partners (`partnerOne`, `partnerTwo`), multiple ordered events, flexible content, gallery references, and settings—never modal/loading/form UI state.

Event order is explicit and contiguous from zero. The editor may add, reorder, and remove events but must keep at least one; event time ranges and cross-fixture owner/template references are runtime-validated.

Repositories: `MockUserRepository`, `MockSessionRepository`, `MockInvitationRepository`, and `MockTemplateRepository`. Later they are replaced behind the same boundary:

```text
mock repository -> API repository -> Go + PostgreSQL
```

Frontend nested data guides API mapping but must not be copied mechanically into relational tables.

## Template Registry

Templates live under `apps/frontend/src/templates/themes/<theme>/` with their own component, manifest, CSS module, components, assets, and optional build-time scripts. Shared code stays under `templates/shared/`; `registry.ts` explicitly maps `templateKey@templateVersion` such as `elegant-gold@1` and `minimal-white@1` to modules.

Every template receives `InvitationTemplateProps`. Dummy catalogue entries and registered manifests must match. Templates never read repositories/storage, call a backend, or define a competing invitation shape. Theme JavaScript is bundled by Next.js; runtime folder auto-loading, `eval`, remote scripts, and arbitrary uploaded code are forbidden.

## Preserved and Future Backend

Go authentication and its PostgreSQL migration are completed but not integrated into this prototype. Backend invitation APIs, normalized persistence, production SSR, object storage, RSVP, and guestbook resume only after frontend data and flows are approved.

ChromaDB remains private derived tooling, never an application dependency or source of truth.

## Mobile-First UI Boundary

Frontend menggunakan mobile-first responsive design.

- Viewport utama pengembangan: 360–430 px.
- CSS dasar berlaku untuk mobile; breakpoint menggunakan pendekatan min-width.
- Dashboard, editor, dan halaman pengaturan menggunakan satu kolom pada mobile.
- Navigasi dan aksi utama harus tetap mudah dijangkau dengan sentuhan.
- Public invitation tidak boleh memiliki interaksi yang bergantung pada hover.
- Fixed atau bottom UI menggunakan `env(safe-area-inset-bottom)` jika diperlukan.
- Tablet dan desktop memperluas layout tanpa mengubah flow utama.
- Template wajib menerima dan menampilkan seluruh data penting dengan baik pada mobile.
