# Frontend Dummy Data Contract

`users.json`, `templates.json`, and `invitations.json` are the source seed finalized by TASK-FE-002. They seed the frontend, document the agreed shape, serve as test fixtures, and guide—but do not dictate—the future backend mapping.

Fixtures must use stable synthetic IDs, contain admin and user accounts, the registered templates (`elegant-gold@1`, `minimal-white@1`, and `daztore-inv1@1`), and at least two invitations including draft/published states and multiple events. They must contain no passwords, secrets, or real personal data and must validate against Zod schemas in `apps/frontend/src/domain/`.

The unified contract requires unique user IDs/emails, template key/version pairs, invitation IDs/slugs, existing owners, existing template references, and valid contiguous event order. Template catalogue entries must match their registered manifests.

Theme thumbnails and runtime media use local `/templates/{key}/...` paths. The catalogue never stores GitHub hotlinks or source-repository personal assets.

Development-only passwords live separately in `apps/frontend/src/repositories/mock/fixtures/credentials.json`. They are local prototype credentials, not part of the cross-feature `User` domain contract and never model production password security.

Mock repositories own browser persistence:

- `ngaturi:mock:v1:users`
- `ngaturi:mock:v1:credentials`
- `ngaturi:mock:v1:session`
- `ngaturi:mock:v1:invitations`
- `ngaturi:mock:v1:templates`
- `ngaturi:mock:v1:metadata` (`storageVersion: 1`, `schemaVersion: 2`)

Seed only missing storage and preserve edits across reloads. Valid current-shape data created before metadata existed is migrated in place; legacy namespaces and older explicit schema metadata require controlled reset, while invalid JSON or incompatible metadata shows retry/reset recovery UI. Reset removes only `ngaturi:mock:*`. Components and themes never access `localStorage` directly. Prototype data remains on one browser/device.
