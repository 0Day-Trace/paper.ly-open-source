import os
import uuid
from datetime import datetime, timezone, timedelta

from pdftool_config import (
    USE_LOCAL_STORAGE,
    get_daily_file_limit,
    get_max_file_size,
    get_retention_hours,
    limits_enabled,
)
from local_storage import get_user_files as local_get_user_files
from local_storage import save_file as local_save_file

BUCKET = "pdf-outputs"

_storage_client = None
_db_client = None


def _get_storage_client():
    """Client for file storage operations (upload, download, public URL).
    Priority: STORAGE_URL/KEY (any vendor) → SUPABASE_URL/KEY (backward compatible)."""
    global _storage_client
    if USE_LOCAL_STORAGE:
        return None
    if _storage_client is not None:
        return _storage_client
    from supabase import create_client
    url = os.environ.get("STORAGE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("STORAGE_KEY") or os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError(
            "No storage credentials found. Set STORAGE_URL + STORAGE_KEY "
            "(dedicated storage service), or SUPABASE_URL + SUPABASE_KEY (Supabase for both)."
        )
    _storage_client = create_client(url, key)
    return _storage_client


def _get_db_client():
    """Client for database operations (pdf_files table queries).
    Priority: DB_URL/KEY (any vendor) → SUPABASE_URL/KEY (backward compatible)."""
    global _db_client
    if USE_LOCAL_STORAGE:
        return None
    if _db_client is not None:
        return _db_client
    from supabase import create_client
    url = os.environ.get("DB_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("DB_KEY") or os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError(
            "No database credentials found. Set DB_URL + DB_KEY "
            "(dedicated database service), or SUPABASE_URL + SUPABASE_KEY (Supabase for both)."
        )
    _db_client = create_client(url, key)
    return _db_client


def check_count_limit(user_id):
    """Check only the daily file count. Call BEFORE processing starts."""
    if not limits_enabled():
        return True, None
    daily_limit = get_daily_file_limit()
    if daily_limit is None:
        return True, None
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    if USE_LOCAL_STORAGE:
        from local_storage import _load_manifest
        count = sum(
            1
            for row in _load_manifest()
            if row.get("user_id") == user_id and row.get("created_at", "") >= cutoff
        )
    else:
        result = (
            _get_db_client().table("pdf_files")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .gte("created_at", cutoff)
            .execute()
        )
        count = result.count or 0
    if count >= daily_limit:
        return False, f"Daily limit of {daily_limit} files reached. Try again tomorrow."
    return True, None


def check_limits(user_id, file_size):
    if not limits_enabled():
        return True, None

    max_size = get_max_file_size()
    if max_size is not None and file_size > max_size:
        mb = round(max_size / (1024 * 1024))
        return False, f"File exceeds {mb}MB limit"

    daily_limit = get_daily_file_limit()
    if daily_limit is None:
        return True, None

    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    if USE_LOCAL_STORAGE:
        from local_storage import _load_manifest
        count = sum(
            1
            for row in _load_manifest()
            if row.get("user_id") == user_id and row.get("created_at", "") >= cutoff
        )
    else:
        result = (
            _get_db_client().table("pdf_files")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .gte("created_at", cutoff)
            .execute()
        )
        count = result.count or 0

    if count >= daily_limit:
        return False, f"Daily limit of {daily_limit} files reached. Try again tomorrow."
    return True, None


def upload_output(file_path, user_id, original_filename, tool=None, base_url: str = ""):
    if USE_LOCAL_STORAGE:
        url, created_at = local_save_file(
            file_path, user_id, original_filename, tool=tool, base_url=base_url
        )
        return url, created_at

    file_size = os.path.getsize(file_path)
    file_name = os.path.basename(file_path)
    storage_path = f"{user_id}/{uuid.uuid4()}_{file_name}"

    storage = _get_storage_client()
    with open(file_path, "rb") as f:
        storage.storage.from_(BUCKET).upload(
            path=storage_path,
            file=f,
            file_options={"content-type": "application/octet-stream"},
        )

    created_at = datetime.now(timezone.utc).isoformat()
    _get_db_client().table("pdf_files").insert({
        "user_id": user_id,
        "file_name": original_filename,
        "file_path": storage_path,
        "file_size_bytes": file_size,
        "tool": tool,
    }).execute()

    public_url = storage.storage.from_(BUCKET).get_public_url(storage_path)
    return public_url, created_at


def resolve_supabase_download(file_id: str, user_id: str):
    result = (
        _get_db_client().table("pdf_files")
        .select("file_name, file_path")
        .eq("id", file_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    row = result.data[0]
    path = row.get("file_path")
    name = row.get("file_name") or "download.bin"
    if not path:
        return None
    try:
        data = _get_storage_client().storage.from_(BUCKET).download(path)
    except Exception:
        return None
    return data, name


def get_user_files(user_id, base_url: str = ""):
    retention = get_retention_hours()
    if USE_LOCAL_STORAGE:
        files = local_get_user_files(user_id, retention)
        if base_url:
            for item in files:
                if item.get("url", "").startswith("/"):
                    item["url"] = f"{base_url.rstrip('/')}{item['url']}"
        return files

    db = _get_db_client()
    storage = _get_storage_client()
    query = (
        db.table("pdf_files")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
    )
    if retention is not None:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=retention)).isoformat()
        query = query.gte("created_at", cutoff)

    result = query.execute()
    files = []
    for row in result.data:
        storage_path = row.get("file_path", "")
        public_url = storage.storage.from_(BUCKET).get_public_url(storage_path) if storage_path else ""
        files.append({
            "id": row["id"],
            "file_name": row["file_name"],
            "file_size_bytes": row["file_size_bytes"],
            "created_at": row["created_at"],
            "tool": row.get("tool"),
            "url": public_url,
        })
    return files
