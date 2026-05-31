# Contributing to paper.ly

Thanks for taking the time to contribute. This document explains how the project is set up, the conventions to follow, and the process for getting a pull request merged.

---

## Getting started

### Fork and clone

```bash
git clone https://github.com/your-username/paper.ly.git
cd paper.ly
```

### Set up backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

### Set up frontend

```bash
cd frontend
npm install
npm start
```

The app runs at `http://localhost:3000` with the default self-host config.

---

## Project structure

```
paper.ly/
  backend/
    app.py                  — all Flask routes
    pdftool_config.py       — runtime config (storage mode, limits, deployment)
    deployment_config.py    — reads deployment.config.json
    supabase_helper.py      — storage + database abstraction
    local_storage.py        — local disk storage
    pdf_to_img.py           — PDF page rendering helpers
    requirements.txt
    Dockerfile
    nixpacks.toml           — Railway deployment config

  frontend/
    src/
      App.jsx               — main app shell + tool grid
      config.js             — config resolution logic (read this first)
      deployment.config.json     — the one config file you edit
      deployment.config.example.json
      [ToolName].jsx         — one file per PDF tool
      components/            — shared UI components
      context/               — React context (ServerConfigContext)
      hooks/                 — custom hooks
    public/
      icons/organization.png — replace with your logo for org mode

  docker-compose.yml
  ARCHITECTURE.md            — deep technical walkthrough
  HOSTING.md                 — deployment guide
  CONTRIBUTING.md            — this file
  SECURITY.md
  LICENSE
```

Read **[ARCHITECTURE.md](ARCHITECTURE.md)** for a full explanation of how the frontend and backend work together.

---

## Making changes

### Adding a new PDF tool

1. **Backend** — add a new route in `app.py` following the existing pattern:
   - Accept `multipart/form-data` with `file` and `user_id`
   - Process with PyMuPDF / PikePDF / Pillow
   - Call `finish(output_path, user_id, filename, tool_name)` at the end
   - Use a `try/finally` block that calls `cleanup()` to delete temp files

2. **Frontend** — create `frontend/src/YourToolName.jsx`:
   - Use `DropZone` for file input
   - Call the backend via `axios.post(\`\${API_BASE}/your-route\`, formData)`
   - On success, call the `onComplete` prop with `{ url, file_name, created_at }`
   - Use `ToolShell` as the outer wrapper

3. **Register the tool** in `App.jsx` — add an entry to the tools array with `id`, `label`, `icon`, and the component.

### Editing config behavior

Config logic lives in two places:
- **Frontend:** `frontend/src/config.js` — `mergeServerConfig()`, `resolveDeployment()`, `getStorageNotice()`
- **Backend:** `backend/pdftool_config.py` — `get_deployment()`, `limits_enabled()`, `public_config()`

Both read from the same `deployment.config.json` file.

---

## Code style

### Python (backend)

- Follow PEP 8.
- All routes use `try/finally` to guarantee `cleanup()` runs.
- No credentials or secrets in source files — use environment variables.
- Keep `app.py` route handlers short; move logic into helper modules.

### JavaScript / React (frontend)

- Functional components with hooks — no class components.
- Use `const` and arrow functions.
- Tool components are self-contained — they receive `onComplete` and `onBack` as props.
- Use `useServerConfig()` to read deployment config inside components — never import `config.js` directly in tool components.

---

## Pull request process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes. Test locally with both local storage (no env vars) and, if relevant, with Supabase.

3. Keep PRs focused — one feature or fix per PR. Avoid unrelated refactors in the same PR.

4. Update `ARCHITECTURE.md` if you change how the system works at a structural level.

5. Write a clear PR description:
   - What does this change?
   - Why is it needed?
   - How was it tested?

6. Open the PR against the `main` branch.

---

## Reporting bugs

Open a GitHub issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser / OS / Python version if relevant
- Any error messages from the browser console or backend terminal

---

## Security issues

Do not open a public GitHub issue for security vulnerabilities. See **[SECURITY.md](SECURITY.md)** for the responsible disclosure process.
