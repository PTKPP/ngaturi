"""Shared configuration and source allow-list for the knowledge index."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROJECT = "digital-invitation"
DEFAULT_COLLECTION = "digital-invitation-knowledge"


def load_dotenv() -> None:
    """Load only simple KEY=VALUE entries from the optional local .env file."""
    path = ROOT / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


@dataclass(frozen=True)
class KnowledgeConfig:
    host: str
    port: int
    collection: str
    embedding_provider: str
    embedding_model: str
    top_k: int
    max_context_chars: int
    chunk_target_tokens: int
    chunk_overlap_tokens: int

    @classmethod
    def from_env(cls, collection: str | None = None) -> "KnowledgeConfig":
        load_dotenv()
        return cls(
            host=os.getenv("CHROMA_HOST", "localhost"),
            port=int(os.getenv("CHROMA_PORT", "8000")),
            collection=collection or os.getenv("CHROMA_COLLECTION", DEFAULT_COLLECTION),
            embedding_provider=os.getenv("KNOWLEDGE_EMBEDDING_PROVIDER", "local"),
            embedding_model=os.getenv("KNOWLEDGE_EMBEDDING_MODEL", "all-MiniLM-L6-v2"),
            top_k=int(os.getenv("KNOWLEDGE_TOP_K", "6")),
            max_context_chars=int(os.getenv("KNOWLEDGE_MAX_CONTEXT_CHARS", "12000")),
            chunk_target_tokens=int(os.getenv("KNOWLEDGE_CHUNK_TARGET_TOKENS", "700")),
            chunk_overlap_tokens=int(os.getenv("KNOWLEDGE_CHUNK_OVERLAP_TOKENS", "100")),
        )


def is_allowed_source(path: Path, root: Path = ROOT) -> bool:
    """Return true only for explicitly whitelisted, non-sensitive Git documents."""
    try:
        relative = path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return False
    name = path.name.lower()
    sensitive_markers = (".env", "credential", "secret", "private", ".pem", ".key")
    if any(marker in name for marker in sensitive_markers):
        return False
    return (
        relative == "AGENTS.md"
        or (relative.startswith("docs/") and relative.endswith(".md"))
        or (
            relative.startswith("contracts/dummy-data/")
            and (relative.endswith(".json") or relative.endswith(".md"))
        )
    )


def iter_sources(root: Path = ROOT) -> list[Path]:
    candidates = [root / "AGENTS.md"]
    candidates.extend((root / "docs").glob("**/*.md"))
    candidates.extend((root / "contracts" / "dummy-data").glob("**/*.json"))
    candidates.extend((root / "contracts" / "dummy-data").glob("**/*.md"))
    return sorted((p for p in candidates if p.is_file() and is_allowed_source(p, root)), key=lambda p: p.as_posix())
