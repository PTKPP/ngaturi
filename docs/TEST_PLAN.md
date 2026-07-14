# Test Plan

| Level | Scope |
|---|---|
| Unit | Go business rules; Next template registry/components; Python chunking/filtering |
| Repository | PostgreSQL constraints, transactions, upsert, ownership queries |
| API integration | Auth, invitation state, guest/RSVP/guestbook envelopes and status codes |
| Contract | OpenAPI syntax/schema validation and examples against schemas |
| E2E | Owner publish journey; guest public/RSVP/guestbook journey |
| Load | Baseline public slug and guestbook/RSVP rate-limit behavior |
| Security | Authz isolation, token validation, input validation, XSS-safe rendering, upload access |

## Required Scenarios

- Published invitation opens; draft/unpublished invitation is not public; missing slug is 404.
- Duplicate slug is rejected by the database; unregistered template cannot publish.
- Valid RSVP succeeds; repeated registered RSVP upserts; invalid token and guest-limit overflow fail.
- Guestbook spam/rate-limit path is rejected and unapproved messages are not listed.
- A user cannot read or modify another user's resource.
- Contract examples validate and frontend never requires an undocumented response field.
- Knowledge tests cover heading/OpenAPI chunks, stable IDs, unchanged/deleted sources, whitelist/sensitive exclusions, required metadata, context budget, and retrieval filter.

Run focused tests per task, then affected integration/contract tests before merge. Production load/security thresholds remain TBD.
