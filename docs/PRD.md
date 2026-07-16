# Product Requirements

## Direction

Ngaturi is a frontend-first digital invitation prototype. Dummy data and browser persistence establish the approved UI/domain shape before backend invitation schema or APIs are designed.

## Actors

- **Admin:** stored authenticated account (`admin`). Manages dummy users and can use all normal user features for invitations it owns. Editing or creating invitations for another user is TBD.
- **User:** stored authenticated account (`user`). Creates, edits, previews, publishes, and deactivates only its own invitations.
- **Guest:** public actor without account or session. Opens a published invitation by slug, cannot edit, and cannot access dashboards.

## Active Frontend Scope

Mock admin/user login; admin and user dashboards; dummy user creation/status; owner invitation creation/editing; template selection; preview; publish/unpublish; public guest route; explicit template registry; and versioned `localStorage` persistence.

## Future Scope

Backend invitation CRUD, frontend integration with Go authentication, production SSR, media upload/object storage, guest management, RSVP, guestbook, payment, monetization, and production deployment.

## Prototype Acceptance

The frontend runs without backend calls, persists changes across reloads on the same browser, enforces role/ownership rules, renders two registered templates, rejects duplicate slugs, and exposes only published invitations on public routes.

Browser-local data cannot be shared across devices. Production persistence and server rendering follow after frontend approval.
