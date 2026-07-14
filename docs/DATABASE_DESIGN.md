# Database Design

All primary keys are UUID and timestamps are `TIMESTAMPTZ`. Application migrations enforce constraints; `deleted_at` is used only where soft deletion is listed. JSONB is limited to flexible template/invitation configuration. Media bytes live in object storage.

| Table | Purpose and key fields | Constraints / indexes |
|---|---|---|
| `users` | Account: `id`, `email`, `password_hash`, `created_at` | PK `id`; unique normalized `email`; index active lookup; soft delete TBD |
| `auth_sessions` | Refresh session: `id`, `user_id`, `refresh_token_hash`, `expires_at`, `revoked_at`, `created_at` | PK `id`; FK user cascade; unique token hash; indexes active user/session and expiry lookup |
| `templates` | Supported template catalogue: `id`, `key`, `version`, `status`, `config_schema` | PK `id`; unique (`key`, `version`); index available templates |
| `invitations` | Owner content: `id`, `user_id`, `template_id`, `slug`, `status`, `timezone`, `couple_data`, `settings`, `published_at` | PK; FK user/template; unique normalized `slug`; indexes (`user_id`,`created_at`), published slug; soft delete `deleted_at` |
| `invitation_events` | Ordered event: `id`, `invitation_id`, `name`, `starts_at`, `ends_at`, `location`, `sort_order` | PK; FK cascade invitation; unique (`invitation_id`,`sort_order`); index invitation/order |
| `media_assets` | Object metadata: `id`, `invitation_id`, `object_key`, `kind`, `alt_text`, `sort_order` | PK; FK cascade; unique object key; index invitation/kind/order; soft delete `deleted_at` |
| `guests` | Invited person/group: `id`, `invitation_id`, `name`, `token_hash`, `max_attendees`, `created_at` | PK; FK cascade; unique (`invitation_id`,`token_hash`); index invitation/name |
| `rsvps` | RSVP: `id`, `invitation_id`, `guest_id` nullable, `attendance`, `attendee_count`, `note`, `responded_at` | PK; FK invitation and nullable guest; unique `guest_id` for registered guests; index invitation/responded_at |
| `guestbook_messages` | Public message: `id`, `invitation_id`, `guest_id` nullable, `name`, `message`, `status`, `created_at` | PK; FK; index (`invitation_id`,`status`,`created_at`); moderation/rate-limit policy TBD |

## Constraints and Query Rules

- `invitations.status` is `draft`, `published`, or `archived`; public queries require `published` and `deleted_at IS NULL`.
- Emails are trimmed and lowercased before persistence. Refresh tokens are opaque random values; persist only their SHA-256 hashes. Refresh rotates the session in one transaction and logout revokes the session identified by the authenticated access token.
- RSVP attendee count must be positive and no greater than `guests.max_attendees` when a registered guest is supplied. Use `INSERT ... ON CONFLICT (guest_id) DO UPDATE`, not SELECT-before-INSERT.
- Validate template availability before publishing; database preserves the selected template FK.
- Create indexes only for stated owner list, public slug, ordered child, lookup, and moderated guestbook query patterns. Add measured indexes later.
- IDs, external JSON, and API errors must not expose raw guest tokens or user ownership on public endpoints.
