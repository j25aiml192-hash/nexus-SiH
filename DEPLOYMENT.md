# NEXUS Production Deployment Guide

This document outlines the deployment procedure for the **NEXUS Cybercrime Intelligence Platform**.

## Architecture Overview
- **Frontend SPA**: React (v19) + Vite + Tailwind/Custom CSS &rarr; Deployed to **Vercel**
- **Backend API**: FastAPI + Uvicorn + ML Inference Pipelines &rarr; Deployed to **Render**
- **Database & Storage**: PostgreSQL + PostGIS + Realtime &rarr; Hosted on **Supabase**

---

## A. GitHub Push Steps

From the repository root (`C:\PROJECTS(ALL)\SIH`):

```bash
# 1. Review modified files and untracked files
git status

# 2. Stage all deployment configuration changes and tracked model artifacts
git add .gitignore DEPLOYMENT.md .env.example backend/.env.example frontend/.env.example
git add vercel.json frontend/vercel.json
git add backend/requirements.txt backend/main.py backend/db/supabase_client.py backend/core/predictor.py
git add frontend/src/services/dataSource/apiDataSource.ts frontend/src/services/realtime/socketRealtimeClient.ts
git add frontend/src/services/realtime/index.ts frontend/src/lib/socket.ts frontend/src/pages/DashboardPage.tsx
git add backend/models/

# 3. Verify .env is NOT staged
git status

# 4. Commit changes
git commit -m "build(deploy): prepare clean production deployment for Vercel and Render"

# 5. Push to GitHub main branch
git push origin main
```

---

## B – E. Backend Deployment on Render

### B. Render Root Directory
Set **Root Directory** in the Render Dashboard service settings:
```text
backend
```

### C. Render Build Command
```bash
pip install -r requirements.txt
```

### D. Render Start Command
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

> **Note on Render Scheduling & Workers**:
> Render sets the `$PORT` environment variable dynamically. The start command uses `$PORT` as required.
> The APScheduler runs within the Uvicorn process. Deploy as a single worker process (`web` service) to prevent duplicate scheduled background jobs. If using Render's Free tier, the service spins down after 15 minutes of inactivity; upgrade to Starter or ping `/health` on a cron if continuous background simulation is needed.

### E. Render Environment Variables
Configure the following in **Render &rarr; Environment**:

| Variable Name | Description | Example / Placeholder Value |
| :--- | :--- | :--- |
| `NEXUS_ENV` | Enforces production mode (disables silent fallbacks) | `production` |
| `FRONTEND_ORIGIN` | Allowed origin for CORS (production Vercel domain) | `https://<your-app>.vercel.app` |
| `SUPABASE_URL` | Supabase Project URL | `https://<your-project>.supabase.co` |
| `SUPABASE_SERVICE_KEY`| Supabase Service Role Secret Key | `<your-supabase-service-role-key>` |
| `SUPABASE_ANON_KEY` | Supabase Anon Public Key | `<your-supabase-anon-key>` |
| `ANTHROPIC_API_KEY` | Claude API Key for Narrative AI Briefs | `<your-anthropic-api-key>` |
| `NTFY_TOPIC` | ntfy.sh notification topic for LEA dispatch | `nexus-alerts-sih2025` |

---

## F – I. Frontend Deployment on Vercel

### F. Vercel Root Directory
Set **Root Directory** in Project Settings:
```text
frontend
```

### G. Vercel Build Command
```bash
npm run build
```
*(Runs `tsc -b && vite build`)*

### H. Vercel Output Directory
```text
dist
```

### I. Vercel Environment Variables
Configure the following in **Vercel &rarr; Settings &rarr; Environment Variables**:

| Variable Name | Description | Example / Placeholder Value |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Centralized REST API base URL of the Render backend | `https://<your-backend-app>.onrender.com` |
| `VITE_SOCKET_URL` | Realtime WebSocket Mesh Node URL | `https://<your-backend-app>.onrender.com` |
| `VITE_DATA_SOURCE` | Production data source mode | `api` |
| `VITE_CARTO_API_KEY` | (Optional) CARTO basemap key for map tiles | `<your-carto-api-key>` |

> **SPA Routing**:
> A `vercel.json` rewrite configuration is provided at both `frontend/vercel.json` and `/vercel.json` to handle direct refreshes to `/complaints`, `/complaints/:complaintId`, `/prediction/:complaintId`, `/alerts`, `/map`, etc., routing them through `/index.html`.

---

## J. Supabase Setup

Ensure the following database tables exist on your Supabase instance:
- `complaints`
- `mule_accounts`
- `mule_chain_nodes`
- `transactions`
- `predictions`
- `atm_locations`
- `alerts`
- `incidents`
- `hotspots`
- `syndicates`
- `cashout_events`
- `sentinel_scores`
- `daily_briefs`

---

## K. Post-Deployment Smoke Tests

Once both Render and Vercel deployments report healthy status:

### 1. Backend Health Check
```bash
curl -I https://<your-backend-app>.onrender.com/health
# Expected: HTTP/2 200 OK, {"status":"ok"}
```

### 2. Backend Config & Dashboard Stats Check
```bash
curl -s https://<your-backend-app>.onrender.com/dashboard/stats
curl -s https://<your-backend-app>.onrender.com/complaints
```

### 3. Frontend Direct SPA Route Refresh
1. Open `https://<your-frontend-app>.vercel.app/`
2. Navigate to `/complaints` or `/alerts`
3. Hit `F5` / browser refresh directly on `https://<your-frontend-app>.vercel.app/complaints`
4. Confirm the page reloads cleanly without a 404 error.

### 4. CORS & API Connectivity Check
1. Open the browser Developer Tools &rarr; **Console** and **Network** tabs.
2. Confirm no `CORS error` or `Access-Control-Allow-Origin` failures appear.
3. Confirm API calls successfully reach `https://<your-backend-app>.onrender.com`.
