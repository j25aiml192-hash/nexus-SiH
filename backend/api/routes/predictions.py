from fastapi import APIRouter, HTTPException
from core.pipeline import run_pipeline
from db import repo
from core.geolocator import find_nearby_atms

router = APIRouter()


import logging

logger = logging.getLogger("nexus.api.predictions")


@router.get("/")
@router.get("/heatmap")
def get_heatmap():
    try:
        predictions = repo.get_all_active_predictions()
        formatted = []
        for p in predictions:
            lat = p.get("predicted_lat") or p.get("lat")
            lon = p.get("predicted_lon") or p.get("predicted_lng") or p.get("lng")
            risk_score = float(p.get("risk_score") or 0.75)
            risk_level = p.get("risk_level") or ("RED" if risk_score >= 0.75 else "AMBER" if risk_score >= 0.45 else "GREEN")
            formatted.append({
                "id": str(p.get("prediction_id") or p.get("id") or ""),
                "prediction_id": str(p.get("prediction_id") or p.get("id") or ""),
                "complaint_id": str(p.get("complaint_id") or ""),
                "predicted_lat": float(lat) if lat is not None else None,
                "predicted_lon": float(lon) if lon is not None else None,
                "predicted_lng": float(lon) if lon is not None else None,
                "lat": float(lat) if lat is not None else None,
                "lng": float(lon) if lon is not None else None,
                "risk_score": risk_score,
                "risk_level": risk_level,
                "cashout_window_hours": int(p.get("cashout_window_hours") or 8),
                "nearest_atms": p.get("predicted_atms") or [],
                "status": p.get("status") or "active"
            })
        return formatted
    except Exception as e:
        logger.error(f"[PREDICTIONS HEATMAP ERROR] {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database query error: {type(e).__name__}: {str(e)}")



@router.get("/{complaint_id}")
def get_prediction(
    complaint_id: str,
    force_refresh: bool = False
):
    # Verify complaint exists (supports UUID or NCRP/Ticket ID)
    complaint = repo.get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(
            status_code=404,
            detail=f"Complaint '{complaint_id}' not found"
        )

    # Always use canonical UUID for all internal prediction operations
    canonical_cid = str(complaint.get("complaint_id") or complaint_id)

    # Check existing or run pipeline
    pred = None
    if not force_refresh:
        pred = repo.get_prediction_by_complaint(canonical_cid)
    
    if not pred or force_refresh:
        pred = run_pipeline(canonical_cid, force_refresh=force_refresh)

    if not pred:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate prediction"
        )

    lat = pred.get("predicted_lat") or 24.4853
    lon = pred.get("predicted_lon") or 86.6936
    
    # Resolve candidate ATMs
    atm_objects = []
    atms_raw = pred.get("predicted_atms") or []
    if isinstance(atms_raw, list) and atms_raw and isinstance(atms_raw[0], str):
        atm_objects = repo.get_atms(ids=atms_raw)
    
    if not atm_objects:
        atm_objects = find_nearby_atms(lat, lon, radius_km=30, max_atms=5)

    return {
        **pred,
        "predicted_lng": lon,
        "nearest_atms": atm_objects
    }