# Invitation modules

`content.ts` owns the versioned content envelope, preservation rules, and template adaptation. Reusable module definitions live in `definitions/` grouped by business concern; each definition owns its schema, default, migration, and editor capability metadata. Wedding-specific projection and UI adapters stay outside the core registry.

Adding or versioning a module requires an explicit ID, one definition, category capability decisions, compatibility migration when stored data changes, and targeted tests. Template packages consume module IDs and parsed values; they must not define competing semantic schemas.

Guest submissions such as RSVP and wishes are not invitation-content records. Module definitions persist only owner configuration in invitation JSONB. RSVP and Wishes use dedicated application services, repositories, tables, narrow service-role RPCs, RLS, idempotency, and independent rate counters; Wishes adds pending-by-default owner moderation and an approved-only public projection.

Image-bearing modules store controlled media IDs, never permanent Storage URLs. Alt text and image lifecycle belong to media metadata; ordered IDs in the gallery module remain the source of display order. Template renderers receive only a sanitized `{ id, altText }` projection and resolve bytes through the controlled same-origin media endpoint.

Gift is a versioned content capability. `gift@2` owns reusable bank, e-wallet, physical-address schemas and its editor; templates may choose their presentation but must consume this contract. Legacy `gift@1 { text }` is migrated in memory to `legacyText`, and compatibility renderers receive a safe text projection without redefining Gift semantics.

External embeds are versioned module data, not arbitrary HTML. `video@2` stores only an allowlisted provider plus canonical video ID. `event@2` accepts only normalized Google Maps/OpenStreetMap links, while `maps@2` controls the label and whether a consent-gated Google Maps embed may be offered. Unsupported legacy HTTPS values remain inert editor-only recovery data and are never used as iframe/link sources.
