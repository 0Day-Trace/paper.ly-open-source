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
        return int(raw) * 1024 * 1024
    file_mb = _limits_from_file().get("maxFileSizeMb")
    if file_mb is not None:
        return int(file_mb) * 1024 * 1024
    if limits_enabled():
        return 200 * 1024 * 1024
    return None


def get_daily_file_limit() -> Optional[int]:
    raw = os.environ.get("DAILY_FILE_LIMIT")
    if raw:
        return int(raw)
    file_limit = _limits_from_file().get("dailyFileLimit")
    if file_limit is not None:
        return int(file_limit)
    if limits_enabled():
        return 10
    return None


def get_retention_hours() -> Optional[int]:
    raw = os.environ.get("FILE_RETENTION_HOURS")
    if raw:
        return int(raw)
    file_hours = _limits_from_file().get("retentionHours")
    if file_hours is not None:
        return int(file_hours)
    if get_deployment() == "official":
        return 6
    return None


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
        "ui": ui if isinstance(ui, dict) else {},
    }
