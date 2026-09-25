import os
import sqlite3
import json
import uuid
import datetime
import random
import math
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "nexus.db")

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS complaints (
        complaint_id TEXT PRIMARY KEY,
        fraud_type TEXT NOT NULL,
        amount_inr REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'flagged',
        created_at TEXT NOT NULL,
        filed_at TEXT NOT NULL,
        victim_state TEXT,
        victim_district TEXT,
        accused_phone_prefix TEXT,
        accused_bank TEXT,
        channel TEXT DEFAULT 'Online Portal'
    );

    CREATE TABLE IF NOT EXISTS mule_accounts (
        account_id TEXT PRIMARY KEY,
        bank_name TEXT NOT NULL,
        risk_score REAL NOT NULL,
        kyc_lat REAL,
        kyc_lon REAL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mule_chain_nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        hop_position INTEGER NOT NULL DEFAULT 1,
        parent_account_id TEXT,
        FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
        transaction_id TEXT PRIMARY KEY,
        complaint_id TEXT NOT NULL,
        sender_account_id TEXT NOT NULL,
        receiver_account_id TEXT NOT NULL,
        amount_inr REAL NOT NULL,
        channel TEXT DEFAULT 'IMPS',
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS predictions (
        prediction_id TEXT PRIMARY KEY,
        complaint_id TEXT UNIQUE NOT NULL,
        risk_score REAL NOT NULL,
        risk_level TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        predicted_lat REAL,
        predicted_lon REAL,
        cashout_window_hours INTEGER NOT NULL DEFAULT 12,
        shap_features TEXT,
        recovery_score REAL NOT NULL DEFAULT 100,
        confidence REAL DEFAULT 0.88,
        model_version TEXT DEFAULT 'geo_lgbm_v3',
        predicted_atms TEXT
    );

    CREATE TABLE IF NOT EXISTS atm_locations (
        atm_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        address TEXT NOT NULL,
        district TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
        alert_id TEXT PRIMARY KEY,
        prediction_id TEXT,
        complaint_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TEXT NOT NULL,
        message TEXT NOT NULL,
        alert_type TEXT DEFAULT 'dashboard',
        severity TEXT NOT NULL DEFAULT 'HIGH',
        assigned_officer TEXT
    );

    CREATE TABLE IF NOT EXISTS incidents (
        incident_id TEXT PRIMARY KEY,
        complaint_id TEXT NOT NULL,
        prediction_id TEXT,
        alert_id TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        suspect_apprehended INTEGER NOT NULL DEFAULT 0,
        action_taken TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hotspots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        district TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        risk_score REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS syndicates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cashout_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id TEXT NOT NULL,
        atm_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        created_at TEXT NOT NULL
    );
    """)
    conn.commit()
    conn.close()

def seed_if_empty():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM complaints")
    count = c.fetchone()[0]
    conn.close()
    if count == 0:
        seed_full_operational_data()

def seed_full_operational_data():
    conn = get_connection()
    c = conn.cursor()

    # Clear existing
    for table in ['complaints', 'mule_accounts', 'mule_chain_nodes', 'transactions', 'predictions', 'atm_locations', 'alerts', 'incidents', 'hotspots', 'syndicates', 'cashout_events']:
        c.execute(f"DELETE FROM {table}")

    now = datetime.datetime.now(datetime.timezone.utc)
    def ts(h_ago=0, m_ago=0):
        return (now - datetime.timedelta(hours=h_ago, minutes=m_ago)).isoformat()

    # 1. ATM Locations across major hot corridors (Jharkhand, Haryana, UP, Delhi, Maharashtra, Karnataka)
    atm_seeds = [
        {"atm_id": "ATM-JH-DEO-01", "name": "SBI Main Branch ATM", "bank_name": "State Bank of India", "address": "Court Road, Deoghar", "district": "Deoghar", "lat": 24.4853, "lon": 86.6936},
        {"atm_id": "ATM-JH-DEO-02", "name": "HDFC Tower ATM", "bank_name": "HDFC Bank", "address": "Station Road, Deoghar", "district": "Deoghar", "lat": 24.4921, "lon": 86.7012},
        {"atm_id": "ATM-JH-GIR-01", "name": "PNB Market Branch ATM", "bank_name": "Punjab National Bank", "address": "Bada Chowk, Giridih", "district": "Giridih", "lat": 24.1939, "lon": 86.3096},
        {"atm_id": "ATM-JH-GIR-02", "name": "Bank of Baroda Kiosk", "bank_name": "Bank of Baroda", "address": "Bus Stand, Giridih", "district": "Giridih", "lat": 24.1850, "lon": 86.3150},
        {"atm_id": "ATM-HR-NUH-01", "name": "SBI Nagina Chowk ATM", "bank_name": "State Bank of India", "address": "Badkali Chowk, Nagina, Nuh", "district": "Nuh", "lat": 27.9138, "lon": 77.0004},
        {"atm_id": "ATM-HR-NUH-02", "name": "Axis Bank Taoru ATM", "bank_name": "Axis Bank", "address": "Main Bazar, Taoru, Nuh", "district": "Nuh", "lat": 28.2104, "lon": 76.9413},
        {"atm_id": "ATM-UP-MAT-01", "name": "SBI Krishna Nagar ATM", "bank_name": "State Bank of India", "address": "Krishna Nagar, Mathura", "district": "Mathura", "lat": 27.4551, "lon": 77.6459},
        {"atm_id": "ATM-UP-MAT-02", "name": "ICICI Highway Hub ATM", "bank_name": "ICICI Bank", "address": "NH-2 Bypass, Mathura", "district": "Mathura", "lat": 27.5284, "lon": 77.8548},
        {"atm_id": "ATM-DL-CP-01", "name": "SBI Connaught Place Radial 3", "bank_name": "State Bank of India", "address": "Radial 3, Connaught Place, New Delhi", "district": "New Delhi", "lat": 28.6289, "lon": 77.2065},
        {"atm_id": "ATM-DL-BAR-01", "name": "HDFC Barakhamba Transit ATM", "bank_name": "HDFC Bank", "address": "Barakhamba Road, New Delhi", "district": "New Delhi", "lat": 28.6142, "lon": 77.2185},
        {"atm_id": "ATM-MH-MUM-01", "name": "Axis Bank Andheri East", "bank_name": "Axis Bank", "address": "Chakala, Andheri East, Mumbai", "district": "Mumbai Suburban", "lat": 19.1136, "lon": 72.8697},
        {"atm_id": "ATM-KA-BLR-01", "name": "Canara Bank Koramangala", "bank_name": "Canara Bank", "address": "80 Feet Road, Koramangala, Bengaluru", "district": "Bengaluru Urban", "lat": 12.9352, "lon": 77.6245}
    ]

    for a in atm_seeds:
        c.execute("""
        INSERT INTO atm_locations (atm_id, name, bank_name, address, district, latitude, longitude, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (a["atm_id"], a["name"], a["bank_name"], a["address"], a["district"], a["lat"], a["lon"], ts(100)))

    # 2. Hotspots
    hotspot_seeds = [
        ("Deoghar Cyber Corridor", 24.4853, 86.6936, 0.94, "Deoghar"),
        ("Giridih Mining Transit", 24.1939, 86.3096, 0.88, "Giridih"),
        ("Nuh Mewat Border", 27.9138, 77.0004, 0.91, "Nuh"),
        ("Mathura NH-2 Corridor", 27.4551, 77.6459, 0.79, "Mathura"),
        ("Connaught Place OTC Nexus", 28.6289, 77.2065, 0.85, "New Delhi"),
        ("Andheri Commercial Ring", 19.1136, 72.8697, 0.72, "Mumbai Suburban")
    ]
    for name, lat, lon, score, dist in hotspot_seeds:
        c.execute("""
        INSERT INTO hotspots (district, latitude, longitude, risk_score, status)
        VALUES (?, ?, ?, ?, 'active')
        """, (dist, lat, lon, score))

    # 3. Syndicates
    syndicate_seeds = [
        ("Karmatar-Jamtara Nexus", ts(2)),
        ("Mewat Rapid Withdrawal Network", ts(4)),
        ("Deoghar Digital Arrest Ring", ts(1))
    ]
    for s_name, s_up in syndicate_seeds:
        c.execute("INSERT INTO syndicates (name, status, updated_at) VALUES (?, 'active', ?)", (s_name, s_up))

    # 4. Realistic Complaints, Mule Accounts, Mule Chain Nodes, Transactions, Predictions, Alerts, and Incidents
    cases = [
        {
            "complaint_id": "CMP-2026-9081",
            "fraud_type": "digital_arrest",
            "amount_inr": 845000.0,
            "status": "flagged",
            "filed_at": ts(1, 30),
            "created_at": ts(1, 30),
            "victim_state": "Maharashtra",
            "victim_district": "Mumbai Suburban",
            "accused_phone_prefix": "70",
            "accused_bank": "Airtel Payments Bank",
            "channel": "National Cybercrime Portal",
            "mules": [
                {"account_id": "ACC-MULE-9081-1", "bank": "Paytm Payments Bank", "lat": 24.4853, "lon": 86.6936, "risk": 0.88, "amount": 845000.0},
                {"account_id": "ACC-MULE-9081-2", "bank": "State Bank of India", "lat": 24.4921, "lon": 86.7012, "risk": 0.94, "amount": 420000.0},
                {"account_id": "ACC-MULE-9081-3", "bank": "HDFC Bank", "lat": 24.4996, "lon": 86.6925, "risk": 0.96, "amount": 425000.0}
            ],
            "prediction": {
                "risk_score": 0.942,
                "risk_level": "RED",
                "predicted_lat": 24.4853,
                "predicted_lon": 86.6936,
                "window": 4,
                "recovery_score": 92.5,
                "atms": ["ATM-JH-DEO-01", "ATM-JH-DEO-02"],
                "shap": {"fraud_type_risk": 0.38, "mule_chain_depth": 0.24, "log_amount": 0.21, "transaction_velocity": 0.15, "phone_prefix_risk": 0.08}
            },
            "alert": {
                "severity": "CRITICAL",
                "message": "NEXUS CRITICAL: Rs 8,45,000 digital arrest fraud. Cash-out corridor detected in Deoghar, Jharkhand within 4h window.",
                "assigned_officer": "Insp. Rajesh Verma (Cyber Cell)"
            },
            "incident": {
                "status": "authorized",
                "suspect_apprehended": 1,
                "action_taken": "Section 102 CrPC digital lien issued. 2 mule accounts frozen at SBI Deoghar.",
                "notes": "Field unit deployed to Station Road ATM corridor. Intercept operational."
            }
        },
        {
            "complaint_id": "CMP-2026-8821",
            "fraud_type": "upi_fraud",
            "amount_inr": 480000.0,
            "status": "flagged",
            "filed_at": ts(3, 10),
            "created_at": ts(3, 10),
            "victim_state": "Karnataka",
            "victim_district": "Bengaluru Urban",
            "accused_phone_prefix": "76",
            "accused_bank": "UCO Bank",
            "channel": "Helpline 1930",
            "mules": [
                {"account_id": "ACC-MULE-8821-1", "bank": "UCO Bank", "lat": 27.9138, "lon": 77.0004, "risk": 0.82, "amount": 480000.0},
                {"account_id": "ACC-MULE-8821-2", "bank": "Punjab National Bank", "lat": 28.2104, "lon": 76.9413, "risk": 0.89, "amount": 480000.0}
            ],
            "prediction": {
                "risk_score": 0.865,
                "risk_level": "RED",
                "predicted_lat": 27.9138,
                "predicted_lon": 77.0004,
                "window": 6,
                "recovery_score": 78.0,
                "atms": ["ATM-HR-NUH-01", "ATM-HR-NUH-02"],
                "shap": {"fraud_type_risk": 0.32, "transaction_velocity": 0.28, "phone_prefix_risk": 0.18, "log_amount": 0.14, "mule_chain_depth": 0.08}
            },
            "alert": {
                "severity": "HIGH",
                "message": "NEXUS RED ALERT: Rapid UPI disbursement of Rs 4,80,000 targeting Nuh-Taoru ATM corridor.",
                "assigned_officer": "Sub-Insp. A. Sharma"
            },
            "incident": {
                "status": "open",
                "suspect_apprehended": 0,
                "action_taken": "ATM surveillance alert dispatched to local police station.",
                "notes": "Bank nodal officer notified for emergency debit freeze."
            }
        },
        {
            "complaint_id": "CMP-2026-7412",
            "fraud_type": "investment_scam",
            "amount_inr": 1250000.0,
            "status": "flagged",
            "filed_at": ts(6, 45),
            "created_at": ts(6, 45),
            "victim_state": "Delhi",
            "victim_district": "New Delhi",
            "accused_phone_prefix": "91",
            "accused_bank": "ICICI Bank",
            "channel": "Online Portal",
            "mules": [
                {"account_id": "ACC-MULE-7412-1", "bank": "Axis Bank", "lat": 24.1939, "lon": 86.3096, "risk": 0.74, "amount": 1250000.0},
                {"account_id": "ACC-MULE-7412-2", "bank": "Bank of Baroda", "lat": 24.1850, "lon": 86.3150, "risk": 0.78, "amount": 600000.0},
                {"account_id": "ACC-MULE-7412-3", "bank": "State Bank of India", "lat": 24.1939, "lon": 86.3096, "risk": 0.81, "amount": 650000.0}
            ],
            "prediction": {
                "risk_score": 0.760,
                "risk_level": "RED",
                "predicted_lat": 24.1939,
                "predicted_lon": 86.3096,
                "window": 8,
                "recovery_score": 64.0,
                "atms": ["ATM-JH-GIR-01", "ATM-JH-GIR-02"],
                "shap": {"log_amount": 0.35, "fraud_type_risk": 0.25, "mule_chain_depth": 0.20, "bank_risk": 0.12, "transaction_velocity": 0.08}
            },
            "alert": {
                "severity": "HIGH",
                "message": "NEXUS RED: High-value investment scam Rs 12.5L. Cashout predicted in Giridih district.",
                "assigned_officer": "Insp. Tanya Mishra"
            },
            "incident": {
                "status": "open",
                "suspect_apprehended": 0,
                "action_taken": "Nodal lien notice drafted under Section 102 CrPC.",
                "notes": "Multi-bank transaction hops identified across Axis and BOB."
            }
        },
        {
            "complaint_id": "CMP-2026-6309",
            "fraud_type": "vishing",
            "amount_inr": 180000.0,
            "status": "flagged",
            "filed_at": ts(10, 0),
            "created_at": ts(10, 0),
            "victim_state": "Uttar Pradesh",
            "victim_district": "Lucknow",
            "accused_phone_prefix": "77",
            "accused_bank": "State Bank of India",
            "channel": "Helpline 1930",
            "mules": [
                {"account_id": "ACC-MULE-6309-1", "bank": "SBI", "lat": 27.4551, "lon": 77.6459, "risk": 0.62, "amount": 180000.0}
            ],
            "prediction": {
                "risk_score": 0.612,
                "risk_level": "AMBER",
                "predicted_lat": 27.4551,
                "predicted_lon": 77.6459,
                "window": 12,
                "recovery_score": 45.0,
                "atms": ["ATM-UP-MAT-01", "ATM-UP-MAT-02"],
                "shap": {"fraud_type_risk": 0.28, "hour": 0.24, "phone_prefix_risk": 0.22, "log_amount": 0.16, "bank_risk": 0.10}
            },
            "alert": {
                "severity": "MEDIUM",
                "message": "NEXUS AMBER: Vishing fraud Rs 1,80,000. Secondary ATM cashout probability in Mathura.",
                "assigned_officer": "Sub-Insp. R. Iyer"
            },
            "incident": {
                "status": "closed",
                "suspect_apprehended": 1,
                "action_taken": "Mule arrested at SBI Krishna Nagar ATM. Rs 1,80,000 fully recovered.",
                "notes": "Case closed with 100% asset recovery."
            }
        },
        {
            "complaint_id": "CMP-2026-5120",
            "fraud_type": "loan",
            "amount_inr": 95000.0,
            "status": "flagged",
            "filed_at": ts(18, 30),
            "created_at": ts(18, 30),
            "victim_state": "Rajasthan",
            "victim_district": "Jaipur",
            "accused_phone_prefix": "88",
            "accused_bank": "Bank of Baroda",
            "channel": "Online Portal",
            "mules": [
                {"account_id": "ACC-MULE-5120-1", "bank": "Bank of Baroda", "lat": 28.6289, "lon": 77.2065, "risk": 0.44, "amount": 95000.0}
            ],
            "prediction": {
                "risk_score": 0.420,
                "risk_level": "GREEN",
                "predicted_lat": 28.6289,
                "predicted_lon": 77.2065,
                "window": 24,
                "recovery_score": 25.0,
                "atms": ["ATM-DL-CP-01", "ATM-DL-BAR-01"],
                "shap": {"day_of_week": 0.25, "log_amount": 0.22, "fraud_type_risk": 0.20, "bank_risk": 0.18, "hour": 0.15}
            },
            "alert": {
                "severity": "LOW",
                "message": "NEXUS GREEN: Fake loan app deduction Rs 95,000. Low risk extraction corridor.",
                "assigned_officer": "Officer P. Deshmukh"
            },
            "incident": {
                "status": "open",
                "suspect_apprehended": 0,
                "action_taken": "Advisory sent to nodal bank.",
                "notes": "Monitoring account activity."
            }
        }
    ]

    for case in cases:
        c.execute("""
        INSERT INTO complaints (complaint_id, fraud_type, amount_inr, status, created_at, filed_at, victim_state, victim_district, accused_phone_prefix, accused_bank, channel)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            case["complaint_id"], case["fraud_type"], case["amount_inr"], case["status"],
            case["created_at"], case["filed_at"], case["victim_state"], case["victim_district"],
            case["accused_phone_prefix"], case["accused_bank"], case["channel"]
        ))

        prev_acc = f"VICTIM-{case['complaint_id']}"
        for idx, m in enumerate(case["mules"]):
            c.execute("""
            INSERT OR REPLACE INTO mule_accounts (account_id, bank_name, risk_score, kyc_lat, kyc_lon, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (m["account_id"], m["bank"], m["risk"], m["lat"], m["lon"], case["created_at"]))

            c.execute("""
            INSERT INTO mule_chain_nodes (complaint_id, account_id, hop_position, parent_account_id)
            VALUES (?, ?, ?, ?)
            """, (case["complaint_id"], m["account_id"], idx + 1, prev_acc))

            txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
            c.execute("""
            INSERT INTO transactions (transaction_id, complaint_id, sender_account_id, receiver_account_id, amount_inr, channel, created_at)
            VALUES (?, ?, ?, ?, ?, 'IMPS', ?)
            """, (txn_id, case["complaint_id"], prev_acc, m["account_id"], m["amount"], case["created_at"]))

            prev_acc = m["account_id"]

        pred = case["prediction"]
        pred_id = f"PRED-{uuid.uuid4().hex[:8].upper()}"
        c.execute("""
        INSERT INTO predictions (prediction_id, complaint_id, risk_score, risk_level, status, created_at, predicted_lat, predicted_lon, cashout_window_hours, shap_features, recovery_score, confidence, model_version, predicted_atms)
        VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, 0.88, 'geo_lgbm_v3', ?)
        """, (
            pred_id, case["complaint_id"], pred["risk_score"], pred["risk_level"],
            case["created_at"], pred["predicted_lat"], pred["predicted_lon"],
            pred["window"], json.dumps(pred["shap"]), pred["recovery_score"],
            json.dumps(pred["atms"])
        ))

        alert_id = f"ALT-{uuid.uuid4().hex[:6].upper()}"
        al = case["alert"]
        c.execute("""
        INSERT INTO alerts (alert_id, prediction_id, complaint_id, status, created_at, message, alert_type, severity, assigned_officer)
        VALUES (?, ?, ?, 'new', ?, ?, 'dashboard', ?, ?)
        """, (alert_id, pred_id, case["complaint_id"], case["created_at"], al["message"], al["severity"], al["assigned_officer"]))

        inc = case["incident"]
        inc_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
        c.execute("""
        INSERT INTO incidents (incident_id, complaint_id, prediction_id, alert_id, status, suspect_apprehended, action_taken, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            inc_id, case["complaint_id"], pred_id, alert_id, inc["status"],
            inc["suspect_apprehended"], inc["action_taken"], inc["notes"],
            case["created_at"], case["created_at"]
        ))

    conn.commit()
    conn.close()
    print("Nexus repository successfully seeded with live operational records.")

# Helper queries for Repository
def get_complaints(limit: int = 50, offset: int = 0, search: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    query = "SELECT * FROM complaints WHERE 1=1"
    params = []
    if status and status != 'all' and status != 'All':
        query += " AND status = ?"
        params.append(status.lower())
    if search:
        s = f"%{search.lower()}%"
        query += " AND (LOWER(complaint_id) LIKE ? OR LOWER(fraud_type) LIKE ? OR LOWER(victim_district) LIKE ? OR LOWER(accused_bank) LIKE ?)"
        params.extend([s, s, s, s])
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_complaint_by_id(complaint_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM complaints WHERE complaint_id = ?", (complaint_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def create_complaint(complaint: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    c = conn.cursor()
    cid = complaint.get("complaint_id") or f"NCRP-2026-{random.randint(100000, 999999)}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    amount = float(complaint.get("amount") or complaint.get("amount_inr") or 50000)
    fraud_type = complaint.get("fraud_type") or "upi_fraud"
    victim_state = complaint.get("victim_state") or "Maharashtra"
    victim_district = complaint.get("victim_district") or "Mumbai"
    phone = complaint.get("accused_phone_prefix") or "70" + str(random.randint(10000000, 99999999))
    bank = complaint.get("accused_bank") or "Paytm Payments Bank"
    channel = complaint.get("channel") or "Online Portal"
    status = complaint.get("status") or "flagged"

    c.execute("""
    INSERT INTO complaints (complaint_id, fraud_type, amount_inr, status, created_at, filed_at, victim_state, victim_district, accused_phone_prefix, accused_bank, channel)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (cid, fraud_type, amount, status, now, now, victim_state, victim_district, phone, bank, channel))

    # Create dummy initial mule node so prediction & graph have targets
    mule_acc = f"ACC-{cid.replace('NCRP-', '')}-1"
    c.execute("""
    INSERT INTO mule_accounts (account_id, bank_name, risk_score, kyc_lat, kyc_lon, created_at)
    VALUES (?, ?, 0.85, 24.4853, 86.6936, ?)
    """, (mule_acc, bank, now))

    c.execute("""
    INSERT INTO mule_chain_nodes (complaint_id, account_id, hop_position, parent_account_id)
    VALUES (?, ?, 1, ?)
    """, (cid, mule_acc, f"VICTIM-{cid}"))

    c.execute("""
    INSERT INTO transactions (transaction_id, complaint_id, sender_account_id, receiver_account_id, amount_inr, channel, created_at)
    VALUES (?, ?, ?, ?, ?, 'UPI', ?)
    """, (f"TXN-{uuid.uuid4().hex[:8].upper()}", cid, f"VICTIM-{cid}", mule_acc, amount, now))

    conn.commit()
    conn.close()
    return get_complaint_by_id(cid)

def get_prediction_by_complaint(complaint_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM predictions WHERE complaint_id = ?", (complaint_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    if d.get("shap_features"):
        try:
            d["shap_features"] = json.loads(d["shap_features"])
        except Exception:
            pass
    if d.get("predicted_atms"):
        try:
            d["predicted_atms"] = json.loads(d["predicted_atms"])
        except Exception:
            pass
    return d

def save_prediction(pred: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    c = conn.cursor()
    pid = pred.get("prediction_id") or f"PRED-{uuid.uuid4().hex[:8].upper()}"
    cid = pred["complaint_id"]
    risk = float(pred.get("risk_score", 0.75))
    level = pred.get("risk_level") or ("RED" if risk >= 0.75 else "AMBER" if risk >= 0.45 else "GREEN")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    lat = pred.get("predicted_lat", 24.4853)
    lon = pred.get("predicted_lon", 86.6936)
    window = int(pred.get("cashout_window_hours", 8))
    shap = json.dumps(pred.get("shap_features") or {})
    atms = json.dumps(pred.get("predicted_atms") or ["ATM-JH-DEO-01", "ATM-JH-DEO-02"])

    c.execute("""
    INSERT OR REPLACE INTO predictions (prediction_id, complaint_id, risk_score, risk_level, status, created_at, predicted_lat, predicted_lon, cashout_window_hours, shap_features, recovery_score, confidence, model_version, predicted_atms)
    VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, 100, 0.88, 'geo_lgbm_v3', ?)
    """, (pid, cid, risk, level, now, lat, lon, window, shap, atms))

    # Also automatically generate alert for critical predictions
    alert_id = f"ALT-{uuid.uuid4().hex[:6].upper()}"
    msg = f"NEXUS ALERT: Complaint {cid} cashout predicted in district. Risk: {int(risk*100)}% ({level}). Window: {window}h."
    c.execute("""
    INSERT INTO alerts (alert_id, prediction_id, complaint_id, status, created_at, message, alert_type, severity, assigned_officer)
    VALUES (?, ?, ?, 'new', ?, ?, 'dashboard', ?, 'Unassigned')
    """, (alert_id, pid, cid, now, msg, level))

    conn.commit()
    conn.close()
    return get_prediction_by_complaint(cid)

def get_all_active_predictions() -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM predictions WHERE status = 'active' ORDER BY created_at DESC")
    rows = []
    for r in c.fetchall():
        d = dict(r)
        if d.get("shap_features"):
            try:
                d["shap_features"] = json.loads(d["shap_features"])
            except Exception:
                pass
        if d.get("predicted_atms"):
            try:
                d["predicted_atms"] = json.loads(d["predicted_atms"])
            except Exception:
                pass
        rows.append(d)
    conn.close()
    return rows

def get_mule_chain(complaint_id: str) -> Dict[str, Any]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM complaints WHERE complaint_id = ?", (complaint_id,))
    comp_row = c.fetchone()
    complaint = dict(comp_row) if comp_row else None

    c.execute("""
    SELECT n.hop_position, n.parent_account_id, a.*
    FROM mule_chain_nodes n
    JOIN mule_accounts a ON n.account_id = a.account_id
    WHERE n.complaint_id = ?
    ORDER BY n.hop_position ASC
    """, (complaint_id,))
    mules = [dict(r) for r in c.fetchall()]

    c.execute("SELECT * FROM transactions WHERE complaint_id = ? ORDER BY created_at ASC", (complaint_id,))
    txns = [dict(r) for r in c.fetchall()]

    conn.close()
    return {
        "complaint": complaint,
        "mule_nodes": mules,
        "transactions": txns
    }

def get_atms(ids: Optional[List[str]] = None, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    if ids and len(ids) > 0:
        placeholders = ','.join('?' for _ in ids)
        c.execute(f"SELECT * FROM atm_locations WHERE atm_id IN ({placeholders}) LIMIT ?", (*ids, limit))
    else:
        c.execute("SELECT * FROM atm_locations LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_atm_by_id(atm_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM atm_locations WHERE atm_id = ?", (atm_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def get_hotspots() -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM hotspots WHERE status = 'active'")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_alerts(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def assign_alert_officer(alert_id: str, officer: str) -> Dict[str, Any]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE alerts SET assigned_officer = ?, status = 'assigned' WHERE alert_id = ?", (officer, alert_id))
    c.execute("SELECT * FROM alerts WHERE alert_id = ?", (alert_id,))
    alert_row = c.fetchone()
    alert = dict(alert_row) if alert_row else None

    # Find or create linked incident
    c.execute("SELECT * FROM incidents WHERE alert_id = ?", (alert_id,))
    inc_row = c.fetchone()
    if inc_row:
        c.execute("UPDATE incidents SET updated_at = ? WHERE incident_id = ?", (datetime.datetime.now(datetime.timezone.utc).isoformat(), inc_row["incident_id"]))
    elif alert:
        inc_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        c.execute("""
        INSERT INTO incidents (incident_id, complaint_id, prediction_id, alert_id, status, suspect_apprehended, action_taken, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'open', 0, 'Officer assigned for physical interception', ?, ?, ?)
        """, (inc_id, alert["complaint_id"], alert.get("prediction_id"), alert_id, f"Assigned to {officer}", now, now))

    conn.commit()
    conn.close()
    return alert

def get_incidents(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM incidents ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_incident_by_id(incident_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM incidents WHERE incident_id = ?", (incident_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def add_incident_note(incident_id: str, note: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    c.execute("SELECT notes FROM incidents WHERE incident_id = ?", (incident_id,))
    r = c.fetchone()
    if not r:
        conn.close()
        return None
    existing = r["notes"] or ""
    updated_notes = f"{existing}\n[{now[:16].replace('T', ' ')} UTC] {note}".strip()
    c.execute("UPDATE incidents SET notes = ?, updated_at = ? WHERE incident_id = ?", (updated_notes, now, incident_id))
    conn.commit()
    conn.close()
    return get_incident_by_id(incident_id)

def authorize_incident(incident_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    c.execute("""
    UPDATE incidents
    SET status = 'authorized', action_taken = 'Section 102 CrPC digital warrant authorized. ATM cashout dispenser locked.', updated_at = ?
    WHERE incident_id = ?
    """, (now, incident_id))
    conn.commit()
    conn.close()
    return get_incident_by_id(incident_id)

def get_dashboard_stats() -> Dict[str, Any]:
    conn = get_connection()
    c = conn.cursor()

    c.execute("SELECT COUNT(*) FROM complaints")
    total_complaints = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM complaints WHERE status != 'resolved'")
    open_complaints = c.fetchone()[0]

    c.execute("SELECT COALESCE(SUM(amount_inr), 0) FROM complaints")
    total_funds = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM alerts WHERE status != 'actioned'")
    active_alerts = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM incidents WHERE status = 'open'")
    incidents_in_progress = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM incidents WHERE status = 'closed'")
    incidents_closed = c.fetchone()[0]

    # Calculate frozen funds (from authorized / closed incidents)
    c.execute("""
    SELECT COALESCE(SUM(c.amount_inr), 0)
    FROM incidents i
    JOIN complaints c ON i.complaint_id = c.complaint_id
    WHERE i.status IN ('authorized', 'closed')
    """)
    funds_frozen = c.fetchone()[0]

    # Risk breakdown
    c.execute("SELECT risk_level, COUNT(*) FROM predictions GROUP BY risk_level")
    risk_counts = {r[0]: r[1] for r in c.fetchall()}

    # Recent priority alerts
    c.execute("""
    SELECT a.alert_id, a.complaint_id, a.message, a.severity, a.created_at, p.risk_score, p.cashout_window_hours, c.amount_inr, c.accused_bank
    FROM alerts a
    JOIN predictions p ON a.complaint_id = p.complaint_id
    JOIN complaints c ON a.complaint_id = c.complaint_id
    ORDER BY p.risk_score DESC, a.created_at DESC
    LIMIT 4
    """)
    priority_alerts = [dict(r) for r in c.fetchall()]

    # Live activity
    c.execute("""
    SELECT 'complaint' as type, complaint_id as ref_id, 'New intake: ' || fraud_type as title, 'Reported amount: Rs ' || CAST(ROUND(amount_inr) as TEXT) as subtitle, status as badge, created_at
    FROM complaints
    UNION ALL
    SELECT 'prediction' as type, complaint_id as ref_id, 'Predictive risk computed' as title, 'Cashout window: ' || CAST(cashout_window_hours as TEXT) || 'h' as subtitle, risk_level as badge, created_at
    FROM predictions
    UNION ALL
    SELECT 'alert' as type, alert_id as ref_id, 'Alert escalation' as title, message as subtitle, severity as badge, created_at
    FROM alerts
    ORDER BY created_at DESC
    LIMIT 8
    """)
    live_activity = [dict(r) for r in c.fetchall()]

    conn.close()

    def format_inr(val):
        if val >= 10000000:
            return f"₹{val/10000000:.1f} Cr"
        elif val >= 100000:
            return f"₹{val/100000:.1f} L"
        else:
            return f"₹{val:,.0f}"

    total_predictions = sum(risk_counts.values()) or 1
    breakdown = [
        {"level": "CRITICAL", "count": risk_counts.get("RED", 0), "percentage": round(risk_counts.get("RED", 0)/total_predictions*100), "color": "#DC2626"},
        {"level": "HIGH", "count": risk_counts.get("AMBER", 0), "percentage": round(risk_counts.get("AMBER", 0)/total_predictions*100), "color": "#EA580C"},
        {"level": "MEDIUM", "count": risk_counts.get("GREEN", 0), "percentage": round(risk_counts.get("GREEN", 0)/total_predictions*100), "color": "#D97706"},
        {"level": "LOW", "count": max(0, total_complaints - total_predictions), "percentage": round(max(0, total_complaints - total_predictions)/max(total_complaints, 1)*100), "color": "#087F5B"}
    ]

    kpis = {
        "openComplaints": open_complaints,
        "totalComplaints": total_complaints,
        "activeAlerts": active_alerts,
        "highestAlertRisk": "Critical" if risk_counts.get("RED", 0) > 0 else "High",
        "incidentsInProgress": incidents_in_progress,
        "incidentsClosedToday": incidents_closed,
        "totalFundsAtRisk": format_inr(total_funds),
        "totalFundsFrozen": format_inr(funds_frozen),
    }

    return {
        "kpis": kpis,
        "openComplaints": open_complaints,
        "totalComplaints": total_complaints,
        "activeAlerts": active_alerts,
        "highestAlertRisk": "Critical" if risk_counts.get("RED", 0) > 0 else "High",
        "incidentsInProgress": incidents_in_progress,
        "incidentsClosedToday": incidents_closed,
        "totalFundsAtRisk": format_inr(total_funds),
        "totalFundsFrozen": format_inr(funds_frozen),
        "priorityAlerts": priority_alerts,
        "liveActivity": live_activity,
        "riskBreakdown": {
            "totalActiveCases": total_complaints,
            "breakdown": breakdown
        }
    }

# Initialize on module import
init_db()
seed_if_empty()
