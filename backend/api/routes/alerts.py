from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.supabase_client import supabase

router = APIRouter()


class AlertCreate(BaseModel):
    prediction_id: str | None = None
    complaint_id: str | None = None
    alert_type: str | None = None
    recipient_role: str | None = None
    recipient_id: str | None = None
    message: str
    alert_level: str | None = None


@router.post("/send")
def send_alert(alert: AlertCreate):

    result = (
        supabase
        .table("alerts")
        .insert(alert.model_dump())
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=500,
            detail="Failed to create alert"
        )

    return result.data[0]


@router.get("/feed")
def get_alert_feed():

    result = (
        supabase
        .table("alerts")
        .select("*")
        .order("sent_at", desc=True)
        .limit(50)
        .execute()
    )

    return result.data
