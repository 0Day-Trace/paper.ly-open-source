# Hosting paper.ly

This guide covers every way to run paper.ly — local development, company server, cloud platforms (Railway, Render, Fly.io), Docker, and Nginx reverse proxy.

---

## One file to configure

Edit **`frontend/src/deployment.config.json`** before you build the frontend. The backend reads the same file at runtime via `/config`.

Copy from `frontend/src/deployment.config.example.json` if starting fresh.

```json
{
  "deployment": "auto",
  "organizationName": "Your Company Name",
  "apiBaseUrl": "http://localhost:5000",
  "officialApiUrl": "https://paper-ly.onrender.com",
  "githubUrl": "https://github.com/0Day-Trace/paper.ly-open-source",
  "limits": {
    "enabled": null,
    "maxFileSizeMb": null,
    "dailyFileLimit": null,
    "retentionHours": null
  },
  "ui": {
    "organizationAccent": "#D97706",
    "selfhostAccent": "#0D9488"
  }
}
```

### `deployment` values

| Value | When to use | UI & limits |
|---|---|---|
| `"auto"` | Detect from API URL and hostname | localhost → self-host; anything else → organization |
| `"selfhost"` | Your machine or private server | "Self-hosted" teal banner, no limits |
| `"organization"` | Company/team instance | "Organization managed" amber banner + your name |
| `"official"` | Public service with caps | 6h retention, 200MB/10 files per day |

### Other config fields

| Field | Purpose |
|---|---|
| `organizationName` | Shown in banners and recent-files subtitle when `deployment` is `organization` |
| `apiBaseUrl` | The URL the browser uses to reach your backend |
| `officialApiUrl` | Used only for auto-detecting the official paper.ly API |
| `githubUrl` | The GitHub link shown in the UI |
| `limits.enabled` | `true` / `false` / `null` — null means "on for official, off for everything else" |
| `limits.maxFileSizeMb` | Max upload size in MB (null = no cap) |
| `limits.dailyFileLimit` | Max files per user per 24h (null = no cap) |
| `limits.retentionHours` | How long recent downloads stay listed (null = forever) |
| `ui.organizationAccent` | Banner hex color for organization mode |
| `ui.selfhostAccent` | Banner hex color for self-host mode |

### Custom organization icon

Replace `frontend/public/icons/organization.png` with a square PNG (transparent or solid background). It is tinted with `organizationAccent` in the UI.

---

## Scenario A — Local development

1. Set `deployment.config.json`:
   ```json
   { "deployment": "auto", "apiBaseUrl": "http://localhost:5000" }
   ```

2. Start backend:
   ```bash
   cd backend
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   python app.py
   ```

3. Start frontend:
   ```bash
   cd frontend && npm install && npm start
   ```

Files are saved to `backend/local_outputs/`. No external services needed.

---

## Scenario B — Organization / company server

Example: hosting at `https://pdf.yourcompany.com`.

1. `deployment.config.json`:
   ```json
   {
     "deployment": "organization",
     "organizationName": "Your Company Name",
     "apiBaseUrl": "https://api.yourcompany.com",
     "limits": { "enabled": false }
   }
   ```

2. **Backend** — run with gunicorn (not `python app.py` in production):
   ```bash
   pip install gunicorn
   PDFTOOL_PUBLIC_URL=https://api.yourcompany.com gunicorn -w 2 -b 0.0.0.0:5000 app:app
   ```
   Set `PDFTOOL_PUBLIC_URL` so that local-disk download links include your domain.

3. **Frontend** — build after editing the JSON:
   ```bash
   cd frontend && npm run build
   ```
   Serve `build/` from any static host (Nginx, Vercel, S3 + CloudFront, etc.).

4. Optional: replace `public/icons/organization.png` with your logo.

---

## Docker

A `docker-compose.yml` is included for running both services together.

```bash
# Build and run
docker compose up --build

# Run in background
docker compose up -d --build

# Stop
docker compose down
```

Frontend → `http://localhost:3000`
Backend → `http://localhost:5000`

### Using Docker with remote storage

Pass Supabase credentials as environment variables — never bake them into the image:

```bash
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_KEY=your-key \
docker compose up --build
```

Or create a `.env` file in the project root (it is git-ignored):

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-key
```

Then `docker compose up --build` picks it up automatically.

---

## Deploying to Railway

Railway can run the Flask backend directly via `nixpacks.toml` (already in `backend/`).

1. Create a new Railway project → **Deploy from GitHub repo**.
2. Set the root directory to `backend/`.
3. Railway detects `nixpacks.toml` and installs LibreOffice automatically.
4. Add environment variables in the Railway dashboard:
   - `SUPABASE_URL` and `SUPABASE_KEY` (if using remote storage)
   - `PDFTOOL_PUBLIC_URL` = your Railway service URL
   - `PORT` = `8080` (Railway sets this automatically; Flask reads it)
5. Note the Railway service URL (e.g. `https://paper-ly-backend.up.railway.app`).
6. Set `apiBaseUrl` in `deployment.config.json` to that URL, then build and deploy the frontend.

---

## Deploying to Render

1. **Backend** (Web Service):
   - Root: `backend/`
   - Build command: `pip install -r requirements.txt`
   - Start command: `gunicorn app:app --bind 0.0.0.0:$PORT`
   - Add env vars: `SUPABASE_URL`, `SUPABASE_KEY`, `PDFTOOL_PUBLIC_URL`
   - Note: Render's free tier spins down after inactivity. Use a paid plan for production.

