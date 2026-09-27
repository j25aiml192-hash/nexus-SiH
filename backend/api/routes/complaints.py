import logging
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from core.pipeline import run_pipeline
from db import repo

logger = logging.getLogger("nexus.api.complaints")
router = APIRouter()

class ComplaintCreate(BaseModel):
    complaint_id: Optional[str] = None
    ncrp_id: Optional[str] = None
    cfcfrms_ticket_id: Optional[str] = None
    fraud_type: Optional[str] = "UPI_PHISHING"
    amount: Optional[float] = None
    amount_inr: Optional[float] = None
    victim_state: Optional[str] = "Jharkhand"
    victim_district: Optional[str] = "Deoghar"
    victim_lat: Optional[float] = None
    victim_lon: Optional[float] = None
    accused_phone: Optional[str] = None
    accused_phone_prefix: Optional[str] = None
    accused_bank: Optional[str] = "State Bank of India"
    accused_account_hash: Optional[str] = None
    mule_chain_depth: Optional[int] = 1
    channel: Optional[str] = "UPI"
    status: Optional[str] = "active"


@router.post("/ingest")
def ingest_complaint(complaint: ComplaintCreate):
    data = complaint.model_dump()
    amt = data.get("amount_inr") or data.get("amount")
    if amt is None or float(amt) <= 0:
        raise HTTPException(
            status_code=422,
            detail="Disputed amount must be a positive number greater than 0"
        )
    data["amount_inr"] = float(amt)
    data["amount"] = float(amt)

    # Check if a valid UUID was supplied and already exists
    cid = data.get("complaint_id")
    if cid and repo.is_valid_uuid(cid):
        existing = repo.get_complaint_by_id(cid)
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Complaint with ID '{cid}' already exists"
            )

    try:
        created = repo.create_complaint(data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[INGEST COMPLAINT ERROR]: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to ingest complaint into database: {type(e).__name__}: {str(e)}"
        )

    if not created or not created.get("complaint_id"):
        raise HTTPException(
            status_code=500,
            detail="Failed to persist complaint to Supabase"
        )

    cid = created["complaint_id"]
    ncrp_id = created.get("ncrp_id")

    # Trigger backend pipeline: prediction generation & alerts
    prediction = None
    try:
        prediction = run_pipeline(cid)
    except Exception as e:
        logger.error(f"[PIPELINE RUN ERROR] for complaint {cid}: {e}", exc_info=True)

    return {
        "status": "created",
        "complaint_id": cid,
        "ncrp_id": ncrp_id,
        "created_at": created.get("created_at"),
        "complaint": created,
        "prediction": prediction
    }


@router.get("/list")
def list_complaints(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    status: Optional[str] = None
):
    try:
        return repo.get_complaints(limit=limit, offset=offset, search=search, status=status)
    except Exception as e:
        logger.error(f"[COMPLAINTS LIST ERROR] {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Database query error: {type(e).__name__}: {str(e)}"
        )


@router.get("/enriched")
def list_enriched_complaints(limit: int = 50):
    complaints = repo.get_complaints(limit=limit)
    enriched = []
    for c in complaints:
        cid = c["complaint_id"]
        chain = repo.get_mule_chain(cid)
        pred = repo.get_prediction_by_complaint(cid)
        enriched.append({
            **c,
            "mule_chain_nodes": chain.get("mule_nodes", []),
            "predictions": [pred] if pred else []
        })
    return enriched


@router.get("/{complaint_id}")
def get_complaint(complaint_id: str):
    complaint = repo.get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(
            status_code=404,
            detail=f"Complaint '{complaint_id}' not found"
        )
    return complaint