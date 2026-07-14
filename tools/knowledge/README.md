# Knowledge Base Tooling

ChromaDB holds a rebuildable, private index of only `AGENTS.md`, `docs/**/*.md`, `contracts/openapi.yaml`, and `contracts/examples/*.json`. Git files remain authoritative.

## Commands

- `make knowledge-up` / `make knowledge-down` — manage local ChromaDB.
- `make knowledge-index` — sync changed source and remove stale chunks.
- `make knowledge-reindex COLLECTION=digital-invitation-knowledge` — guarded full rebuild.
- `make knowledge-health` — check service, collection, record count.
- `make knowledge-search QUERY="getPublicInvitation"` — compact retrieval.
- `make knowledge-test` — run deterministic unit tests.

`search.py` supports `--document-type`, `--feature`, `--task-id`, `--phase`, `--operation-id`, `--schema-name`, and `--source-path`. Chroma runs on an internal Docker network and binds its configurable host port only to `127.0.0.1`; it must not be exposed publicly in deployment.

`KNOWLEDGE_EMBEDDING_PROVIDER=local` uses Chroma's compatible default local model. `server` delegates embedding to a suitably configured Chroma server; a new remote provider must be added as an adapter in `embedding.py`, keeping the index format stable. No secret, user data, or application source code is indexed.
