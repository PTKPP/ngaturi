# Product Requirements

## Direction

Ngaturi is a frontend-first digital invitation prototype. Dummy data and browser persistence establish the approved UI/domain shape before backend invitation schema or APIs are designed.

## Actors

- **Admin:** stored authenticated account (`admin`). Manages dummy users, route quota, allocation, and confirmed route reassignment. It uses normal invitation features only for admin-owned invitations. Editing content for another user remains TBD.
- **User:** stored authenticated account (`user`). Uses an unused preassigned route or claims one within quota, then creates, edits, previews, publishes, and deactivates only its own invitation. Assigned route slugs are immutable to the user.
- **Guest:** public actor without account or session. Opens a published invitation through route lookup, cannot edit, and cannot access dashboards.

## Product Concepts

- **Route Allocation:** one globally unique public slug owned by one user. It consumes route quota even while unused and connects to at most one invitation.
- **Invitation:** editable owner content connected by `routeId`; it selects one template and one compatible theme and does not own a slug.
- **Template:** a structural renderer controlling composition, layout, navigation, and behavior. Current templates are `minimal-white@1`, `elegant-gold@1`, and `daztore-inv1@1`.
- **Theme:** a safe visual-token preset compatible with one template. It cannot change layout, content, route, ownership, status, or behavior.

## Active Frontend Scope

Mock admin/user login; admin user/quota/route management; owner invitation creation/editing; separate template and compatible-theme selection; preview; publish/unpublish; route-based public guest view; explicit registries; schema-v3 browser persistence; and controlled schema-v2 migration.

## Prototype Acceptance

The frontend runs without backend calls, persists changes across reloads in the same browser, enforces role/ownership/quota/route rules, renders three registered templates with compatible themes, rejects duplicate route slugs, and exposes only published invitations through allocated routes.

Browser-local data cannot be shared across devices. Public URLs work only in the browser containing the data and must not be presented as production sharing.

## Deferred and TBD

Backend invitation/route/theme CRUD, Go-auth frontend integration, production SSR, normalized persistence, media/object storage, upload, guest management, RSVP, guestbook, payment, monetization, redirects after route reassignment, and deployment are deferred. The policy for a published invitation whose owner is later deactivated remains TBD.
