from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.supabase_client import supabase

router = APIRouter()


class MuleCreate(BaseModel):
    complaint_id: str
    node_index: int
    account_hash: str | None = None
    bank: str | None = None
    state: str | None = None
    transaction_velocity: int = 0
    is_flagged: bool = False
    kyc_lat: float | None = None
    kyc_lng: float | None = None


@router.post("/")
def create_mule(mule: MuleCreate):

    complaint = (
        supabase
        .table("complaints")
        .select("complaint_id")
        .eq("complaint_id", mule.complaint_id)
        .limit(1)
        .execute()
    )

    if not complaint.data:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    result = (
        supabase
        .table("mule_chain_nodes")
        .insert(mule.model_dump())
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=500,
            detail="Failed to create mule node"
        )

    return result.data[0]

@router.get("/{complaint_id}")
def get_mules(complaint_id: str):
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

    result = (
        supabase
        .table("mule_chain_nodes")
        .select("*")
        .eq("complaint_id", complaint_id)
        .order("node_index")
        .execute()
    )

    return {
        "complaint_id": complaint_id,
        "mule_nodes": result.data
    }


@router.get("/details/{complaint_id}")
def get_mule_complaint_full_details(complaint_id: str):
    """
    Executes single optimized RPC function in Postgres returning
    complaint, mule chain traversal, prediction scores, and cashout nodes.
    """
    try:
        response = supabase.rpc("get_mule_complaint_details", {"p_complaint_id": complaint_id}).execute()
        if response.data:
            return response.data
    except Exception as e:
        print(f"RPC call notice: {e}")

    # Fallback to PostgREST relational query if RPC is not deployed yet
    complaint = (
        supabase
        .table("complaints")
        .select("*, mule_chain_nodes(*), predictions(*)")
        .eq("complaint_id", complaint_id)
        .execute()
    )

    if not complaint.data:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    return complaint.data[0]