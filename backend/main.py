from fastapi import FastAPI

from api.routes import complaints
from api.routes import predictions
from api.routes import alerts
from api.routes import incidents
from api.routes import briefs
from api.routes import mule
from scheduler import start_scheduler

start_scheduler()
app = FastAPI(
    title="Nexus Cybercrime Intelligence API",
    description="Predictive cybercrime and cash-out risk intelligence backend",
    version="1.0.0",
)


app.include_router(complaints.router, prefix="/complaints", tags=["Complaints"])
app.include_router(predictions.router, prefix="/predictions", tags=["Predictions"])
app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
app.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
app.include_router(briefs.router, prefix="/briefs", tags=["Briefs"])
app.include_router(mule.router, prefix="/mule", tags=["Mule"])


@app.get("/health")
def health():
    return {"status": "ok"}