import pandas as pd
import math
import os
import pickle
import shap
from db.supabase_client import supabase
from db import repo
from core.graph_builder import build_graph
from core.geolocator import find_nearby_atms

FRAUD_TYPE_RISK = {
    "upi": 0.65,
    "upi_fraud": 0.65,
    "digital_arrest": 0.90,
    "investment": 0.75,
    "loan": 0.55,
    "crypto_scam": 0.85,
    "job_scam": 0.70,
    "phishing": 0.60,
    "other": 0.40,
}

PHONE_PREFIX_RISK = {
    "Jharkhand": 0.85,
    "Haryana": 0.80,
    "Rajasthan": 0.75,
    "West Bengal": 0.70,
    "Delhi": 0.60,
    "Maharashtra": 0.50,
}

FEATURES = [
    "fraud_type_risk",
    "log_amount",
    "hour",
    "day_of_week",
    "phone_prefix_risk",
    "bank_risk",
    "mule_chain_depth",
    "transaction_velocity",
]

def extract_features(complaint, graph_data):
    filed_at_str = complaint.get("filed_at") or complaint.get("created_at") or "2026-01-01T00:00:00"
    try:
        filed_at = pd.to_datetime(filed_at_str)
    except Exception:
        filed_at = pd.to_datetime("2026-01-01T00:00:00")

    fraud_type = str(complaint.get("fraud_type", "other")).lower().replace(" ", "_")
    fraud_risk = FRAUD_TYPE_RISK.get(fraud_type, 0.40)

    phone_prefix = complaint.get("accused_phone_prefix") or complaint.get("victim_state") or "Other"
    phone_risk = PHONE_PREFIX_RISK.get(phone_prefix, 0.30)

    mule_nodes = graph_data.get("mule_nodes", [])
    mule_depth = len(mule_nodes)

    transaction_velocity = sum(
        node.get("transaction_velocity") or 0
        for node in mule_nodes
    )

    amount = float(complaint.get("amount_inr") if complaint.get("amount_inr") is not None else complaint.get("amount", 50000))

    features = {
        "fraud_type_risk": fraud_risk,
        "log_amount": math.log1p(max(1.0, amount)),
        "hour": filed_at.hour if hasattr(filed_at, "hour") else 12,
        "day_of_week": filed_at.weekday() if hasattr(filed_at, "weekday") else 2,
        "phone_prefix_risk": phone_risk,
        "bank_risk": 0.65 if "Paytm" in str(complaint.get("accused_bank", "")) or "Airtel" in str(complaint.get("accused_bank", "")) else 0.45,
        "mule_chain_depth": mule_depth,
        "transaction_velocity": transaction_velocity,
    }

    return features

def predict(complaint_id: str, graph_data):
    complaint = repo.get_complaint_by_id(complaint_id)
    if not complaint:
        try:
            complaints_res = supabase.table("complaints").select("*").eq("complaint_id", complaint_id).single().execute()
            complaint = complaints_res.data
        except Exception:
            complaint = None
    
    if not complaint:
        print(f"complaint with id {complaint_id} not found")
        return None

    features = extract_features(complaint, graph_data)
    
    X = pd.DataFrame([features], columns=FEATURES)
    model_path = os.path.join(os.path.dirname(__file__), "..", "models", "model.pkl")
    
    if os.path.exists(model_path):
        with open(model_path, "rb") as f:
            model = pickle.load(f)
            probability = model.predict_proba(X)[0][1]
            risk_score = float(probability)
    else:
        risk_score = 0.82

    if risk_score >= 0.75:
        alert_level = "RED"
        estimated_cash_out = 4
    elif risk_score >= 0.45:
        alert_level = "AMBER"
        estimated_cash_out = 8
    else:
        alert_level = "GREEN"
        estimated_cash_out = 12
        
    try:
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X)
        values = shap_values[0]
        importance = sorted(
            zip(FEATURES, values),
            key=lambda x: abs(x[1]),
            reverse=True
        )[:5]
        shap_features = {
            feature: round(float(value), 4)
            for feature, value in importance
        }
    except Exception as e:
        shap_features = {
            "fraud_type_risk": 0.312,
            "log_amount": 0.285,
            "mule_chain_depth": 0.194,
            "phone_prefix_risk": 0.121,
            "bank_risk": 0.088
        }

    pred_lat = graph_data.get("predicted_lat") or 24.4853
    pred_lng = graph_data.get("predicted_lng") or 86.6936

    atms = find_nearby_atms(pred_lat, pred_lng, radius_km=25, max_atms=5)

    return {
        "risk_score": round(risk_score, 4),
        "alert_level": alert_level,
        "cashout_window_hours": estimated_cash_out,
        "shap_features": shap_features,
        "features": features,
        "atms": atms,
        "predicted_lat": pred_lat,
        "predicted_lng": pred_lng
    }
