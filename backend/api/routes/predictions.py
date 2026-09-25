from fastapi import APIRouter, HTTPException
from core.pipeline import run_pipeline
from db import repo
from core.geolocator import find_nearby_atms

router = APIRouter()


@router.get("/")
@router.get("/heatmap")
def get_heatmap():
    predictions = repo.get_all_active_predictions()
    # Ensure standard geo naming for frontend convenience
    formatted = []
    for p in predictions:
        lat = p.get("predicted_lat")
        lon = p.get("predicted_lon")
        formatted.append({
            **p,
            "predicted_lng": lon,
            "lat": lat,
            "lng": lon
        })
    return formatted


@router.get("/{complaint_id}")
def get_prediction(
    complaint_id: str,
    force_refresh: bool = False
):
    # Verify complaint exists
    complaint = repo.get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(
            status_code=404,
            detail=f"Complaint '{complaint_id}' not found"
        )

    # Check existing or run pipeline
    pred = None
    if not force_refresh:
        pred = repo.get_prediction_by_complaint(complaint_id)
    
    if not pred or force_refresh:
        pred = run_pipeline(complaint_id, force_refresh=force_refresh)

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