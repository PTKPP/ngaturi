#!/usr/bin/env python
"""Retrieve compact, filtered documentation context for an agent task."""
from __future__ import annotations

import argparse
import sys
from typing import Any

from ingest import connect
from config import KnowledgeConfig

FILTER_FIELDS = ("document_type", "feature", "task_id", "phase", "operation_id", "schema_name", "source_path")


def build_filter(args: argparse.Namespace) -> dict[str, str] | None:
    filters = {field: getattr(args, field) for field in FILTER_FIELDS if getattr(args, field, None)}
    if not filters:
        return None
    if len(filters) == 1:
        return filters
    return {"$and": [{key: value} for key, value in filters.items()]}


def retrieve(collection: Any, query: str, top_k: int, max_chars: int, where: dict | None) -> list[dict]:
    result = collection.query(query_texts=[query], n_results=max(top_k * 3, top_k), where=where, include=["documents", "metadatas", "distances"])
    documents = (result.get("documents") or [[]])[0]
    metadatas = (result.get("metadatas") or [[]])[0]
    distances = (result.get("distances") or [[]])[0]
    chosen: list[dict] = []
    used = 0
    fingerprints: set[str] = set()
    for document, metadata, distance in zip(documents, metadatas, distances):
        normalized = " ".join(document.lower().split())[:240]
        if normalized in fingerprints:
            continue
        if used + len(document) > max_chars:
            remaining = max_chars - used
            if remaining < 200:
                break
            document = document[:remaining].rsplit("\n", 1)[0]
        fingerprints.add(normalized)
        chosen.append({"document": document, "metadata": metadata, "score": 1 - float(distance)})
        used += len(document)
        if len(chosen) >= top_k or used >= max_chars:
            break
    return chosen


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--query", required=True)
    parser.add_argument("--collection")
    parser.add_argument("--top-k", type=int)
    parser.add_argument("--max-chars", type=int)
    for field in FILTER_FIELDS:
        parser.add_argument(f"--{field.replace('_', '-')}", dest=field)
    args = parser.parse_args()
    config = KnowledgeConfig.from_env(args.collection)
    try:
        collection = connect(config)
        results = retrieve(collection, args.query, args.top_k or config.top_k, args.max_chars or config.max_context_chars, build_filter(args))
    except Exception as exc:
        print(f"ERROR: knowledge search failed: {exc}", file=sys.stderr)
        return 1
    if not results:
        print("Context belum ditemukan atau tidak cukup relevan untuk query/filter ini.")
        return 0
    for index, item in enumerate(results, start=1):
        meta = item["metadata"]
        print(f"RESULT {index}")
        print(f"Source: {meta.get('source_path', 'unknown')}")
        print(f"Section: {meta.get('section', 'unknown')}")
        print(f"Type: {meta.get('document_type', 'unknown')}")
        print(f"Score: {item['score']:.3f}\n")
        print(item["document"].strip())
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
