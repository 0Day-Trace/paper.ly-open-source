# paper.ly — Architecture & How It Works

> Current version: **v3.0**

A complete walkthrough of how the frontend and backend work together — from app startup to file download.

---

## High-level overview

```
Browser (React SPA)
        │
        │  HTTP multipart/form-data (axios)
        ▼
Flask backend  ──►  PyMuPDF / pikepdf / Pillow / reportlab / LibreOffice
        │
        ├──► local disk  (backend/local_outputs/)   ← default, no config needed
        └──► Supabase Storage + DB                  ← when SUPABASE_URL/KEY are set
```

The frontend and backend are completely separate processes that communicate only over HTTP. The browser never touches PDF bytes directly — all processing happens on the server.

---

## Frontend stack

| Concern | Library |
|---|---|
| UI framework | React 19 |
| Animation | Framer Motion 12 |
| Dialogs / overlays | @radix-ui/react-dialog |
| Tooltips | @radix-ui/react-tooltip |
| Scroll areas | @radix-ui/react-scroll-area |
| Drag-and-drop reorder | @hello-pangea/dnd |
| Icons | lucide-react |
| HTTP client | axios |
| Toast notifications | react-hot-toast |
| WebGL backgrounds | ogl (custom Aurora + Grainient shaders) |
| Color picker | react-aria-components |
| Fonts | Instrument Serif (display) · DM Sans (UI) |

---

## Backend stack

| Concern | Library |
|---|---|
| Web framework | Flask + flask-cors |
| PDF read/write/render | PyMuPDF (fitz) |
| PDF encryption | pikepdf |
| Image processing / compression | Pillow |
| PDF metadata / split | pypdf |
| Watermark text rendering | reportlab |
| Image → PDF | img2pdf |
| Office → PDF conversion | LibreOffice (subprocess) |
| Remote storage + database | supabase-py |
| Production server | Gunicorn |

---

## Step 1 — App startup

When the React SPA first loads:

1. **`config.js` runs** — reads `deployment.config.json` (bundled at build time) and constructs `DEFAULT_SERVER_CONFIG`. This sets the initial deployment mode (`selfhost` / `organization` / `official`) and the API base URL.

2. **`ServerConfigContext`** fires a `GET /config` request to the backend, fetching live values: deployment mode, storage mode, limits, retention hours, and UI settings.

