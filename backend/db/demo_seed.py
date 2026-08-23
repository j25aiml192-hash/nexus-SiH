import os
import uuid
import random
import hashlib
import datetime
from dotenv import load_dotenv

# Load environment variables from backend/.env or root .env
if os.path.exists('backend/.env'):
    load_dotenv('backend/.env')
elif os.path.exists('.env'):
    load_dotenv('.env')
else:
    load_dotenv()

from supabase import create_client

supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
supabase_key = (
    os.getenv('SUPABASE_SERVICE_KEY')
    or os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    or os.getenv('SUPABASE_ANON_KEY')
    or os.getenv('VITE_SUPABASE_ANON_KEY')
)

if not supabase_url or not supabase_key:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables.")

supabase = create_client(
    supabase_url,
    supabase_key
)

now = datetime.datetime.now(datetime.timezone.utc)

def ts(hours_ago=0, minutes_ago=0):
    """Return ISO timestamp N hours/minutes in the past."""
    delta = datetime.timedelta(hours=hours_ago, minutes=minutes_ago)
    return (now - delta).isoformat()

def uid():
    return str(uuid.uuid4())

def ahash(text):
    return hashlib.sha256(text.encode()).hexdigest()[:16]

# =============================================================================
# CONFIGURATION — DISTRICTS, BANKS, STATES, FRAUD TYPES
# =============================================================================

DISTRICTS = [
    {"district": "Deoghar",   "state": "Jharkhand",      "lat": 24.4853, "lng": 86.6936, "weight": 0.28},
    {"district": "Giridih",   "state": "Jharkhand",      "lat": 24.1939, "lng": 86.3096, "weight": 0.18},
    {"district": "Nuh",       "state": "Haryana",        "lat": 28.1047, "lng": 76.9974, "weight": 0.20},
    {"district": "Mathura",   "state": "Uttar Pradesh",  "lat": 27.4924, "lng": 77.6737, "weight": 0.14},
    {"district": "Bharatpur", "state": "Rajasthan",      "lat": 27.2152, "lng": 77.4941, "weight": 0.12},
    {"district": "Dhanbad",   "state": "Jharkhand",      "lat": 23.7957, "lng": 86.4304, "weight": 0.08},
]

FRAUD_PATTERNS = [
    {
        "fraud_type": "upi_fraud",
        "amount_range": (5000, 500000),
        "prefixes": ["76", "70", "91"],
        "banks": ["Paytm Payments Bank", "UCO Bank", "SBI"],
        "victim_states": ["Karnataka", "Maharashtra", "Delhi", "Tamil Nadu",
                          "Telangana", "Andhra Pradesh"],
        "cashout_hours": 8,
        "weight": 0.30
    },
    {
        "fraud_type": "digital_arrest",
        "amount_range": (200000, 5000000),
        "prefixes": ["70", "76", "63"],
        "banks": ["Airtel Payments Bank", "Paytm Payments Bank"],
        "victim_states": ["Delhi", "Maharashtra", "Gujarat",
                          "Uttar Pradesh", "Haryana"],
        "cashout_hours": 6,
        "weight": 0.25
    },
    {
        "fraud_type": "investment_scam",
        "amount_range": (100000, 3000000),
        "prefixes": ["91", "78", "98"],
        "banks": ["HDFC Bank", "Axis Bank", "Kotak Bank"],
        "victim_states": ["Maharashtra", "Gujarat", "Rajasthan",
                          "Punjab", "Madhya Pradesh"],
        "cashout_hours": 24,
        "weight": 0.20
    },
    {
        "fraud_type": "vishing",
        "amount_range": (2000, 150000),
        "prefixes": ["77", "63", "88"],
        "banks": ["SBI", "Bank of Baroda", "UCO Bank"],
        "victim_states": ["Uttar Pradesh", "Bihar", "Madhya Pradesh",
                          "Chhattisgarh", "Odisha"],
        "cashout_hours": 12,
        "weight": 0.15
    },
    {
        "fraud_type": "job_fraud",
        "amount_range": (5000, 80000),
        "prefixes": ["88", "99", "78"],
        "banks": ["SBI", "Bank of Baroda"],
        "victim_states": ["Bihar", "Jharkhand", "Odisha",
                          "West Bengal", "Assam"],
        "cashout_hours": 12,
        "weight": 0.10
    },
]

MULE_BANKS = [
    "Paytm Payments Bank", "UCO Bank", "Airtel Payments Bank",
    "SBI", "Bank of Baroda", "Punjab National Bank",
    "Canara Bank", "IDBI Bank"
]

HIGH_RISK_BANKS = ["Paytm Payments Bank", "Airtel Payments Bank", "UCO Bank"]

