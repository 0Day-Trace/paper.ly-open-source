# paper.ly — Architecture & How It Works

A step-by-step walkthrough of how the frontend and backend work together, from the moment a user opens the app to downloading their processed file.

---

## Overview

```
Browser (React app)
       │
       │  HTTP (axios)
       ▼
Flask backend  ──►  PyMuPDF / pikepdf / LibreOffice  (processing)
       │
       ├──► local disk (backend/local_outputs/)       if no storage env vars
       └──► Supabase / remote storage                 if SUPABASE_URL etc. set
```

The frontend and backend are completely separate processes. They communicate only over HTTP. The frontend never touches PDF files directly — all processing happens on the backend.

---

## Step 1 — App startup (frontend)

When the React app first loads:

1. **`config.js` runs** — reads `deployment.config.json` and builds `DEFAULT_SERVER_CONFIG`. This determines the initial deployment mode (`selfhost`, `organization`, `official`) and the API base URL.

2. **`ServerConfigContext`** fires a `GET /config` request to the backend. This fetches the live server configuration (deployment mode, limits, retention hours, storage mode, UI settings).

3. The response is merged with the local config via `mergeServerConfig()`. The backend's values win for most fields. The deployment mode from the config file always wins (it's a trusted local setting).

4. The merged config is stored in React context and made available to all components via `useServerConfig()`.

**Why two configs?** The JSON file is bundled into the frontend at build time — it's used for the initial render so there's no flash of wrong content. The backend `/config` response updates it with live values (e.g. actual storage mode, real limits).

---

## Step 2 — User selects a tool

The main `App.jsx` renders a grid of tools. Each tool is a card component that, when clicked, opens in a full-screen panel via Framer Motion animation.

Each tool is a self-contained React component (e.g. `MergePdf.jsx`, `CompressPdf.jsx`). They all follow the same pattern:

1. User drops or selects files (via `DropZone` component)
2. User configures options (page ranges, rotation, quality, etc.)
3. User clicks the action button

---

## Step 3 — File upload and processing

When the user clicks the action button, the tool component calls the backend via `axios`:

```js
const formData = new FormData()
formData.append('file', selectedFile)
formData.append('user_id', getUserId())
// ...any tool-specific options

const response = await axios.post(`${API_BASE}/compress`, formData)
```

`getUserId()` returns a UUID stored in `localStorage`. This is the only "account" system — no sign-up required, no passwords. It's used to scope file storage per browser session.

The backend receives the `multipart/form-data` request:

1. **Saves uploaded files** to `backend/uploads/` temporarily
2. **Processes the file** using the appropriate library:
   - PDF operations → **PyMuPDF** (`pymupdf`)
   - Password operations → **pikepdf**
   - Compression → **Pillow** + **pypdf** (re-compress embedded images)
   - Office conversions → **LibreOffice** (`soffice`) via subprocess
3. **Writes the output** to `backend/outputs/` temporarily
4. Calls `finish()` which handles storage and cleanup

---

## Step 4 — `finish()` — the central handoff

Every tool route ends with a call to `finish(output_path, user_id, filename, tool)`. This function:

1. **Checks limits** (if enabled) — file size cap, daily usage cap
2. **Calls `upload_output()`** from `supabase_helper.py`
3. **Deletes temp files** (`cleanup()`) and forces garbage collection
4. **Returns JSON** to the frontend: `{ url, file_name, created_at }`

---

## Step 5 — Storage branching

`upload_output()` in `supabase_helper.py` branches based on `USE_LOCAL_STORAGE`:

### Local storage path (no env vars set)

```python
# File is copied to backend/local_outputs/{user_id}/{uuid}_{filename}
# A record is appended to backend/local_outputs/manifest.json
# Download URL: https://your-backend.com/download/{id}?user_id=...
```

The backend serves the file itself via the `/download/<file_id>` endpoint.

### Remote storage path (SUPABASE_URL etc. set)

```python
# File is uploaded to Supabase Storage bucket "pdf-outputs"
#   path: {user_id}/{uuid}_{filename}
# A row is inserted into the "pdf_files" Supabase table
# Download URL: https://your-project.supabase.co/storage/v1/object/public/...
```

The download URL is a **direct Supabase public URL** — the backend is not in the delivery path at all. The file goes straight from Supabase to the user's browser.

**Two separate clients** handle this:

```
_get_storage_client()  →  STORAGE_URL/KEY  →  SUPABASE_URL/KEY
_get_db_client()       →  DB_URL/KEY       →  SUPABASE_URL/KEY
```

This lets you point file storage and the metadata database at completely different services.

---

## Step 6 — Download ready page (frontend)

