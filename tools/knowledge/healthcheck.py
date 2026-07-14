#!/usr/bin/env python
"""Check Chroma reachability and collection availability."""
from __future__ import annotations

import sys

import chromadb

from config import KnowledgeConfig


def main() -> int:
    config = KnowledgeConfig.from_env()
    try:
        client = chromadb.HttpClient(host=config.host, port=config.port)
        client.heartbeat()
        collection = client.get_collection(config.collection)
        print(f"healthy: collection={config.collection} records={collection.count()}")
        return 0
    except Exception as exc:
        print(f"unhealthy: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
