# Hosting paper.ly

Complete deployment guide for every environment — local dev, company server, Docker, Railway, Render, Fly.io, and Nginx reverse proxy.

---

## The one config file

Edit **`frontend/src/deployment.config.json`** before building the frontend. The backend reads the same file at runtime to serve it via `GET /config`.

```json
{
  "deployment": "auto",
  "organizationName": "Your Company",
  "apiBaseUrl": "http://localhost:5000",
  "officialApiUrl": "https://paper-ly.onrender.com",
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
  },
  "ui": {
    "organizationAccent": "#D97706",
    "selfhostAccent": "#0D9488"
  }
}
```

### `deployment` modes

| Value | When to use | Banner shown |
|---|---|---|
| `"auto"` | Let the app detect from hostname — good default | localhost → selfhost; other → organization |
| `"selfhost"` | Your machine or private server | Teal "Self-hosted" banner |
| `"organization"` | Company / team instance | Amber "Organization managed" banner + name |
| `"official"` | Public service with caps | 6h retention notice |

### All config fields

| Field | Default | Purpose |
|---|---|---|
| `deployment` | `"auto"` | Deployment mode (see above) |
| `organizationName` | `"your organization"` | Shown in banners and Recent panel subtitle |
| `apiBaseUrl` | `"http://localhost:5000"` | URL the browser uses to reach the backend |
| `officialApiUrl` | Onrender URL | Used only for auto-detecting the official instance |
| `githubUrl` | GitHub URL | Link shown in the header and footer |
| `limits.enabled` | `null` | `true` / `false` / `null` (null = on for official, off otherwise) |
| `limits.maxFileSizeMb` | `null` | Max upload size in MB — null = no cap |
| `limits.dailyFileLimit` | `null` | Max processed files per user per day — null = no cap |
| `limits.retentionHours` | `null` | How long recent files stay listed — null = forever |
| `advanced.flaskUploadLimitMb` | `210` | Flask `MAX_CONTENT_LENGTH` — returns 413 if exceeded |
| `advanced.sofficeTimeoutSeconds` | `120` | LibreOffice subprocess timeout |
| `advanced.compressPresets` | see above | Quality/DPI for screen / ebook / printer presets |
| `ui.organizationAccent` | `"#D97706"` | Amber accent for organization mode banner |
| `ui.selfhostAccent` | `"#0D9488"` | Teal accent for self-host mode banner |

### Custom organization logo

Replace `frontend/public/icons/organization.png` with a square PNG (transparent background recommended). It appears tinted with `organizationAccent` in the organization mode banner.

---

## Scenario A — Local development

1. Leave `deployment.config.json` defaults as-is (or set `apiBaseUrl` to `http://localhost:5000`).

2. Start the backend:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate      # Windows: .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python app.py
   ```

3. Start the frontend:
   ```bash
   cd frontend
   npm install
   npm start
   ```

Files are saved to `backend/local_outputs/`. No external services or accounts needed.

---

## Scenario B — Organization / company server

Example: hosting at `https://pdf.yourcompany.com`.

**`deployment.config.json`:**
```json
{
  "deployment": "organization",
  "organizationName": "Your Company",
  "apiBaseUrl": "https://api.yourcompany.com",
  "limits": { "enabled": false }
}
```

**Build the frontend** after editing the config:
```bash
cd frontend
npm run build
```
Serve the `build/` folder from Nginx, Apache, Vercel, S3 + CloudFront, or any static host.

**Run the backend** with Gunicorn (never `python app.py` in production):
```bash
pip install gunicorn
PDFTOOL_PUBLIC_URL=https://api.yourcompany.com \
gunicorn app:app --bind 0.0.0.0:5000 --workers 2 --timeout 180
```

Set `PDFTOOL_PUBLIC_URL` so local-disk download links include your real domain.

---

## Docker

`docker-compose.yml` runs both services with one command.

```bash
# Build and start
docker compose up --build

# Background mode
docker compose up -d --build

# Stop and remove containers
docker compose down
```

Frontend → `http://localhost:3000`  
Backend → `http://localhost:5000`

### With remote Supabase storage

