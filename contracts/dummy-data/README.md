# Frontend Dummy Data Contract

`users.json`, `templates.json`, and `invitations.json` are the source seed for TASK-FE-001. They seed the frontend, document the agreed shape, serve as test fixtures, and guide—but do not dictate—the future backend mapping.

Fixtures must use stable synthetic IDs, contain admin and user accounts, at least two templates (`elegant-gold@1`, `minimal-white@1`), and at least two invitations including draft/published states and multiple events. They must contain no passwords, secrets, or real personal data and must validate against Zod schemas in `apps/frontend/src/domain/`.

Development-only passwords live separately in `apps/frontend/src/repositories/mock/fixtures/credentials.json`. They are local prototype credentials, not part of the cross-feature `User` domain contract and never model production password security.

Mock repositories own browser persistence:

- `ngaturi:mock:v1:users`
- `ngaturi:mock:v1:credentials`
- `ngaturi:mock:v1:session`
- `ngaturi:mock:v1:invitations`
- `ngaturi:mock:v1:templates`

Seed only missing storage, preserve edits across reloads, and provide a development-only reset that removes only the `ngaturi:mock:v1:*` namespace. Components and themes never access `localStorage` directly. Prototype data remains on one browser/device.
