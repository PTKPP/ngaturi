from pathlib import Path

from chunking import chunks_for_file, markdown_chunks, openapi_chunks
from config import ROOT, is_allowed_source, iter_sources


def test_markdown_chunks_keep_headings_and_stable_ids():
    text = "# Root\n\nIntro text.\n\n## Feature: RSVP\n\n" + "Useful rule. " * 40
    chunks = markdown_chunks("docs/example.md", text, 20, 4)
    assert len(chunks) >= 2
    assert all(chunk.section for chunk in chunks)
    assert len({chunk.id for chunk in chunks}) == len(chunks)
    assert chunks[0].id == markdown_chunks("docs/example.md", text, 20, 4)[0].id


def test_openapi_is_chunked_by_operation_and_schema():
    text = (ROOT / "contracts/openapi.yaml").read_text(encoding="utf-8")
    chunks = openapi_chunks("contracts/openapi.yaml", text)
    assert any(c.extras.get("operation_id") == "getPublicInvitation" for c in chunks)
    assert any(c.extras.get("schema_name") == "PublicInvitation" for c in chunks)
    assert all(c.document_type != "markdown" for c in chunks)


def test_whitelist_and_sensitive_exclusion():
    assert is_allowed_source(ROOT / "AGENTS.md")
    assert is_allowed_source(ROOT / "docs/PRD.md")
    assert not is_allowed_source(ROOT / ".env")
    assert not is_allowed_source(ROOT / "apps/backend/main.go")
    assert all(".env" not in source.name for source in iter_sources())


def test_metadata_has_required_fields():
    path = ROOT / "docs/PRD.md"
    chunk = chunks_for_file(path, ROOT, 700, 100)[0]
    metadata = chunk.metadata("file-hash")
    assert {"project", "source_path", "document_type", "section", "feature", "status", "version", "chunk_index", "content_hash", "file_hash"} <= set(metadata)
