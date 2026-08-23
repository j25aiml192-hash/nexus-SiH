from fastapi import APIRouter,HTTPException
from core.pipeline import run_pipeline
from db.supabase_client import supabase
router = APIRouter()

@router.get("/heatmap")
def get_heatmap():

    result = (
        supabase
        .table("predictions")
        .select("*")
        .eq("status", "active")
        .execute()
    )

    return result.data


@router.get("/{complaint_id}")
def get_prediction(
    complaint_id: str,
    force_refresh: bool = False
):
    # Make sure complaint exists
    complaint = (
        supabase
        .table("complaints")
        .select("complaint_id")
        .eq("complaint_id", complaint_id)
        .limit(1)
        .execute()
    )

    if not complaint.data:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    # Check existing active prediction
    existing = (
        supabase
        .table("predictions")
        .select("*")
        .eq("complaint_id", complaint_id)
        .eq("status", "active")
        .limit(1)
        .execute()
    )

    # Return existing unless explicitly refreshing
    if existing.data and not force_refresh:
        return existing.data[0]

    # No prediction OR force refresh
    result = run_pipeline(complaint_id)

    if not result:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate prediction"
        )

    return result