PHONE_PREFIX_RISK = {
    "76": 0.91, "70": 0.85, "91": 0.78,
    "63": 0.72, "78": 0.68, "98": 0.45,
    "99": 0.40, "88": 0.50, "77": 0.60
}

BANK_RISK = {
    "Paytm Payments Bank": 0.85,
    "Airtel Payments Bank": 0.75,
    "UCO Bank": 0.72,
    "Bank of Baroda": 0.60,
    "SBI": 0.45,
    "HDFC Bank": 0.40,
    "Axis Bank": 0.42,
    "Kotak Bank": 0.38,
    "Punjab National Bank": 0.55,
    "Canara Bank": 0.50,
    "IDBI Bank": 0.48
}

LANDMARKS = [
    "Bus Stand", "Main Market", "Railway Station",
    "Civil Lines", "Hospital Road", "Town Hall", "Court Road",
    "NH-2 Highway", "Industrial Area", "Old City Chowk"
]

VICTIM_DISTRICTS = [
    "Bengaluru Urban", "Mumbai Suburban", "New Delhi",
    "Ahmedabad", "Hyderabad", "Chennai", "Pune",
    "Lucknow", "Jaipur", "Kolkata", "Chandigarh",
    "Bhopal", "Patna", "Guwahati", "Kochi"
]


