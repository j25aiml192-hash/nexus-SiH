import datetime
from dotenv import load_dotenv
from db.supabase_client import supabase
load_dotenv()

def detect_clusters() -> None:
    try:
        cutoff = (
            datetime.datetime.now(datetime.timezone.utc) -
            datetime.timedelta(hours=48)
        ).isoformat()

        result = supabase.table("predictions").select("*")\
                 .neq("status", "expired").gte("created_at", cutoff).execute()
        predictions = result.data or []

        if not predictions:
            return

        clusters = []
        for pred in predictions:
            lat = pred.get("predicted_lat")
            lng = pred.get("predicted_lng")
            if not lat or not lng:
                continue

            matched = False
            for cluster in clusters:
                dist = (
                    (lat - cluster["lat"]) ** 2 +
                    (lng - cluster["lng"]) ** 2
                ) ** 0.5 * 111
                if dist <= 15:
                    cluster["preds"].append(pred)
                    cluster["lat"] = sum(
                        p["predicted_lat"] for p in cluster["preds"]
                    ) / len(cluster["preds"])
                    cluster["lng"] = sum(
                        p["predicted_lng"] for p in cluster["preds"]
                    ) / len(cluster["preds"])
                    matched = True
                    break

            if not matched:
                clusters.append({"lat": lat, "lng": lng, "preds": [pred]})

        existing_result = supabase.table("atm_clusters").select("*")\
                          .eq("status", "active").execute()
        existing = existing_result.data or []

        for cluster in clusters:
            if len(cluster["preds"]) < 2:
                continue

            complaint_ids = [p.get("complaint_id") for p in cluster["preds"]]
            avg_risk = sum(
                p.get("risk_score", 0) for p in cluster["preds"]
            ) / len(cluster["preds"])
            score = round(min(100, len(cluster["preds"]) * 15 + avg_risk * 40), 1)

            matched_cluster = None
            for ex in existing:
                dist = (
                    (cluster["lat"] - ex["centroid_lat"]) ** 2 +
                    (cluster["lng"] - ex["centroid_lng"]) ** 2
                ) ** 0.5 * 111
                if dist <= 15:
                    matched_cluster = ex
                    break

            if matched_cluster:
                supabase.table("atm_clusters").update({
                    "complaint_count": len(cluster["preds"]),
                    "cluster_score": score,
                    "last_updated": datetime.datetime.now(
                        datetime.timezone.utc).isoformat(),
                    "linked_complaints": complaint_ids
                }).eq("id", matched_cluster["id"]).execute()
            else:
                first_pred = cluster["preds"][0]
                cluster_name = (
                    f"{first_pred.get('complaint_id', 'Unknown')[:10]} Cluster"
                )
                supabase.table("atm_clusters").insert({
                    "cluster_name": cluster_name,
                    "centroid_lat": cluster["lat"],
                    "centroid_lng": cluster["lng"],
                    "radius_km": 15,
                    "complaint_count": len(cluster["preds"]),
                    "cluster_score": score,
                    "status": "active",
                    "linked_complaints": complaint_ids
                }).execute()

        cutoff_48 = (
            datetime.datetime.now(datetime.timezone.utc) -
            datetime.timedelta(hours=48)
        ).isoformat()
        supabase.table("atm_clusters").update({"status": "expired"})\
                .lt("last_updated", cutoff_48).execute()

    except Exception as e:
        print(f"Cluster detector error: {e}")
