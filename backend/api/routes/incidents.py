from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db import repo

router = APIRouter()


class IncidentReport(BaseModel):
    prediction_id: Optional[str] = None
    officer_id: Optional[str] = None
    suspect_observed: bool = False
    suspect_apprehended: bool = False
    funds_secured: bool = False
    amount_recovered: float = 0
    notes: Optional[str] = None


class IncidentNoteRequest(BaseModel):
    note: str


class IncidentAuthorizeRequest(BaseModel):
    officer_id: Optional[str] = "Demo Analyst"
    action: Optional[str] = "FREEZE_ACCOUNT_AND_DISPENSER"


@router.get("/list")
@router.get("/")
def get_incidents_list(limit: int = 50):
    incidents = repo.get_incidents(limit=limit)
    enriched = []
    for inc in incidents:
        cid = inc.get("complaint_id")
        comp = repo.get_complaint_by_id(cid) if cid else None
        pred = repo.get_prediction_by_complaint(cid) if cid else None
        enriched.append({
            **inc,
            "id": inc.get("incident_id"),
            "complaint": comp,
            "prediction": pred,
            "priority": "HIGH" if pred and pred.get("risk_level") == "RED" else "MEDIUM"
        })
    return enriched


@router.get("/{incident_id}")
def get_incident(incident_id: str):
    inc = repo.get_incident_by_id(incident_id)
    if not inc:
        raise HTTPException(
            status_code=404,
            detail=f"Incident '{incident_id}' not found"
        )
    cid = inc.get("complaint_id")
    comp = repo.get_complaint_by_id(cid) if cid else None
    pred = repo.get_prediction_by_complaint(cid) if cid else None
    
    # Candidate ATMs
    atm_objects = []
    if pred:
        lat = pred.get("predicted_lat") or 24.4853
        lon = pred.get("predicted_lon") or 86.6936
        atms_raw = pred.get("predicted_atms") or []
        if isinstance(atms_raw, list) and atms_raw and isinstance(atms_raw[0], str):
            atm_objects = repo.get_atms(ids=atms_raw)

    return {
        **inc,
        "id": inc.get("incident_id"),
        "complaint": comp,
        "prediction": pred,
        "atms": atm_objects
    }


@router.post("/{incident_id}/notes")
def add_note(incident_id: str, req: IncidentNoteRequest):
    updated = repo.add_incident_note(incident_id, req.note)
    if not updated:
        raise HTTPException(
            status_code=404,
            detail=f"Incident '{incident_id}' not found"
        )
    return {
        **updated,
        "id": incident_id,
        "status": "success",
        "message": "Note added to operational log."
    }


@router.post("/{incident_id}/authorize")
def authorize_incident(incident_id: str, req: Optional[IncidentAuthorizeRequest] = None):
    updated = repo.authorize_incident(incident_id)
    if not updated:
        raise HTTPException(
            status_code=404,
            detail=f"Incident '{incident_id}' not found"
        )
    return {
        **updated,
        "id": incident_id,
        "status": "authorized",
        "action_taken": "Digital warrant authorized under Section 102 CrPC. ATM cashout dispenser locked."
    }


@router.post("/report")
def report_incident(report: IncidentReport):
    return {
        "status": "recorded",
        "suspect_apprehended": report.suspect_apprehended,
        "funds_secured": report.funds_secured,
        "amount_recovered": report.amount_recovered
    }