When the backend responds with `{ url, file_name, created_at }`, the tool component transitions to `DownloadReadyPage`. This component:

1. Shows the filename, file size (if available), and a download button
2. The download button triggers `downloadRemoteFile()` from `download.js`, which:
   - Fetches the file via the URL returned by the backend
   - Creates a temporary `<a>` element with `download` attribute
   - Programmatically clicks it to trigger the browser's native download
   - Cleans up the object URL after

The filename shown and used for the download is the **original upload filename** (passed as `original_filename` through the whole chain), never the internal UUID-prefixed storage path.

---

## Step 7 — Recent files

The app has a "Recent" panel that shows the user's past processed files. When opened:

1. Frontend calls `GET /files?user_id={id}`
2. Backend queries either `manifest.json` (local) or the `pdf_files` table (remote)
3. Returns a list of `{ id, file_name, file_size_bytes, created_at, tool, url }`
4. Each entry shows a download button using the stored `url`

For remote storage, the `url` in the database is the Supabase public URL. For local storage, the URL is regenerated from the backend host at query time.

---

## Configuration system

Configuration flows in two directions:

### Build-time (frontend)

```
deployment.config.json
       │
       ▼
config.js  →  DEFAULT_SERVER_CONFIG
                    │
                    ▼
             initial React render
```

### Runtime (backend → frontend)

```
deployment.config.json  +  environment variables
              │
              ▼
       pdftool_config.py  (USE_LOCAL_STORAGE, deployment mode, limits)
              │
              ▼
       GET /config  →  public_config()
              │
              ▼
       ServerConfigContext  →  mergeServerConfig()
              │
              ▼
       all tool components (via useServerConfig())
```

Environment variables always override the JSON file. The JSON file overrides built-in defaults.

---

## Backend file layout

```
backend/
  app.py               — all Flask routes
  pdftool_config.py    — runtime config (storage mode, limits, deployment)
  deployment_config.py — reads deployment.config.json
  supabase_helper.py   — storage + database abstraction layer
  local_storage.py     — local disk storage (manifest.json + local_outputs/)
  pdf_to_img.py        — PDF page rendering helpers
  uploads/             — temp upload landing zone (cleaned after each request)
  outputs/             — temp processing output (cleaned after each request)
  local_outputs/       — permanent local storage (only in local mode)
```

---

## API routes reference

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/config` | Returns server configuration (deployment mode, limits, storage mode) |
| `POST` | `/merge` | Merge multiple PDFs |
| `POST` | `/split` | Split PDF into page ranges |
| `POST` | `/remove-pages` | Remove specific pages |
| `POST` | `/compress` | Compress PDF (re-compress images) |
| `POST` | `/rotate-pdf` | Rotate pages |
| `POST` | `/protect` | Add password to PDF |
| `POST` | `/unlock` | Remove password from PDF |
| `POST` | `/clean-metadata` | Strip PDF metadata |
| `POST` | `/pdf-to-image` | Convert PDF pages to images |
| `POST` | `/image-to-pdf` | Convert images to PDF |
| `POST` | `/pptx-convert` | Convert PowerPoint to PDF |
| `POST` | `/docx-convert` | Convert Word document to PDF |
| `POST` | `/excel-convert` | Convert Excel spreadsheet to PDF |
| `POST` | `/thumbnail` | Generate PDF thumbnail |
| `POST` | `/pagecount` | Get page count of a PDF |
| `POST` | `/page-thumbnail` | Render a specific page as an image |
| `GET` | `/download/<file_id>` | Serve a file (local storage mode only) |
| `GET` | `/files` | List recent files for a user |

---

## User identity

There are no user accounts. Each browser generates a UUID on first visit and stores it in `localStorage` as `pdf_user_id`. This ID is sent with every request as `user_id` in the form data or query string.

The backend uses it to:
- Scope file storage (files are stored under `{user_id}/` path)
- Enforce per-user limits (daily file count)
- Filter recent files (`GET /files?user_id=...`)

Clearing `localStorage` generates a new identity — the user's previous files are no longer listed (though they still exist on disk/in storage until the retention period expires).

---

## Office document conversion

Word, Excel, and PowerPoint conversions use **LibreOffice** running as a subprocess:

```python
subprocess.run([
    "soffice", "--headless", "--convert-to", "pdf",
    "--outdir", output_dir, input_file
])
```

LibreOffice must be installed on the host machine. The `Dockerfile` and `nixpacks.toml` handle this automatically for containerized deployments.

---

## Temp file cleanup

Every route uses a `try/finally` block. The `cleanup()` function runs in `finally` — it deletes all temp files from `uploads/` and `outputs/` and calls `gc.collect()` to free memory immediately. This keeps disk usage near zero even under heavy load.
