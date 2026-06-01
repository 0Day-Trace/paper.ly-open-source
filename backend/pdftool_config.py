import os
from typing import Any, Optional

from deployment_config import (
    api_base_points_to_localhost,
    get_file_deployment,
    get_organization_name,
    load_deployment_file,
)

OFFICIAL_API_HOST = os.environ.get("OFFICIAL_API_HOST", "paper-ly.onrender.com")

def _has_remote_storage_credentials() -> bool:
    # Combined Supabase credentials — covers both storage and DB (backward compatible)
    if os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_KEY"):
        return True
    # Split credentials — any vendor, separate services for storage and DB
    storage_ok = bool(os.environ.get("STORAGE_URL") and os.environ.get("STORAGE_KEY"))
    db_ok = bool(os.environ.get("DB_URL") and os.environ.get("DB_KEY"))
    return storage_ok and db_ok

USE_LOCAL_STORAGE = not _has_remote_storage_credentials()


def _limits_from_file() -> dict:
    raw = load_deployment_file().get("limits") or {}
    return raw if isinstance(raw, dict) else {}


def _resolve_limits_enabled() -> bool:
    flag = (os.environ.get("PDFTOOL_LIMITS") or "").strip().lower()
    if flag in ("1", "true", "yes"):
        return True
    if flag in ("0", "false", "no"):
        return False
    file_flag = _limits_from_file().get("enabled")
    if file_flag is True:
        return True
    if file_flag is False:
        return False
    return get_deployment() == "official"


def get_deployment() -> str:
    explicit = (os.environ.get("PDFTOOL_DEPLOYMENT") or "").strip().lower()
    if explicit in ("official", "selfhost", "organization"):
        return explicit
    if os.environ.get("PDFTOOL_OFFICIAL", "").lower() in ("1", "true", "yes"):
        return "official"

    file_mode = get_file_deployment()
    if file_mode == "official":
        return "official"

    # Local disk + localhost API → selfhost (not when deployment is official)
    if USE_LOCAL_STORAGE and api_base_points_to_localhost():
        return "selfhost"

    if file_mode and file_mode != "auto":
        return file_mode

    if USE_LOCAL_STORAGE:
        return "selfhost"
    return "organization"


def limits_enabled() -> bool:
    return _resolve_limits_enabled()


def get_max_file_size() -> Optional[int]:
    raw = os.environ.get("MAX_FILE_SIZE_MB")
    if raw:
        try:
            return int(raw) * 1024 * 1024
        except ValueError:
            pass
    file_mb = _limits_from_file().get("maxFileSizeMb")
    if file_mb is not None:
        try:
            return int(file_mb) * 1024 * 1024
        except (ValueError, TypeError):
            pass
    if limits_enabled():
        return 200 * 1024 * 1024
    return None


def get_daily_file_limit() -> Optional[int]:
    raw = os.environ.get("DAILY_FILE_LIMIT")
    if raw:
        try:
            return int(raw)
        except ValueError:
            pass
    file_limit = _limits_from_file().get("dailyFileLimit")
    if file_limit is not None:
        try:
            return int(file_limit)
        except (ValueError, TypeError):
            pass
    if limits_enabled():
        return 10
    return None


def get_retention_hours() -> Optional[int]:
    raw = os.environ.get("FILE_RETENTION_HOURS")
    if raw:
        try:
            return int(raw)
        except ValueError:
            pass
    file_hours = _limits_from_file().get("retentionHours")
    if file_hours is not None:
        try:
            return int(file_hours)
        except (ValueError, TypeError):
            pass
    if get_deployment() == "official":
        return 6
    return None


def _advanced_from_file() -> dict:
    raw = load_deployment_file().get("advanced") or {}
    return raw if isinstance(raw, dict) else {}


def get_flask_upload_limit_mb() -> int:
    """Max upload size enforced at Flask layer (before any processing). Default: 210 MB."""
    raw = os.environ.get("FLASK_UPLOAD_LIMIT_MB")
    if raw:
        try:
            return int(raw)
        except ValueError:
            pass
    v = _advanced_from_file().get("flaskUploadLimitMb")
    if v is not None:
        try:
            return int(v)
        except (ValueError, TypeError):
            pass
    return 210


def get_soffice_timeout() -> int:
    """Seconds to wait for LibreOffice conversion. Default: 120."""
    raw = os.environ.get("SOFFICE_TIMEOUT")
    if raw:
        try:
            return int(raw)
        except ValueError:
            pass
    v = _advanced_from_file().get("sofficeTimeoutSeconds")
    if v is not None:
        try:
            return int(v)
        except (ValueError, TypeError):
            pass
    return 120


def get_compress_presets() -> dict:
    """
    Returns the three compression presets (screen / ebook / printer).
    Each preset has 'quality' (JPEG 1-95) and 'max_dpi' (int).
    Values come from deployment.config.json advanced.compressPresets,
    with hardcoded defaults as fallback.
    """
    defaults = {
        "screen":  {"quality": 40, "max_dpi": 96},
        "ebook":   {"quality": 60, "max_dpi": 150},
        "printer": {"quality": 80, "max_dpi": 200},
    }
    file_presets = _advanced_from_file().get("compressPresets") or {}
    if not isinstance(file_presets, dict):
        return defaults
    merged = {}
    for name, default_vals in defaults.items():
        override = file_presets.get(name) or {}
        merged[name] = {
            "quality": int(override.get("quality", default_vals["quality"])),
            "max_dpi": int(override.get("maxDpi",  default_vals["max_dpi"])),
        }
    return merged


def public_config() -> dict:
    retention = get_retention_hours()
    max_bytes = get_max_file_size()
    daily = get_daily_file_limit()
    ui = load_deployment_file().get("ui") or {}
    return {
        "deployment": get_deployment(),
        "organization_name": get_organization_name(),
        "storage_mode": "local" if USE_LOCAL_STORAGE else "supabase",
        "limits_enabled": limits_enabled(),
        "retention_hours": retention,
        "max_file_size_mb": round(max_bytes / (1024 * 1024)) if max_bytes else None,
        "daily_file_limit": daily,
        "soffice_timeout_seconds": get_soffice_timeout(),
        "flask_upload_limit_mb": get_flask_upload_limit_mb(),
        "compress_presets": get_compress_presets(),
        "ui": ui if isinstance(ui, dict) else {},
    }
