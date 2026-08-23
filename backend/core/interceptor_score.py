import datetime
from dotenv import load_dotenv
from db.supabase_client import supabase
load_dotenv()

def update_recovery_scores() -> None:
    try:
        result = supabase.table("predictions").select("*")\
                 .eq("status", "active").execute()
        predictions = result.data or []

        for prediction in predictions:
            try:
                created_raw = prediction.get("created_at", "")
                created_at = datetime.datetime.fromisoformat(
                    created_raw.replace("Z", "+00:00")
                )
                now = datetime.datetime.now(datetime.timezone.utc)
                elapsed_hours = (now - created_at).total_seconds() / 3600
                window = prediction.get("cashout_window_hours", 12)
                time_ratio = min(elapsed_hours / window, 1.0)
                base_score = (1 - time_ratio) * 100

                decay_map = {"RED": 1.4, "AMBER": 1.1, "GREEN": 0.9}
                rate = decay_map.get(prediction.get("alert_level", "AMBER"), 1.1)
                recovery_score = round(max(0, min(100, base_score / rate)), 1)

                if recovery_score == 0:
                    new_status = "expired"
                elif recovery_score < 20 and prediction.get("status") == "active":
                    new_status = "escalated"
                    supabase.table("alerts").insert({
                        "prediction_id": prediction["id"],
                        "complaint_id": prediction.get("complaint_id"),
                        "alert_type": "dashboard",
                        "recipient_role": "i4c_national",
                        "message": (
                            f"AUTO-ESCALATION: Recovery window closing on "
                            f"{prediction.get('complaint_id')}. "
                            f"Score: {recovery_score}. Immediate action required."
                        ),
                        "alert_level": "RED",
                        "status": "sent"
                    }).execute()
                else:
                    new_status = prediction.get("status", "active")

                supabase.table("predictions").update({
                    "recovery_score": recovery_score,
                    "status": new_status
                }).eq("id", prediction["id"]).execute()

            except Exception as e:
                print(f"Interceptor error on {prediction.get('id')}: {e}")

    except Exception as e:
        print(f"Interceptor score update failed: {e}")
