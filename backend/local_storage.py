import json
import os
import shutil
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Tuple

STORAGE_DIR = Path(__file__).parent / "local_outputs"
MANIFEST_PATH = STORAGE_DIR / "manifest.json"


def _ensure_dirs():
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def _load_manifest() -> list:
    _ensure_dirs()
    if not MANIFEST_PATH.exists():
        return []
    try:
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def _save_manifest(rows: list) -> None:
    _ensure_dirs()
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2)


def save_file(file_path: str, user_id: str, original_filename: str, tool=None, base_url: str = "") -> Tuple[str, str]:
    _ensure_dirs()
    file_id = str(uuid.uuid4())
    user_dir = STORAGE_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    safe_name = os.path.basename(original_filename) or "output.bin"
    dest = user_dir / f"{file_id}_{safe_name}"
    shutil.copy2(file_path, dest)
    created_at = datetime.now(timezone.utc).isoformat()
    file_size = os.path.getsize(dest)

    base = (base_url or "").rstrip("/")
    public_url = f"{base}/download/{file_id}?user_id={user_id}"

    rows = _load_manifest()
    rows.append({
        "id": file_id,
        "user_id": user_id,
        "file_name": safe_name,
        "file_path": str(dest),
        "file_size_bytes": file_size,
        "created_at": created_at,
        "tool": tool,
        "url": public_url,
    })
    _save_manifest(rows)

    return public_url, created_at


def resolve_download(file_id: str, user_id: str) -> Optional[Tuple[str, str]]:
    for row in _load_manifest():
        if row.get("id") == file_id and row.get("user_id") == user_id:
            path = row.get("file_path")
            if path and os.path.isfile(path):
                return path, row.get("file_name") or "download.bin"
    return None


def get_user_files(user_id: str, retention_hours: Optional[int]) -> list:
    rows = [r for r in _load_manifest() if r.get("user_id") == user_id]
    if retention_hours is not None:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=retention_hours)
        filtered = []
        for row in rows:
            try:
                created = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
            except (KeyError, ValueError):
                continue
            if created >= cutoff:
                filtered.append(row)
        rows = filtered

    base_hint = os.environ.get("PDFTOOL_PUBLIC_URL", "").rstrip("/")
    files = []
    for row in sorted(rows, key=lambda r: r.get("created_at", ""), reverse=True):
        url = row.get("url")
        if not url:
            url = f"{base_hint}/download/{row['id']}?user_id={user_id}" if base_hint else f"/download/{row['id']}?user_id={user_id}"
        files.append({
            "id": row["id"],
            "file_name": row.get("file_name"),
            "file_size_bytes": row.get("file_size_bytes"),
            "created_at": row.get("created_at"),
            "tool": row.get("tool"),
            "url": url,
        })
    return files
