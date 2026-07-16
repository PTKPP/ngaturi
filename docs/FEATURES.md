# Features

## Active: Mock Authentication

Admin and user select a valid active demo account at `/login`; the mock session persists in versioned browser storage. Admin routes require role `admin`; dashboard routes accept `admin` or `user`. Guest has no account/session. Integration with completed Go authentication is deferred.

## Active: Admin User Management

Admin lists, creates, activates, and deactivates dummy stored accounts with role `admin` or `user`. Admin can also use owner invitation features and create its own invitations. Admin creating/editing invitations for another user is TBD and must not be implemented.

## Active: Owner Invitation Management

Admin or user lists and manages only invitations where `ownerId` matches the session account. The editor supports title, neutral partner data, multiple events, location, flexible text content, template reference, slug, and draft/published/inactive status. Slugs are unique in the mock repository.

## Active: Template Selection and Editor

The catalogue starts with `elegant-gold@1` and `minimal-white@1`. Changing a template keeps domain data. Editor/UI state is separate from invitation data; components use repository interfaces, while templates receive only validated `InvitationTemplateProps`.

## Active: Preview and Publication

Owner preview renders the latest edited data through the selected registry entry. Publishing exposes `/{slug}`; unpublishing/inactivation removes public visibility. Draft preview does not make a draft public.

## Active: Public Guest View

Guest opens a published slug without login and can only view. Missing, draft, or inactive invitations are unavailable. Guest cannot edit, open dashboards, or see admin/user controls.

## Persistence Rules

Dummy JSON seeds versioned `localStorage` only when keys are absent. Reload preserves edits; seed never overwrites them. Only mock repository adapters access storage. A development reset may restore fixtures. Data remains limited to one browser/device.

## Future Scope

Backend invitation CRUD and API repository, Go-auth frontend integration, normalized invitation database, production SSR, media upload/object storage, guest management, RSVP, guestbook, payment, monetization, and final UI/deployment.
