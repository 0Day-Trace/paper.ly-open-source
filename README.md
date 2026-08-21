# paper.ly

A privacy-first, open-source PDF toolkit. Process documents entirely on your own server — no accounts, no subscriptions, no tracking, no watermarks.

![Version](https://img.shields.io/badge/version-3.0-blue.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg)
![Flask](https://img.shields.io/badge/Flask-3.1-black.svg)

---

## Tools — 14 total

| Tool | Category | What it does |
|---|---|---|
| **PDF to Image** | Convert | Export every page as JPG or PNG |
| **Image to PDF** | Convert | Pack JPG / PNG / WEBP images into a single PDF |
| **Word Converter** | Convert | DOCX / DOC → PDF or images (via LibreOffice) |
| **Excel Converter** | Convert | XLSX / CSV → PDF or images (via LibreOffice) |
| **Slides Converter** | Convert | PPTX / PPT → PDF or images (via LibreOffice) |
| **Merge PDF** | Organize | Combine multiple PDFs with optional per-file rotation |
| **Split PDF** | Organize | Extract page ranges into separate files |
| **Rotate PDF** | Organize | Rotate pages 90°, 180°, or 270° |
| **Remove Pages** | Organize | Delete selected pages from a PDF |
| **Watermark PDF** | Organize | Stamp text, image, or PDF watermark on every page |
| **Compress PDF** | Optimize | Reduce file size by re-encoding embedded images |
| **Protect PDF** | Security | AES-256 password encryption + permission flags |
| **Unlock PDF** | Security | Remove password from a PDF you own |
| **Clean Metadata** | Security | Strip all embedded author / creation / software metadata |

---

## Quick start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **LibreOffice** — required only for the three office converter tools
  - macOS: `brew install --cask libreoffice`
  - Ubuntu/Debian: `sudo apt install libreoffice`
  - Windows: installer at [libreoffice.org](https://www.libreoffice.org/download/) — add `C:\Program Files\LibreOffice\program` to `PATH` after installing

### 1. Clone and start the backend

```bash
git clone https://github.com/0Day-Trace/paper.ly.git
cd paper.ly/backend

python -m venv .venv
source .venv/bin/activate        # Windows: .\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
python app.py
```

Backend starts at `http://localhost:5000`.

### 2. Start the frontend

```bash
cd ../frontend
npm install
npm start
```

Open `http://localhost:3000`. With the default config (`deployment: "auto"` + localhost), the app runs in **self-host mode** — no file size limits, no expiry timers, files saved to `backend/local_outputs/`.

---

## Configure your deployment

Edit one file: **`frontend/src/deployment.config.json`**

```json
{
  "deployment": "auto",
  "organizationName": "your organization",
  "apiBaseUrl": "http://localhost:5000",
  "githubUrl": "https://github.com/0Day-Trace/paper.ly",
  "limits": {
    "enabled": null,
    "maxFileSizeMb": null,
    "dailyFileLimit": null,
    "retentionHours": null
  },
  "advanced": {
    "flaskUploadLimitMb": 210,
    "sofficeTimeoutSeconds": 120,
    "compressPresets": {
      "screen":  { "quality": 40, "maxDpi": 96  },
      "ebook":   { "quality": 60, "maxDpi": 150 },
      "printer": { "quality": 80, "maxDpi": 200 }
    }
  }
}
```

| `deployment` | Use case |
|---|---|
| `"auto"` | Auto-detect from hostname (localhost → selfhost, anything else → organization) |
| `"selfhost"` | Your own machine or private server |
| `"organization"` | Company / team instance — fill in `organizationName` |
| `"official"` | Public service with limits and 6h file retention |

See **[HOSTING.md](HOSTING.md)** for full deployment guides: Docker, Railway, Render, Fly.io, and Nginx.

---

## Docker

```bash
docker compose up --build
```

Frontend → `http://localhost:3000` · Backend → `http://localhost:5000`

For remote Supabase storage, add a `.env` file (git-ignored):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
```

---

## Storage

By default, processed files are saved to `backend/local_outputs/` — no external services needed.

For remote storage, set these env vars on your hosting platform:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key
```

See [HOSTING.md → Storage](HOSTING.md#storage-configuration) for full Supabase setup.

---

## Tech stack

**Frontend:** React 19 · Framer Motion 12 · Radix UI · Lucide · ogl (WebGL aurora/grain shaders) · DM Sans + Instrument Serif

**Backend:** Python 3.11 · Flask · PyMuPDF · pikepdf · Pillow · reportlab · pypdf · img2pdf · LibreOffice · Gunicorn

**Storage:** Local disk (default) · Supabase Storage + PostgreSQL (optional)

---

## How it works

Every tool uploads the file to the Flask backend over HTTP. The backend processes it server-side using Python PDF libraries, saves the result, and returns a download URL. The browser never has to parse PDF bytes directly.

Files are identified per-browser via a UUID in `localStorage` — no sign-up required.

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for a full technical deep-dive.

---

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for local setup, how to add a new tool, code style, and the PR process.

---

## Security

To report a vulnerability privately, see **[SECURITY.md](SECURITY.md)**.

---

## License

[MIT](LICENSE)
