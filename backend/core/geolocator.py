import math
from db.supabase_client import supabase
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
    radius_km=2,
    max_atms=10,
):
    if predicted_lat is None or predicted_lng is None:
        return []

    response = (
        supabase
        .table("atm_locations")
        .select("*")
        .execute()
    )

    atms = []
    for atm in response.data:
        lat = float(atm["lat"])
        lng = float(atm["lng"])
        distance = distance_km(
            predicted_lat,
            predicted_lng,
            lat,
            lng,
        )
    
        if distance <= radius_km:
            atm["distance_km"] = round(distance, 3)
            atms.append(atm)

    atms.sort(key=lambda x: x["distance_km"])
    return atms[:max_atms]