2. **Frontend** (Static Site):
   - Root: `frontend/`
   - Build command: `npm install && npm run build`
   - Publish directory: `build/`
   - Add env var: `REACT_APP_API_URL` = your Render backend URL

---

## Deploying to Fly.io

1. Install flyctl: `brew install flyctl` or [see docs](https://fly.io/docs/getting-started/installing-flyctl/).
2. From `backend/`:
   ```bash
   fly launch          # creates fly.toml, detects Dockerfile
   fly secrets set SUPABASE_URL=... SUPABASE_KEY=...
   fly deploy
   ```
3. Use the Fly.io app URL as `apiBaseUrl` in `deployment.config.json`.
4. Deploy the frontend to any static host pointing at that URL.

---

## Nginx reverse proxy

If you serve both frontend and backend from one domain:

```nginx
server {
    listen 80;
    server_name pdf.yourcompany.com;

    # Frontend (static build)
    root /var/www/paper-ly/build;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 250M;
    }
}
```

Then set `apiBaseUrl` to `https://pdf.yourcompany.com/api` in `deployment.config.json`.

For HTTPS, use Certbot: `sudo certbot --nginx -d pdf.yourcompany.com`.

---

## Storage configuration

By default, processed files land in `backend/local_outputs/`. No external services needed.

> **Important:** Never put credentials in `deployment.config.json` — that file is committed to your repo.

### Option A — Supabase (simplest)

Set environment variables on your hosting platform:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key
```

Detection is automatic. When set at startup, the backend switches to Supabase for file storage and the metadata database.

#### Supabase setup steps

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Storage** → create a bucket named `pdf-outputs`, set it to **Public**.
3. Create the `pdf_files` table in the SQL editor:
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
4. Set `SUPABASE_URL` and `SUPABASE_KEY` as environment variables on your hosting platform.

#### Automated file cleanup (Supabase)

To auto-delete files older than 6 hours, enable pg_cron in your Supabase project and run:

```sql
select cron.schedule(
  'delete-old-pdf-files',
  '0 * * * *',  -- every hour
  $$
  delete from pdf_files
  where created_at < now() - interval '6 hours';
  $$
);
```

Also set up a Supabase Edge Function or use the Supabase Storage lifecycle rules to delete objects from the `pdf-outputs` bucket.

### Option B — Separate storage and database vendors

```
STORAGE_URL=https://storage-service-url
STORAGE_KEY=your-storage-key

DB_URL=https://database-service-url
DB_KEY=your-database-key
```

Priority order:
```
Storage client: STORAGE_URL/KEY → SUPABASE_URL/KEY
Database client: DB_URL/KEY     → SUPABASE_URL/KEY
```

### Storage detection summary

| Env vars set | Mode |
|---|---|
| None | Local disk (`backend/local_outputs/`) |
| `SUPABASE_URL` + `SUPABASE_KEY` | Supabase for both storage and DB |
| `STORAGE_URL/KEY` + `DB_URL/KEY` | Separate vendors |

---

## Environment variables reference

### Backend

| Variable | Effect |
|---|---|
| `PORT` | Listen port (default `5000`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon or service role key |
| `STORAGE_URL` | Override storage service URL |
| `STORAGE_KEY` | Override storage service key |
| `DB_URL` | Override database service URL |
| `DB_KEY` | Override database service key |
| `PDFTOOL_DEPLOYMENT` | `official` \| `selfhost` \| `organization` |
| `PDFTOOL_LIMITS` | `1` force limits on, `0` force off |
| `PDFTOOL_OFFICIAL` | `1` treats instance as official (legacy) |
| `MAX_FILE_SIZE_MB` | Upload size cap in MB |
| `DAILY_FILE_LIMIT` | Per-user daily file cap |
| `FILE_RETENTION_HOURS` | Recent-files window in hours |
| `PDFTOOL_PUBLIC_URL` | Public base URL for local-disk download links |
| `OFFICIAL_API_HOST` | Override the hardcoded official API hostname |
| `FLASK_DEBUG` | `1` for debug mode (never in production) |

### Frontend (build-time only)

| Variable | Effect |
|---|---|
| `REACT_APP_API_URL` | Overrides `apiBaseUrl` in the JSON |
| `REACT_APP_ORG_NAME` | Overrides `organizationName` |
| `REACT_APP_DEPLOYMENT` | Overrides `deployment` in the JSON |

---

## Pre-production checklist

- [ ] `deployment.config.json` matches your host type
- [ ] `apiBaseUrl` is your real public HTTPS API URL
- [ ] `npm run build` run **after** editing the JSON
- [ ] Storage env vars set on hosting platform (not in config files)
- [ ] `PDFTOOL_PUBLIC_URL` set if using local disk behind a reverse proxy
- [ ] `FLASK_DEBUG` unset (or `0`) in production
- [ ] CORS config allows your frontend origin to call the API
- [ ] LibreOffice installed on the backend host (needed for Office conversions)
- [ ] Supabase bucket named `pdf-outputs` and `pdf_files` table created (if using Supabase)

---

## What users see per mode

| Mode | Banner | Recent files subtitle | Default limits |
|---|---|---|---|
| `official` | paper.ly hosted, 6h deletion notice | Available for 6 hours | 200MB, 10/day, 6h |
| `selfhost` | Self-hosted (teal) | Managed by your server | None |
| `organization` | Organization managed (amber) + icon | Managed by {name} | None (unless you set limits) |
