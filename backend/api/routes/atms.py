from fastapi import APIRouter, HTTPException
from db.supabase_client import supabase

router = APIRouter()

@router.get("/{atm_id}")
def get_atm(atm_id: str):

    result = (
        supabase
        .table("atm_locations")
        .select("*")
        .eq("id", atm_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="ATM not found"
        )

    return result.data


@router.get("/")
def get_atms(ids: str):

    atm_ids = [x.strip() for x in ids.split(",") if x.strip()]

    if not atm_ids:
        raise HTTPException(
            status_code=400,
            detail="No ATM IDs provided"
        )

    result = (
        supabase
        .table("atm_locations")
        .select("*")
        .in_("id", atm_ids)
        .execute()
    )

    return result.data