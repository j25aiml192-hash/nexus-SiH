from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import datetime
import uuid
from db import repo

router = APIRouter()


class AlertCreate(BaseModel):
    prediction_id: Optional[str] = None
    complaint_id: Optional[str] = None
    alert_type: Optional[str] = "dashboard"
    recipient_role: Optional[str] = None
    recipient_id: Optional[str] = None
    message: str
    severity: Optional[str] = "HIGH"
    assigned_officer: Optional[str] = "Unassigned"


class AssignOfficerRequest(BaseModel):
    officer: Optional[str] = None
    officer_name: Optional[str] = None

    def get_officer(self) -> str:
        return self.officer_name or self.officer or "Insp. R. Sharma"


@router.get("/feed")
def get_alert_feed(limit: int = 50):
    alerts = repo.get_alerts(limit=limit)
    # Ensure consistent fields for frontend
    formatted = []
    for a in alerts:
        formatted.append({
            **a,
            "id": a.get("alert_id"),
            "sent_at": a.get("created_at"),
            "alert_level": a.get("severity")
        })
    return formatted


@router.post("/send")
def send_alert(alert: AlertCreate):
    conn = repo.get_connection()
    c = conn.cursor()
    aid = f"ALT-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    cid = alert.complaint_id or "NCRP-2026-619201"
    pid = alert.prediction_id or ""
    c.execute("""
    INSERT INTO alerts (alert_id, prediction_id, complaint_id, status, created_at, message, alert_type, severity, assigned_officer)
    VALUES (?, ?, ?, 'new', ?, ?, ?, ?, ?)
    """, (aid, pid, cid, now, alert.message, alert.alert_type, alert.severity, alert.assigned_officer))
    conn.commit()
    conn.close()

    return {
        "alert_id": aid,
        "id": aid,
        "complaint_id": cid,
        "message": alert.message,
        "severity": alert.severity,
        "status": "new",
        "created_at": now
    }


@router.post("/{alert_id}/assign")
def assign_officer(alert_id: str, req: AssignOfficerRequest):
    officer_name = req.get_officer()
    updated = repo.assign_alert_officer(alert_id, officer_name)
    if not updated:
        raise HTTPException(
            status_code=404,
            detail=f"Alert '{alert_id}' not found"
        )
    return {
        **updated,
        "id": alert_id,
        "assigned_officer": officer_name,
        "status": "assigned"
    }


@router.post("/simulate")
def simulate_inbound_alert():
    """
    Creates an authentic, DB-persisted inbound high-priority alert for demonstration purposes.
    """
    complaints = repo.get_complaints(limit=1)
    cid = complaints[0]["complaint_id"] if complaints else "NCRP-2026-619201"
    pred = repo.get_prediction_by_complaint(cid)
    pid = pred["prediction_id"] if pred else None

    conn = repo.get_connection()
    c = conn.cursor()
    aid = f"ALT-SIM-{uuid.uuid4().hex[:4].upper()}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    msg = f"LIVE INTERCEPT: Rapid multi-hop cashout detected for case {cid}. ATM withdrawal attempt imminent."
    c.execute("""
    INSERT INTO alerts (alert_id, prediction_id, complaint_id, status, created_at, message, alert_type, severity, assigned_officer)
    VALUES (?, ?, ?, 'new', ?, ?, 'sms', 'CRITICAL', 'Unassigned')
    """, (aid, pid, cid, now, msg))
    conn.commit()
    conn.close()

    return {
        "status": "simulated",
        "alert_id": aid,
        "id": aid,
        "complaint_id": cid,
        "message": msg,
        "severity": "CRITICAL",
        "created_at": now
    }
