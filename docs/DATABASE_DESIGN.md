# Database Design

## Completed Authentication Persistence

All keys are UUID and timestamps are `TIMESTAMPTZ`.

| Table | Purpose | Enforced constraints/indexes |
|---|---|---|
| `users` | Authentication account: id, normalized email, password hash, created time | PK; unique normalized email; lookup index |
| `auth_sessions` | Hashed refresh session with user, expiry, revocation, created time | PK; user FK cascade; unique 32-byte SHA-256 hash; active/expiry indexes |

Emails are trimmed/lowercased before insert. Passwords use bcrypt. Refresh tokens remain opaque to clients and only their SHA-256 hashes are stored; rotation locks/consumes the old session transactionally. TASK-002 migrations and behavior remain unchanged by the frontend rebaseline.

Stored account roles will later be `admin` and `user`; no role migration is part of this rebaseline. Guest is not a stored account.

## Invitation Persistence — Legacy Draft, Not Active Design

Earlier proposals included templates, invitations, events, media, guests, RSVP, and guestbook tables. They are unimplemented drafts and must be reviewed after TASK-FE-001 approves schemas, fixtures, flow, and query needs.

The future backend must normalize ownership, template references, ordered events, constraints, and query indexes appropriately, then map them to the frontend contract. It must not copy nested dummy JSON directly into database tables. No invitation migration or final database design is authorized yet.
