import os
import requests
from dotenv import load_dotenv
from db.supabase_client import supabase
load_dotenv()

NTFY_TOPIC = os.getenv("NTFY_TOPIC", "nexus-alerts-sih2025")

def send_alerts(complaint_id: str, prediction_id: str,
                alert_level: str, narrative: str,
                location: dict) -> dict:
    try:
        supabase.table('alerts').insert({
            "prediction_id": prediction_id,
            "complaint_id": complaint_id,
            "alert_type": "dashboard",
            "recipient_role": "state_lea",
            "message": narrative[:500],
            "alert_level": alert_level,
            "status": "sent"
        }).execute()

        if alert_level in ["RED", "AMBER"]:
            try:
                requests.post(
                    f"https://ntfy.sh/{NTFY_TOPIC}",
                    data=f"[{alert_level}] {narrative[:200]}".encode("utf-8"),
                    headers={
                        "Title": f"NEXUS {alert_level} - {complaint_id}",
                        "Priority": "urgent" if alert_level == "RED" else "default",
                        "Tags": "rotating_light" if alert_level == "RED" else "warning"
                    },
                    timeout=5
                )
            except Exception as e:
                print(f"Ntfy push failed: {e}")

        supabase.table('alerts').insert({
            "prediction_id": prediction_id,
            "complaint_id": complaint_id,
            "alert_type": "dashboard",
            "recipient_role": "i4c_national",
            "message": narrative[:500],
            "alert_level": alert_level,
            "status": "sent"
        }).execute()

        return {
            "dashboard": True,
            "push": alert_level in ["RED", "AMBER"],
            "i4c": True
        }

    except Exception as e:
        print(f"Alerter error: {e}")
        return {"dashboard": False, "push": False, "i4c": False}
