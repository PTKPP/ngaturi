"""Embedding-provider selection kept separate from indexing semantics."""
from __future__ import annotations

from config import KnowledgeConfig


def create_embedding_function(config: KnowledgeConfig):
    """Return an embedding function for supported local/server configurations.

    `local` runs Chroma's compatible default model in the CLI process. `server`
    delegates embeddings to a Chroma server configured by its operator. Remote
    providers can be added here without changing chunk IDs or index metadata.
    """
    provider = config.embedding_provider.lower()
    if provider in {"server", "none"}:
        return None
    if provider in {"local", "chroma_default"}:
        from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
        return DefaultEmbeddingFunction()
    raise ValueError(
        f"Unsupported KNOWLEDGE_EMBEDDING_PROVIDER={config.embedding_provider!r}. "
        "Use local/server or add its adapter in tools/knowledge/embedding.py."
    )
