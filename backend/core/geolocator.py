import math
from db.supabase_client import supabase
from db import repo


def distance_km(lat1, lng1, lat2, lng2):
    R = 6371.0

    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlng / 2) ** 2
    )

    return R * 2 * math.asin(math.sqrt(a))


def find_nearby_atms(
    predicted_lat,
    predicted_lng,
    radius_km=15,
    max_atms=10,
):
    if predicted_lat is None or predicted_lng is None:
        return []

    atms_data = repo.get_atms(limit=200)
    if not atms_data:
        try:
            response = supabase.table("atm_locations").select("*").execute()
            atms_data = response.data or []
        except Exception:
            atms_data = []

    atms = []
    for atm in atms_data:
        lat_val = atm.get("latitude") if atm.get("latitude") is not None else atm.get("lat")
        lng_val = atm.get("longitude") if atm.get("longitude") is not None else (atm.get("lng") if atm.get("lng") is not None else atm.get("lon"))
        if lat_val is None or lng_val is None:
            continue
        lat = float(lat_val)
        lng = float(lng_val)
        distance = distance_km(
            predicted_lat,
            predicted_lng,
            lat,
            lng,
        )
    
        if distance <= radius_km:
            atm_copy = dict(atm)
            atm_copy["distance_km"] = round(distance, 3)
            atm_copy["lat"] = lat
            atm_copy["lng"] = lng
            atm_copy["latitude"] = lat
            atm_copy["longitude"] = lng
            atm_copy["id"] = atm.get("atm_id") or atm.get("id")
            atm_copy["atm_id"] = atm_copy["id"]
            atms.append(atm_copy)

    atms.sort(key=lambda x: x["distance_km"])
    return atms[:max_atms]