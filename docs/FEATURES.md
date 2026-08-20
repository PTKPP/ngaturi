# Features

## Active: Mock Authentication

Admin and user select a valid active demo account at `/login`; the mock session persists in versioned browser storage. Persisted sessions are cleared when the user is missing, inactive, or its stored role no longer matches the current user record. Admin routes require role `admin`; dashboard routes accept `admin` or `user`. Guest has no account/session. Integration with completed Go authentication is deferred.

## Active: Admin User and Route Management

Admin lists, creates, activates, and deactivates dummy accounts. User creation includes a non-negative prototype `routeQuota`. Admin sees allocated route usage as `used / quota`, may change quota without going below current allocation, preassign a globally unique route within capacity, and explicitly confirm route slug reassignment at `/admin/users/[id]/routes`.

Route reassignment changes only the route slug. It does not edit invitation content, template, theme, ownership, or status; the prior slug becomes unavailable with no automatic redirect. Admin cross-user invitation content editing remains TBD. Admin may use normal owner features only for admin-owned invitations.

## Active: Route Allocation and Quota

An `InvitationRoute` owns one immutable public slug for exactly one user. A route consumes quota even while unused and may be connected to at most one invitation. Users cannot change assigned route slugs. They may create an invitation from an unused preassigned route or claim a new route while capacity remains; a route claim and invitation creation validates the complete intended contract and rolls back safely on persistence failure.

## Active: Owner Invitation Management

An invitation is editable content connected through `routeId`; it no longer owns a slug. Admin or user lists and manages only invitations whose owner matches the session account. The editor supports title, neutral partner data, ordered events, flexible text, gift information, gallery references, template, compatible theme, and draft/published/inactive status. Route and owner are immutable to the user.

## Active: Templates and Themes

`minimal-white@1`, `elegant-gold@1`, and `daztore-inv1@1` are three structural templates with different section composition, layout, and behavior. A theme is a compatible visual-token preset inside one template. Each template has one default theme preserving its original appearance and at least one alternate theme. Theme changes preserve template, route, content, and behavior. Template changes preserve compatible content and select the target template's default active theme.

Templates and themes are explicit build-time registries. No runtime auto-loading, arbitrary CSS, `eval`, remote scripts, or unvalidated style injection is permitted.

## Active: Preview, Publication, and Guest View

Owner preview and public rendering use the stored template-theme combination. Public guest lookup resolves slug to route, route to invitation, and requires `published` status. Missing, unused, draft, and inactive routes are unavailable. Guest requires no session, cannot mutate data, and may keep the existing `?to=` recipient behavior.

The public visibility policy when a published invitation's owner account later becomes inactive remains TBD.

## Persistence Rules and Limitations

Dummy JSON seeds versioned `localStorage`; browser schema version 3 stores users, routes, invitations, templates, and themes. Valid schema-v2 data migrates in place by creating deterministic route allocations, preserving slug/content/owner/status, selecting compatible default themes, and raising each migrated user's quota to at least its route count. Metadata is written only after successful migration. Invalid data keeps visible retry/reset recovery, and reset removes only `ngaturi:mock:*`.

Only mock repository adapters access storage. Data and public URLs work only in the same browser/device and are not production sharing. Backend invitation CRUD, Go-auth integration, production SSR, object storage, upload, RSVP, guestbook, payment, and deployment remain future scope.
