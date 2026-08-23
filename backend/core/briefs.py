from datetime import date
from db.supabase_client import supabase


def generate_daily_brief():

    today = date.today().isoformat()

    predictions = (
        supabase
        .table("predictions")
        .select("*")
        .eq("status", "active")
        .execute()
    )

    data = predictions.data or []

    red = [
        p for p in data
        if p.get("alert_level") == "RED"
    ]

    amber = [
        p for p in data
        if p.get("alert_level") == "AMBER"
    ]

    summary = {
    "date": today,

    "summary": {
        "total_predictions": len(data),
        "red_alerts": len(red),
        "amber_alerts": len(amber),
    },

    "red_alerts": [
        {
            "complaint_id": p["complaint_id"],
            "risk_score": float(p["risk_score"]),
            "cashout_window_hours": p["cashout_window_hours"],
            "predicted_lat": p["predicted_lat"],
            "predicted_lng": p["predicted_lng"],
            "predicted_atms": p["predicted_atms"],
        }
        for p in red
    ],

    "amber_alerts": [
        {
            "complaint_id": p["complaint_id"],
            "risk_score": float(p["risk_score"]),
            "cashout_window_hours": p["cashout_window_hours"],
            "predicted_lat": p["predicted_lat"],
            "predicted_lng": p["predicted_lng"],
            "predicted_atms": p["predicted_atms"],
        }
        for p in amber
    ],
}

    
    brief = {
        "brief_date": today,
        "summary_json": summary,
    }

    # Don't create duplicate brief for the same day
    existing = (
        supabase
        .table("daily_briefs")
        .select("id")
        .eq("brief_date", today)
        .limit(1)
        .execute()
    )

    if existing.data:

        result = (
            supabase
            .table("daily_briefs")
            .update(brief)
            .eq("id", existing.data[0]["id"])
            .execute()
        )

    else:

        result = (
            supabase
            .table("daily_briefs")
            .insert(brief)
            .execute()
        )

    return result.data[0]