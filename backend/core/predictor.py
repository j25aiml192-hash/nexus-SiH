import pandas as pd
import math
import os
import pickle
import shap
from db.supabase_client import supabase
from core.graph_builder import build_graph
from core.geolocator import find_nearby_atms

FRAUD_TYPE_RISK = {
    "upi": 0.65,
    "digital_arrest": 0.90,
    "investment": 0.75,
    "loan": 0.55,
    "other": 0.40,
}

PHONE_PREFIX_RISK = {
    "Jharkhand": 0.85,
    "Haryana": 0.80,
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

    filed_at = pd.to_datetime(complaint["filed_at"])

    fraud_type = complaint["fraud_type"].lower()

    fraud_risk = FRAUD_TYPE_RISK.get(
        fraud_type,
        0.40
    )

    phone_prefix = complaint.get("accused_phone_prefix")

    phone_risk = PHONE_PREFIX_RISK.get(
        phone_prefix,
        0.20
    )

    mule_nodes = graph_data.get("mule_nodes", [])

    mule_depth = len(mule_nodes)

    transaction_velocity = sum(
        node.get("transaction_velocity") or 0
        for node in mule_nodes
    )

    features = {
        "fraud_type_risk": fraud_risk,
        "log_amount": math.log1p(
            float(complaint["amount"])
        ),
        "hour": filed_at.hour,
        "day_of_week": filed_at.weekday(),
        "phone_prefix_risk": phone_risk,
        "bank_risk": 0.5,
        "mule_chain_depth": mule_depth,
        "transaction_velocity": transaction_velocity,
    }

    return features

def predict(complaint_id:str, graph_data):
    complaints_res = supabase.table("complaints").select("*").eq("complaint_id", complaint_id).single().execute()
    complaint = complaints_res.data
    
    if not complaint:
        print(f"complaint with id {complaint_id} not found")
        return
    

    features = extract_features(complaint, graph_data)
    
    X = pd.DataFrame(
        [features],
        columns=FEATURES
    )
    with open(os.path.join(os.path.dirname(__file__), "..", "models", "model.pkl"), "rb") as f:
        model = pickle.load(f)
        probability = model.predict_proba(X)[0][1]
        risk_score = float(probability)
    
    if risk_score >= 0.75:
        alert_level = "RED"
        estimated_cash_out = 4

    elif risk_score >= 0.45:
        alert_level = "AMBER"
        estimated_cash_out = 8
    else:
        alert_level = "GREEN"
        estimated_cash_out = 12
        
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X)
    values = shap_values[0]
    
    importance = sorted(
        zip(FEATURES, values),
        key=lambda x: abs(x[1]),
        reverse=True
    )[:5]

    shap_features = {
        feature: float(value)
        for feature, value in importance
    } 

    atms = find_nearby_atms(graph_data.get("predicted_lat"), graph_data.get("predicted_lng"), 5, 5)
    return {
        "risk_score": risk_score,
        "alert_level": alert_level,
        "cashout_window_hours": estimated_cash_out,
        "shap_features": shap_features,
        "features": features,
        "atms": atms
    }
    
