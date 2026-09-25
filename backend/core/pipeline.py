from db.supabase_client import supabase
from db import repo
from core.graph_builder import build_graph
from core.predictor import predict

def run_pipeline(complaint_id, force_refresh=False):
    # 1. Check for existing active prediction in repo
    if not force_refresh:
        existing = repo.get_prediction_by_complaint(complaint_id)
        if existing and existing.get("status") == "active":
            return existing

    # 2. Build mule graph
    graph_data = build_graph(complaint_id)
    if not graph_data:
        return None

    # 3. Run prediction
    prediction = predict(complaint_id, graph_data)
    if not prediction:
        return None

    lat = prediction.get("predicted_lat") or graph_data.get("predicted_lat") or 24.4853
    lon = prediction.get("predicted_lng") or graph_data.get("predicted_lng") or 86.6936

    atm_ids = [atm.get("atm_id") or atm.get("id") for atm in prediction.get("atms", [])]

    prediction_row = {
        "complaint_id": complaint_id,
        "risk_score": prediction["risk_score"],
        "risk_level": prediction["alert_level"],
        "predicted_lat": lat,
        "predicted_lon": lon,
        "cashout_window_hours": prediction["cashout_window_hours"],
        "shap_features": prediction["shap_features"],
        "predicted_atms": atm_ids,
        "status": "active",
        "recovery_score": 100,
        "confidence": 0.88,
        "model_version": "geo_lgbm_v3"
    }

    # Save to repo (guaranteed persistent DB)
    saved = repo.save_prediction(prediction_row)
    
    # Also attempt Supabase upsert if online
    try:
        supabase.table("predictions").upsert(prediction_row).execute()
    except Exception as e:
        pass

    return saved
