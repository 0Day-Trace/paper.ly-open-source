# paper.ly

A privacy-first, open-source PDF toolkit. Process documents in your browser — no accounts, no subscriptions, no tracking.

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg)

---

## Tools

| Tool | What it does |
|------|-------------|
| **Merge PDF** | Combine multiple PDFs into one, with optional per-file rotation |
| **Split PDF** | Extract page ranges into separate PDF files |
| **Remove Pages** | Delete specific pages from a PDF |
| **Rotate PDF** | Rotate individual pages or the entire document |
| **Compress PDF** | Reduce file size by re-compressing embedded images |
| **Protect PDF** | Add password protection to a PDF |
| **Unlock PDF** | Remove password protection from a PDF |
| **Clean Metadata** | Strip author, title, and all embedded metadata |
| **PDF to Image** | Export pages as JPG or PNG |
| **Image to PDF** | Convert JPG/PNG/WEBP images into a PDF |
| **Word to PDF** | Convert `.docx` files to PDF via LibreOffice |
| **Excel to PDF** | Convert `.xlsx` files to PDF via LibreOffice |
| **PowerPoint to PDF** | Convert `.pptx` files to PDF via LibreOffice |

---

## Quick start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **LibreOffice** (for Office→PDF conversions only)
  - macOS: `brew install --cask libreoffice`
  - Ubuntu/Debian: `sudo apt install libreoffice`
  - Windows: download from [libreoffice.org](https://www.libreoffice.org/download/)

### 1. Clone and start the backend

```bash
git clone https://github.com/your-username/paper.ly.git
cd paper.ly/backend

python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows (PowerShell):
# .\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
python app.py
```

Backend runs at `http://localhost:5000`.

### 2. Start the frontend

```bash
cd ../frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`. Open it in your browser.

With the default config (`deployment: "auto"` + localhost API), the app runs in **self-host mode** — no file size limits and no expiry timers.

---

## Configure your deployment

Edit one file: **`frontend/src/deployment.config.json`**

```json
{
  "deployment": "auto",
  "organizationName": "your organization",
  "apiBaseUrl": "http://localhost:5000",
  "githubUrl": "https://github.com/your-username/paper.ly",
  "limits": {
    "enabled": null,
    "maxFileSizeMb": null,
    "dailyFileLimit": null,
    "retentionHours": null
  }
}
```

| `deployment` | Use case |
|---|---|
| `"auto"` | Detect from hostname/API URL (good default) |
| `"selfhost"` | Your machine or private server |
| `"organization"` | Company/team instance — set `organizationName` |
| `"official"` | Public service with limits and 6h retention |

See **[HOSTING.md](HOSTING.md)** for full deployment walkthroughs including Railway, Render, Docker, and Nginx.

---

## Docker

```bash
# Build and run both services
docker compose up --build
```

Frontend → `http://localhost:3000` · Backend → `http://localhost:5000`

See [`docker-compose.yml`](docker-compose.yml) and the [Docker section of HOSTING.md](HOSTING.md#docker).

---

## Storage

By default, processed files are saved to `backend/local_outputs/` — no external services needed.

To use **Supabase** for remote storage, set these environment variables on your hosting platform (never in config files):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key
```

See [HOSTING.md → Storage](HOSTING.md#storage-configuration) for Supabase setup instructions.

---

## Tech stack

- **Frontend:** React 19 (CRA), Framer Motion, Radix UI, Lucide
- **Backend:** Python, Flask, PyMuPDF, PikePDF, Pillow, LibreOffice
- **Storage:** Local disk (default) or Supabase (optional)

---

## Contributing

Contributions are welcome. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for how to get started, the code style guide, and PR process.

---

## Security

To report a vulnerability, see **[SECURITY.md](SECURITY.md)**.

---

## License

[MIT](LICENSE)
