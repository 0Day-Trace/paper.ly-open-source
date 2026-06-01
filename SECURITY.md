# Security Policy

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

If you discover a security issue — including things like path traversal in file handling, credential exposure, authentication bypass, or dependency vulnerabilities — please report it privately.

**Contact:** Open a [GitHub Security Advisory](https://github.com/0Day-Trace/paper.ly-open-source/security/advisories/new) on the repository (GitHub → Security tab → "Report a vulnerability").

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- A suggested fix if you have one

You can expect an acknowledgement within 48 hours and a fix or mitigation timeline within 7 days for confirmed issues.

---

## Scope

In scope:
- The Flask backend (`backend/`)
- The React frontend (`frontend/`)
- File upload/download handling
- Storage credential handling
- Dependency vulnerabilities with a known exploit

Out of scope:
- Issues in third-party libraries with no known exploit (please report those upstream)
- Social engineering
- Issues that require physical access to the server

---

## Security model

paper.ly is designed with the following principles:

**No user accounts.** A UUID stored in `localStorage` scopes file storage per browser. There are no passwords to steal or sessions to hijack.

**Files are temporary.** In official mode, files are automatically deleted after 6 hours. In self-host / organization mode, retention is under the operator's control.

**Credentials are never in source files.** Supabase keys and other secrets are loaded from environment variables only. `deployment.config.json` is committed to the repo and must never contain credentials.

**Local processing.** All PDF processing happens on the backend — the browser never handles the raw file bytes for server-side tools.

---

## Known limitations

- The user identity system (UUID in localStorage) is not authenticated. Anyone with a `user_id` value can list or download files associated with that ID. This is by design for a no-account tool, but operators running in organization mode with sensitive documents should consider adding authentication at the reverse proxy layer.

- File uploads land in `backend/uploads/` temporarily. Ensure the server has appropriate disk quotas and that the directory is not publicly accessible.
