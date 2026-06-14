# Security Policy

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

If you find a security issue — including path traversal in file handling, credential exposure, authentication bypass, dependency vulnerabilities, or anything else that could harm users or operators — please report it privately.

**How to report:**  
Open a [GitHub Security Advisory](https://github.com/0Day-Trace/paper.ly/security/advisories/new) via the repository's **Security** tab → "Report a vulnerability".

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- A suggested fix if you have one

You can expect an acknowledgement within **48 hours** and a fix or mitigation timeline within **7 days** for confirmed issues.

---

## Scope

**In scope:**
- Flask backend (`backend/`) — file upload/download handling, route logic, storage credential handling
- React frontend (`frontend/`) — client-side input handling, config exposure
- File processing pipeline — PyMuPDF, pikepdf, Pillow, reportlab, LibreOffice subprocess
- Dependency vulnerabilities with a known public exploit

**Out of scope:**
- Theoretical issues in third-party libraries with no known exploit (report those upstream)
- Social engineering or phishing
- Issues that require physical access to the server
- Denial-of-service via extremely large files (mitigated by `flaskUploadLimitMb` config)

---

## Security model

### No user accounts

User identity is a UUID stored in the browser's `localStorage` (`pdf_user_id`). There are no passwords, sessions, or tokens to steal or hijack. Anyone who obtains a `user_id` value can list and download files associated with that ID — this is by design for a no-account tool. Operators running in **organization mode** with sensitive documents should add authentication at the reverse proxy layer before exposing the service.

### Temporary files

All uploaded files are saved to `backend/uploads/` with a UUID prefix and deleted in `finally` blocks regardless of whether processing succeeds or fails. Output files are deleted after being uploaded to storage or returned to the browser. Disk usage stays near zero under normal operation.

In **local storage mode**, processed outputs land in `backend/local_outputs/` and are served via `/download/<file_id>?user_id=...`. In **Supabase mode**, outputs are stored in the cloud and served directly from the CDN — the backend is not in the download path.

### Credentials are never in source files

Supabase URLs, keys, and all other secrets are loaded from environment variables only. `deployment.config.json` is committed to the repository and **must never contain credentials**. The file only holds non-secret configuration (deployment mode, UI colors, limits, presets).

### CORS

The backend restricts CORS to the configured frontend origin via the `CORS_ORIGINS` environment variable. In production this should be set to your exact frontend domain.

### Upload size limits

Flask rejects uploads above `flaskUploadLimitMb` (default 210 MB) at the framework level before any processing starts, returning a clean 413 response. Per-user daily limits and file size caps are configurable in `deployment.config.json`.

### Pre-flight limit checks

All processing routes register in `_PROCESSING_ROUTES`. A `before_request` hook checks per-user daily limits before any file is saved or processed — users over limit get a 429 immediately.

### LibreOffice subprocess

Office file conversion runs LibreOffice in a headless subprocess with `--norestore --nodefault --nofirststartwizard` flags. The subprocess has a configurable timeout (`sofficeTimeoutSeconds`, default 120s). Input filenames are sanitized with `secure_filename()` before being passed to the subprocess. Non-ASCII filenames that `secure_filename()` would blank out are replaced with a UUID-based fallback.

### Filename sanitization

All uploaded filenames go through `safe_name()` which wraps `werkzeug.utils.secure_filename`. If `secure_filename` returns an empty string (e.g. for Arabic or CJK filenames), a `file_{uuid}` fallback is used. All temp files include a UUID prefix to prevent collisions under concurrent load.

---

## Known limitations

- **UUID-based identity is not authenticated.** A `user_id` value is not a secret — it is stored in plaintext in `localStorage` and sent in every request. For sensitive internal deployments, add authentication (e.g. OAuth, SSO, HTTP Basic Auth) at the reverse proxy before exposing paper.ly.

- **Local storage files are keyed only by `user_id`.** The `/download/<file_id>?user_id=...` endpoint validates that the `user_id` matches the file's owner, but the file ID itself is not a secret URL. Operators who need stricter access control should use Supabase mode with signed URLs or restrict network access to the backend.

- **No virus scanning.** Uploaded files are processed by Python libraries and LibreOffice. Malformed or malicious PDF/Office files could potentially exploit parsing vulnerabilities in those libraries. Keep PyMuPDF, pikepdf, and LibreOffice updated.

- **LibreOffice runs as the same user as the backend process.** Ensure the backend runs under a low-privilege user account in production.

---

## Dependency security

Key production dependencies and their roles:

| Package | Role | Keep updated for |
|---|---|---|
| `PyMuPDF` | PDF parsing and rendering | PDF parser CVEs |
| `pikepdf` | PDF encryption / decryption | PDF crypto CVEs |
| `Pillow` | Image processing | Image decoder CVEs |
| `reportlab` | Watermark text rendering | PDF generation CVEs |
| `pypdf` | PDF metadata / split | Parser CVEs |
| `Flask` + `Werkzeug` | HTTP server | Web framework CVEs |
| `LibreOffice` | Office file conversion | Document parser CVEs |

Run `pip list --outdated` periodically and update `requirements.txt` with pinned versions after testing.

---

## Recommended production hardening

- Run the backend as a non-root, low-privilege OS user
- Set `CORS_ORIGINS` to your exact frontend domain — never leave it as `*` in production
- Set `FLASK_DEBUG=0` in production
- Keep `backend/uploads/` and `backend/outputs/` outside the web root (not publicly accessible via Nginx)
- Set disk quotas on the partition hosting `backend/local_outputs/`
- Enable HTTPS everywhere — use Certbot or your platform's TLS termination
- Regularly update all Python dependencies and LibreOffice
- If using Supabase, use a **service role key** with the minimum required bucket permissions — not the anon key for write operations
