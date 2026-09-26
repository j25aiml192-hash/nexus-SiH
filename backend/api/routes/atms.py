import logging
from fastapi import APIRouter, HTTPException
from typing import Optional
from db import repo

logger = logging.getLogger("nexus.api.atms")
router = APIRouter()


@router.get("/hotspots")
def get_hotspots():
    try:
        hotspots = repo.get_hotspots()
        formatted = []
        for h in hotspots:
            lat = h.get("latitude") or h.get("center_lat") or h.get("lat")
            lon = h.get("longitude") or h.get("center_lon") or h.get("lng") or h.get("lon")
            formatted.append({
                "id": str(h.get("hotspot_id") or h.get("id") or ""),
                "hotspot_id": str(h.get("hotspot_id") or h.get("id") or ""),
                "district": h.get("district_name") or h.get("district"),
                "district_name": h.get("district_name") or h.get("district"),
                "state_name": h.get("state_name") or h.get("state"),
                "latitude": float(lat) if lat is not None else None,
                "longitude": float(lon) if lon is not None else None,
                "center_lat": float(lat) if lat is not None else None,
                "center_lon": float(lon) if lon is not None else None,
                "lat": float(lat) if lat is not None else None,
                "lng": float(lon) if lon is not None else None,
                "radius_km": float(h.get("radius_km") or 5.0),
                "risk_score": float(h.get("risk_score") or h.get("hotspot_score") or 0.8),
                "hotspot_score": float(h.get("hotspot_score") or h.get("risk_score") or 0.8),
                "prediction_count": int(h.get("prediction_count") or 0),
                "cashout_count": int(h.get("cashout_count") or 0),
                "status": h.get("status") or "active"
            })
        return formatted
    except Exception as e:
        logger.error(f"[HOTSPOTS ERROR] {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database query error: {type(e).__name__}: {str(e)}")


@router.get("/")
def get_atms(ids: Optional[str] = None, limit: int = 100):
    try:
        atm_ids = [x.strip() for x in ids.split(",") if x.strip()] if ids else None
        atms = repo.get_atms(ids=atm_ids, limit=limit)
        formatted = []
        for a in atms:
            lat = a.get("latitude") or a.get("lat")
            lon = a.get("longitude") or a.get("lon") or a.get("lng")
            formatted.append({
                "id": str(a.get("atm_id") or a.get("id") or ""),
                "atm_id": str(a.get("atm_id") or a.get("id") or ""),
                "name": a.get("name") or f"{a.get('bank_name', 'National Bank')} ATM",
                "bank_name": a.get("bank_name") or a.get("bank") or "National Bank",
                "latitude": float(lat) if lat is not None else None,
                "longitude": float(lon) if lon is not None else None,
                "lat": float(lat) if lat is not None else None,
                "lng": float(lon) if lon is not None else None,
                "state_name": a.get("state_name") or a.get("state"),
                "district": a.get("district_name") or a.get("district"),
                "district_name": a.get("district_name") or a.get("district"),
                "area_type": a.get("area_type") or "urban",
                "is_active": a.get("is_active") if a.get("is_active") is not None else True,
                "address": a.get("address") or f"{a.get('district_name') or a.get('district') or 'Transit'} Cluster",
            })
        return formatted
    except Exception as e:
        logger.error(f"[ATMS ERROR] {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database query error: {type(e).__name__}: {str(e)}")


@router.get("/{atm_id}")
def get_atm(atm_id: str):
    try:
        atm = repo.get_atm_by_id(atm_id)
        if not atm:
            raise HTTPException(
                status_code=404,
                detail=f"ATM '{atm_id}' not found"
            )
        lat = atm.get("latitude") or atm.get("lat")
        lon = atm.get("longitude") or atm.get("lon") or atm.get("lng")
        return {
            "id": str(atm.get("atm_id") or atm.get("id") or ""),
            "atm_id": str(atm.get("atm_id") or atm.get("id") or ""),
            "name": atm.get("name") or f"{atm.get('bank_name', 'National Bank')} ATM",
            "bank_name": atm.get("bank_name") or atm.get("bank") or "National Bank",
            "latitude": float(lat) if lat is not None else None,
            "longitude": float(lon) if lon is not None else None,
            "lat": float(lat) if lat is not None else None,
            "lng": float(lon) if lon is not None else None,
            "state_name": atm.get("state_name") or atm.get("state"),
            "district": atm.get("district_name") or atm.get("district"),
            "district_name": atm.get("district_name") or atm.get("district"),
            "area_type": atm.get("area_type") or "urban",
            "is_active": atm.get("is_active") if atm.get("is_active") is not None else True,
            "address": atm.get("address") or f"{atm.get('district_name') or atm.get('district') or 'Transit'} Cluster",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ATM BY ID ERROR] {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database query error: {type(e).__name__}: {str(e)}")