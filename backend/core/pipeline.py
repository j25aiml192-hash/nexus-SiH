from db.supabase_client import supabase
from core.graph_builder import build_graph
from core.predictor import predict


def run_pipeline(complaint_id):

    graph_data = build_graph(complaint_id)

    if not graph_data:
        return None

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
        "predicted_atms": [atm["id"] for atm in prediction["atms"]],
        "status": "active",
        "recovery_score": 0,
    }

    result = (
        supabase
        .table("predictions")
        .insert(prediction_row)
        .execute()
    )

    return result.data
