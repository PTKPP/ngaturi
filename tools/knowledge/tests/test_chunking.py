from pathlib import Path

from chunking import chunks_for_file, json_chunks, markdown_chunks
from config import ROOT, is_allowed_source, iter_sources


def test_markdown_chunks_keep_headings_and_stable_ids():
    text = "# Root\n\nIntro text.\n\n## Feature: RSVP\n\n" + "Useful rule. " * 40
    chunks = markdown_chunks("docs/example.md", text, 20, 4)
    assert len(chunks) >= 2
    assert all(chunk.section for chunk in chunks)
    assert len({chunk.id for chunk in chunks}) == len(chunks)
    assert chunks[0].id == markdown_chunks("docs/example.md", text, 20, 4)[0].id


def test_dummy_json_is_chunked_as_contract_fixture():
    chunks = json_chunks("contracts/dummy-data/users.json", '[{"id":"user-demo"}]')
    assert len(chunks) == 1
    assert chunks[0].document_type == "contract_example"
    assert chunks[0].section == "users"


def test_frontend_task_id_is_added_to_metadata():
    chunks = markdown_chunks("docs/plan.md", "# Plan\n\n## TASK-FE-001\n\nFrontend foundation rules.", 700, 100)
    assert any(chunk.extras.get("task_id") == "TASK-FE-001" for chunk in chunks)


def test_whitelist_and_sensitive_exclusion():
    assert is_allowed_source(ROOT / "AGENTS.md")
    assert is_allowed_source(ROOT / "docs/PRODUCT.md")
    assert is_allowed_source(ROOT / "contracts/dummy-data/README.md")
    assert not is_allowed_source(ROOT / "contracts/archive/openapi-task-002.yaml")
    assert not is_allowed_source(ROOT / ".env")
    assert not is_allowed_source(ROOT / "legacy/go-auth-backend/cmd/api/main.go")
    assert all(".env" not in source.name for source in iter_sources())


def test_metadata_has_required_fields():
    path = ROOT / "docs/PRODUCT.md"
    chunk = chunks_for_file(path, ROOT, 700, 100)[0]
    metadata = chunk.metadata("file-hash")
    assert {"project", "source_path", "document_type", "section", "feature", "status", "version", "chunk_index", "content_hash", "file_hash"} <= set(metadata)
