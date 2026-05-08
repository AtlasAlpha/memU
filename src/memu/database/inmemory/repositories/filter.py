from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Any

_VALID_FIELD_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


def matches_where(obj: Any, where: Mapping[str, Any] | None) -> bool:
    """Basic field/`__in` matcher for in-memory repos."""
    if not where:
        return True
    for raw_key, expected in where.items():
        if expected is None:
            continue
        field, op = [*raw_key.split("__", 1), None][:2]
        if not _VALID_FIELD_RE.match(str(field)):
            msg = f"Invalid filter field name '{field}'"
            raise ValueError(msg)
        actual = getattr(obj, str(field), None)
        if op == "in":
            if isinstance(expected, str):
                if actual != expected:
                    return False
            else:
                try:
                    if actual not in expected:
                        return False
                except TypeError:
                    return False
        else:
            if actual != expected:
                return False
    return True


__all__ = ["matches_where"]
