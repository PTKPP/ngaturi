from argparse import Namespace
from pathlib import Path

from config import KnowledgeConfig
from ingest import sync
from search import build_filter, retrieve


class FakeCollection:
    def __init__(self):
        self.records = {}

    def get(self, where=None, include=None):
        records = list(self.records.items())
        if where and "source_path" in where:
            records = [(k, v) for k, v in records if v["metadata"].get("source_path") == where["source_path"]]
        return {"ids": [k for k, _ in records], "metadatas": [v["metadata"] for _, v in records]}

    def upsert(self, ids, documents, metadatas):
        for identifier, document, metadata in zip(ids, documents, metadatas):
            self.records[identifier] = {"document": document, "metadata": metadata}

    def delete(self, ids=None, where=None):
        if ids is not None:
            for identifier in ids:
                self.records.pop(identifier, None)
        elif where == {}:
            self.records.clear()

    def query(self, query_texts, n_results, where=None, include=None):
        records = list(self.records.values())
        if where and "source_path" in where:
            records = [r for r in records if r["metadata"].get("source_path") == where["source_path"]]
        records = records[:n_results]
        return {"documents": [[r["document"] for r in records]], "metadatas": [[r["metadata"] for r in records]], "distances": [[0.1 for _ in records]]}


def _write(root: Path, relative: str, content: str):
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_unchanged_sources_do_not_duplicate_and_deleted_sources_are_removed(tmp_path):
    _write(tmp_path, "AGENTS.md", "# Agent\n\nUse rules.")
    _write(tmp_path, "docs/A.md", "# A\n\nFirst content.")
    _write(tmp_path, "contracts/dummy-data/users.json", '[{"id":"user-demo"}]')
    _write(tmp_path, "contracts/archive/openapi-task-002.yaml", "openapi: 3.1.0\npaths: {}")
    collection = FakeCollection()
    config = KnowledgeConfig("x", 1, "test", "local", "model", 50, 1000, 20, 2)
    first = sync(collection, tmp_path, config)
    count = len(collection.records)
    second = sync(collection, tmp_path, config)
    assert first["files_processed"] == 3
    assert second["files_skipped"] == 3
    assert len(collection.records) == count
    (tmp_path / "docs/A.md").unlink()
    third = sync(collection, tmp_path, config)
    assert third["chunks_deleted"] >= 1
    assert all(r["metadata"]["source_path"] != "docs/A.md" for r in collection.records.values())


def test_retrieval_filter_and_character_budget():
    collection = FakeCollection()
    collection.upsert(["a", "b"], ["A" * 500, "B" * 500], [{"source_path": "docs/FEATURES.md", "section": "a", "document_type": "markdown"}, {"source_path": "docs/PRD.md", "section": "b", "document_type": "markdown"}])
    args = Namespace(document_type=None, feature=None, task_id=None, phase=None, operation_id=None, schema_name=None, source_path="docs/FEATURES.md")
    assert build_filter(args) == {"source_path": "docs/FEATURES.md"}
    results = retrieve(collection, "roles", 6, 300, build_filter(args))
    assert len(results) == 1
    assert sum(len(row["document"]) for row in results) <= 300
