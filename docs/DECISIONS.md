# Architecture Decisions

## DEC-001: PostgreSQL Is the Application Database
Status: Accepted

Context: Invitations need transactional ownership and constraints.
Decision: Use PostgreSQL with UUID, TIMESTAMPTZ, relational constraints, and limited JSONB configuration.
Reason: It supports transactional data integrity and query patterns.
Consequence: Media bytes and agent knowledge are external services.

## DEC-002: Hybrid SSR and Client Components
Status: Accepted

Context: Public invitations need discoverable fast rendering plus interaction.
Decision: SSR public invitation pages in Next.js; hydrate only interactive features.
Reason: Good initial rendering without SPA-only tradeoffs.
Consequence: Templates must separate server-safe rendering from client features.

## DEC-003: API-First Development
Status: Accepted

Context: Frontend and backend work in parallel.
Decision: OpenAPI 3.1 is the official request/response contract.
Reason: Prevents implicit field and breaking changes.
Consequence: Contract changes precede implementation and are validated.

## DEC-004: Frontend Template Registry
Status: Accepted

Context: Templates are executable presentation code.
Decision: Backend returns key/version and data; frontend maps those to dynamic imports.
Reason: No remote source-code execution and predictable SSR.
Consequence: Registry/catalogue compatibility must be maintained.

## DEC-005: Object Storage for Media
Status: Accepted

Context: Gallery media does not belong in relational blobs.
Decision: Store objects in S3-compatible storage and metadata in PostgreSQL.
Reason: Scalability and delivery flexibility.
Consequence: Signed upload/access policy is needed.

## DEC-006: ChromaDB Is a Derived Knowledge Index
Status: Accepted

Context: Agents need focused documentation retrieval.
Decision: Index whitelisted Git documentation into private persistent ChromaDB.
Reason: Lower context use without duplicating source of truth.
Consequence: It is rebuildable, contains no secrets/data, and cannot affect application runtime.
