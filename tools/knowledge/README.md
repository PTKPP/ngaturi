# Knowledge Index

ChromaDB stores a rebuildable private index of active sources only: `AGENTS.md`, `docs/**/*.md`, and `contracts/dummy-data/**/*.{json,md}`. Git remains authoritative.

Archived contracts, application source, `.env`, credentials, production data, and build output are excluded.

## Commands

- `make knowledge-up` / `make knowledge-down` — manage local Chroma.
- `make knowledge-index` — incremental sync; changed files replace old chunks and removed sources are deleted.
- `make knowledge-health` — verify collection reachability/count.
- `make knowledge-search QUERY="frontend-first roles"` — focused retrieval.
- `make knowledge-test` — whitelist, chunking, sync, deduplication, filter, and budget tests.
- `make knowledge-reindex COLLECTION=digital-invitation-knowledge` — explicit destructive rebuild.

Use 4–6 chunks and the configured context budget. Retrieval supports metadata filters such as feature, task, source path, and document type.
