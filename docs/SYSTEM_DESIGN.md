# System Design

## Frontend-First Prototype

```text
Next.js App Router
  -> service authorization and business rules
  -> repository interfaces
  -> mock repository adapters
  -> dummy JSON seed + versioned localStorage
  -> explicit template and compatible-theme registries
```

Frontend does not call the backend. Seed initializes only missing versioned keys and preserves valid browser changes. Explicit metadata controls schema-v2 to schema-v3 migration and recovery. A development-only reset restores fixtures and removes only the Ngaturi namespace. UI components and templates do not access storage directly.

## Routes and Access

| Route | Actor |
|---|---|
| `/login` | admin or user mock session |
| `/admin`, `/admin/users`, `/admin/users/[id]/routes`, `/admin/invitations` | admin only; invitations remain owner-scoped |
| `/dashboard/**` | active admin or user session |
| `/dashboard/invitations/[id]/preview` | invitation owner; admin cross-user access TBD |
| `/{slug}` | guest; route must resolve to a published invitation |

Drafts appear only in owner preview. Public pages have no edit controls. Prototype public rendering is client-side because its source is `localStorage`; production SSR is deferred.

## Domain and Repository Boundary

Zod schemas produce the types for `User`, `Session`, `InvitationRoute`, `Template`, `InvitationTheme`, and `Invitation`. `FrontendContractSchema` validates unique IDs/emails/slugs, route ownership and quota, one invitation per route, owner agreement, catalogue references, template-theme compatibility, and existing event rules as one executable contract. Invitation contains `routeId`, neutral partner data, ordered events, flexible content, gallery references, and settings; it does not own a slug or UI state.

Repositories are `MockUserRepository`, `MockSessionRepository`, `MockRouteRepository`, `MockInvitationRepository`, `MockTemplateRepository`, and `MockThemeRepository`. Services verify current session state, admin role, owner isolation, quota, immutable route relationships, and active catalogue selections independently of repository implementation.

```text
mock repository -> future API repository -> Go + PostgreSQL
```

Frontend nested data guides future API mapping but must not be copied mechanically into relational tables.

## Route and Invitation Transactions

A route consumes owner quota even when unused. Admin preassignment creates only a route record. User invitation creation either connects an unused owned route or builds a new user-assigned route within quota. The complete prospective frontend contract is validated before persistence. When a new route write succeeds but the invitation write fails, the mock service removes the new route so no half-created allocation remains.

Only admin service methods may reassign a route slug. Reassignment updates no invitation record and creates no redirect.

## Template and Theme Registries

`minimal-white@1`, `elegant-gold@1`, and `daztore-inv1@1` are structural templates. Their implementations live under `apps/frontend/src/templates/renderers/<template-key>/`; each renderer retains its component composition, behavior, manifest, scoped CSS, and local assets.

`apps/frontend/src/themes/registry.ts` is the build-time typed catalogue for compatible visual presets. Every template has exactly one default active theme and at least one alternate. Safe validated color tokens are passed through `InvitationTemplateProps`; themes do not duplicate template components or alter content, section order, route, status, ownership, or interaction rules.

Dummy catalogues and registered manifests are parity-tested. Templates never read repositories/storage, call a backend, or define a competing invitation shape. Runtime folder auto-loading, arbitrary CSS, `eval`, remote scripts, and uploaded code are forbidden.

## Preserved and Future Backend

Go authentication and its PostgreSQL migration remain completed but are not integrated. Backend invitation/route/theme APIs, normalized persistence, production SSR, object storage, upload, RSVP, guestbook, payment, and deployment resume only after frontend flow approval. Visibility of a published invitation after its owner is deactivated remains TBD.

ChromaDB remains private derived tooling, never an application dependency or source of truth.

## Mobile-First UI Boundary

- Base viewport is 360-430 px; tablet and desktop are progressive enhancement.
- Dashboard, editor, route management, and settings use one column on mobile.
- No page may create horizontal viewport overflow.
- Primary controls keep a touch target near 44x44 px and no flow depends on hover.
- Fixed/bottom UI accounts for safe areas.
- Public invitations remain readable and operable with one hand.
