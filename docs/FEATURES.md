# Features

## Feature: Authentication
### Tujuan
Establish an authenticated owner session.
### Preconditions
Register data is valid; protected operations have a valid access token.
### Main Flow
Register/login returns session tokens; refresh rotates/renews per final security design (TBD); logout invalidates the refresh session.
### Error Flow
Duplicate email, invalid credentials, expired/revoked refresh token return standard errors.
### Business Rules
Every invitation is owned by one user; protected resources require ownership checks.
### API Terkait
`register`, `login`, `refreshToken`, `logout`.
### Acceptance Criteria
Unauthorized callers cannot access or mutate another user's invitation.

## Feature: Invitation Management
### Tujuan
Create and maintain a draft invitation.
### Preconditions
Authenticated owner and registered template reference.
### Main Flow
Owner creates draft, edits supported fields/events/settings, previews, then publishes.
### Error Flow
Duplicate slug, invalid template, invalid timezone or invalid state transition fail without partial writes.
### Business Rules
Slug is unique; only owner may mutate; publish requires valid public-ready configuration (final checklist TBD).
### API Terkait
`listInvitations`, `createInvitation`, `getInvitation`, `updateInvitation`, `deleteInvitation`, `publishInvitation`, `unpublishInvitation`.
### Acceptance Criteria
Draft is private; publish/unpublish changes public availability.

## Feature: Public Invitation and Template Rendering
### Tujuan
Render a published invitation quickly at its slug.
### Preconditions
Invitation is published and the frontend registry supports its key/version.
### Main Flow
SSR fetches public payload; frontend dynamically selects local template; client components enable interactions.
### Error Flow
Missing slug returns 404; draft returns 404; unknown local template is handled as a controlled unavailable page.
### Business Rules
No user ID, raw guest token, or template source in public payload. Guest personalization requires a valid token.
### API Terkait
`getPublicInvitation`.
### Acceptance Criteria
Published invitation opens; unpublished/draft does not.

## Feature: Media and Gallery
### Tujuan
Attach images/media and optional music.
### Preconditions
Owner controls invitation; object upload authorization is valid.
### Main Flow
Object is uploaded, metadata linked and ordered, public template consumes safe URLs.
### Error Flow
Unsupported/failed uploads retain no broken published reference.
### Business Rules
Storage holds bytes; PostgreSQL holds metadata. Limits/type policy TBD.
### API Terkait
Invitation management; upload contract is TBD.
### Acceptance Criteria
Gallery order is stable and media is not stored as database blobs.

## Feature: Guest Management
### Tujuan
Manage invitees and personal links.
### Preconditions
Owner controls invitation.
### Main Flow
Owner creates guest with attendee limit; system generates opaque token; owner shares resulting personalized link.
### Error Flow
Foreign invitation access is rejected; invalid guest data fails validation.
### Business Rules
Persist only a hash of token; token is never returned by unrelated public API.
### API Terkait
`listGuests`, `createGuest`, `updateGuest`, `deleteGuest`.
### Acceptance Criteria
Owner CRUD is scoped to invitation and links personalize only valid guests.

## Feature: RSVP
### Tujuan
Collect one current attendance response per registered guest.
### Preconditions
Published invitation; guest token valid when guest-specific RSVP is used.
### Main Flow
Guest submits attendance/count/note; API atomically creates or updates RSVP.
### Error Flow
Invalid token, invalid attendance/count, or exceeding guest limit returns a standard error.
### Business Rules
Registered guest has one RSVP via unique `guest_id`; repeated submit updates it. Anonymous RSVP policy is TBD.
### API Terkait
`submitPublicRsvp`.
### Acceptance Criteria
Valid RSVP succeeds; double submit does not create duplicates.

## Feature: Guestbook
### Tujuan
Collect public congratulations safely.
### Preconditions
Published invitation.
### Main Flow
Visitor posts name/message; approved messages are listed newest-first.
### Error Flow
Spam, invalid content, or rate limit is rejected without exposing moderation internals.
### Business Rules
Rate limiting and moderation state are required; final thresholds/policy TBD.
### API Terkait
`listPublicGuestbook`, `createPublicGuestbookMessage`.
### Acceptance Criteria
Spam controls work and only visible messages are publicly returned.

## Feature: Publish and Unpublish
### Tujuan
Control public visibility.
### Preconditions
Authenticated owner; invitation passes publish checks.
### Main Flow
Publish timestamps the invitation; unpublish removes public access and triggers future cache invalidation.
### Error Flow
Invalid state/configuration is rejected.
### Business Rules
Public lookup only returns `published`; an owner is not allowed to publish another owner’s invitation.
### API Terkait
`publishInvitation`, `unpublishInvitation`.
### Acceptance Criteria
State transitions are idempotent or explicitly documented in the API implementation.
