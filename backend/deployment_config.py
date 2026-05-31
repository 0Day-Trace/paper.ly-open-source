"""Load shared deployment.config.json (same file the frontend uses)."""
import json
from pathlib import Path
from typing import Any, Dict, Optional

def _config_candidates() -> list:
    backend_dir = Path(__file__).resolve().parent
    root = backend_dir.parent
    return [
        root / "frontend" / "src" / "deployment.config.json",
        backend_dir / "deployment.config.json",
    ]


def _resolve_config_path() -> Optional[Path]:
    for path in _config_candidates():
        if path.is_file():
            return path
    return None
_cached = None  # type: Optional[Dict[str, Any]]


def load_deployment_file() -> Dict[str, Any]:
    global _cached
    if _cached is not None:
        return _cached
    path = _resolve_config_path()
    if path is None:
        _cached = {}
        return _cached
    try:
        with open(path, encoding="utf-8") as f:
            _cached = json.load(f)
    except (OSError, json.JSONDecodeError):
        _cached = {}
    return _cached


def get_file_deployment() -> str:
    return (load_deployment_file().get("deployment") or "").strip().lower()


def get_organization_name() -> str:
    return (load_deployment_file().get("organizationName") or "").strip() or "your organization"


def api_base_points_to_localhost() -> bool:
    api = (load_deployment_file().get("apiBaseUrl") or "").lower()
    return "localhost" in api or "127.0.0.1" in api


