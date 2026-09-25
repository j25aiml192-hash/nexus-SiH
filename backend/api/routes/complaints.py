from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from core.pipeline import run_pipeline
from db import repo

router = APIRouter()

class ComplaintCreate(BaseModel):
    complaint_id: Optional[str] = None
    fraud_type: str = "upi_fraud"
    amount: Optional[float] = None
    amount_inr: Optional[float] = None
    victim_state: Optional[str] = "Maharashtra"
    victim_district: Optional[str] = "Mumbai"
    accused_phone_prefix: Optional[str] = None
    accused_bank: Optional[str] = "State Bank of India"
    accused_account_hash: Optional[str] = None
    mule_chain_depth: Optional[int] = 1
    channel: Optional[str] = "Online Portal"
    status: Optional[str] = "flagged"


@router.post("/ingest")
def ingest_complaint(complaint: ComplaintCreate):
    data = complaint.model_dump()
    if data.get("amount") and not data.get("amount_inr"):
        data["amount_inr"] = data["amount"]

    # Check if exists
    cid = data.get("complaint_id")
    if cid:
        existing = repo.get_complaint_by_id(cid)
        if existing:
            raise HTTPException(
                status_code=409,
                detail="Complaint already exists"
            )

    created = repo.create_complaint(data)
    cid = created["complaint_id"]

    # Trigger backend pipeline: prediction generation & alerts
    prediction = None
    try:
        prediction = run_pipeline(cid)
    except Exception as e:
        print(f"Pipeline error for {cid}: {e}")

    return {
        "status": "created",
        "complaint_id": cid,
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
    return repo.get_complaints(limit=limit, offset=offset, search=search, status=status)


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