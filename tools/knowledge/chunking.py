"""Deterministic Markdown, OpenAPI, and JSON chunkers."""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from config import PROJECT

HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.MULTILINE)


@dataclass(frozen=True)
class Chunk:
    source_path: str
    document_type: str
    section: str
    content: str
    chunk_index: int
    extras: dict[str, str]

    @property
    def id(self) -> str:
        raw = f"{self.source_path}\x1f{self.section}\x1f{self.chunk_index}".encode()
        return hashlib.sha256(raw).hexdigest()

    def metadata(self, file_hash: str) -> dict[str, str | int]:
        base: dict[str, str | int] = {
            "project": PROJECT,
            "source_path": self.source_path,
            "document_type": self.document_type,
            "section": self.section,
            "feature": self.extras.get("feature", ""),
            "status": "active",
            "version": "1",
            "chunk_index": self.chunk_index,
            "content_hash": hashlib.sha256(self.content.encode()).hexdigest(),
            "file_hash": file_hash,
        }
        base.update({key: value for key, value in self.extras.items() if value})
        return base


def _token_count(text: str) -> int:
    return max(1, len(re.findall(r"\S+", text)))


def _split_text(text: str, target_tokens: int, overlap_tokens: int) -> list[str]:
    """Split at paragraph boundaries, retaining a modest word overlap when needed."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text.strip()) if p.strip()]
    if not paragraphs:
        return []
    output: list[str] = []
    current: list[str] = []
    current_count = 0
    for paragraph in paragraphs:
        size = _token_count(paragraph)
        if current and current_count + size > target_tokens:
            output.append("\n\n".join(current))
            tail = re.findall(r"\S+", output[-1])[-overlap_tokens:] if overlap_tokens else []
            current = [" ".join(tail)] if tail else []
            current_count = len(tail)
        if size > target_tokens and not current:
            words = re.findall(r"\S+", paragraph)
            step = max(1, target_tokens - overlap_tokens)
            for start in range(0, len(words), step):
                output.append(" ".join(words[start : start + target_tokens]))
            continue
        current.append(paragraph)
        current_count += size
    if current:
        output.append("\n\n".join(current))
    return output


def markdown_chunks(source_path: str, text: str, target_tokens: int, overlap_tokens: int) -> list[Chunk]:
    matches = list(HEADING.finditer(text))
    sections: list[tuple[str, str]] = []
    if not matches:
        sections.append((Path(source_path).stem, text))
    else:
        preface = text[: matches[0].start()].strip()
        if preface:
            sections.append((Path(source_path).stem, preface))
        stack: list[tuple[int, str]] = []
        for index, match in enumerate(matches):
            level = len(match.group(1))
            title = match.group(2)
            stack = [(l, t) for l, t in stack if l < level]
            stack.append((level, title))
            end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
            body = text[match.start() : end].strip()
            sections.append((" > ".join(t for _, t in stack), body))
    chunks: list[Chunk] = []
    ordinal = 0
    for section, body in sections:
        parts = _split_text(body, target_tokens, overlap_tokens)
        for part in parts:
            if _token_count(part) < 2:
                continue
            feature = section.removeprefix("Feature: ").split(" > ")[0] if "Feature:" in section else ""
            task_match = re.search(r"\bTASK-\d{3}\b", part)
            phase_match = re.search(r"\bPhase\s+\d+[^|\n]*", part, re.IGNORECASE)
            extras = {"feature": feature}
            if task_match:
                extras["task_id"] = task_match.group(0)
            if phase_match:
                extras["phase"] = phase_match.group(0).strip()
            chunks.append(Chunk(source_path, "markdown", section, part, ordinal, extras))
            ordinal += 1
    return chunks


def _yaml_text(value: Any) -> str:
    return yaml.safe_dump(value, allow_unicode=True, sort_keys=False).strip()


def openapi_chunks(source_path: str, text: str) -> list[Chunk]:
    spec = yaml.safe_load(text) or {}
    chunks: list[Chunk] = []
    ordinal = 0
    for api_path, path_item in (spec.get("paths") or {}).items():
        for method, operation in path_item.items():
            if method.lower() not in {"get", "post", "put", "patch", "delete", "head", "options"}:
                continue
            operation = operation or {}
            operation_id = operation.get("operationId", f"{method}-{api_path}")
            content = f"OpenAPI operation\noperationId: {operation_id}\nmethod: {method.upper()}\npath: {api_path}\n\n{_yaml_text(operation)}"
            chunks.append(Chunk(source_path, "api_operation", operation_id, content, ordinal, {
                "operation_id": operation_id, "http_method": method.upper(), "api_path": api_path,
            }))
            ordinal += 1
    components = spec.get("components") or {}
    for name, schema in (components.get("schemas") or {}).items():
        content = f"OpenAPI schema: {name}\n\n{_yaml_text(schema)}"
        chunks.append(Chunk(source_path, "api_schema", name, content, ordinal, {"schema_name": name}))
        ordinal += 1
    for name, scheme in (components.get("securitySchemes") or {}).items():
        chunks.append(Chunk(source_path, "api_security", name, f"OpenAPI security scheme: {name}\n\n{_yaml_text(scheme)}", ordinal, {}))
        ordinal += 1
    for name, response in (components.get("responses") or {}).items():
        chunks.append(Chunk(source_path, "api_response", name, f"OpenAPI common response: {name}\n\n{_yaml_text(response)}", ordinal, {}))
        ordinal += 1
    return chunks


def json_chunks(source_path: str, text: str) -> list[Chunk]:
    value = json.loads(text)
    return [Chunk(source_path, "contract_example", Path(source_path).stem, json.dumps(value, ensure_ascii=False, indent=2), 0, {})]


def chunks_for_file(path: Path, root: Path, target_tokens: int, overlap_tokens: int) -> list[Chunk]:
    source_path = path.resolve().relative_to(root.resolve()).as_posix()
    text = path.read_text(encoding="utf-8")
    if source_path == "contracts/openapi.yaml":
        return openapi_chunks(source_path, text)
    if path.suffix == ".json":
        return json_chunks(source_path, text)
    return markdown_chunks(source_path, text, target_tokens, overlap_tokens)
