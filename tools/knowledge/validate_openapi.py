#!/usr/bin/env python
"""Lightweight, repeatable OpenAPI contract and example validation."""
from __future__ import annotations

import json
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", category=DeprecationWarning, message="jsonschema.RefResolver")
from jsonschema import Draft202012Validator, FormatChecker, RefResolver
import yaml
from openapi_spec_validator import validate

ROOT = Path(__file__).resolve().parents[2]
REQUIRED_PATHS = {
    "/api/v1/public/invitations/{slug}", "/api/v1/public/invitations/{slug}/rsvp",
    "/api/v1/public/invitations/{slug}/guestbook", "/api/v1/auth/register", "/api/v1/auth/login",
    "/api/v1/auth/refresh", "/api/v1/auth/logout", "/api/v1/invitations", "/api/v1/invitations/{id}",
    "/api/v1/invitations/{id}/publish", "/api/v1/invitations/{id}/unpublish",
    "/api/v1/invitations/{id}/guests", "/api/v1/invitations/{id}/guests/{guestId}",
}
EXAMPLE_SCHEMAS = {
    "public-invitation-response.json": "PublicInvitationSuccess",
    "rsvp-request.json": "PublicRsvpRequest",
    "rsvp-response.json": "RsvpSuccess",
    "error-response.json": "ErrorEnvelope",
}


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "contracts/archive/openapi-task-002.yaml"
    try:
        spec = yaml.safe_load(path.read_text(encoding="utf-8"))
        assert spec.get("openapi", "").startswith("3.1."), "openapi must be 3.1.x"
        validate(spec)
        missing = REQUIRED_PATHS - set(spec.get("paths", {}))
        assert not missing, f"missing paths: {sorted(missing)}"
        operations = [op for item in spec["paths"].values() for key, op in item.items() if key in {"get", "post", "patch", "put", "delete"}]
        assert all(op.get("operationId") for op in operations), "every operation needs operationId"
        schemas = spec.get("components", {}).get("schemas", {})
        for name in ("ErrorEnvelope", "PublicInvitation", "Rsvp", "Guest", "Pagination"):
            assert name in schemas, f"missing schema {name}"
        resolver = RefResolver.from_schema(spec)
        for filename, schema_name in EXAMPLE_SCHEMAS.items():
            example = ROOT / "contracts/archive/examples" / filename
            instance = json.loads(example.read_text(encoding="utf-8"))
            validator = Draft202012Validator(schemas[schema_name], resolver=resolver, format_checker=FormatChecker())
            validator.validate(instance)
    except Exception as exc:
        print(f"OpenAPI validation failed: {exc}", file=sys.stderr)
        return 1
    print(f"OpenAPI 3.1 contract valid: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