Create a `.env` file in the repo root (it is git-ignored):
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-service-role-key
```

Or pass them inline:
```bash
SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=your-key docker compose up --build
```

### With persistent local storage across restarts

The `docker-compose.yml` already mounts `backend_outputs` volume to `/app/local_outputs` — files survive container restarts automatically.

---

## Railway

Railway runs the Flask backend via `nixpacks.toml` (already in `backend/`). The toml installs LibreOffice from Nix automatically.

1. Create a new Railway project → **Deploy from GitHub repo**.
2. Set the **root directory** to `backend/`.
3. Railway detects `nixpacks.toml` and handles everything.
4. Add environment variables in the Railway dashboard:

   | Variable | Value |
   |---|---|
   | `SUPABASE_URL` | Your Supabase project URL (if using remote storage) |
   | `SUPABASE_KEY` | Your service role key |
   | `PDFTOOL_PUBLIC_URL` | Your Railway service URL (e.g. `https://paper-ly.up.railway.app`) |
   | `PORT` | Set automatically by Railway — do not override |

5. Copy the Railway service URL.
6. Set `apiBaseUrl` to that URL in `deployment.config.json`, build the frontend, and deploy it to Vercel / Netlify / any static host.

---

## Render

### Backend (Web Service)

| Setting | Value |
|---|---|
| Root directory | `backend/` |
| Build command | `pip install -r requirements.txt` |
| Start command | `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 180` |
| Environment vars | `SUPABASE_URL`, `SUPABASE_KEY`, `PDFTOOL_PUBLIC_URL` |

> Render's **free tier spins down after inactivity**. Use a paid plan for production or expect cold start delays.

### Frontend (Static Site)

| Setting | Value |
|---|---|
| Root directory | `frontend/` |
| Build command | `npm install && npm run build` |
| Publish directory | `build/` |

Set `apiBaseUrl` in `deployment.config.json` to your Render backend URL before building.

---

## Fly.io

```bash
# Install flyctl
brew install flyctl        # macOS
# or: https://fly.io/docs/getting-started/installing-flyctl/

cd backend
fly launch        # detects Dockerfile, creates fly.toml
fly secrets set SUPABASE_URL=... SUPABASE_KEY=... PDFTOOL_PUBLIC_URL=https://your-app.fly.dev
fly deploy
```

Use the Fly.io app URL as `apiBaseUrl` in `deployment.config.json`, then build and deploy the frontend anywhere.

---

## Nginx reverse proxy

Serve both frontend and backend from a single domain with Nginx:

```nginx
server {
    listen 443 ssl;
    server_name pdf.yourcompany.com;

    # TLS (managed by Certbot)
    ssl_certificate     /etc/letsencrypt/live/pdf.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdf.yourcompany.com/privkey.pem;

    # Frontend (static build)
    root /var/www/paper-ly/build;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass         http://127.0.0.1:5000/;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        client_max_body_size 250M;
        proxy_read_timeout 300s;
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name pdf.yourcompany.com;
    return 301 https://$host$request_uri;
}
```

Set `apiBaseUrl` to `https://pdf.yourcompany.com/api` in `deployment.config.json`.

Get a free TLS cert: `sudo certbot --nginx -d pdf.yourcompany.com`

---

## Storage configuration

By default, processed files are stored to `backend/local_outputs/` — no external services required. Set env vars to switch to remote storage.

> **Never put credentials in `deployment.config.json`** — that file is committed to your repo.

