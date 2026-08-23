import os
from dotenv import load_dotenv
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

start_scheduler()

app = FastAPI(
    title="Nexus Cybercrime Intelligence API",
    description="Predictive cybercrime and cash-out risk intelligence backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/config")
def get_config():
    return {
        "supabase_url": os.getenv("SUPABASE_URL"),
        "supabase_anon_key": os.getenv("SUPABASE_ANON_KEY"),
        "ntfy_topic": os.getenv("NTFY_TOPIC", "nexus-alerts-sih2025"),
    }