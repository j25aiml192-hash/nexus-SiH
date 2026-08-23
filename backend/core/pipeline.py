from db.supabase_client import supabase
from core.graph_builder import build_graph
from core.predictor import predict

def run_pipeline(complaint_id, force_refresh=False):

    # 1. Build mule graph
    graph_data = build_graph(complaint_id)

    if not graph_data:
        return None

    # 2. Run prediction
    prediction = predict(complaint_id, graph_data)

    if not prediction:
        return None

    prediction_row = {
        "complaint_id": graph_data["complaint"]["complaint_id"],
        "risk_score": prediction["risk_score"],
        "predicted_lat": graph_data.get("predicted_lat"),
        "predicted_lng": graph_data.get("predicted_lng"),
        "predicted_radius_km": 5,
        "cashout_window_hours": prediction["cashout_window_hours"],
        "alert_level": prediction["alert_level"],
        "shap_features": prediction["shap_features"],
        "predicted_atms": [
            atm["id"] for atm in prediction["atms"]
        ],
        "status": "active",
        "recovery_score": 100,
    }

    # 3. Check for existing active prediction
    existing = (
        supabase
        .table("predictions")
        .select("id")
        .eq("complaint_id", complaint_id)
        .eq("status", "active")
        .limit(1)
        .execute()
    )

    # 4. Existing prediction + no refresh → return it
    if existing.data and not force_refresh:
        return (
            supabase
            .table("predictions")
            .select("*")
            .eq("id", existing.data[0]["id"])
            .single()
            .execute()
            .data
        )

    # 5. Existing prediction + refresh → update it
    if existing.data and force_refresh:
        result = (
            supabase
            .table("predictions")
            .update(prediction_row)
            .eq("id", existing.data[0]["id"])
            .execute()
        )

        return result.data[0]

    # 6. No prediction → create one
    result = (
        supabase
        .table("predictions")
        .insert(prediction_row)
        .execute()
    )

    return result.data[0]
