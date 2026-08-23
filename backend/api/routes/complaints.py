from fastapi import APIRouter, HTTPException
from core.pipeline import run_pipeline
from pydantic import BaseModel
from db.supabase_client import supabase

router = APIRouter()

#POST /complaints/ingest?complaint_id=CMP-0001
class ComplaintCreate(BaseModel):
    complaint_id: str
    fraud_type: str
    amount: float
    victim_state: str | None = None
    victim_district: str | None = None
    accused_phone_prefix: str | None = None
    accused_bank: str | None = None
    accused_account_hash: str | None = None
    mule_chain_depth: int | None = None


@router.post("/ingest")
def ingest_complaint(complaint: ComplaintCreate):

    existing = (
        supabase
        .table("complaints")
        .select("complaint_id")
        .eq("complaint_id", complaint.complaint_id)
        .execute()
    )

    if existing.data:
        raise HTTPException(
            status_code=409,
            detail="Complaint already exists"
        )

    result = (
        supabase
        .table("complaints")
        .insert(complaint.model_dump())
        .execute()
    )

    return {
        "status": "created",
        "complaint_id": complaint.complaint_id
    }


@router.get("/list")
def list_complaints(limit: int = 50):
    result = supabase.table('complaints').select('*')\
             .order('created_at', desc=True).limit(limit).execute()
    return result.data