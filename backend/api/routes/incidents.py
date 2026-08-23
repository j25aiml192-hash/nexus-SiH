from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.supabase_client import supabase

router = APIRouter()


class IncidentReport(BaseModel):
    prediction_id: str | None = None
    officer_id: str | None = None
    suspect_observed: bool = False
    suspect_apprehended: bool = False
    funds_secured: bool = False
    amount_recovered: float = 0
    notes: str | None = None


@router.post("/report")
def report_incident(report: IncidentReport):

    result = (
        supabase
        .table("incident_reports")
        .insert(report.model_dump())
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=500,
            detail="Failed to save incident report"
        )

    return result.data[0]