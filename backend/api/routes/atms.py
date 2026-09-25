from fastapi import APIRouter, HTTPException
from typing import Optional
from db import repo

router = APIRouter()


@router.get("/hotspots")
def get_hotspots():
    hotspots = repo.get_hotspots()
    formatted = []
    for h in hotspots:
        formatted.append({
            "id": h.get("id"),
            "district": h.get("district"),
            "latitude": h.get("latitude"),
            "longitude": h.get("longitude"),
            "lat": h.get("latitude"),
            "lng": h.get("longitude"),
            "risk_score": h.get("risk_score"),
            "status": h.get("status")
        })
    return formatted


@router.get("/")
def get_atms(ids: Optional[str] = None, limit: int = 100):
    atm_ids = [x.strip() for x in ids.split(",") if x.strip()] if ids else None
    atms = repo.get_atms(ids=atm_ids, limit=limit)
    formatted = []
    for a in atms:
        lat = a.get("latitude")
        lon = a.get("longitude")
        formatted.append({
            **a,
            "id": a.get("atm_id"),
            "lat": lat,
            "lng": lon,
            "latitude": lat,
            "longitude": lon
        })
    return formatted


@router.get("/{atm_id}")
def get_atm(atm_id: str):
    atm = repo.get_atm_by_id(atm_id)
    if not atm:
        raise HTTPException(
            status_code=404,
            detail=f"ATM '{atm_id}' not found"
        )
    lat = atm.get("latitude")
    lon = atm.get("longitude")
    return {
        **atm,
        "id": atm.get("atm_id"),
        "lat": lat,
        "lng": lon,
        "latitude": lat,
        "longitude": lon
    }