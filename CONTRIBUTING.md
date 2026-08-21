# Contributing to paper.ly

Thanks for taking the time to contribute. This document covers local setup, project conventions, and the PR process.

> Read **[ARCHITECTURE.md](ARCHITECTURE.md)** first for a full explanation of how the system works.

---

## Local setup

### 1. Clone the repo

```bash
git clone https://github.com/0Day-Trace/paper.ly.git
cd paper.ly
```

### 2. Backend

```bash
cd backend
python -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
python app.py
```

The backend starts on `http://localhost:5000`.

**LibreOffice** must be installed separately for the office converter tools (PPTX, DOCX, XLSX). On Windows download the installer from [libreoffice.org](https://www.libreoffice.org/download). On Linux/Mac use your package manager.

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

The app opens at `http://localhost:3000`. It proxies API calls to `http://localhost:5000` by default (set via `apiBaseUrl` in `deployment.config.json`).

---

## Project structure

```
paper.ly/
├── backend/
│   ├── app.py                  All Flask routes
│   ├── pdftool_config.py       Runtime config (storage mode, limits, presets)
│   ├── deployment_config.py    Reads deployment.config.json
│   ├── supabase_helper.py      Storage + DB abstraction
│   ├── local_storage.py        Local disk storage (manifest-based)
│   ├── pdf_to_img.py           PDF page rendering helpers
│   ├── requirements.txt        Pinned Python dependencies
│   ├── Dockerfile              Production container
│   ├── nixpacks.toml           Railway deployment config
│   └── deployment.config.json  The one config file you edit
│
├── frontend/
│   └── src/
│       ├── App.jsx             App shell, tool grid, header, footer, recent panel
│       ├── config.js           Config resolution + getUserId helpers
│       ├── download.js         File download utilities
│       ├── toolUi.js           Shared accent color utilities
│       ├── deployment.config.json  Build-time config (keep in sync with backend one)
│       ├── [ToolName].jsx      One component per tool (14 total)
│       └── components/
│           ├── Aurora.jsx          WebGL aurora shader (dark mode bg)
│           ├── Grainient.jsx       WebGL grain+warp shader (light mode bg)
│           ├── DropZone.jsx        File drop target
│           ├── DownloadReadyPage.jsx  Download screen + QR code
│           ├── ToolShell.jsx       Animated tool wrapper
│           ├── StorageNotice.jsx   Storage mode banner
│           ├── ToolActionNotice.jsx  Inline info callouts
│           ├── VerticalReorderList.jsx  Drag-to-reorder list
│           └── ReorderMoveButtons.jsx   Up/down buttons
│
├── docker-compose.yml
├── ARCHITECTURE.md
└── CONTRIBUTING.md  ← this file
```

---

## Adding a new PDF tool

### Backend

Add a new route in `app.py` following this pattern:

```python
@app.route("/your-tool", methods=["POST"])
def your_tool():
    file = request.files["file"]
    user_id = get_user_id()
    file_name = os.path.splitext(file.filename)[0]
    pdf_path = f"{UPLOAD_FOLDER}/{uuid.uuid4().hex}_{safe_name(file.filename, '.pdf')}"
    file.save(pdf_path)
    out_id = uuid.uuid4().hex
    output_path = f"{OUTPUT_FOLDER}/{out_id}_{file_name}_output.pdf"
    try:
        # ← your processing here using pymupdf / pikepdf / Pillow
        doc = pymupdf.open(pdf_path)
        # ...
        doc.save(output_path)
        doc.close()
        return finish(output_path, user_id, f"{file_name}_output.pdf", tool="Your Tool")
    except Exception as e:
        cleanup(output_path)
        return jsonify({"error": str(e)}), 500
    finally:
        cleanup(pdf_path)
```

Key rules:
- Always use `try/finally` so `cleanup()` runs even on error
- Prefix temp filenames with a UUID to prevent collision under concurrent load
- Call `finish()` — never return a file path or URL yourself
- Add the route to `_PROCESSING_ROUTES` in `app.py` so pre-flight limit checks apply

### Frontend

Create `frontend/src/YourToolName.jsx`. Every tool follows the same contract:

```jsx
export default function YourToolName({ onComplete, onBack, theme }) {
  // 1. File selection via DropZone
  // 2. Options state
  // 3. Submit handler → axios.post(`${API_BASE}/your-tool`, formData)
  //    → on success: onComplete({ url, file_name, created_at })
}
```

Wrap everything in `ToolShell` for the animated open/close:

```jsx
return (
  <ToolShell title="Your Tool" accent="#HEXCOLOR" onBack={onBack} theme={theme}>
    {/* your UI */}
  </ToolShell>
)
```

Use `useServerConfig()` for any config values — never import `config.js` directly in tool components.

### Register the tool in App.jsx

Add an entry to the `TOOLS` array:

```js
{
  id: "Your Tool",          // must match the case you use in switch/if elsewhere
  label: "Your Tool",
  desc: "One-line description shown on the card",
  icon: SomeLucideIcon,
  accent: "#HEXCOLOR",
  accentLight: "#LIGHTHEX", // light mode tint for the card visual
  category: "Convert",      // "Convert" | "Organize" | "Security" | "Optimize"
}
```

Then add a case for it in the tool rendering switch in `App.jsx`.

---

## Editing the config system

Config logic lives in two places:

- **Frontend:** `frontend/src/config.js` — `mergeServerConfig()`, `resolveDeployment()`, `getRetentionHours()`, `getUserId()`
- **Backend:** `backend/pdftool_config.py` — `get_deployment()`, `limits_enabled()`, `public_config()`, `get_compress_presets()`

Both read from `deployment.config.json`. Environment variables always override the JSON file. See `ARCHITECTURE.md` for the full config flow.

---

## Code style

### Python (backend)

- Follow PEP 8.
- All routes use `try/finally` to guarantee `cleanup()` runs.
- No credentials or secrets in source files — use environment variables.
- Keep `app.py` route handlers short — move complex logic into helper modules.
- All new dependencies must be added to `requirements.txt` with pinned versions.

### JavaScript / React (frontend)

- Functional components with hooks only — no class components.
- `const` and arrow functions throughout.
- Tool components are self-contained — they receive `onComplete`, `onBack`, and `theme` as props.
- Use `useServerConfig()` for config access inside components.
- Inline styles for component-specific styles, `App.css` / `index.css` for globals.

---

## Testing locally

There is no automated test suite. Test manually:

1. Run both backend and frontend as described above.
2. Try each affected tool end-to-end: upload → process → download.
3. Test with local storage (no env vars) and, if relevant, with Supabase.
4. Test on mobile viewport sizes (browser DevTools) for any UI changes.
5. Test both light and dark themes.

---

## Pull request process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Keep PRs focused — one feature or fix per PR. Avoid unrelated refactors.

3. Update `ARCHITECTURE.md` if you change how the system works structurally (new route, new storage path, new config field, etc.).

4. Write a clear PR description:
   - What does this change?
   - Why is it needed?
   - How was it tested?
   - Any edge cases to watch out for?

5. Open the PR against `main`.

---

## Deployment

### Docker (self-host)

```bash
docker compose up --build
```

Frontend on `http://localhost:3000`, backend on `http://localhost:5000`.

For remote storage add to `.env` (git-ignored):
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-service-role-key
```

### Railway (backend only)

The `nixpacks.toml` handles everything:
- Installs LibreOffice via Nix
- Installs Python 3.11 + pip dependencies
- Starts Gunicorn with 2 workers and 150s timeout

Set these env vars in Railway:
- `SUPABASE_URL` and `SUPABASE_KEY` (for remote storage)
- `PDFTOOL_PUBLIC_URL` (your Railway backend URL — used to build download links in local storage mode)
- `PORT` is set automatically by Railway

### Frontend (Vercel / Netlify / static host)

```bash
cd frontend
npm run build
```

Set `apiBaseUrl` in `frontend/src/deployment.config.json` to your backend URL before building.

---

## Reporting bugs

Open a GitHub issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser / OS / Python version
- Error messages from browser console or backend terminal

---

## Security issues

Do not open a public GitHub issue for security vulnerabilities. Email the maintainer directly or use GitHub's private security advisory feature.
