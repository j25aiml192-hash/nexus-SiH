from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from core.autonomy.case_watcher import get_autonomy_status
from core.autonomy.attention_engine import attention_engine
from db import repo

router = APIRouter()


@router.get("/status")
def get_status():
    """Returns real-time telemetry and heartbeat of the autonomous case watcher."""
    return get_autonomy_status()


@router.get("/attention")
def get_attention_queue(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    level: Optional[str] = Query(None, description="Filter by attention level: CRITICAL, HIGH, MEDIUM, LOW"),
    fraud_type: Optional[str] = Query(None, description="Filter by fraud type"),
    state: Optional[str] = Query(None, description="Filter by victim state"),
):
    """
    Returns prioritized operational work queue ordered by attention_score descending.
    Enables investigators to immediately see which active cases require attention and why.
    """
    return attention_engine.get_attention_queue(
        limit=limit,
        offset=offset,
        attention_level=level,
        fraud_type=fraud_type,
        victim_state=state,
    )


@router.get("/attention/{complaint_id}")
def get_case_attention(complaint_id: str):
    """
    Returns the current operational attention state, machine-readable reason codes,
    and structured decision factor contributions for a specific case.
    """
    state = repo.get_case_attention_state(complaint_id)
    if state:
        return state

    # If not yet evaluated, verify complaint exists and evaluate on demand
    comp = repo.get_complaint_by_id(complaint_id)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found")

    return attention_engine.evaluate_case_attention(complaint_id)

