import os
import sys
import logging
from dotenv import load_dotenv

# Ensure backend directory is in sys.path for both local and Render execution
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import complaints
from api.routes import predictions
from api.routes import alerts
from api.routes import incidents
from api.routes import briefs
from api.routes import mule
from api.routes import atms
from scheduler import start_scheduler

load_dotenv()
logger = logging.getLogger("nexus.main")

# Verify critical ML model artifacts in production
nexus_env = os.getenv("NEXUS_ENV", "development").strip().lower()
if nexus_env == "production":
    model_path = os.path.join(os.path.dirname(__file__), "models", "model.pkl")
    if not os.path.exists(model_path):
        error_msg = f"[PRODUCTION ERROR] Required ML model artifact not found at {model_path}"
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)

start_scheduler()

app = FastAPI(
    title="Nexus Cybercrime Intelligence API",
    description="Predictive cybercrime and cash-out risk intelligence backend",
    version="1.0.0",
)

# CORS Configuration
frontend_origin_env = os.getenv("FRONTEND_ORIGIN", "")
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

if frontend_origin_env:
    for orig in frontend_origin_env.split(","):
        cleaned = orig.strip().rstrip("/")
        if cleaned and cleaned not in allowed_origins:
            allowed_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$" if nexus_env == "production" else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaints.router, prefix="/complaints", tags=["Complaints"])
app.include_router(predictions.router, prefix="/predictions", tags=["Predictions"])
app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
app.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
app.include_router(briefs.router, prefix="/briefs", tags=["Briefs"])
app.include_router(mule.router, prefix="/mule", tags=["Mule"])
app.include_router(atms.router, prefix="/atms", tags=["Atm"])

from db import repo


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/dashboard/stats")
@app.get("/stats")
def get_dashboard_stats(timeframe: str = "24h"):
    try:
        return repo.get_dashboard_stats()
    except Exception as e:
        logger.error(f"[DASHBOARD STATS ERROR] Failed to fetch stats: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail=f"Database service unavailable: {str(e)}")


@app.get("/config")
def get_config():
    return {
        "supabase_url": os.getenv("SUPABASE_URL"),
        "supabase_anon_key": os.getenv("SUPABASE_ANON_KEY"),
        "ntfy_topic": os.getenv("NTFY_TOPIC", "nexus-alerts-sih2025"),
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port)