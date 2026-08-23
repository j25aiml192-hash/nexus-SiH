from fastapi import APIRouter
from db.supabase_client import supabase
from datetime import date

router = APIRouter()


@router.get("/today")
def get_today_brief():

    result = (
        supabase
        .table("daily_briefs")
        .select("*")
        .eq("brief_date", date.today().isoformat())
        .limit(1)
        .execute()
    )

    if not result.data:
        return {
            "message": "No brief available for today"
        }

    return result.data[0]