#!/usr/bin/env python
"""Synchronize whitelisted Git documents into a Chroma collection."""
from __future__ import annotations

import argparse
import hashlib
import sys
from collections import Counter
from pathlib import Path

import chromadb

from chunking import chunks_for_file
from config import ROOT, KnowledgeConfig, iter_sources
from embedding import create_embedding_function


def connect(config: KnowledgeConfig):
    client = chromadb.HttpClient(host=config.host, port=config.port)
    return client.get_or_create_collection(
        name=config.collection,
        embedding_function=create_embedding_function(config),
    )


def _file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _existing(collection, source_path: str) -> dict:
    return collection.get(where={"source_path": source_path}, include=["metadatas"])


def sync(collection, root: Path, config: KnowledgeConfig) -> Counter:
    """Upsert changed files and delete removed records; suitable for a temporary test collection."""
    summary: Counter = Counter()
    sources = iter_sources(root)
    wanted = {path.resolve().relative_to(root.resolve()).as_posix() for path in sources}
    all_records = collection.get(include=["metadatas"])
    existing_paths = {m.get("source_path") for m in (all_records.get("metadatas") or []) if m.get("source_path")}
    for stale_path in existing_paths - wanted:
        stale = _existing(collection, stale_path)
        ids = stale.get("ids") or []
        if ids:
            collection.delete(ids=ids)
            summary["chunks_deleted"] += len(ids)
    for source in sources:
        relative = source.resolve().relative_to(root.resolve()).as_posix()
        digest = _file_hash(source)
        old = _existing(collection, relative)
        previous_hashes = {m.get("file_hash") for m in (old.get("metadatas") or [])}
        if old.get("ids") and previous_hashes == {digest}:
            summary["files_skipped"] += 1
            continue
        if old.get("ids"):
            collection.delete(ids=old["ids"])
            summary["chunks_deleted"] += len(old["ids"])
        chunks = chunks_for_file(source, root, config.chunk_target_tokens, config.chunk_overlap_tokens)
        if not chunks:
            summary["errors"] += 1
            print(f"ERROR: no chunks generated for {relative}", file=sys.stderr)
            continue
        collection.upsert(
            ids=[chunk.id for chunk in chunks],
            documents=[chunk.content for chunk in chunks],
            metadatas=[chunk.metadata(digest) for chunk in chunks],
        )
        summary["files_processed"] += 1
        summary["chunks_added" if not old.get("ids") else "chunks_updated"] += len(chunks)
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--collection", help="Override collection name")
    parser.add_argument("--reindex", action="store_true", help="Delete and rebuild the explicitly named collection")
    args = parser.parse_args()
    config = KnowledgeConfig.from_env(args.collection)
    if args.reindex and not args.collection:
        parser.error("--reindex requires --collection as an explicit safety guard")
    try:
        collection = connect(config)
        if args.reindex:
            existing_ids = collection.get(include=[]).get("ids") or []
            if existing_ids:
                collection.delete(ids=existing_ids)
        summary = sync(collection, ROOT, config)
    except Exception as exc:
        print(f"ERROR: knowledge indexing failed: {exc}", file=sys.stderr)
        return 1
    print("Knowledge indexing summary")
    for key in ("files_processed", "files_skipped", "chunks_added", "chunks_updated", "chunks_deleted", "errors"):
        print(f"{key}: {summary[key]}")
    return 1 if summary["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