### Option A — Supabase (recommended for cloud deployments)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key
```

When these are present at startup, the backend automatically uses Supabase Storage for files and Supabase Postgres for metadata.

#### Supabase one-time setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Storage** → New bucket → name it `pdf-outputs` → set to **Public**.
3. **SQL Editor** → run:
   ```sql
   create table pdf_files (
     id uuid primary key default gen_random_uuid(),
     user_id text,
     file_name text,
     file_path text,
     file_size_bytes bigint,
     tool text,
     created_at timestamptz default now()
   );
   ```
4. Set `SUPABASE_URL` and `SUPABASE_KEY` on your hosting platform.

#### Automated cleanup (Supabase)

Enable pg_cron in your project settings, then:

```sql
select cron.schedule(
  'delete-old-pdf-files',
  '0 * * * *',
  $$
    delete from pdf_files
    where created_at < now() - interval '6 hours';
  $$
);
```

Use Supabase Storage lifecycle rules to also purge objects from the bucket on the same schedule.

### Option B — Separate storage and database vendors

```
STORAGE_URL=https://storage-service.com
STORAGE_KEY=your-storage-key
DB_URL=https://database-service.com
DB_KEY=your-database-key
```

Precedence:
```
Storage client: STORAGE_URL/KEY  →  SUPABASE_URL/KEY
Database client: DB_URL/KEY      →  SUPABASE_URL/KEY
```

### Storage mode summary

| Environment variables set | Storage mode |
|---|---|
| None | Local disk (`backend/local_outputs/`) |
| `SUPABASE_URL` + `SUPABASE_KEY` | Supabase (storage + DB) |
| `STORAGE_URL/KEY` + `DB_URL/KEY` | Separate vendors |

---

## Environment variables reference

### Backend

| Variable | Default | Effect |
|---|---|---|
| `PORT` | `5000` | Listen port |
| `SUPABASE_URL` | — | Supabase project URL |
| `SUPABASE_KEY` | — | Supabase anon or service role key |
| `STORAGE_URL` | — | Override storage service URL |
| `STORAGE_KEY` | — | Override storage service key |
| `DB_URL` | — | Override database service URL |
| `DB_KEY` | — | Override database service key |
| `PDFTOOL_PUBLIC_URL` | — | Public base URL for local-disk download links |
| `PDFTOOL_DEPLOYMENT` | from JSON | `official` · `selfhost` · `organization` |
| `PDFTOOL_LIMITS` | — | `1` force limits on · `0` force off |
| `MAX_FILE_SIZE_MB` | from JSON | Upload size cap in MB |
| `DAILY_FILE_LIMIT` | from JSON | Per-user daily file cap |
| `FILE_RETENTION_HOURS` | from JSON | Recent-files window in hours |
| `FLASK_UPLOAD_LIMIT_MB` | from JSON (`210`) | Flask hard upload limit (returns 413) |
| `OFFICIAL_API_HOST` | — | Override hardcoded official API hostname |
| `FLASK_DEBUG` | — | `1` for debug mode — **never in production** |

### Frontend (build-time only)

| Variable | Effect |
|---|---|
| `REACT_APP_API_URL` | Overrides `apiBaseUrl` in the JSON |
| `REACT_APP_ORG_NAME` | Overrides `organizationName` |
| `REACT_APP_DEPLOYMENT` | Overrides `deployment` |

---

## Compression presets

Configurable in `deployment.config.json` under `advanced.compressPresets`:

| Preset | JPEG quality | Max DPI | Best for |
|---|---|---|---|
| `screen` | 40 | 96 | Email or web sharing |
| `ebook` | 60 | 150 | Digital reading (default) |
| `printer` | 80 | 200 | High-quality print output |

---

## What users see per deployment mode

| Mode | Banner | Recent files subtitle | Default limits |
|---|---|---|---|
| `official` | paper.ly hosted · 6h deletion notice | Available for 6 hours | 200 MB · 10/day · 6h |
| `selfhost` | Self-hosted (teal) | Managed by your server | None |
| `organization` | Organization managed (amber) + icon | Managed by {name} | None (unless you configure them) |

---

## Pre-production checklist

- [ ] `deployment.config.json` has the correct `deployment` mode
- [ ] `apiBaseUrl` is your real public HTTPS backend URL
- [ ] `npm run build` was run **after** editing the JSON
- [ ] Storage env vars are set on the hosting platform — not in any committed file
- [ ] `PDFTOOL_PUBLIC_URL` is set if using local disk behind a reverse proxy
- [ ] `FLASK_DEBUG` is unset (or `0`) in production
- [ ] CORS: `CORS_ORIGINS` env var is set to your frontend origin on the backend
- [ ] LibreOffice is installed on the backend host (needed for office converter tools)
- [ ] Supabase bucket `pdf-outputs` is public and `pdf_files` table exists (if using Supabase)
- [ ] Upload size limit (`flaskUploadLimitMb`) matches your Nginx `client_max_body_size`
