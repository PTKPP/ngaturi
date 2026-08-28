# Invitation modules

`content.ts` owns the versioned content envelope, preservation rules, and template adaptation. Reusable module definitions live in `definitions/` grouped by business concern; each definition owns its schema, default, migration, and editor capability metadata. Wedding-specific projection and UI adapters stay outside the core registry.

Adding or versioning a module requires an explicit ID, one definition, category capability decisions, compatibility migration when stored data changes, and targeted tests. Template packages consume module IDs and parsed values; they must not define competing semantic schemas.

Guest submissions such as RSVP and wishes are not invitation-content records. Their module definitions currently persist only owner configuration in invitation JSONB; future guest data must use dedicated application services, repositories, tables, RLS, and rate limiting.

Image-bearing modules store controlled media IDs, never permanent Storage URLs. Alt text and image lifecycle belong to media metadata; ordered IDs in the gallery module remain the source of display order. Template renderers receive only a sanitized `{ id, altText }` projection and resolve bytes through the controlled same-origin media endpoint.