def seed_demo_data():
    # =========================================================================
    # STEP 1 — DELETE OLD SEEDED DATA (preserve users and atm_locations)
    # =========================================================================
    print("Clearing old demo data...")
    tables_to_delete = [
        'incident_reports',
        'sentinel_scores',
        'atm_clusters',
        'alerts',
        'mule_chain_nodes',
        'predictions',
        'daily_briefs',
        'system_logs',
        'complaints'
    ]

    for tbl in tables_to_delete:
        try:
            supabase.table(tbl).delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        except Exception as e:
            print(f"Warning during clearing {tbl}: {e}")

    print("Old data cleared.")

    # =========================================================================
    # STEP 2 — SEED COMPLAINTS
    # =========================================================================
    # Target: 80 total complaints.
    #   - 45 complaints with created_at within last 12 hours (today's data)
    #   - 20 complaints with created_at between 12 and 48 hours ago
    #   - 15 complaints with created_at between 2 and 7 days ago
    complaints_list = []
    used_complaint_ids = set()

    pattern_weights = [p["weight"] for p in FRAUD_PATTERNS]
    district_weights = [d["weight"] for d in DISTRICTS]

    # Generate timestamp buckets
    time_buckets = []
    # Bucket 1: 45 complaints within last 12 hours
    for _ in range(45):
        hours = random.uniform(0.1, 11.9)
        time_buckets.append(hours)
    # Bucket 2: 20 complaints between 12 and 48 hours ago
    for _ in range(20):
        hours = random.uniform(12.1, 47.9)
        time_buckets.append(hours)
    # Bucket 3: 15 complaints between 2 and 7 days ago (48 to 168 hours)
    for _ in range(15):
        hours = random.uniform(48.1, 167.5)
        time_buckets.append(hours)

    all_complaints = []
    for hours_ago in time_buckets:
        pattern = random.choices(FRAUD_PATTERNS, weights=pattern_weights, k=1)[0]
        assigned_district = random.choices(DISTRICTS, weights=district_weights, k=1)[0]

        while True:
            cid = f"NCRP-2026-{random.randint(100000, 999999)}"
            if cid not in used_complaint_ids:
                used_complaint_ids.add(cid)
                break

        prefix = random.choice(pattern["prefixes"])
        phone = prefix + str(random.randint(10000000, 99999999))
        created_timestamp = ts(hours_ago=hours_ago)

        comp_record = {
            "complaint_id": cid,
            "fraud_type": pattern["fraud_type"],
            "amount": random.randint(*pattern["amount_range"]),
            "filed_at": created_timestamp,
            "victim_state": random.choice(pattern["victim_states"]),
            "victim_district": random.choice(VICTIM_DISTRICTS),
            "accused_phone_prefix": phone,
            "accused_bank": random.choice(pattern["banks"]),
            "accused_account_hash": ahash(cid),
            "mule_chain_depth": random.randint(2, 4),
            "status": "flagged",
            "created_at": created_timestamp
        }

        # Internal metadata for downstream generation
        comp_record["_pattern"] = pattern
        comp_record["_district"] = assigned_district
        comp_record["_hours_ago"] = hours_ago

        all_complaints.append(comp_record)

    # Sort descending by recency so recent ones come first
    all_complaints.sort(key=lambda x: x["_hours_ago"])
    complaints_list = all_complaints

    # Insert into Supabase (strip private metadata helper keys)
    records_to_insert = [
        {k: v for k, v in c.items() if not k.startswith('_')}
        for c in complaints_list
    ]

    try:
        supabase.table('complaints').insert(records_to_insert).execute()
        print(f"Seeded {len(complaints_list)} complaints.")
    except Exception as e:
        print(f"Error inserting complaints: {e}")

    # =========================================================================
    # STEP 3 — SEED PREDICTIONS WITH VALID COORDINATES
    # =========================================================================
    # Target: 70 predictions total (one per complaint for the first 70).
    #   - 25 with alert_level RED,  created within last 12 hours
    #   - 25 with alert_level AMBER, created within last 24 hours
    #   - 20 with alert_level GREEN, created within last 48 hours
    predictions_list = []

    # Choose 5 random predictions to be intercepted, 3 old ones to be expired
    intercepted_indices = set(random.sample(range(70), 5))
    # Old predictions for expired (candidates from index 45..69)
    expired_indices = set(random.sample(range(45, 70), 3))

    for i in range(70):
        complaint = complaints_list[i]
        district = complaint["_district"]
        pattern = complaint["_pattern"]
        hours_ago = complaint["_hours_ago"]

        if i < 25:
            alert_level = "RED"
            risk_score = random.uniform(0.75, 0.97)
        elif i < 50:
            alert_level = "AMBER"
            risk_score = random.uniform(0.50, 0.74)
        else:
            alert_level = "GREEN"
            risk_score = random.uniform(0.20, 0.49)

        final_lat = round(district["lat"] + random.uniform(-0.12, 0.12), 6)
        final_lng = round(district["lng"] + random.uniform(-0.12, 0.12), 6)

        # Recovery score based on how old the prediction is
        if hours_ago <= 2:
            recovery_score = random.randint(70, 95)
        elif hours_ago <= 8:
            recovery_score = random.randint(35, 69)
        elif hours_ago <= 24:
            recovery_score = random.randint(5, 34)
        else:
            recovery_score = random.randint(0, 10)

        # Status determination
        if i in intercepted_indices:
            status = 'intercepted'
        elif i in expired_indices:
            status = 'expired'
        elif recovery_score > 20 and alert_level in ['RED', 'AMBER']:
            status = 'active'
        elif recovery_score <= 20 and alert_level == 'RED':
            status = 'escalated'
        elif alert_level == 'GREEN':
            status = 'active'
        else:
            status = 'active'

        cashout_hours = pattern["cashout_hours"]

        shap_features = {
            "fraud_type_risk": round(random.uniform(0.2, 0.6), 3),
            "phone_prefix_risk": round(random.uniform(0.1, 0.4), 3),
            "bank_risk": round(random.uniform(0.05, 0.3), 3),
            "transaction_velocity": round(random.uniform(0.05, 0.25), 3),
            "time_of_day_risk": round(random.uniform(0.01, 0.15), 3)
        }

        llm_narrative = (
            f"Intelligence assessment indicates a high-probability {complaint['fraud_type']} "
            f"operation targeting victims in {complaint['victim_state']}. Analysis of the "
            f"{complaint['mule_chain_depth']}-hop mule chain traced from account "
            f"{complaint['accused_account_hash'][:8]}... points to likely cash withdrawal in "
            f"{district['district']}, {district['state']} within the next {cashout_hours} hours. "
            f"Risk score: {risk_score:.2f}. Recommend immediate ATM surveillance "
            f"and account freeze coordination with {complaint['accused_bank']}."
        )

        predicted_atms = [
            {
                "name": f"{random.choice(MULE_BANKS)} ATM",
                "address": f"Near {random.choice(LANDMARKS)}, {district['district']}",
                "lat": round(final_lat + random.uniform(-0.03, 0.03), 6),
                "lng": round(final_lng + random.uniform(-0.03, 0.03), 6),
                "distance_km": round(random.uniform(0.5, 8.0), 1)
            }
            for _ in range(3)
        ]

        pred_record = {
            "complaint_id": complaint["complaint_id"],
            "risk_score": round(risk_score, 2),
            "predicted_lat": final_lat,
            "predicted_lng": final_lng,
            "predicted_radius_km": 5.0,
            "cashout_window_hours": cashout_hours,
            "alert_level": alert_level,
            "shap_features": shap_features,
            "llm_narrative": llm_narrative,
            "predicted_atms": predicted_atms,
            "status": status,
            "recovery_score": recovery_score,
            "created_at": complaint["created_at"]
        }

        # Keep internal link
        pred_record["_complaint"] = complaint
        pred_record["_district"] = district
        pred_record["_pattern"] = pattern

        predictions_list.append(pred_record)

    # Insert predictions in batches of 20
    for i in range(0, len(predictions_list), 20):
        batch = [
            {k: v for k, v in p.items() if not k.startswith('_')}
            for p in predictions_list[i:i+20]
        ]
        try:
            supabase.table('predictions').insert(batch).execute()
        except Exception as e:
            print(f"Error inserting predictions batch {i//20}: {e}")

    # Fetch predictions back to map complaint_id to prediction UUID
    prediction_id_map = {}
    try:
        res = supabase.table('predictions').select('id,complaint_id').execute()
        prediction_id_map = {p['complaint_id']: p['id'] for p in res.data}
    except Exception as e:
        print(f"Error fetching predictions id map: {e}")

    print(f"Seeded {len(predictions_list)} predictions.")

    # =========================================================================
    # STEP 4 — SEED MULE CHAIN NODES
    # =========================================================================
    # Target: 3 to 5 nodes per complaint for the first 60 complaints.
    # Total: approximately 200-250 nodes.
    all_mule_nodes = []
    cashout_nodes_sample = []

    for complaint in complaints_list[:60]:
        chain_depth = complaint["mule_chain_depth"]  # 2, 3, or 4
        num_nodes = chain_depth + 1  # 3, 4, or 5 nodes
        district = complaint["_district"]

        # Node 0 (first mule)
        node_0 = {
            "complaint_id": complaint["complaint_id"],
            "node_index": 0,
            "account_hash": ahash(complaint["complaint_id"] + "0"),
            "bank": random.choice(MULE_BANKS),
            "state": random.choice(["Jharkhand", "Haryana", "Uttar Pradesh", "Rajasthan", "Bihar"]),
            "transaction_velocity": random.randint(3, 8),
            "is_flagged": False,
            "kyc_lat": round(district["lat"] + random.uniform(-0.08, 0.08), 6),
            "kyc_lng": round(district["lng"] + random.uniform(-0.08, 0.08), 6),
            "created_at": complaint["created_at"]
        }
        all_mule_nodes.append(node_0)

        # Middle nodes (index 1 to num_nodes - 2)
        for idx in range(1, num_nodes - 1):
            bank = random.choice(MULE_BANKS)
            mid_node = {
                "complaint_id": complaint["complaint_id"],
                "node_index": idx,
                "account_hash": ahash(complaint["complaint_id"] + str(idx)),
                "bank": bank,
                "state": random.choice(["Jharkhand", "Bihar", "West Bengal", "Haryana", "Uttar Pradesh"]),
                "transaction_velocity": random.randint(5, 15),
                "is_flagged": (bank in HIGH_RISK_BANKS),
                "kyc_lat": round(district["lat"] + random.uniform(-0.10, 0.10), 6),
                "kyc_lng": round(district["lng"] + random.uniform(-0.10, 0.10), 6),
                "created_at": complaint["created_at"]
            }
            all_mule_nodes.append(mid_node)

        # Final node (cash-out node)
        final_idx = num_nodes - 1
        final_node = {
            "complaint_id": complaint["complaint_id"],
            "node_index": final_idx,
            "account_hash": ahash(complaint["complaint_id"] + str(final_idx)),
            "bank": random.choice(HIGH_RISK_BANKS),
            "state": district["state"],
            "transaction_velocity": random.randint(10, 25),
            "is_flagged": True,
            "kyc_lat": round(district["lat"] + random.uniform(-0.05, 0.05), 6),
            "kyc_lng": round(district["lng"] + random.uniform(-0.05, 0.05), 6),
            "created_at": complaint["created_at"]
        }
        all_mule_nodes.append(final_node)
        cashout_nodes_sample.append(final_node)

    # Insert mule nodes in batches of 30
    for i in range(0, len(all_mule_nodes), 30):
        batch = all_mule_nodes[i:i+30]
        try:
            supabase.table('mule_chain_nodes').insert(batch).execute()
        except Exception as e:
            print(f"Error inserting mule nodes batch {i//30}: {e}")

    print(f"Seeded {len(all_mule_nodes)} mule chain nodes.")

    # =========================================================================
    # STEP 5 — SEED ALERTS
    # =========================================================================
    # Target: 35 alerts total.
    # Rules:
    #   Every RED prediction gets 2 alerts: state_lea & i4c_national
    #   Every AMBER prediction gets 1 alert: state_lea
    #   5 field_officer alerts on 5 random RED predictions
    #   5 bank_officer alerts on 5 random AMBER predictions
    # Total = 10 RED (20 alerts) + 5 AMBER (5 alerts) + 5 field_officer + 5 bank_officer = 35 alerts.
    alerts_list = []

    red_preds = [p for p in predictions_list if p["alert_level"] == "RED"]
    amber_preds = [p for p in predictions_list if p["alert_level"] == "AMBER"]

    # 10 RED predictions -> 20 alerts
    selected_red = red_preds[:10]
    for pred in selected_red:
        comp = pred["_complaint"]
        dist = pred["_district"]
        pattern = pred["_pattern"]
        pid = prediction_id_map.get(comp["complaint_id"])

        if comp["fraud_type"] == "digital_arrest":
            msg = (
                f"CRITICAL: Digital arrest scam victim in {comp['victim_state']} — "
                f"Rs {comp['amount']:,} at risk. Mule chain terminates near {dist['district']}, "
                f"{dist['state']}. Cash-out window: {pattern['cashout_hours']}h. Deploy plainclothes "
                f"team to flagged ATM cluster immediately."
            )
        else:
            msg = (
                f"HIGH ALERT: UPI fraud chain traced to {dist['district']}, {dist['state']}. "
                f"Amount: Rs {comp['amount']:,}. {comp['mule_chain_depth']} mule hops detected. "
                f"Predicted withdrawal within {pattern['cashout_hours']} hours. "
                f"Coordinate with {comp['accused_bank']} for freeze."
            )

        sent_time = ts(hours_ago=comp["_hours_ago"], minutes_ago=-random.randint(1, 5))

        # state_lea alert
        alerts_list.append({
            "prediction_id": pid,
            "complaint_id": comp["complaint_id"],
            "alert_type": "dashboard",
            "recipient_role": "state_lea",
            "message": msg,
            "alert_level": "RED",
            "status": "sent",
            "created_at": sent_time
        })

        # i4c_national alert
        alerts_list.append({
            "prediction_id": pid,
            "complaint_id": comp["complaint_id"],
            "alert_type": "dashboard",
            "recipient_role": "i4c_national",
            "message": msg,
            "alert_level": "RED",
            "status": "sent",
            "created_at": sent_time
        })

    # 5 AMBER predictions -> 5 alerts
    selected_amber = amber_preds[:5]
    for pred in selected_amber:
        comp = pred["_complaint"]
        dist = pred["_district"]
        pid = prediction_id_map.get(comp["complaint_id"])

        msg = (
            f"ADVISORY: {comp['fraud_type'].replace('_', ' ').title()} case — "
            f"Rs {comp['amount']:,}. Mule network active near {dist['district']}. "
            f"Monitor ATMs within 10km radius. Risk score: {pred['risk_score']:.2f}."
        )
        sent_time = ts(hours_ago=comp["_hours_ago"], minutes_ago=-random.randint(1, 5))

        alerts_list.append({
            "prediction_id": pid,
            "complaint_id": comp["complaint_id"],
            "alert_type": "dashboard",
            "recipient_role": "state_lea",
            "message": msg,
            "alert_level": "AMBER",
            "status": "sent",
            "created_at": sent_time
        })

    # 5 field_officer alerts on 5 random RED predictions
    field_reds = random.sample(red_preds, 5)
    for pred in field_reds:
        comp = pred["_complaint"]
        dist = pred["_district"]
        pattern = pred["_pattern"]
        pid = prediction_id_map.get(comp["complaint_id"])
        atm_name = pred["predicted_atms"][0]["name"] if pred["predicted_atms"] else "SBI ATM"

        msg = (
            f"DEPLOYMENT ORDER: Report to {atm_name}, {dist['district']}. "
            f"Suspected cash-out within {pattern['cashout_hours']} hours. "
            f"Amount at risk: Rs {comp['amount']:,}. "
            f"Look for multiple rapid ATM withdrawals."
        )
        sent_time = ts(hours_ago=comp["_hours_ago"], minutes_ago=-random.randint(1, 5))

        alerts_list.append({
            "prediction_id": pid,
            "complaint_id": comp["complaint_id"],
            "alert_type": "dashboard",
            "recipient_role": "field_officer",
            "message": msg,
            "alert_level": "RED",
            "status": "sent",
            "created_at": sent_time
        })

    # 5 bank_officer alerts on 5 random AMBER predictions
    bank_ambers = random.sample(amber_preds, 5)
    for pred in bank_ambers:
        comp = pred["_complaint"]
        pattern = pred["_pattern"]
        pid = prediction_id_map.get(comp["complaint_id"])

        msg = (
            f"BANK ACTION REQUIRED: Account {comp['accused_account_hash'][:8]}... "
            f"flagged as mule terminal. Bank: {comp['accused_bank']}. "
            f"Reduce daily ATM limit immediately. "
            f"Predicted withdrawal window closes in {pattern['cashout_hours']}h."
        )
        sent_time = ts(hours_ago=comp["_hours_ago"], minutes_ago=-random.randint(1, 5))

        alerts_list.append({
            "prediction_id": pid,
            "complaint_id": comp["complaint_id"],
            "alert_type": "dashboard",
            "recipient_role": "bank_officer",
            "message": msg,
            "alert_level": "AMBER",
            "status": "sent",
            "created_at": sent_time
        })

    # Set 'acknowledged' for 8 random alerts
    ack_indices = random.sample(range(len(alerts_list)), 8)
    for idx in ack_indices:
        alerts_list[idx]["status"] = "acknowledged"

    try:
        supabase.table('alerts').insert(alerts_list).execute()
        print(f"Seeded {len(alerts_list)} alerts.")
    except Exception as e:
        print(f"Error inserting alerts: {e}")

    # =========================================================================
    # STEP 6 — SEED SENTINEL SCORES
    # =========================================================================
    # Target: 25 sentinel score records.
    # Source: Take the final mule chain node (cash-out node) from each of the first 25 complaints.
    sentinel_scores_list = []
    nodes_for_sentinel = cashout_nodes_sample[:25]

    for i, node in enumerate(nodes_for_sentinel):
        velocity = node["transaction_velocity"]
        is_flagged = node["is_flagged"]
        hour = random.randint(0, 23)
        is_high_risk_hour = hour in [22, 23, 0, 1, 2, 3, 4, 5]

        velocity_score = round(min(velocity / 15, 1) * 40, 1)
        dormancy_score = random.choice([0, 0, 30, 30, 0])
        time_score = 20 if is_high_risk_hour else 0
        flag_score = 10 if is_flagged else 0

        # Distribution: 8 >= 80 (surge), 10 50-79 (monitoring), 7 < 50 (monitoring)
        if i < 8:
            surge_score = random.randint(82, 97)
            status = 'surge'
            trigger = f"Velocity {velocity} txn/4h + dormancy break + {'high-risk hour' if is_high_risk_hour else 'flagged account'}"
        elif i < 18:
            surge_score = random.randint(52, 78)
            status = 'monitoring'
            trigger = f"Elevated velocity: {velocity} transactions in 4 hours on {node['bank']} account"
        else:
            surge_score = random.randint(20, 48)
            status = 'monitoring'
            trigger = f"Normal pattern. Monitoring active. Velocity: {velocity} txn/4h"

        sentinel_scores_list.append({
            "account_hash": node["account_hash"],
            "complaint_id": node["complaint_id"],
            "bank": node["bank"],
            "state": node["state"],
            "surge_score": surge_score,
            "velocity_score": velocity_score,
            "dormancy_score": dormancy_score,
            "time_score": time_score,
            "flag_score": flag_score,
            "trigger_reason": trigger,
            "status": status,
            "last_updated": ts(hours_ago=random.randint(0, 2)),
            "created_at": ts(hours_ago=random.randint(0, 2))
        })

    try:
        supabase.table('sentinel_scores').insert(sentinel_scores_list).execute()
        print("Seeded 25 sentinel scores.")
    except Exception as e:
        print(f"Error inserting sentinel scores: {e}")

    # =========================================================================
    # STEP 7 — SEED ATM CLUSTERS
    # =========================================================================
    # Target: 7 active clusters, hardcoded coordinates, linked to actual complaint_ids.
    def get_complaint_ids_for_district(dist_name):
        return [
            c["complaint_id"]
            for c in complaints_list
            if c["_district"]["district"].lower() == dist_name.lower()
        ]

    def get_complaint_ids_for_state(state_name):
        return [
            c["complaint_id"]
            for c in complaints_list
            if c["_district"]["state"].lower() == state_name.lower()
        ]

    deoghar_ids = get_complaint_ids_for_district("Deoghar")[:8]
    nuh_ids = get_complaint_ids_for_district("Nuh")[:6]
    giridih_ids = get_complaint_ids_for_district("Giridih")[:5]
    mathura_ids = get_complaint_ids_for_district("Mathura")[:4]
    bharatpur_ids = get_complaint_ids_for_district("Bharatpur")[:3]
    dhanbad_ids = get_complaint_ids_for_district("Dhanbad")[:3]
    jharkhand_ids = get_complaint_ids_for_state("Jharkhand")[:12]

    atm_clusters_list = [
        {
            "cluster_name": "Deoghar Cybercrime Corridor",
            "centroid_lat": 24.4853,
            "centroid_lng": 86.6936,
            "radius_km": 4.2,
            "complaint_count": 31,
            "avg_fraud_amount": 287000,
            "cluster_score": 91.5,
            "linked_complaints": deoghar_ids if deoghar_ids else [complaints_list[0]["complaint_id"]],
            "status": "active",
            "first_seen": ts(hours_ago=random.randint(18, 72)),
            "last_updated": ts(hours_ago=random.randint(0, 3)),
            "created_at": ts(hours_ago=24)
        },
        {
            "cluster_name": "Nuh-Mewat Hotspot",
            "centroid_lat": 28.1047,
            "centroid_lng": 76.9974,
            "radius_km": 5.8,
            "complaint_count": 24,
            "avg_fraud_amount": 198000,
            "cluster_score": 84.2,
            "linked_complaints": nuh_ids if nuh_ids else [complaints_list[1]["complaint_id"]],
            "status": "active",
            "first_seen": ts(hours_ago=random.randint(18, 72)),
            "last_updated": ts(hours_ago=random.randint(0, 3)),
            "created_at": ts(hours_ago=24)
        },
        {
            "cluster_name": "Giridih Jamtara Belt",
            "centroid_lat": 24.1939,
            "centroid_lng": 86.3096,
            "radius_km": 3.5,
            "complaint_count": 19,
            "avg_fraud_amount": 156000,
            "cluster_score": 76.8,
            "linked_complaints": giridih_ids if giridih_ids else [complaints_list[2]["complaint_id"]],
            "status": "active",
            "first_seen": ts(hours_ago=random.randint(18, 72)),
            "last_updated": ts(hours_ago=random.randint(0, 3)),
            "created_at": ts(hours_ago=24)
        },
        {
            "cluster_name": "Mathura Transit Cluster",
            "centroid_lat": 27.4924,
            "centroid_lng": 77.6737,
            "radius_km": 6.1,
            "complaint_count": 14,
            "avg_fraud_amount": 421000,
            "cluster_score": 68.3,
            "linked_complaints": mathura_ids if mathura_ids else [complaints_list[3]["complaint_id"]],
            "status": "active",
            "first_seen": ts(hours_ago=random.randint(18, 72)),
            "last_updated": ts(hours_ago=random.randint(0, 3)),
            "created_at": ts(hours_ago=24)
        },
        {
            "cluster_name": "Bharatpur Border Zone",
            "centroid_lat": 27.2152,
            "centroid_lng": 77.4941,
            "radius_km": 4.9,
            "complaint_count": 12,
            "avg_fraud_amount": 312000,
            "cluster_score": 63.7,
            "linked_complaints": bharatpur_ids if bharatpur_ids else [complaints_list[4]["complaint_id"]],
            "status": "active",
            "first_seen": ts(hours_ago=random.randint(18, 72)),
            "last_updated": ts(hours_ago=random.randint(0, 3)),
            "created_at": ts(hours_ago=24)
        },
        {
            "cluster_name": "Dhanbad Industrial Cluster",
            "centroid_lat": 23.7957,
            "centroid_lng": 86.4304,
            "radius_km": 3.8,
            "complaint_count": 9,
            "avg_fraud_amount": 145000,
            "cluster_score": 57.4,
            "linked_complaints": dhanbad_ids if dhanbad_ids else [complaints_list[5]["complaint_id"]],
            "status": "active",
            "first_seen": ts(hours_ago=random.randint(18, 72)),
            "last_updated": ts(hours_ago=random.randint(0, 3)),
            "created_at": ts(hours_ago=24)
        },
        {
            "cluster_name": "Jharkhand Tri-District Network",
            "centroid_lat": 24.3200,
            "centroid_lng": 86.5100,
            "radius_km": 18.0,
            "complaint_count": 53,
            "avg_fraud_amount": 203000,
            "cluster_score": 95.2,
            "linked_complaints": jharkhand_ids if jharkhand_ids else [complaints_list[0]["complaint_id"]],
            "status": "active",
            "first_seen": ts(hours_ago=random.randint(18, 72)),
            "last_updated": ts(hours_ago=random.randint(0, 3)),
            "created_at": ts(hours_ago=24)
        }
    ]

    try:
        supabase.table('atm_clusters').insert(atm_clusters_list).execute()
        print("Seeded 7 ATM clusters.")
    except Exception as e:
        print(f"Error inserting ATM clusters: {e}")

    # =========================================================================
    # STEP 8 — SEED INCIDENT REPORTS
    # =========================================================================
    # Target: 8 incident reports on closed/intercepted predictions.
    incident_candidates = [
        p for p in predictions_list if p["status"] == "intercepted"
    ]
    if len(incident_candidates) < 8:
        incident_candidates += [
            p for p in predictions_list if p not in incident_candidates
        ][:8 - len(incident_candidates)]

    incident_reports_list = []
    incident_notes = [
        "Suspect apprehended at SBI ATM. Three withdrawals of Rs 10,000 observed before interception. FIR filed at local police station.",
        "Plainclothes team deployed per NEXUS alert. Mule account holder identified. Bank account frozen. Victim funds partially recovered.",
        "ATM under surveillance. No suspect appeared within window. Prediction window expired. Account flagged for monitoring.",
        "Two suspects observed. One apprehended. Second suspect fled. Rs 45,000 recovered. Ongoing investigation.",
        "Coordinated action with bank nodal officer. Account frozen before withdrawal. Full amount secured."
    ]

    for p in incident_candidates[:8]:
        comp = p["_complaint"]
        pid = prediction_id_map.get(comp["complaint_id"])
        funds_secured = random.choice([True, True, False])
        amount_rec = round(comp["amount"] * random.uniform(0.4, 0.95), 2) if funds_secured else 0.0
        rep_time = ts(hours_ago=random.randint(1, 12))

        incident_reports_list.append({
            "prediction_id": pid,
            "suspect_observed": True,
            "suspect_apprehended": random.choice([True, True, False]),
            "funds_secured": funds_secured,
            "amount_recovered": amount_rec,
            "notes": random.choice(incident_notes),
            "reported_at": rep_time,
            "created_at": rep_time
        })

    try:
        supabase.table('incident_reports').insert(incident_reports_list).execute()
        print("Seeded 8 incident reports.")
    except Exception as e:
        print(f"Error inserting incident reports: {e}")

    # =========================================================================
    # STEP 9 — SEED SYSTEM LOGS
    # =========================================================================
    # Target: 20 system log entries simulating the last 20 autonomous loops.
    system_logs_list = []
    for i in range(20):
        loop_time = ts(minutes_ago=(20 - i) * 3)
        system_logs_list.append({
            "loop_run_at": loop_time,
            "complaints_processed": random.randint(1, 3),
            "predictions_generated": random.randint(1, 3),
            "alerts_fired": random.randint(2, 6),
            "loop_duration_ms": random.randint(1200, 4800),
            "errors": [],
            "created_at": loop_time
        })

    try:
        supabase.table('system_logs').insert(system_logs_list).execute()
        print("Seeded 20 system logs.")
    except Exception as e:
        print(f"Error inserting system logs: {e}")

    # =========================================================================
    # STEP 10 — SEED DAILY BRIEF
    # =========================================================================
    # Target: 1 daily brief for today.
    today = datetime.date.today().isoformat()

    complaints_today = len([c for c in complaints_list if c["_hours_ago"] <= 12])
    predictions_today = len(predictions_list)
    red_alerts = len([p for p in predictions_list if p["alert_level"] == "RED"])
    total_funds = sum(c["amount"] for c in complaints_list if c["_hours_ago"] <= 12)

    narrative = (
        f"Intelligence assessment for {today}: NEXUS autonomous engine processed "
        f"{complaints_today} new complaints in the last 24 hours, generating "
        f"{predictions_today} active predictions across 6 high-risk districts in "
        f"Jharkhand, Haryana, Uttar Pradesh, and Rajasthan. The Deoghar-Giridih cybercrime "
        f"corridor in Jharkhand continues to show the highest concentration of mule network "
        f"activity, with {red_alerts} RED-level alerts requiring immediate law enforcement response. "
        f"Total funds at risk across active predictions stands at Rs {total_funds:,.0f}. "
        f"Recommend priority deployment of state cyber cell teams to ATM clusters in "
        f"Deoghar and Nuh districts within the next 6 hours."
    )

    daily_brief_record = {
        "brief_date": today,
        "html_content": narrative,
        "summary_json": {
            "complaints_today": complaints_today,
            "predictions_generated": predictions_today,
            "red_alerts": red_alerts,
            "funds_at_risk": total_funds,
            "top_fraud_type": "upi_fraud",
            "top_district": "Deoghar"
        },
        "generated_at": now.isoformat(),
        "created_at": now.isoformat()
    }

    try:
        supabase.table('daily_briefs').upsert(daily_brief_record, on_conflict='brief_date').execute()
        print("Seeded daily brief.")
    except Exception as e:
        print(f"Error seeding daily brief: {e}")

    # =========================================================================
    # STEP 11 — FINAL VERIFICATION REPORT
    # =========================================================================
    def get_count(table_name):
        try:
            res = supabase.table(table_name).select('*', count='exact').execute()
            if res.count is not None:
                return res.count
            return len(res.data)
        except Exception:
            return 'N/A'

    print("\n=== NEXUS DEMO SEED COMPLETE ===")
    print(f"complaints:       {get_count('complaints')}")
    print(f"predictions:      {get_count('predictions')}")
    print(f"mule_chain_nodes: {get_count('mule_chain_nodes')}")
    print(f"alerts:           {get_count('alerts')}")
    print(f"sentinel_scores:  {get_count('sentinel_scores')}")
    print(f"atm_clusters:     {get_count('atm_clusters')}")
    print(f"incident_reports: {get_count('incident_reports')}")
    print(f"system_logs:      {get_count('system_logs')}")
    print(f"daily_briefs:     {get_count('daily_briefs')}")
    print(f"atm_locations:    {get_count('atm_locations')} (unchanged)")
    print("================================")
    print("Demo database is ready.")
    print("Start the backend: uvicorn main:app --reload --port 8000")
    print("Open the frontend and verify the map shows active predictions.")


if __name__ == '__main__':
    seed_demo_data()
