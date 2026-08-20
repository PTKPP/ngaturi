# Frontend Dummy Data Contract

`users.json`, `routes.json`, `templates.json`, `themes.json`, and `invitations.json` are the source seed for TASK-FE-004. Values are synthetic prototype data, including route quotas; they do not define commercial packages.

The unified schema-v3 contract requires:

- unique user IDs and emails with non-negative integer `routeQuota`;
- unique route IDs and globally unique normalized slugs, valid owners, and allocated counts within owner quota;
- unique invitation IDs and `routeId` values, existing routes, and matching invitation/route owners;
- the three registered structural templates: `minimal-white@1`, `elegant-gold@1`, and `daztore-inv1@1`;
- exactly one active default theme and at least one alternate theme for each template;
- existing active template/theme references with compatible versions when invitations are created, updated, or published;
- valid contiguous event order and time ranges.

Invitation data owns content and references `routeId`, `templateKey`, `templateVersion`, `themeKey`, and `themeVersion`. It does not duplicate the public slug. UI state is not domain data.

Template catalogue entries and build-time manifests must match. Theme catalogue entries are parsed into the build-time typed theme registry. Theme tokens are safe six-digit hex colors; arbitrary CSS, remote scripts, `eval`, and uploaded code are forbidden.

Development-only passwords remain in `apps/frontend/src/repositories/mock/fixtures/credentials.json`. They are not part of the `User` contract and are not a production security model.

Mock repositories own browser persistence:

- `ngaturi:mock:v1:users`
- `ngaturi:mock:v1:credentials`
- `ngaturi:mock:v1:session`
- `ngaturi:mock:v1:routes`
- `ngaturi:mock:v1:invitations`
- `ngaturi:mock:v1:templates`
- `ngaturi:mock:v1:themes`
- `ngaturi:mock:v1:metadata` (`storageVersion: 1`, `schemaVersion: 3`)

Valid schema-v2 storage migrates deterministically: each legacy invitation slug becomes a migration-assigned route, the invitation receives `routeId` and the template's default active theme, route quota is raised to at least migrated usage, the full contract is validated, and metadata is written last. Migration is idempotent. Invalid or incompatible data keeps visible retry/reset recovery. Reset removes only `ngaturi:mock:*` and preserves other application data on the origin.

Components and templates never access `localStorage` directly. Data and public routes remain limited to one browser/device; production persistence and SSR are deferred.