3. The response is merged with the local config via `mergeServerConfig()`. Backend values win for most fields; deployment mode from the JSON file always wins (it's a trusted local setting).

4. The merged config is stored in React context and available everywhere via `useServerConfig()`.

**Why two configs?** The JSON file gives the initial render the right values immediately. The backend `/config` response then updates with live, runtime-computed values (e.g. actual storage mode, real limits).

---

## Step 2 — Homepage

The homepage renders:

- **`PageAura`** — a full-viewport WebGL gradient anchored behind all content. In dark mode it uses the `Aurora` component (GLSL simplex noise waves, responsive `amplitude`, `blend`, and `frequency` props). In light mode it uses `Grainient` (animated grain + warp shader). Both are fully responsive — parameters change at mobile (`< 480px`) and tablet (`480–768px`) breakpoints to prevent gaps or overflow.

- **Hero section** — headline, tagline, info cards (self-hostable · offline compatible · privacy-first · open source), GitHub link, and Explore button.

- **Tool grid** — 14 tools displayed in a card grid (2 columns on mobile, 3 on desktop). Tools are filterable by category: Convert · Organize · Security · Optimize.

---

## Step 3 — Tools

### All 14 tools

| Tool | Category | Backend route | Libraries used |
|---|---|---|---|
| PDF to Image | Convert | `/pdf-to-image` | PyMuPDF |
| Image to PDF | Convert | `/image-to-pdf` | img2pdf, PyMuPDF |
| Merge PDF | Organize | `/merge` | PyMuPDF |
| Split PDF | Organize | `/split` | PyMuPDF |
| Compress PDF | Optimize | `/compress` | Pillow, PyMuPDF |
| Protect PDF | Security | `/protect` | pikepdf |
| Unlock PDF | Security | `/unlock` | pikepdf |
| Watermark PDF | Organize | `/watermark` | PyMuPDF, reportlab, Pillow |
| Clean Metadata | Security | `/clean-metadata` | PyMuPDF |
| Slides Converter | Convert | `/pptx-convert` | LibreOffice, PyMuPDF |
| Word Converter | Convert | `/docx-convert` | LibreOffice, PyMuPDF |
| Excel Converter | Convert | `/excel-convert` | LibreOffice, PyMuPDF |
| Rotate PDF | Organize | `/rotate-pdf` | PyMuPDF |
| Remove Pages | Organize | `/remove-pages` | PyMuPDF |

Each tool is a self-contained React component (`frontend/src/<ToolName>.jsx`) that:
1. Accepts files via the `DropZone` component
2. Configures options (page ranges, quality preset, password, rotation, watermark text/image, etc.)
3. Submits via `axios.post()` to the backend
4. On success, hands off `{ url, file_name, created_at }` to `DownloadReadyPage`

All tools are wrapped in `ToolShell` which handles the animated open/close transition, back navigation, and the "processing" loading state.

---

## Step 4 — File upload and processing

```js
const formData = new FormData()
formData.append('file', selectedFile)
formData.append('user_id', getUserId())   // UUID from localStorage
// ...tool-specific fields

const res = await axios.post(`${API_BASE}/compress`, formData)
// res.data = { url, file_name, created_at }
```

`getUserId()` returns a UUID stored in `localStorage` as `pdf_user_id`. This is the only "account" — no sign-up, no passwords. It scopes file storage and usage limits per browser session.

On the backend:
1. File is saved to `uploads/` with a UUID prefix (prevents filename collisions)
2. Processing runs (see tool table above)
3. Output is written to `outputs/` with a UUID prefix
4. `finish()` is called to handle storage, cleanup, and response

---

## Step 5 — `finish()` — the central handoff

Every route ends with `finish(output_path, user_id, filename, tool)`:

1. **Size limit check** — `check_limits()` in `supabase_helper.py`
2. **Upload** — `upload_output()` branches to local disk or Supabase
3. **Cleanup** — `cleanup()` deletes all temp files, calls `gc.collect()`
4. **Response** — returns `{ url, file_name, created_at }` as JSON

---

## Step 6 — Storage

`USE_LOCAL_STORAGE` is `True` when no `SUPABASE_URL` / `SUPABASE_KEY` env vars are set.

### Local storage mode (default)

```
backend/
  local_outputs/
    manifest.json          ← index of all stored files
    manifest.lock          ← file lock (prevents concurrent write corruption)
    {user_id}/
      {uuid}_{filename}    ← the actual output file
```

- Files are served by the backend's own `/download/<file_id>` endpoint
- The download URL is `{PDFTOOL_PUBLIC_URL}/download/{file_id}?user_id={user_id}`
- Expired files are pruned automatically once every 10 minutes (if `retentionHours` is set)

### Remote storage mode (Supabase)

```
Supabase Storage bucket: "pdf-outputs"
  {user_id}/{uuid}_{filename}

Supabase DB table: "pdf_files"
  id, user_id, file_name, file_size_bytes, tool, created_at, url
```

- Download URL is a direct Supabase public URL — the backend is not in the delivery path
- Two independent clients: `_get_storage_client()` for the bucket, `_get_db_client()` for the table
- These can point to different Supabase projects via `STORAGE_URL`/`STORAGE_KEY` vs `DB_URL`/`DB_KEY`

---

## Step 7 — Download ready page

`DownloadReadyPage` receives `{ url, file_name, created_at }` and renders:

- Filename and file size
- QR code (generated via `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=...`) for scanning from a phone
- Download button → `downloadRemoteFile()` fetches the file and triggers a native browser download via a temporary `<a download>` element
- Copy link button

---

## Step 8 — Recent files panel

The Recent panel (slide-in sheet) shows the user's past processed files:

1. Frontend calls `GET /files?user_id={id}`
2. Backend queries `manifest.json` (local) or the `pdf_files` Supabase table (remote)
3. Returns `[{ id, file_name, file_size_bytes, created_at, tool, url }]`
4. Each row shows: download button, QR code button

The QR button opens a **bottom sheet** on mobile (slides up from viewport bottom, full width, safe-area padding) and a floating popover on desktop (positioned to the left of the recent panel). The QR image is fetched at `320×320` and displayed at `220×220`.

---

## Configuration system

### Build-time (frontend)

```
frontend/src/deployment.config.json   ← the one file you edit
          │
          ▼
    config.js  →  DEFAULT_SERVER_CONFIG  →  initial React render
```

### Runtime (backend → frontend)

```
deployment.config.json + environment variables
          │
          ▼
    pdftool_config.py  (parses both, env vars win)
          │
          ▼
    GET /config  →  public_config()
          │
          ▼
    ServerConfigContext → mergeServerConfig()
          │
          ▼
    all components via useServerConfig()
```

### Key config fields

| Field | What it controls |
|---|---|
| `deployment` | `"auto"` (detect), `"selfhost"`, `"organization"`, `"official"` |
| `apiBaseUrl` | Backend URL used by the frontend |
| `limits.maxFileSizeMb` | Max upload size per file |
| `limits.dailyFileLimit` | Max processed files per user per day |
| `limits.retentionHours` | How long local output files are kept |
| `advanced.flaskUploadLimitMb` | Flask `MAX_CONTENT_LENGTH` (returns 413 if exceeded) |
| `advanced.sofficeTimeoutSeconds` | LibreOffice subprocess timeout |
| `advanced.compressPresets` | Quality/DPI settings for screen / ebook / printer presets |

---

## API routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/config` | Server configuration (mode, limits, storage) |
| `POST` | `/merge` | Merge multiple PDFs |
| `POST` | `/split` | Split PDF into page ranges |
| `POST` | `/remove-pages` | Delete specific pages |
| `POST` | `/compress` | Compress PDF (re-encode embedded images) |
| `POST` | `/rotate-pdf` | Rotate pages |
| `POST` | `/protect` | AES-256 password + permission flags |
| `POST` | `/unlock` | Remove password |
| `POST` | `/clean-metadata` | Strip all PDF metadata |
| `POST` | `/watermark` | Add text, image, or PDF watermark |
| `POST` | `/pdf-to-image` | Render pages as JPG/PNG |
| `POST` | `/image-to-pdf` | Pack images into a PDF |
| `POST` | `/pptx-convert` | PPTX/PPT → PDF or images |
| `POST` | `/docx-convert` | DOCX/DOC → PDF or images |
| `POST` | `/excel-convert` | XLSX/CSV → PDF or images |
| `POST` | `/thumbnail` | First-page thumbnail (576 DPI, base64 PNG) |
| `POST` | `/pagecount` | Page count + low-res thumbnail |
| `POST` | `/page-thumbnail` | Single-page thumbnail |
| `GET` | `/download/<file_id>` | Serve file (local storage mode only) |
| `GET` | `/files` | List recent files for a user |

---

## Watermark tool details

The watermark tool (`/watermark`) supports three modes:

- **Text** — renders text onto each page using `reportlab` + `pypdf` overlay. Configurable: font size, opacity, color, rotation, position (9 anchor points: corners, edges, center), repeat tiling, and custom font upload.
- **Image** — stamps a PNG/JPG onto each page using `Pillow` + `PyMuPDF`.
- **PDF** — overlays another PDF's first page as a watermark using `PyMuPDF`.

---

## Compression details

The `/compress` route has three presets (configurable in `deployment.config.json`):

| Preset | JPEG quality | Max DPI | Use case |
|---|---|---|---|
| screen | 40 | 96 | Email / web sharing |
| ebook | 60 | 150 | Digital reading (default) |
| printer | 80 | 200 | Print-quality output |

The `_recompress_images()` function extracts each embedded image, down-scales if above target DPI, converts CMYK → RGB, flattens transparency, and re-encodes as JPEG. Images smaller than 200×200 px and images that would grow after re-encoding are skipped.

---

## Thumbnail quality

The `/thumbnail` endpoint renders the first page at **Matrix(8.0, 8.0)** — equivalent to ~576 DPI — and returns it as a base64 PNG. This is used for PDF preview cards in the frontend.

---

## Aurora gradient (dark mode)

The `Aurora` WebGL component (`frontend/src/components/Aurora.jsx`) uses a GLSL simplex-noise shader. Key uniforms:

| Uniform | Prop | Effect |
|---|---|---|
| `uAmplitude` | `amplitude` | Vertical wave height |
| `uBlend` | `blend` | Glow band width (smoothstep range) |
| `uFrequency` | `frequency` | Horizontal wave density — `0.8` = wide sweeping waves |
| `uTime` | driven by `speed` | Animation speed |

On mobile the `PageAura` wrapper adjusts all three props down to prevent waves from overflowing the narrower viewport. The mask gradient is also adjusted per breakpoint so the aurora fills the full screen without a hard edge at the bottom.

---

## User identity

No accounts. Each browser generates a UUID on first visit stored in `localStorage` as `pdf_user_id`. This ID is sent with every request as `user_id`.

The backend uses it to:
- Namespace file storage (`{user_id}/` path prefix)
- Enforce per-user daily limits
- Filter recent files queries

Clearing `localStorage` creates a new identity. Previous files remain in storage until the retention period expires but will no longer appear in the Recent panel.

---

## Office document conversion

Word, Excel, and PowerPoint files are converted via LibreOffice running headlessly as a subprocess:

```python
subprocess.run([
    "soffice", "--headless", "--invisible", "--nodefault",
    "--nofirststartwizard", "--norestore",
    "--convert-to", "pdf", "--outdir", tmp_dir, input_file
], timeout=get_soffice_timeout())
```

LibreOffice is installed automatically via the `Dockerfile` and `nixpacks.toml`.

---

## Temp file cleanup

Every route uses `try/finally`. The `cleanup(*paths)` helper:
1. Deletes all temp files from `uploads/` and `outputs/`
2. Removes temp directories
3. Calls `gc.collect()` to release memory immediately

This keeps disk usage near zero even under load. All file paths include a UUID prefix so concurrent requests never collide.

---

## File and folder layout

```
paper.ly/
├── backend/
│   ├── app.py                  Flask routes (all endpoints)
│   ├── pdftool_config.py       Runtime config — storage mode, limits, presets
│   ├── deployment_config.py    Reads deployment.config.json
│   ├── supabase_helper.py      Storage + DB abstraction (local ↔ Supabase)
│   ├── local_storage.py        Manifest-based local disk storage
│   ├── pdf_to_img.py           PDF page rendering (DPI, format helpers)
│   ├── requirements.txt        Python dependencies (pinned versions)
│   ├── Dockerfile              Production container (Python 3.11 + LibreOffice)
│   ├── nixpacks.toml           Railway deployment config
│   ├── deployment.config.json  The one config file you edit
│   ├── uploads/                Temp upload landing zone (auto-cleaned)
│   ├── outputs/                Temp processing output (auto-cleaned)
│   └── local_outputs/          Permanent local storage (local mode only)
│       ├── manifest.json
│       └── manifest.lock
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── App.jsx                     App shell, tool grid, header, footer, recent panel
│       ├── config.js                   Config resolution + getUserId + helpers
│       ├── download.js                 downloadRemoteFile, cleanDownloadFilename, toAbsoluteUrl
│       ├── toolUi.js                   Shared accent color helpers
│       ├── deployment.config.json      Build-time config (copy of backend one)
│       ├── index.css                   Global base styles
│       ├── [ToolName].jsx              One file per tool (14 tools total)
│       ├── WatermarkPdf.jsx            Watermark tool (text / image / PDF)
│       └── components/
│           ├── Aurora.jsx              WebGL aurora shader (dark mode background)
│           ├── Grainient.jsx           WebGL grain+warp shader (light mode background)
│           ├── DropZone.jsx            File drop target with drag-and-drop
│           ├── DownloadReadyPage.jsx   Post-processing download screen + QR code
│           ├── ToolShell.jsx           Animated tool open/close wrapper
│           ├── StorageNotice.jsx       Storage mode info banner
│           ├── ToolActionNotice.jsx    Inline info/warning callouts
│           ├── VerticalReorderList.jsx Drag-to-reorder list (used in Merge, Split)
│           └── ReorderMoveButtons.jsx  Up/down buttons for reorder lists
│
├── docker-compose.yml          Run frontend + backend together
├── ARCHITECTURE.md             This file
└── CONTRIBUTING.md             Dev setup + contribution guide
```
