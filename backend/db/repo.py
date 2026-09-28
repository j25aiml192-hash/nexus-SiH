import os
import sqlite3
import json
import uuid
import datetime
import random
import math
import logging
import hashlib
import re
import time
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger("nexus.repo")
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

    CREATE TABLE IF NOT EXISTS truth_graph_entities (
        entity_id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        canonical_reference TEXT UNIQUE NOT NULL,
        raw_fingerprint_hash TEXT NOT NULL,
        masked_value TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS truth_graph_relations (
        relation_id TEXT PRIMARY KEY,
        source_entity_id TEXT NOT NULL,
        target_entity_id TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        semantic_level TEXT NOT NULL DEFAULT 'DIRECT_OBSERVED',
        complaint_id TEXT,
        source_record_type TEXT NOT NULL,
        source_record_id TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 1.0,
        evidence_metadata TEXT NOT NULL DEFAULT '{}',
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (source_entity_id) REFERENCES truth_graph_entities(entity_id),
        FOREIGN KEY (target_entity_id) REFERENCES truth_graph_entities(entity_id),
        UNIQUE (source_entity_id, target_entity_id, relation_type, source_record_id)
    );

    CREATE TABLE IF NOT EXISTS potential_network_clusters (
        cluster_id TEXT PRIMARY KEY,
        cluster_label TEXT NOT NULL,
        cluster_type TEXT NOT NULL DEFAULT 'POTENTIAL_SHARED_INFRASTRUCTURE',
        status TEXT NOT NULL DEFAULT 'candidate',
        confidence_score REAL NOT NULL DEFAULT 0.5,
        supporting_entity_count INTEGER NOT NULL DEFAULT 0,
        supporting_complaint_count INTEGER NOT NULL DEFAULT 0,
        total_exposure_inr REAL NOT NULL DEFAULT 0.0,
        summary_metadata TEXT NOT NULL DEFAULT '{}',
        detected_at TEXT NOT NULL,
        last_updated_at TEXT NOT NULL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS potential_network_members (
        id TEXT PRIMARY KEY,
        cluster_id TEXT NOT NULL,
        member_type TEXT NOT NULL,
        entity_id TEXT,
        complaint_id TEXT,
        evidence_basis TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 1.0,
        evidence_metadata TEXT NOT NULL DEFAULT '{}',
        joined_at TEXT NOT NULL,
        FOREIGN KEY (cluster_id) REFERENCES potential_network_clusters(cluster_id),
        FOREIGN KEY (entity_id) REFERENCES truth_graph_entities(entity_id),
        UNIQUE (cluster_id, member_type, entity_id, complaint_id)
    );

    CREATE TABLE IF NOT EXISTS autonomy_events (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        complaint_id TEXT,
        payload TEXT NOT NULL DEFAULT '{}',
        processing_status TEXT NOT NULL DEFAULT 'pending',
        idempotency_key TEXT UNIQUE NOT NULL,
        processed_at TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS autonomy_audit_log (
        log_id TEXT PRIMARY KEY,
        complaint_id TEXT,
        trigger_event_id TEXT,
        trigger_event_type TEXT NOT NULL,
        action_type TEXT NOT NULL,
        decision_factors TEXT NOT NULL DEFAULT '{"reason_codes": []}',
        action_payload TEXT NOT NULL DEFAULT '{}',
        requires_approval INTEGER NOT NULL DEFAULT 0,
        approval_status TEXT NOT NULL DEFAULT 'not_required',
        approved_by TEXT,
        approval_notes TEXT,
        executed_at TEXT,
        execution_result TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS victim_advisories (
        advisory_id TEXT PRIMARY KEY,
        complaint_id TEXT NOT NULL,
        phone_number_masked TEXT NOT NULL,
        channel TEXT NOT NULL,
        advisory_type TEXT NOT NULL,
        advisory_version TEXT NOT NULL DEFAULT 'v1.0',
        advisory_text TEXT NOT NULL,
        delivery_status TEXT NOT NULL DEFAULT 'queued',
        sent_at TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS model_evaluations (
        eval_id TEXT PRIMARY KEY,
        prediction_id TEXT NOT NULL,
        complaint_id TEXT NOT NULL,
        incident_id TEXT,
        predicted_lat REAL,
        predicted_lon REAL,
        predicted_h3 TEXT,
        predicted_time_start TEXT,
        predicted_time_end TEXT,
        actual_lat REAL,
        actual_lon REAL,
        actual_h3 TEXT,
        actual_cashout_at TEXT,
        distance_error_km REAL,
        time_error_minutes REAL,
        geo_correct_2_5km INTEGER,
        time_correct_window INTEGER,
        evaluation_status TEXT NOT NULL DEFAULT 'pending',
        evaluated_at TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'Officer',
        badge_id TEXT NOT NULL,
        agency TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'approved',
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS case_attention_state (
        attention_id TEXT PRIMARY KEY,
        complaint_id TEXT UNIQUE NOT NULL,
        attention_score REAL NOT NULL DEFAULT 0.0,
        attention_level TEXT NOT NULL DEFAULT 'LOW',
        reason_codes TEXT NOT NULL DEFAULT '[]',
        decision_factors TEXT NOT NULL DEFAULT '{}',
        source_event_id TEXT,
        calculated_at TEXT NOT NULL,
        policy_version TEXT NOT NULL DEFAULT 'phase2b-v1',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    c.execute("CREATE INDEX IF NOT EXISTS idx_case_attention_score ON case_attention_state(attention_score)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_case_attention_level ON case_attention_state(attention_level)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_case_attention_complaint ON case_attention_state(complaint_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_case_attention_active ON case_attention_state(active)")
    
    # Pre-seed initial default approved accounts if not present
    default_users = [
        ("usr_analyst_01", "Senior Analyst", "analyst@nexus.gov.in", "Analyst@123", "Analyst", "NEX-8821-AN", "I4C Cybercrime Predictive Cell", "approved"),
        ("usr_officer_02", "Field Dispatch Officer", "officer@nexus.gov.in", "Officer@123", "Officer", "NEX-4409-OF", "State Police Interception Wing", "approved"),
        ("usr_admin_01", "NEXUS Admin Director", "admin@nexus.gov.in", "Admin@123", "Admin", "NEX-0001-AD", "I4C National Command", "approved"),
        ("usr_admin_02", "System Administrator", "h90519495@gmail.com", "Admin@123", "Admin", "NEX-0002-AD", "I4C National Command", "approved"),
    ]
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for uid, name, email, pass_hash, role, badge, agency, status in default_users:
        c.execute("INSERT OR IGNORE INTO users (id, name, email, password_hash, role, badge_id, agency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                  (uid, name, email, pass_hash, role, badge, agency, status, now_str))

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
        },
        {
            "complaint_id": "CMP-2026-4015",
            "fraud_type": "digital_arrest",
            "amount_inr": 1850000.0,
            "status": "flagged",
            "filed_at": ts(2, 15),
            "created_at": ts(2, 15),
            "victim_state": "Delhi",
            "victim_district": "New Delhi",
            "accused_phone_prefix": "70",
            "accused_bank": "Airtel Payments Bank",
            "channel": "National Cybercrime Portal",
            "mules": [
                {"account_id": "ACC-MULE-4015-1", "bank": "Paytm Payments Bank", "lat": 28.6289, "lon": 77.2065, "risk": 0.95, "amount": 1850000.0},
                {"account_id": "ACC-MULE-4015-2", "bank": "HDFC Bank", "lat": 28.5355, "lon": 77.3910, "risk": 0.91, "amount": 925000.0}
            ],
            "prediction": {
                "risk_score": 0.955,
                "risk_level": "RED",
                "predicted_lat": 28.5355,
                "predicted_lon": 77.3910,
                "window": 3,
                "recovery_score": 96.0,
                "atms": ["ATM-DL-CP-01", "ATM-DL-BAR-01"],
                "shap": {"fraud_type_risk": 0.42, "mule_chain_depth": 0.26, "log_amount": 0.18, "transaction_velocity": 0.14}
            },
            "alert": {
                "severity": "CRITICAL",
                "message": "NEXUS CRITICAL: Rs 18,50,000 digital arrest fraud targeting Noida Sector 62 corridor. Urgent 3h intercept window.",
                "assigned_officer": "Insp. Vikram Singh (Delhi Cyber Cell)"
            },
            "incident": {
                "status": "authorized",
                "suspect_apprehended": 1,
                "action_taken": "Emergency Section 102 CrPC lien issued. Rapid response team dispatched.",
                "notes": "Mule suspect intercepted near HDFC ATM kiosk."
            }
        },
        {
            "complaint_id": "CMP-2026-3890",
            "fraud_type": "investment_scam",
            "amount_inr": 620000.0,
            "status": "flagged",
            "filed_at": ts(4, 45),
            "created_at": ts(4, 45),
            "victim_state": "Uttar Pradesh",
            "victim_district": "Ghaziabad",
            "accused_phone_prefix": "76",
            "accused_bank": "ICICI Bank",
            "channel": "Online Portal",
            "mules": [
                {"account_id": "ACC-MULE-3890-1", "bank": "ICICI Bank", "lat": 28.6692, "lon": 77.4538, "risk": 0.84, "amount": 620000.0}
            ],
            "prediction": {
                "risk_score": 0.835,
                "risk_level": "RED",
                "predicted_lat": 28.6692,
                "predicted_lon": 77.4538,
                "window": 5,
                "recovery_score": 81.0,
                "atms": ["ATM-UP-MAT-01"],
                "shap": {"fraud_type_risk": 0.35, "bank_risk": 0.25, "transaction_velocity": 0.22}
            },
            "alert": {
                "severity": "HIGH",
                "message": "NEXUS RED: Rs 6,20,000 crypto investment fraud. Cashout expected in Indirapuram Ghaziabad.",
                "assigned_officer": "Sub-Insp. Neha Gupta"
            },
            "incident": {
                "status": "open",
                "suspect_apprehended": 0,
                "action_taken": "Nodal debit freeze notice served to ICICI Bank.",
                "notes": "Account under active monitoring."
            }
        },
        {
            "complaint_id": "CMP-2026-2914",
            "fraud_type": "upi_fraud",
            "amount_inr": 310000.0,
            "status": "flagged",
            "filed_at": ts(7, 20),
            "created_at": ts(7, 20),
            "victim_state": "Uttar Pradesh",
            "victim_district": "Lucknow",
            "accused_phone_prefix": "91",
            "accused_bank": "State Bank of India",
            "channel": "Helpline 1930",
            "mules": [
                {"account_id": "ACC-MULE-2914-1", "bank": "SBI", "lat": 26.8467, "lon": 80.9462, "risk": 0.76, "amount": 310000.0}
            ],
            "prediction": {
                "risk_score": 0.748,
                "risk_level": "AMBER",
                "predicted_lat": 26.8467,
                "predicted_lon": 80.9462,
                "window": 8,
                "recovery_score": 68.0,
                "atms": ["ATM-UP-MAT-02"],
                "shap": {"phone_prefix_risk": 0.30, "fraud_type_risk": 0.28, "hour": 0.20}
            },
            "alert": {
                "severity": "HIGH",
                "message": "NEXUS AMBER: UPI QR scam Rs 3,10,000. Hazratganj Lucknow cashout probability.",
                "assigned_officer": "Insp. Alok Sharma"
            },
            "incident": {
                "status": "open",
                "suspect_apprehended": 0,
                "action_taken": "Bank nodal officer contacted for freeze.",
                "notes": "Transaction trail mapped."
            }
        },
        {
            "complaint_id": "CMP-2026-1802",
            "fraud_type": "vishing",
            "amount_inr": 540000.0,
            "status": "flagged",
            "filed_at": ts(12, 10),
            "created_at": ts(12, 10),
            "victim_state": "Telangana",
            "victim_district": "Hyderabad",
            "accused_phone_prefix": "78",
            "accused_bank": "Axis Bank",
            "channel": "Online Portal",
            "mules": [
                {"account_id": "ACC-MULE-1802-1", "bank": "Axis Bank", "lat": 17.3850, "lon": 78.4867, "risk": 0.68, "amount": 540000.0}
            ],
            "prediction": {
                "risk_score": 0.672,
                "risk_level": "AMBER",
                "predicted_lat": 17.3850,
                "predicted_lon": 78.4867,
                "window": 10,
                "recovery_score": 52.0,
                "atms": ["ATM-KA-BLR-01"],
                "shap": {"fraud_type_risk": 0.32, "mule_chain_depth": 0.24, "log_amount": 0.18}
            },
            "alert": {
                "severity": "MEDIUM",
                "message": "NEXUS AMBER: APK Malware bank bypass Rs 5,40,000. Secunderabad ATM alert.",
                "assigned_officer": "Sub-Insp. K. Rao"
            },
            "incident": {
                "status": "closed",
                "suspect_apprehended": 1,
                "action_taken": "Mule account lien executed. Rs 5.4L frozen.",
                "notes": "Full recovery completed."
            }
        },
        {
            "complaint_id": "CMP-2026-1055",
            "fraud_type": "investment_scam",
            "amount_inr": 980000.0,
            "status": "flagged",
            "filed_at": ts(15, 40),
            "created_at": ts(15, 40),
            "victim_state": "West Bengal",
            "victim_district": "Kolkata",
            "accused_phone_prefix": "98",
            "accused_bank": "HDFC Bank",
            "channel": "Helpline 1930",
            "mules": [
                {"account_id": "ACC-MULE-1055-1", "bank": "HDFC Bank", "lat": 22.5726, "lon": 88.3639, "risk": 0.89, "amount": 980000.0}
            ],
            "prediction": {
                "risk_score": 0.885,
                "risk_level": "RED",
                "predicted_lat": 22.5726,
                "predicted_lon": 88.3639,
                "window": 6,
                "recovery_score": 85.0,
                "atms": ["ATM-DL-CP-01"],
                "shap": {"log_amount": 0.38, "fraud_type_risk": 0.26, "bank_risk": 0.18}
            },
            "alert": {
                "severity": "HIGH",
                "message": "NEXUS RED: Task scam fraud Rs 9,80,000. Salt Lake Kolkata extraction corridor.",
                "assigned_officer": "Insp. S. Chatterjee"
            },
            "incident": {
                "status": "open",
                "suspect_apprehended": 0,
                "action_taken": "Nodal alert sent to HDFC Salt Lake branch.",
                "notes": "Investigation active."
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
def is_valid_uuid(val: Any) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def _use_supabase() -> bool:
    from db.supabase_client import SUPABASE_URL, SUPABASE_SERVICE_KEY, NEXUS_ENV
    is_production = NEXUS_ENV == "production" or os.getenv("NEXUS_ENV", "").lower() == "production"
    if is_production:
        return True
    if os.getenv("USE_LOCAL_SQLITE", "").lower() == "true":
        return False
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)


def get_supabase_complaints(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    from db.supabase_client import supabase
    try:
        q = supabase.table("complaints").select("*").order("created_at", desc=True)
        if status and status.lower() not in ("all", "*"):
            q = q.eq("status", status.lower())
        if search:
            clean_search = search.replace(",", " ").strip()
            if is_valid_uuid(clean_search):
                q = q.eq("complaint_id", clean_search)
            else:
                q = q.or_(f"fraud_type.ilike.%{clean_search}%,victim_state.ilike.%{clean_search}%,accused_bank.ilike.%{clean_search}%")
        start = max(0, offset)
        end = start + max(1, limit) - 1
        res = q.range(start, end).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"[SUPABASE COMPLAINTS ERROR] Failed to fetch complaints: {e}", exc_info=True)
        raise


def get_sqlite_complaints(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
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


def get_complaints(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    if _use_supabase():
        return get_supabase_complaints(limit=limit, offset=offset, search=search, status=status)
    return get_sqlite_complaints(limit=limit, offset=offset, search=search, status=status)


def get_supabase_complaint_by_id(complaint_id: str) -> Optional[Dict[str, Any]]:
    from db.supabase_client import supabase
    if not is_valid_uuid(complaint_id):
        return None
    try:
        res = supabase.table("complaints").select("*").eq("complaint_id", complaint_id).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"[SUPABASE COMPLAINT GET ERROR] Failed to fetch complaint {complaint_id}: {e}", exc_info=True)
        raise


def get_sqlite_complaint_by_id(complaint_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM complaints WHERE complaint_id = ?", (complaint_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None


def get_complaint_by_id(complaint_id: str) -> Optional[Dict[str, Any]]:
    if _use_supabase():
        try:
            return get_supabase_complaint_by_id(complaint_id)
        except Exception as e:
            logger.warning(f"[SUPABASE COMPLAINT GET FALLBACK] Falling back to SQLite for {complaint_id}: {e}")
            return get_sqlite_complaint_by_id(complaint_id)
    return get_sqlite_complaint_by_id(complaint_id)


FRAUD_TYPE_MAP = {
    "upi_phishing": "UPI_PHISHING",
    "upi_fraud": "UPI_PHISHING",
    "upi intercept / fraud": "UPI_PHISHING",
    "upi": "UPI_PHISHING",
    "digital_arrest": "DIGITAL_ARREST",
    "digital arrest extortion": "DIGITAL_ARREST",
    "investment_scam": "INVESTMENT_SCAM",
    "high-yield investment scam": "INVESTMENT_SCAM",
    "fake_loan": "FAKE_LOAN",
    "loan": "FAKE_LOAN",
    "illegal lending app fraud": "FAKE_LOAN",
    "sextortion": "SEXTORTION",
    "aeps_fraud": "AEPS_FRAUD",
    "aeps": "AEPS_FRAUD",
    "task_fraud": "TASK_FRAUD",
    "other": "OTHER",
    "vishing": "OTHER",
    "crypto_scam": "OTHER",
}

CHANNEL_MAP = {
    "upi": "UPI",
    "neft": "NEFT",
    "imps": "IMPS",
    "aeps": "AEPS",
    "atm": "ATM",
    "rtgs": "RTGS",
    "other": "OTHER",
    "online portal": "UPI",
    "national cybercrime portal (ncrp)": "UPI",
    "1930 helpline": "IMPS",
    "helpline 1930 direct transit": "IMPS",
    "police station": "NEFT",
    "lea police station intake": "NEFT",
}

STATE_COORDINATES = {
    "Jharkhand": (23.3569, 85.3347),
    "Haryana": (28.4595, 77.0266),
    "Uttar Pradesh": (28.5355, 77.3910),
    "Delhi": (28.6139, 77.2090),
    "Maharashtra": (19.0760, 72.8777),
    "Karnataka": (12.9716, 77.5946),
    "West Bengal": (22.5726, 88.3639),
    "Rajasthan": (26.9124, 75.7873),
}

DISTRICT_COORDINATES = {
    "deoghar": (24.4853, 86.6936),
    "jamtara": (23.9631, 86.8029),
    "giridih": (24.1805, 86.3117),
    "ranchi": (23.3441, 85.3096),
    "gurugram": (28.4595, 77.0266),
    "faridabad": (28.4089, 77.3178),
    "nuh": (28.1150, 77.0049),
    "mumbai": (19.0760, 72.8777),
    "pune": (18.5204, 73.8567),
    "bengaluru": (12.9716, 77.5946),
    "noida": (28.5355, 77.3910),
}


def create_supabase_complaint(complaint: Dict[str, Any]) -> Dict[str, Any]:
    from db.supabase_client import supabase

    # Generate canonical UUID primary key
    raw_cid = complaint.get("complaint_id")
    if raw_cid and is_valid_uuid(raw_cid):
        cid = raw_cid
    else:
        cid = str(uuid.uuid4())

    # Generate / preserve human-facing reference
    raw_ncrp = complaint.get("ncrp_id")
    if raw_ncrp:
        ncrp_id = raw_ncrp
    elif raw_cid and not is_valid_uuid(raw_cid):
        ncrp_id = raw_cid
    else:
        ncrp_id = f"NCRP-2026-{random.randint(100000, 999999)}"

    cfcfrms_ticket = complaint.get("cfcfrms_ticket_id") or f"CFCFRMS-2026-{random.randint(100000, 999999)}"

    raw_ft = str(complaint.get("fraud_type") or "UPI_PHISHING").strip().lower().replace(" ", "_")
    fraud_type = FRAUD_TYPE_MAP.get(raw_ft, "UPI_PHISHING")

    amount = float(complaint.get("amount_inr") or complaint.get("amount") or 50000.0)

    raw_ch = str(complaint.get("channel") or "UPI").strip().lower()
    channel = CHANNEL_MAP.get(raw_ch, "UPI")

    state = complaint.get("victim_state") or "Jharkhand"
    district = complaint.get("victim_district") or ""

    # Resolve coordinates
    lat = complaint.get("victim_lat")
    lon = complaint.get("victim_lon")
    if lat is None or lon is None:
        if district and district.lower() in DISTRICT_COORDINATES:
            lat, lon = DISTRICT_COORDINATES[district.lower()]
        elif state in STATE_COORDINATES:
            lat, lon = STATE_COORDINATES[state]
        else:
            lat, lon = (24.4853, 86.6936)

    phone_prefix = complaint.get("accused_phone_prefix") or ""
    if not phone_prefix:
        phone = str(complaint.get("accused_phone") or "")
        if phone:
            phone_prefix = phone[:5] if phone.startswith("+") else "+91" + phone[:2]
        else:
            phone_prefix = "+9170"

    bank = complaint.get("accused_bank") or "State Bank of India"
    status = complaint.get("status") or "active"

    # Prepare row strictly matching Supabase complaints columns (DO NOT include victim_district)
    row = {
        "complaint_id": cid,
        "ncrp_id": ncrp_id,
        "cfcfrms_ticket_id": cfcfrms_ticket,
        "fraud_type": fraud_type,
        "amount_inr": amount,
        "victim_state": state,
        "victim_lat": float(lat),
        "victim_lon": float(lon),
        "accused_phone_prefix": phone_prefix,
        "accused_bank": bank,
        "channel": channel,
        "status": status,
    }

    try:
        res = supabase.table("complaints").insert(row).execute()
        if not res.data:
            raise RuntimeError("Supabase returned empty data on complaint insert.")
        inserted = res.data[0]
        # Attach victim_district for the application/response model
        if district:
            inserted["victim_district"] = district
        return inserted
    except Exception as e:
        logger.error(f"[SUPABASE CREATE COMPLAINT ERROR] {cid}: {e}", exc_info=True)
        raise


def create_sqlite_complaint(complaint: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    c = conn.cursor()
    cid = complaint.get("complaint_id") or str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    amount = float(complaint.get("amount") or complaint.get("amount_inr") or 50000)
    fraud_type = complaint.get("fraud_type") or "UPI_PHISHING"
    victim_state = complaint.get("victim_state") or "Maharashtra"
    victim_district = complaint.get("victim_district") or "Mumbai"
    phone = complaint.get("accused_phone_prefix") or "70" + str(random.randint(10000000, 99999999))
    bank = complaint.get("accused_bank") or "Paytm Payments Bank"
    channel = complaint.get("channel") or "UPI"
    status = complaint.get("status") or "active"

    c.execute("""
    INSERT INTO complaints (complaint_id, fraud_type, amount_inr, status, created_at, filed_at, victim_state, victim_district, accused_phone_prefix, accused_bank, channel)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (cid, fraud_type, amount, status, now, now, victim_state, victim_district, phone, bank, channel))

    # Create dummy initial mule node so prediction & graph have targets
    mule_acc = f"ACC-{cid[:8]}-1"
    c.execute("""
    INSERT INTO mule_accounts (account_id, bank_name, risk_score, kyc_lat, kyc_lon, created_at)
    VALUES (?, ?, 0.85, 24.4853, 86.6936, ?)
    """, (mule_acc, bank, now))

    c.execute("""
    INSERT INTO mule_chain_nodes (complaint_id, account_id, hop_position, parent_account_id)
    VALUES (?, ?, 1, ?)
    """, (cid, mule_acc, f"VICTIM-{cid[:8]}"))

    c.execute("""
    INSERT INTO transactions (transaction_id, complaint_id, sender_account_id, receiver_account_id, amount_inr, channel, created_at)
    VALUES (?, ?, ?, ?, ?, 'UPI', ?)
    """, (f"TXN-{uuid.uuid4().hex[:8].upper()}", cid, f"VICTIM-{cid[:8]}", mule_acc, amount, now))

    conn.commit()
    conn.close()
    return get_sqlite_complaint_by_id(cid)


def create_complaint(complaint: Dict[str, Any]) -> Dict[str, Any]:
    if _use_supabase():
        created = create_supabase_complaint(complaint)
    else:
        created = create_sqlite_complaint(complaint)

    # Autonomous Event Emission (Non-blocking guarantee)
    if created and created.get("complaint_id"):
        cid = str(created["complaint_id"])
        ch = str(complaint.get("channel") or created.get("channel") or "").strip().upper()
        is_voice = ch in ("VOICE", "VOICE_BOT", "VOICE BOT", "EXOTEL")
        evt_type = "voice_complaint_submitted" if is_voice else "complaint_ingested"
        idem_key = f"voice:{cid}:submitted" if is_voice else f"complaint:{cid}:created"

        safe_emit_autonomy_event(
            event_type=evt_type,
            entity_type="complaint",
            entity_id=cid,
            complaint_id=cid,
            payload={
                "complaint_id": cid,
                "ncrp_id": created.get("ncrp_id"),
                "fraud_type": created.get("fraud_type"),
                "amount_inr": created.get("amount_inr"),
                "victim_state": created.get("victim_state"),
                "victim_district": created.get("victim_district"),
                "channel": ch or "UPI",
                "accused_phone_prefix": created.get("accused_phone_prefix") or complaint.get("accused_phone_prefix"),
                "accused_phone": complaint.get("accused_phone"),
                "accused_bank": created.get("accused_bank") or complaint.get("accused_bank"),
            },
            idempotency_key=idem_key,
        )

    return created


def get_supabase_prediction_by_complaint(complaint_id: str) -> Optional[Dict[str, Any]]:
    from db.supabase_client import supabase
    if not is_valid_uuid(complaint_id):
        return None
    try:
        res = supabase.table("predictions").select("*").eq("complaint_id", complaint_id).order("created_at", desc=True).limit(1).execute()
        if not res.data:
            return None
        row = res.data[0]
        if isinstance(row.get("shap_features"), str):
            try:
                row["shap_features"] = json.loads(row["shap_features"])
            except Exception:
                pass
        return row
    except Exception as e:
        logger.error(f"[SUPABASE PREDICTION BY COMPLAINT ERROR] {complaint_id}: {e}", exc_info=True)
        raise


def get_sqlite_prediction_by_complaint(complaint_id: str) -> Optional[Dict[str, Any]]:
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


def get_prediction_by_complaint(complaint_id: str) -> Optional[Dict[str, Any]]:
    if _use_supabase():
        return get_supabase_prediction_by_complaint(complaint_id)
    return get_sqlite_prediction_by_complaint(complaint_id)

get_prediction = get_prediction_by_complaint


def save_supabase_prediction(pred: Dict[str, Any]) -> Dict[str, Any]:
    from db.supabase_client import supabase

    cid = pred["complaint_id"]
    raw_pid = pred.get("prediction_id")
    if raw_pid and is_valid_uuid(raw_pid):
        pid = raw_pid
    else:
        pid = str(uuid.uuid4())
    lat = float(pred.get("predicted_lat") or 24.4853)
    lon = float(pred.get("predicted_lon") or pred.get("predicted_lng") or 86.6936)

    try:
        import h3
        h3_cell = h3.latlng_to_cell(lat, lon, 8) if hasattr(h3, 'latlng_to_cell') else h3.geo_to_h3(lat, lon, 8)
    except Exception:
        h3_cell = "883cad6f2bfffff"

    atms_val = pred.get("nearest_atms") or pred.get("predicted_atms") or []
    risk = float(pred.get("risk_score", 0.75))
    level = pred.get("risk_level") or ("RED" if risk >= 0.75 else "AMBER" if risk >= 0.45 else "GREEN")
    window = int(pred.get("cashout_window_hours", 8))
    shap = pred.get("shap_features") or {}

    row = {
        "prediction_id": pid,
        "complaint_id": cid,
        "h3_index": h3_cell,
        "predicted_h3_cell_r8": h3_cell,
        "predicted_lat": lat,
        "predicted_lon": lon,
        "predicted_geom": f"POINT({lon} {lat})",
        "risk_score": risk,
        "risk_level": level,
        "cashout_window_hours": window,
        "shap_features": shap,
        "nearest_atms": atms_val,
        "status": "active",
        "recovery_score": int(pred.get("recovery_score", 90)),
        "confidence": float(pred.get("confidence", 0.88)),
        "model_version": pred.get("model_version", "geo_lgbm_v3")
    }

    try:
        res = supabase.table("predictions").upsert(row, on_conflict="complaint_id").execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.error(f"[SUPABASE SAVE PREDICTION ERROR] {cid}: {e}", exc_info=True)
        try:
            res = supabase.table("predictions").insert(row).execute()
            if res.data:
                return res.data[0]
        except Exception as e2:
            logger.error(f"[SUPABASE INSERT PREDICTION ERROR] {cid}: {e2}", exc_info=True)

    return get_supabase_prediction_by_complaint(cid) or row


def save_sqlite_prediction(pred: Dict[str, Any]) -> Dict[str, Any]:
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

    conn.commit()
    conn.close()
    return get_sqlite_prediction_by_complaint(cid)


def save_prediction(pred: Dict[str, Any]) -> Dict[str, Any]:
    cid = pred["complaint_id"]
    prev_pred = None
    try:
        prev_pred = get_prediction_by_complaint(cid)
    except Exception:
        pass

    if _use_supabase():
        saved = save_supabase_prediction(pred)
    else:
        saved = save_sqlite_prediction(pred)

    # Autonomous Event Emission (Non-blocking guarantee)
    if saved and (saved.get("prediction_id") or pred.get("prediction_id")):
        pid = str(saved.get("prediction_id") or pred.get("prediction_id"))
        new_risk = float(saved.get("risk_score") or pred.get("risk_score") or 0.0)
        new_level = str(saved.get("risk_level") or pred.get("risk_level") or "AMBER")
        new_window = int(saved.get("cashout_window_hours") or pred.get("cashout_window_hours") or 8)

        if prev_pred and prev_pred.get("prediction_id"):
            old_risk = float(prev_pred.get("risk_score", 0.0))
            old_level = str(prev_pred.get("risk_level", "AMBER"))
            old_window = int(prev_pred.get("cashout_window_hours", 8))
            delta_risk = abs(new_risk - old_risk)

            # Determine whether shift is meaningful
            if delta_risk >= 0.05 or old_level != new_level or old_window != new_window:
                safe_emit_autonomy_event(
                    event_type="prediction_updated",
                    entity_type="prediction",
                    entity_id=pid,
                    complaint_id=cid,
                    payload={
                        "prediction_id": pid,
                        "complaint_id": cid,
                        "previous_risk_score": old_risk,
                        "new_risk_score": new_risk,
                        "previous_risk_level": old_level,
                        "new_risk_level": new_level,
                        "previous_cashout_window_hours": old_window,
                        "cashout_window_hours": new_window,
                        "delta_risk": round(delta_risk, 4),
                        "predicted_lat": saved.get("predicted_lat"),
                        "predicted_lon": saved.get("predicted_lon"),
                    },
                    idempotency_key=f"prediction:{pid}:updated:{int(time.time() // 60)}",
                )
        else:
            safe_emit_autonomy_event(
                event_type="prediction_generated",
                entity_type="prediction",
                entity_id=pid,
                complaint_id=cid,
                payload={
                    "prediction_id": pid,
                    "complaint_id": cid,
                    "risk_score": new_risk,
                    "risk_level": new_level,
                    "cashout_window_hours": new_window,
                    "predicted_lat": saved.get("predicted_lat"),
                    "predicted_lon": saved.get("predicted_lon"),
                    "shap_features": saved.get("shap_features"),
                },
                idempotency_key=f"prediction:{pid}:generated",
            )

    return saved

def get_supabase_all_active_predictions() -> List[Dict[str, Any]]:
    from db.supabase_client import supabase
    try:
        res = supabase.table("predictions").select("*").eq("status", "active").order("created_at", desc=True).execute()
        rows = res.data or []
        for r in rows:
            if isinstance(r.get("shap_features"), str):
                try:
                    r["shap_features"] = json.loads(r["shap_features"])
                except Exception:
                    pass
            if isinstance(r.get("predicted_atms"), str):
                try:
                    r["predicted_atms"] = json.loads(r["predicted_atms"])
                except Exception:
                    pass
        return rows
    except Exception as e:
        logger.error(f"[SUPABASE PREDICTIONS ERROR] Failed to fetch active predictions: {e}", exc_info=True)
        raise


def get_sqlite_all_active_predictions() -> List[Dict[str, Any]]:
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


def get_all_active_predictions() -> List[Dict[str, Any]]:
    if _use_supabase():
        return get_supabase_all_active_predictions()
    return get_sqlite_all_active_predictions()

def get_supabase_mule_chain(complaint_id: str) -> Dict[str, Any]:
    from db.supabase_client import supabase
    try:
        complaint = get_supabase_complaint_by_id(complaint_id)
        nodes_res = supabase.table("mule_chain_nodes").select("*").eq("complaint_id", complaint_id).order("hop_position").execute()
        nodes = nodes_res.data or []
        acc_ids = [n["account_id"] for n in nodes if n.get("account_id")]
        accs_by_id = {}
        if acc_ids:
            acc_res = supabase.table("mule_accounts").select("*").in_("account_id", acc_ids).execute()
            for a in (acc_res.data or []):
                accs_by_id[a["account_id"]] = a

        mules = []
        for n in nodes:
            acc_data = accs_by_id.get(n.get("account_id"), {})
            merged = {**acc_data, **n}
            mules.append(merged)

        txns_res = supabase.table("transactions").select("*").eq("complaint_id", complaint_id).order("created_at").execute()
        txns = txns_res.data or []

        return {
            "complaint": complaint,
            "mule_nodes": mules,
            "transactions": txns
        }
    except Exception as e:
        logger.error(f"[SUPABASE MULE CHAIN ERROR] {complaint_id}: {e}", exc_info=True)
        return {"complaint": None, "mule_nodes": [], "transactions": []}


def get_sqlite_mule_chain(complaint_id: str) -> Dict[str, Any]:
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


def get_mule_chain(complaint_id: str) -> Dict[str, Any]:
    if _use_supabase():
        return get_supabase_mule_chain(complaint_id)
    return get_sqlite_mule_chain(complaint_id)

def get_supabase_atms(ids: Optional[List[str]] = None, limit: int = 100) -> List[Dict[str, Any]]:
    from db.supabase_client import supabase
    try:
        q = supabase.table("atm_locations").select("*")
        if ids and len(ids) > 0:
            q = q.in_("atm_id", ids)
        res = q.limit(limit).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"[SUPABASE ATMS ERROR] Failed to fetch ATMs: {e}", exc_info=True)
        raise


def get_sqlite_atms(ids: Optional[List[str]] = None, limit: int = 50) -> List[Dict[str, Any]]:
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


def get_atms(ids: Optional[List[str]] = None, limit: int = 100) -> List[Dict[str, Any]]:
    if _use_supabase():
        return get_supabase_atms(ids=ids, limit=limit)
    return get_sqlite_atms(ids=ids, limit=limit)


def get_supabase_atm_by_id(atm_id: str) -> Optional[Dict[str, Any]]:
    from db.supabase_client import supabase
    try:
        res = supabase.table("atm_locations").select("*").eq("atm_id", atm_id).limit(1).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"[SUPABASE ATM GET ERROR] Failed to fetch ATM {atm_id}: {e}", exc_info=True)
        raise


def get_sqlite_atm_by_id(atm_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM atm_locations WHERE atm_id = ?", (atm_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None


def get_atm_by_id(atm_id: str) -> Optional[Dict[str, Any]]:
    if _use_supabase():
        return get_supabase_atm_by_id(atm_id)
    return get_sqlite_atm_by_id(atm_id)


def get_supabase_hotspots(limit: int = 50) -> List[Dict[str, Any]]:
    from db.supabase_client import supabase
    try:
        res = supabase.table("hotspots").select("*").limit(limit).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"[SUPABASE HOTSPOTS ERROR] Failed to fetch hotspots: {e}", exc_info=True)
        raise


def get_sqlite_hotspots() -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM hotspots WHERE status = 'active'")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


def get_hotspots(limit: int = 50) -> List[Dict[str, Any]]:
    if _use_supabase():
        return get_supabase_hotspots(limit=limit)
    return get_sqlite_hotspots()

def get_supabase_alerts(limit: int = 50) -> List[Dict[str, Any]]:
    from db.supabase_client import supabase
    try:
        res = supabase.table("alerts").select("*").order("created_at", desc=True).limit(limit).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"[SUPABASE ALERTS ERROR] Failed to fetch alerts: {e}", exc_info=True)
        raise


def get_sqlite_alerts(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


def get_alerts(limit: int = 50) -> List[Dict[str, Any]]:
    if _use_supabase():
        return get_supabase_alerts(limit=limit)
    return get_sqlite_alerts(limit=limit)

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

    if alert:
        safe_emit_autonomy_event(
            event_type="alert_acknowledged",
            entity_type="alert",
            entity_id=str(alert_id),
            complaint_id=alert.get("complaint_id"),
            payload={
                "alert_id": str(alert_id),
                "complaint_id": alert.get("complaint_id"),
                "assigned_officer": officer,
                "status": "assigned",
            },
            idempotency_key=f"alert:{alert_id}:acknowledged",
        )

    return alert

def get_supabase_incidents(limit: int = 50) -> List[Dict[str, Any]]:
    from db.supabase_client import supabase
    try:
        res = supabase.table("incidents").select("*").order("created_at", desc=True).limit(limit).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"[SUPABASE INCIDENTS ERROR] Failed to fetch incidents: {e}", exc_info=True)
        raise


def get_sqlite_incidents(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM incidents ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


def get_incidents(limit: int = 50) -> List[Dict[str, Any]]:
    if _use_supabase():
        return get_supabase_incidents(limit=limit)
    return get_sqlite_incidents(limit=limit)


def get_supabase_incident_by_id(incident_id: str) -> Optional[Dict[str, Any]]:
    from db.supabase_client import supabase
    if not is_valid_uuid(incident_id):
        return None
    try:
        res = supabase.table("incidents").select("*").eq("incident_id", incident_id).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"[SUPABASE INCIDENT GET ERROR] Failed to fetch incident {incident_id}: {e}", exc_info=True)
        raise


def get_sqlite_incident_by_id(incident_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM incidents WHERE incident_id = ?", (incident_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None


def get_incident_by_id(incident_id: str) -> Optional[Dict[str, Any]]:
    if _use_supabase():
        return get_supabase_incident_by_id(incident_id)
    return get_sqlite_incident_by_id(incident_id)

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


def resolve_incident(
    incident_id: str,
    action_taken: Optional[str] = None,
    notes: Optional[str] = None,
    suspect_apprehended: int = 0,
    amount_recovered: float = 0.0,
    outcome: str = "resolved",
) -> Optional[Dict[str, Any]]:
    """
    Marks an operational incident as resolved and safely emits incident_resolved event.
    """
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    existing = get_incident_by_id(incident_id)
    cid = existing.get("complaint_id") if existing else None

    if _use_supabase():
        try:
            from db.supabase_client import supabase
            upd = {
                "status": outcome,
                "suspect_apprehended": suspect_apprehended,
            }
            if action_taken:
                upd["action_taken"] = action_taken
            if notes:
                upd["notes"] = notes
            supabase.table("incidents").update(upd).eq("incident_id", incident_id).execute()
        except Exception as e:
            logger.error(f"[SUPABASE RESOLVE INCIDENT ERROR] {incident_id}: {e}", exc_info=True)

    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        UPDATE incidents
        SET status = ?, suspect_apprehended = ?,
            action_taken = COALESCE(?, action_taken),
            notes = COALESCE(?, notes),
            updated_at = ?
        WHERE incident_id = ?
    """, (outcome, suspect_apprehended, action_taken, notes, now, incident_id))
    conn.commit()
    conn.close()

    updated = get_incident_by_id(incident_id)

    # Safely emit incident_resolved autonomy event
    safe_emit_autonomy_event(
        event_type="incident_resolved",
        entity_type="incident",
        entity_id=str(incident_id),
        complaint_id=cid,
        payload={
            "incident_id": str(incident_id),
            "complaint_id": cid,
            "status": outcome,
            "action_taken": action_taken,
            "suspect_apprehended": suspect_apprehended,
            "amount_recovered": amount_recovered,
        },
        idempotency_key=f"incident:{incident_id}:resolved",
    )

    return updated


def get_cutoff_iso(timeframe: str) -> Optional[str]:
    tf = (timeframe or "24h").lower()
    now = datetime.datetime.now(datetime.timezone.utc)
    if tf == "24h":
        return (now - datetime.timedelta(hours=24)).isoformat()
    elif tf == "7d":
        return (now - datetime.timedelta(days=7)).isoformat()
    elif tf == "30d":
        return (now - datetime.timedelta(days=30)).isoformat()
    return None


def format_inr_currency(val: float) -> str:
    if not val or val == 0:
        return "₹0"
    if val >= 10000000:
        return f"₹{val/10000000:.2f} Cr"
    elif val >= 100000:
        return f"₹{val/100000:.2f} L"
    else:
        return f"₹{val:,.0f}"


def get_supabase_dashboard_stats(timeframe: str = "24h") -> Dict[str, Any]:
    from db.supabase_client import supabase

    c_res = supabase.table("complaints").select("complaint_id, fraud_type, amount_inr, status, created_at, filed_at, victim_state").execute()
    complaints = c_res.data or []

    a_res = supabase.table("alerts").select("alert_id, prediction_id, complaint_id, message, severity, created_at, status").order("created_at", desc=True).execute()
    alerts = a_res.data or []

    i_res = supabase.table("incidents").select("incident_id, complaint_id, prediction_id, alert_id, status, suspect_apprehended, action_taken, amount_recovered_inr, outcome, created_at").order("created_at", desc=True).execute()
    incidents = i_res.data or []

    p_res = supabase.table("predictions").select("complaint_id, risk_score, predicted_lat, cashout_window_hours, status, created_at").execute()
    predictions = p_res.data or []

    cutoff_iso = get_cutoff_iso(timeframe)
    if cutoff_iso:
        complaints = [c for c in complaints if str(c.get("created_at") or c.get("filed_at") or "") >= cutoff_iso]
        alerts = [a for a in alerts if str(a.get("created_at") or "") >= cutoff_iso]
        incidents = [i for i in incidents if str(i.get("created_at") or "") >= cutoff_iso]
        predictions = [p for p in predictions if str(p.get("created_at") or "") >= cutoff_iso]

    total_complaints = len(complaints)
    open_complaints = len([c for c in complaints if str(c.get("status", "")).lower() != "closed"])
    total_funds = sum(float(c.get("amount_inr") or 0) for c in complaints)

    active_alerts = len([a for a in alerts if str(a.get("status", "")).lower() not in ("actioned", "resolved", "closed", "failed")])
    incidents_in_progress = len([i for i in incidents if str(i.get("status", "")).lower() in ("open", "in_progress", "authorized")])
    incidents_closed = len([i for i in incidents if str(i.get("status", "")).lower() in ("closed", "resolved")])
    funds_frozen = sum(float(i.get("amount_recovered_inr") or 0) for i in incidents)

    red_count = len([p for p in predictions if float(p.get("risk_score") or 0) >= 0.75])
    amber_count = len([p for p in predictions if 0.45 <= float(p.get("risk_score") or 0) < 0.75])
    green_count = len([p for p in predictions if 0 < float(p.get("risk_score") or 0) < 0.45])
    total_predictions = len(predictions)

    breakdown = [
        {"level": "CRITICAL", "count": red_count, "percentage": round(red_count / max(total_predictions, 1) * 100) if total_predictions > 0 else 0, "color": "#DC2626"},
        {"level": "HIGH", "count": amber_count, "percentage": round(amber_count / max(total_predictions, 1) * 100) if total_predictions > 0 else 0, "color": "#EA580C"},
        {"level": "MEDIUM", "count": green_count, "percentage": round(green_count / max(total_predictions, 1) * 100) if total_predictions > 0 else 0, "color": "#D97706"},
        {"level": "LOW", "count": max(0, total_complaints - total_predictions), "percentage": round(max(0, total_complaints - total_predictions) / max(total_complaints, 1) * 100) if total_complaints > 0 else 0, "color": "#087F5B"}
    ]

    highest_risk = "Critical" if red_count > 0 else ("High" if amber_count > 0 else ("Medium" if green_count > 0 else "None"))

    complaints_map = {c["complaint_id"]: c for c in complaints if c.get("complaint_id")}
    predictions_map = {p["complaint_id"]: p for p in predictions if p.get("complaint_id")}

    priority_alerts = []
    for a in alerts[:4]:
        cid = a.get("complaint_id")
        comp = complaints_map.get(cid, {})
        pred = predictions_map.get(cid, {})
        priority_alerts.append({
            "alert_id": a.get("alert_id") or str(a.get("id", "")),
            "id": a.get("alert_id") or str(a.get("id", "")),
            "complaint_id": cid or "",
            "message": a.get("message") or "",
            "severity": a.get("severity") or "HIGH",
            "created_at": a.get("created_at") or "",
            "risk_score": float(pred.get("risk_score") or 0.75),
            "cashout_window_hours": int(pred.get("cashout_window_hours") or 12),
            "amount_inr": float(comp.get("amount_inr") or 0),
            "accused_bank": comp.get("accused_bank") or "National Bank",
        })

    live_activity = []
    for c in complaints[:4]:
        f_amt = int(float(c.get("amount_inr") or 0))
        live_activity.append({
            "type": "complaint",
            "ref_id": c.get("complaint_id") or "",
            "title": f"New intake: {c.get('fraud_type', 'Fraud')}",
            "subtitle": f"Reported amount: Rs {f_amt:,}",
            "badge": c.get("status") or "flagged",
            "created_at": c.get("created_at") or c.get("filed_at") or "",
        })
    for a in alerts[:4]:
        live_activity.append({
            "type": "alert",
            "ref_id": a.get("alert_id") or a.get("complaint_id") or "",
            "title": "Alert escalation",
            "subtitle": a.get("message") or "",
            "badge": a.get("severity") or "HIGH",
            "created_at": a.get("created_at") or "",
        })
    live_activity.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)

    kpis = {
        "openComplaints": open_complaints,
        "totalComplaints": total_complaints,
        "activeAlerts": active_alerts,
        "highestAlertRisk": highest_risk,
        "incidentsInProgress": incidents_in_progress,
        "incidentsClosedToday": incidents_closed,
        "totalFundsAtRisk": format_inr_currency(total_funds),
        "totalFundsFrozen": f"{format_inr_currency(funds_frozen)} secured / frozen" if funds_frozen > 0 else "₹0 secured / frozen",
    }

    return {
        "kpis": kpis,
        "openComplaints": open_complaints,
        "totalComplaints": total_complaints,
        "activeAlerts": active_alerts,
        "highestAlertRisk": highest_risk,
        "incidentsInProgress": incidents_in_progress,
        "incidentsClosedToday": incidents_closed,
        "totalFundsAtRisk": format_inr_currency(total_funds),
        "totalFundsFrozen": f"{format_inr_currency(funds_frozen)} secured / frozen" if funds_frozen > 0 else "₹0 secured / frozen",
        "priorityAlerts": priority_alerts,
        "liveActivity": live_activity[:8],
        "riskBreakdown": {
            "totalActiveCases": total_complaints,
            "breakdown": breakdown,
        }
    }


def get_sqlite_dashboard_stats(timeframe: str = "24h") -> Dict[str, Any]:
    conn = get_connection()
    c = conn.cursor()

    cutoff_iso = get_cutoff_iso(timeframe)

    if cutoff_iso:
        c.execute("SELECT COUNT(*) FROM complaints WHERE created_at >= ?", (cutoff_iso,))
        total_complaints = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM complaints WHERE status != 'resolved' AND created_at >= ?", (cutoff_iso,))
        open_complaints = c.fetchone()[0]

        c.execute("SELECT COALESCE(SUM(amount_inr), 0) FROM complaints WHERE created_at >= ?", (cutoff_iso,))
        total_funds = float(c.fetchone()[0] or 0)

        c.execute("SELECT COUNT(*) FROM alerts WHERE status != 'actioned' AND created_at >= ?", (cutoff_iso,))
        active_alerts = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM incidents WHERE status IN ('open', 'in_progress', 'authorized') AND created_at >= ?", (cutoff_iso,))
        incidents_in_progress = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM incidents WHERE status IN ('closed', 'resolved') AND created_at >= ?", (cutoff_iso,))
        incidents_closed = c.fetchone()[0]

        c.execute("""
        SELECT COALESCE(SUM(c.amount_inr), 0)
        FROM incidents i
        JOIN complaints c ON i.complaint_id = c.complaint_id
        WHERE i.status IN ('authorized', 'closed', 'resolved') AND i.created_at >= ?
        """, (cutoff_iso,))
        funds_frozen = float(c.fetchone()[0] or 0)

        c.execute("SELECT risk_level, COUNT(*) FROM predictions WHERE created_at >= ? GROUP BY risk_level", (cutoff_iso,))
        risk_counts = {r[0]: r[1] for r in c.fetchall()}

        c.execute("""
        SELECT a.alert_id, a.complaint_id, a.message, a.severity, a.created_at, p.risk_score, p.cashout_window_hours, c.amount_inr, c.accused_bank
        FROM alerts a
        JOIN predictions p ON a.complaint_id = p.complaint_id
        JOIN complaints c ON a.complaint_id = c.complaint_id
        WHERE a.created_at >= ?
        ORDER BY p.risk_score DESC, a.created_at DESC
        LIMIT 4
        """, (cutoff_iso,))
        priority_alerts = [dict(r) for r in c.fetchall()]

        c.execute("""
        SELECT 'complaint' as type, complaint_id as ref_id, 'New intake: ' || fraud_type as title, 'Reported amount: Rs ' || CAST(ROUND(amount_inr) as TEXT) as subtitle, status as badge, created_at
        FROM complaints WHERE created_at >= ?
        UNION ALL
        SELECT 'prediction' as type, complaint_id as ref_id, 'Predictive risk computed' as title, 'Cashout window: ' || CAST(cashout_window_hours as TEXT) || 'h' as subtitle, risk_level as badge, created_at
        FROM predictions WHERE created_at >= ?
        UNION ALL
        SELECT 'alert' as type, alert_id as ref_id, 'Alert escalation' as title, message as subtitle, severity as badge, created_at
        FROM alerts WHERE created_at >= ?
        ORDER BY created_at DESC
        LIMIT 8
        """, (cutoff_iso, cutoff_iso, cutoff_iso))
        live_activity = [dict(r) for r in c.fetchall()]
    else:
        c.execute("SELECT COUNT(*) FROM complaints")
        total_complaints = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM complaints WHERE status != 'resolved'")
        open_complaints = c.fetchone()[0]

        c.execute("SELECT COALESCE(SUM(amount_inr), 0) FROM complaints")
        total_funds = float(c.fetchone()[0] or 0)

        c.execute("SELECT COUNT(*) FROM alerts WHERE status != 'actioned'")
        active_alerts = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM incidents WHERE status IN ('open', 'in_progress', 'authorized')")
        incidents_in_progress = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM incidents WHERE status IN ('closed', 'resolved')")
        incidents_closed = c.fetchone()[0]

        c.execute("""
        SELECT COALESCE(SUM(c.amount_inr), 0)
        FROM incidents i
        JOIN complaints c ON i.complaint_id = c.complaint_id
        WHERE i.status IN ('authorized', 'closed', 'resolved')
        """)
        funds_frozen = float(c.fetchone()[0] or 0)

        c.execute("SELECT risk_level, COUNT(*) FROM predictions GROUP BY risk_level")
        risk_counts = {r[0]: r[1] for r in c.fetchall()}

        c.execute("""
        SELECT a.alert_id, a.complaint_id, a.message, a.severity, a.created_at, p.risk_score, p.cashout_window_hours, c.amount_inr, c.accused_bank
        FROM alerts a
        JOIN predictions p ON a.complaint_id = p.complaint_id
        JOIN complaints c ON a.complaint_id = c.complaint_id
        ORDER BY p.risk_score DESC, a.created_at DESC
        LIMIT 4
        """)
        priority_alerts = [dict(r) for r in c.fetchall()]

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

    total_predictions = sum(risk_counts.values()) or max(total_complaints, 1)
    red_c = risk_counts.get("RED", 0)
    amber_c = risk_counts.get("AMBER", 0)
    green_c = risk_counts.get("GREEN", 0)

    breakdown = [
        {"level": "CRITICAL", "count": red_c, "percentage": round(red_c / total_predictions * 100) if total_predictions > 0 else 0, "color": "#DC2626"},
        {"level": "HIGH", "count": amber_c, "percentage": round(amber_c / total_predictions * 100) if total_predictions > 0 else 0, "color": "#EA580C"},
        {"level": "MEDIUM", "count": green_c, "percentage": round(green_c / total_predictions * 100) if total_predictions > 0 else 0, "color": "#D97706"},
        {"level": "LOW", "count": max(0, total_complaints - total_predictions), "percentage": round(max(0, total_complaints - total_predictions) / max(total_complaints, 1) * 100) if total_complaints > 0 else 0, "color": "#087F5B"}
    ]

    highest_risk = "Critical" if red_c > 0 else ("High" if amber_c > 0 else ("Medium" if green_c > 0 else "None"))

    kpis = {
        "openComplaints": open_complaints,
        "totalComplaints": total_complaints,
        "activeAlerts": active_alerts,
        "highestAlertRisk": highest_risk,
        "incidentsInProgress": incidents_in_progress,
        "incidentsClosedToday": incidents_closed,
        "totalFundsAtRisk": format_inr_currency(total_funds),
        "totalFundsFrozen": f"{format_inr_currency(funds_frozen)} secured / frozen" if funds_frozen > 0 else "₹0 secured / frozen",
    }

    return {
        "kpis": kpis,
        "openComplaints": open_complaints,
        "totalComplaints": total_complaints,
        "activeAlerts": active_alerts,
        "highestAlertRisk": highest_risk,
        "incidentsInProgress": incidents_in_progress,
        "incidentsClosedToday": incidents_closed,
        "totalFundsAtRisk": format_inr_currency(total_funds),
        "totalFundsFrozen": f"{format_inr_currency(funds_frozen)} secured / frozen" if funds_frozen > 0 else "₹0 secured / frozen",
        "priorityAlerts": priority_alerts,
        "liveActivity": live_activity,
        "riskBreakdown": {
            "totalActiveCases": total_complaints,
            "breakdown": breakdown
        }
    }


def get_dashboard_stats(timeframe: str = "24h") -> Dict[str, Any]:
    if _use_supabase():
        return get_supabase_dashboard_stats(timeframe)
    return get_sqlite_dashboard_stats(timeframe)


# =============================================================================
# PHASE 1: TRUTH GRAPH & AUTONOMY DATA FOUNDATION UTILITIES & REPOSITORY
# =============================================================================

def normalize_entity_identity(entity_type: str, raw_value: str) -> Tuple[str, str, str]:
    """
    Deterministically normalizes an entity identifier into:
    (canonical_reference, raw_fingerprint_hash, masked_value)
    Guarantees consistent cross-case matching without exposing plaintext PII.
    """
    etype = str(entity_type).strip().lower()
    val = str(raw_value).strip()

    if etype == "phone":
        digits = re.sub(r"\D", "", val)
        norm = digits[-10:] if len(digits) >= 10 else digits
        fp = hashlib.sha256(f"phone:{norm}".encode()).hexdigest()
        canon = f"phone:{fp[:16]}"
        masked = ("*" * (len(norm) - 4) + norm[-4:]) if len(norm) > 4 else "****"
        return canon, fp, masked

    elif etype == "bank_account":
        norm = re.sub(r"[^A-Za-z0-9]", "", val.upper())
        fp = hashlib.sha256(f"account:{norm}".encode()).hexdigest()
        canon = f"account:{fp[:16]}"
        masked = ("*" * (len(norm) - 4) + norm[-4:]) if len(norm) > 4 else "****"
        return canon, fp, masked

    elif etype == "upi_id":
        norm = val.lower()
        fp = hashlib.sha256(f"upi:{norm}".encode()).hexdigest()
        canon = f"upi:{fp[:16]}"
        handle = norm.split("@")[-1] if "@" in norm else "upi"
        masked = f"***@{handle}"
        return canon, fp, masked

    elif etype == "device":
        norm = val.lower()
        fp = hashlib.sha256(f"device:{norm}".encode()).hexdigest()
        canon = f"device:{fp[:16]}"
        masked = f"DEV-******{norm[-4:] if len(norm) >= 4 else norm}"
        return canon, fp, masked

    elif etype == "ip_subnet":
        norm = val.strip()
        fp = hashlib.sha256(f"ip:{norm}".encode()).hexdigest()
        canon = f"ip:{fp[:16]}"
        parts = norm.split(".")
        masked = f"***.***.{parts[-2] if len(parts) >= 2 else 'X'}.0/24"
        return canon, fp, masked

    elif etype == "complaint":
        canon = f"complaint:{val}"
        fp = hashlib.sha256(canon.encode()).hexdigest()
        return canon, fp, val

    elif etype == "transaction":
        canon = f"txn:{val}"
        fp = hashlib.sha256(canon.encode()).hexdigest()
        masked = f"TXN-******{val[-4:] if len(val) >= 4 else val}"
        return canon, fp, masked

    elif etype == "atm":
        canon = f"atm:{val}"
        fp = hashlib.sha256(canon.encode()).hexdigest()
        return canon, fp, val

    else:
        norm = val.lower()
        fp = hashlib.sha256(f"{etype}:{norm}".encode()).hexdigest()
        canon = f"{etype}:{fp[:16]}"
        masked = f"{etype.upper()}-******"
        return canon, fp, masked


# -----------------------------------------------------------------------------
# 1. TRUTH GRAPH ENTITIES
# -----------------------------------------------------------------------------

def create_or_get_truth_entity(
    entity_type: str,
    raw_value: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    raw_identifier: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Creates or retrieves a deterministic Truth Graph entity.
    Resolves duplicates deterministically across complaints.
    """
    val = raw_value if raw_value is not None else (raw_identifier or "")
    canon_ref, fp_hash, masked = normalize_entity_identity(entity_type, val)
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    meta = metadata or {}

    # Attempt Supabase if active
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            existing = supabase.table("truth_graph_entities").select("*").eq("canonical_reference", canon_ref).execute()
            if existing.data:
                row = existing.data[0]
                merged_meta = {**(row.get("metadata") or {}), **meta}
                supabase.table("truth_graph_entities").update({
                    "last_seen_at": now_iso,
                    "updated_at": now_iso,
                    "metadata": merged_meta,
                }).eq("entity_id", row["entity_id"]).execute()
                row["last_seen_at"] = now_iso
                row["metadata"] = merged_meta
                return row

            new_id = str(uuid.uuid4())
            new_row = {
                "entity_id": new_id,
                "entity_type": entity_type.strip().lower(),
                "canonical_reference": canon_ref,
                "raw_fingerprint_hash": fp_hash,
                "masked_value": masked,
                "metadata": meta,
                "first_seen_at": now_iso,
                "last_seen_at": now_iso,
                "created_at": now_iso,
                "updated_at": now_iso,
            }
            res = supabase.table("truth_graph_entities").insert(new_row).execute()
            if res.data:
                return res.data[0]
            return new_row
        except Exception as e:
            logger.debug(f"[SUPABASE TRUTH ENTITY FALLBACK]: {e}")

    # SQLite fallback / local execution
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM truth_graph_entities WHERE canonical_reference = ?", (canon_ref,))
    row = c.fetchone()
    if row:
        d = dict(row)
        try:
            cur_meta = json.loads(d.get("metadata") or "{}")
        except Exception:
            cur_meta = {}
        merged_meta = {**cur_meta, **meta}
        c.execute("""
            UPDATE truth_graph_entities 
            SET last_seen_at = ?, updated_at = ?, metadata = ?
            WHERE canonical_reference = ?
        """, (now_iso, now_iso, json.dumps(merged_meta), canon_ref))
        conn.commit()
        conn.close()
        d["last_seen_at"] = now_iso
        d["metadata"] = merged_meta
        return d

    new_id = str(uuid.uuid4())
    c.execute("""
        INSERT INTO truth_graph_entities (
            entity_id, entity_type, canonical_reference, raw_fingerprint_hash,
            masked_value, metadata, first_seen_at, last_seen_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        new_id, entity_type.strip().lower(), canon_ref, fp_hash,
        masked, json.dumps(meta), now_iso, now_iso, now_iso, now_iso
    ))
    conn.commit()
    conn.close()

    return {
        "entity_id": new_id,
        "entity_type": entity_type.strip().lower(),
        "canonical_reference": canon_ref,
        "raw_fingerprint_hash": fp_hash,
        "masked_value": masked,
        "metadata": meta,
        "first_seen_at": now_iso,
        "last_seen_at": now_iso,
        "created_at": now_iso,
        "updated_at": now_iso,
    }


def get_truth_entity_by_id(entity_id: str) -> Optional[Dict[str, Any]]:
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            res = supabase.table("truth_graph_entities").select("*").eq("entity_id", entity_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.debug(f"[SUPABASE GET ENTITY FALLBACK]: {e}")

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM truth_graph_entities WHERE entity_id = ?", (entity_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    if isinstance(d.get("metadata"), str):
        try:
            d["metadata"] = json.loads(d["metadata"])
        except Exception:
            d["metadata"] = {}
    return d


# =============================================================================
# USER MANAGEMENT HELPERS
# =============================================================================

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)

def register_user(name: str, email: str, password_hash: str, role: str = "Officer", badge_id: str = "", agency: str = "", status: str = "pending_approval") -> Dict[str, Any]:
    uid = f"usr_{abs(hash(email))}"
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO users (id, name, email, password_hash, role, badge_id, agency, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (uid, name, email, password_hash, role, badge_id, agency, status, now_str))
    conn.commit()
    c.execute("SELECT * FROM users WHERE id = ?", (uid,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else {"id": uid, "name": name, "email": email, "role": role, "badge_id": badge_id, "agency": agency, "status": status}

def get_pending_users() -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE status = 'pending_approval' ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def update_user_status(email_or_id: str, status: str) -> bool:
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE users SET status = ? WHERE id = ? OR LOWER(email) = LOWER(?)", (status, email_or_id, email_or_id.strip()))
    updated = c.rowcount > 0
    conn.commit()
    conn.close()
    return updated


def get_truth_entity_by_reference(canonical_reference: str) -> Optional[Dict[str, Any]]:
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            res = supabase.table("truth_graph_entities").select("*").eq("canonical_reference", canonical_reference).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.debug(f"[SUPABASE GET REF FALLBACK]: {e}")

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM truth_graph_entities WHERE canonical_reference = ?", (canonical_reference,))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    if isinstance(d.get("metadata"), str):
        try:
            d["metadata"] = json.loads(d["metadata"])
        except Exception:
            d["metadata"] = {}
    return d


# -----------------------------------------------------------------------------
# 2. TRUTH GRAPH RELATIONS
# -----------------------------------------------------------------------------

def create_truth_relation(
    source_entity_id: str,
    target_entity_id: str,
    relation_type: str,
    semantic_level: str = "DIRECT_OBSERVED",
    complaint_id: Optional[str] = None,
    source_record_type: str = "analysis",
    source_record_id: str = "",
    confidence: float = 1.0,
    evidence_metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Creates a provenance-backed relation between two Truth Graph entities.
    Distinguishes fact from inference via semantic_level:
    DIRECT_OBSERVED | DERIVED | INFERRED | MODEL_SIGNAL
    """
    valid_levels = {"DIRECT_OBSERVED", "DERIVED", "INFERRED", "MODEL_SIGNAL"}
    sem_level = semantic_level.upper() if semantic_level.upper() in valid_levels else "DIRECT_OBSERVED"
    rel_type = relation_type.strip().upper()
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    ev_meta = evidence_metadata or {}
    rec_id = source_record_id or f"{source_entity_id}_{target_entity_id}_{rel_type}"

    if _use_supabase():
        try:
            from db.supabase_client import supabase
            existing = supabase.table("truth_graph_relations")\
                .select("*")\
                .eq("source_entity_id", source_entity_id)\
                .eq("target_entity_id", target_entity_id)\
                .eq("relation_type", rel_type)\
                .eq("source_record_id", rec_id)\
                .execute()
            if existing.data:
                row = existing.data[0]
                supabase.table("truth_graph_relations").update({"last_seen_at": now_iso}).eq("relation_id", row["relation_id"]).execute()
                row["last_seen_at"] = now_iso
                return row

            new_id = str(uuid.uuid4())
            new_row = {
                "relation_id": new_id,
                "source_entity_id": source_entity_id,
                "target_entity_id": target_entity_id,
                "relation_type": rel_type,
                "semantic_level": sem_level,
                "complaint_id": complaint_id,
                "source_record_type": source_record_type,
                "source_record_id": rec_id,
                "confidence": min(1.0, max(0.0, float(confidence))),
                "evidence_metadata": ev_meta,
                "first_seen_at": now_iso,
                "last_seen_at": now_iso,
                "created_at": now_iso,
            }
            res = supabase.table("truth_graph_relations").insert(new_row).execute()
            if res.data:
                return res.data[0]
            return new_row
        except Exception as e:
            logger.debug(f"[SUPABASE TRUTH RELATION FALLBACK]: {e}")

    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        SELECT * FROM truth_graph_relations
        WHERE source_entity_id = ? AND target_entity_id = ? AND relation_type = ? AND source_record_id = ?
    """, (source_entity_id, target_entity_id, rel_type, rec_id))
    row = c.fetchone()
    if row:
        d = dict(row)
        c.execute("UPDATE truth_graph_relations SET last_seen_at = ? WHERE relation_id = ?", (now_iso, d["relation_id"]))
        conn.commit()
        conn.close()
        d["last_seen_at"] = now_iso
        return d

    new_id = str(uuid.uuid4())
    c.execute("""
        INSERT INTO truth_graph_relations (
            relation_id, source_entity_id, target_entity_id, relation_type,
            semantic_level, complaint_id, source_record_type, source_record_id,
            confidence, evidence_metadata, first_seen_at, last_seen_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        new_id, source_entity_id, target_entity_id, rel_type,
        sem_level, complaint_id, source_record_type, rec_id,
        float(confidence), json.dumps(ev_meta), now_iso, now_iso, now_iso
    ))
    conn.commit()
    conn.close()

    return {
        "relation_id": new_id,
        "source_entity_id": source_entity_id,
        "target_entity_id": target_entity_id,
        "relation_type": rel_type,
        "semantic_level": sem_level,
        "complaint_id": complaint_id,
        "source_record_type": source_record_type,
        "source_record_id": rec_id,
        "confidence": float(confidence),
        "evidence_metadata": ev_meta,
        "first_seen_at": now_iso,
        "last_seen_at": now_iso,
        "created_at": now_iso,
    }


def get_truth_graph_for_complaint(complaint_id: str) -> Dict[str, Any]:
    """Returns the unified Truth Graph (entities + relations) associated with a complaint."""
    relations = []
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            res = supabase.table("truth_graph_relations").select("*").eq("complaint_id", complaint_id).execute()
            if res.data:
                relations = res.data
        except Exception:
            relations = []

    if not relations:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM truth_graph_relations WHERE complaint_id = ?", (complaint_id,))
        relations = [dict(r) for r in c.fetchall()]
        conn.close()

    entity_ids = set()
    for rel in relations:
        entity_ids.add(rel["source_entity_id"])
        entity_ids.add(rel["target_entity_id"])

    entities = []
    for eid in entity_ids:
        ent = get_truth_entity_by_id(eid)
        if ent:
            entities.append(ent)

    return {
        "complaint_id": complaint_id,
        "entities": entities,
        "relations": relations,
    }


def get_entity_cross_case_links(entity_id: str) -> Dict[str, Any]:
    """Retrieves all complaints and connected entities linked to an entity across cases."""
    relations = []
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            r1 = supabase.table("truth_graph_relations").select("*").eq("source_entity_id", entity_id).execute()
            r2 = supabase.table("truth_graph_relations").select("*").eq("target_entity_id", entity_id).execute()
            relations = (r1.data or []) + (r2.data or [])
        except Exception:
            relations = []

    if not relations:
        conn = get_connection()
        c = conn.cursor()
        c.execute("""
            SELECT * FROM truth_graph_relations
            WHERE source_entity_id = ? OR target_entity_id = ?
        """, (entity_id, entity_id))
        relations = [dict(r) for r in c.fetchall()]
        conn.close()

    linked_complaint_ids = sorted(list({r.get("complaint_id") for r in relations if r.get("complaint_id")}))
    neighbor_entity_ids = sorted(list({
        r["target_entity_id"] if r["source_entity_id"] == entity_id else r["source_entity_id"]
        for r in relations
    }))

    return {
        "entity_id": entity_id,
        "cross_case_count": len(linked_complaint_ids),
        "linked_complaints": linked_complaint_ids,
        "connected_entity_ids": neighbor_entity_ids,
        "relations": relations,
    }


# -----------------------------------------------------------------------------
# 3. POTENTIAL NETWORK CLUSTERS (INFERRED NETWORKS / SYNDICATE DNA)
# -----------------------------------------------------------------------------

def create_potential_network_cluster(
    cluster_label: str,
    cluster_type: str = "POTENTIAL_SHARED_INFRASTRUCTURE",
    status: str = "candidate",
    confidence_score: float = 0.5,
    summary_metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Creates an inferred operational network cluster candidate.
    DOES NOT modify or overload the authoritative `syndicates` table.
    """
    new_id = str(uuid.uuid4())
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    meta = summary_metadata or {}
    score = min(1.0, max(0.0, float(confidence_score)))

    if _use_supabase():
        try:
            from db.supabase_client import supabase
            new_row = {
                "cluster_id": new_id,
                "cluster_label": cluster_label,
                "cluster_type": cluster_type,
                "status": status,
                "confidence_score": score,
                "supporting_entity_count": 0,
                "supporting_complaint_count": 0,
                "total_exposure_inr": 0.0,
                "summary_metadata": meta,
                "detected_at": now_iso,
                "last_updated_at": now_iso,
                "created_at": now_iso,
            }
            res = supabase.table("potential_network_clusters").insert(new_row).execute()
            if res.data:
                return res.data[0]
            return new_row
        except Exception as e:
            logger.debug(f"[SUPABASE NETWORK CLUSTER FALLBACK]: {e}")

    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO potential_network_clusters (
            cluster_id, cluster_label, cluster_type, status, confidence_score,
            supporting_entity_count, supporting_complaint_count, total_exposure_inr,
            summary_metadata, detected_at, last_updated_at, created_at
        ) VALUES (?, ?, ?, ?, ?, 0, 0, 0.0, ?, ?, ?, ?)
    """, (new_id, cluster_label, cluster_type, status, score, json.dumps(meta), now_iso, now_iso, now_iso))
    conn.commit()
    conn.close()

    return {
        "cluster_id": new_id,
        "cluster_label": cluster_label,
        "cluster_type": cluster_type,
        "status": status,
        "confidence_score": score,
        "supporting_entity_count": 0,
        "supporting_complaint_count": 0,
        "total_exposure_inr": 0.0,
        "summary_metadata": meta,
        "detected_at": now_iso,
        "last_updated_at": now_iso,
        "created_at": now_iso,
    }


def add_potential_network_member(
    cluster_id: str,
    member_type: str,
    entity_id: Optional[str] = None,
    complaint_id: Optional[str] = None,
    evidence_basis: str = "SHARED_INFRASTRUCTURE",
    confidence: float = 1.0,
    evidence_metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Adds an entity or complaint membership link to an inferred network cluster idempotently."""
    new_id = str(uuid.uuid4())
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    meta = evidence_metadata or {}
    conf = min(1.0, max(0.0, float(confidence)))

    if _use_supabase():
        try:
            from db.supabase_client import supabase
            q = supabase.table("potential_network_members").select("*").eq("cluster_id", cluster_id).eq("member_type", member_type)
            if entity_id:
                q = q.eq("entity_id", entity_id)
            if complaint_id:
                q = q.eq("complaint_id", complaint_id)
            existing = q.execute()
            if existing.data:
                return existing.data[0]

            new_row = {
                "id": new_id,
                "cluster_id": cluster_id,
                "member_type": member_type,
                "entity_id": entity_id,
                "complaint_id": complaint_id,
                "evidence_basis": evidence_basis,
                "confidence": conf,
                "evidence_metadata": meta,
                "joined_at": now_iso,
            }
            res = supabase.table("potential_network_members").insert(new_row).execute()
            if res.data:
                return res.data[0]
            return new_row
        except Exception as e:
            logger.debug(f"[SUPABASE CLUSTER MEMBER FALLBACK]: {e}")

    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        SELECT * FROM potential_network_members
        WHERE cluster_id = ? AND member_type = ? 
        AND ((entity_id = ? AND entity_id IS NOT NULL) OR (entity_id IS NULL AND ? IS NULL))
        AND ((complaint_id = ? AND complaint_id IS NOT NULL) OR (complaint_id IS NULL AND ? IS NULL))
    """, (cluster_id, member_type, entity_id, entity_id, complaint_id, complaint_id))
    existing_row = c.fetchone()
    if existing_row:
        conn.close()
        return dict(existing_row)

    c.execute("""
        INSERT OR IGNORE INTO potential_network_members (
            id, cluster_id, member_type, entity_id, complaint_id,
            evidence_basis, confidence, evidence_metadata, joined_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (new_id, cluster_id, member_type, entity_id, complaint_id, evidence_basis, conf, json.dumps(meta), now_iso))
    conn.commit()
    conn.close()

    return {
        "id": new_id,
        "cluster_id": cluster_id,
        "member_type": member_type,
        "entity_id": entity_id,
        "complaint_id": complaint_id,
        "evidence_basis": evidence_basis,
        "confidence": conf,
        "evidence_metadata": meta,
        "joined_at": now_iso,
    }


def get_potential_network_clusters(limit: int = 50, status: Optional[str] = None) -> List[Dict[str, Any]]:
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            query = supabase.table("potential_network_clusters").select("*").order("detected_at", desc=True).limit(limit)
            if status:
                query = query.eq("status", status)
            res = query.execute()
            if res.data:
                rows = res.data
                for r in rows:
                    if isinstance(r.get("summary_metadata"), str):
                        try:
                            r["summary_metadata"] = json.loads(r["summary_metadata"])
                        except Exception:
                            r["summary_metadata"] = {}
                return rows
        except Exception:
            pass

    conn = get_connection()
    c = conn.cursor()
    if status:
        c.execute("SELECT * FROM potential_network_clusters WHERE status = ? ORDER BY detected_at DESC LIMIT ?", (status, limit))
    else:
        c.execute("SELECT * FROM potential_network_clusters ORDER BY detected_at DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    for r in rows:
        if isinstance(r.get("summary_metadata"), str):
            try:
                r["summary_metadata"] = json.loads(r["summary_metadata"])
            except Exception:
                r["summary_metadata"] = {}
    return rows


def get_potential_network_cluster_by_id(cluster_id: str) -> Optional[Dict[str, Any]]:
    """Fetches a single potential network cluster by its UUID."""
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            res = supabase.table("potential_network_clusters").select("*").eq("cluster_id", cluster_id).execute()
            if res.data:
                row = res.data[0]
                if isinstance(row.get("summary_metadata"), str):
                    try:
                        row["summary_metadata"] = json.loads(row["summary_metadata"])
                    except Exception:
                        row["summary_metadata"] = {}
                return row
        except Exception:
            pass

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM potential_network_clusters WHERE cluster_id = ?", (cluster_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    if isinstance(d.get("summary_metadata"), str):
        try:
            d["summary_metadata"] = json.loads(d["summary_metadata"])
        except Exception:
            d["summary_metadata"] = {}
    return d


def get_potential_network_members(cluster_id: str) -> List[Dict[str, Any]]:
    """Returns all entity and complaint members associated with a potential network cluster."""
    rows = []
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            res = supabase.table("potential_network_members").select("*").eq("cluster_id", cluster_id).execute()
            if res.data:
                rows = res.data
        except Exception:
            rows = []

    if not rows:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM potential_network_members WHERE cluster_id = ?", (cluster_id,))
        rows = [dict(r) for r in c.fetchall()]
        conn.close()

    for r in rows:
        if isinstance(r.get("evidence_metadata"), str):
            try:
                r["evidence_metadata"] = json.loads(r["evidence_metadata"])
            except Exception:
                r["evidence_metadata"] = {}
    return rows


def get_potential_network_clusters_for_complaint(complaint_id: str) -> List[Dict[str, Any]]:
    """Returns all potential network clusters that include the given complaint as a member."""
    cluster_ids = []
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            res = supabase.table("potential_network_members").select("cluster_id").eq("complaint_id", complaint_id).execute()
            if res.data:
                cluster_ids = [r["cluster_id"] for r in res.data if r.get("cluster_id")]
        except Exception:
            cluster_ids = []

    if not cluster_ids:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT DISTINCT cluster_id FROM potential_network_members WHERE complaint_id = ?", (complaint_id,))
        cluster_ids = [r[0] for r in c.fetchall() if r[0]]
        conn.close()

    clusters = []
    for cid in sorted(list(set(cluster_ids))):
        cl = get_potential_network_cluster_by_id(cid)
        if cl:
            clusters.append(cl)
    return clusters


def update_potential_network_cluster(cluster_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Updates mutable summary and count fields of a potential network cluster."""
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    clean_updates = dict(updates)
    clean_updates["last_updated_at"] = now_iso

    if _use_supabase():
        try:
            from db.supabase_client import supabase
            supabase_updates = dict(clean_updates)
            # Ensure summary_metadata is properly typed for JSONB
            if "summary_metadata" in supabase_updates and isinstance(supabase_updates["summary_metadata"], str):
                try:
                    supabase_updates["summary_metadata"] = json.loads(supabase_updates["summary_metadata"])
                except Exception:
                    pass
            res = supabase.table("potential_network_clusters").update(supabase_updates).eq("cluster_id", cluster_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.debug(f"[SUPABASE UPDATE CLUSTER FALLBACK]: {e}")

    conn = get_connection()
    c = conn.cursor()
    set_clauses = []
    vals = []
    for k, v in clean_updates.items():
        if k in ("cluster_label", "cluster_type", "status", "confidence_score",
                 "supporting_entity_count", "supporting_complaint_count",
                 "total_exposure_inr", "summary_metadata", "last_updated_at"):
            set_clauses.append(f"{k} = ?")
            if k == "summary_metadata" and isinstance(v, dict):
                vals.append(json.dumps(v))
            else:
                vals.append(v)
    if set_clauses:
        vals.append(cluster_id)
        c.execute(f"UPDATE potential_network_clusters SET {', '.join(set_clauses)} WHERE cluster_id = ?", vals)
        conn.commit()
    conn.close()
    return get_potential_network_cluster_by_id(cluster_id)


def find_existing_cluster_for_entities_or_complaints(
    entity_ids: List[str], complaint_ids: List[str]
) -> Optional[str]:
    """
    Finds if an active potential network cluster already contains any of the given entities or complaints.
    Enables incremental cluster expansion without creating duplicate fragments.
    """
    clean_eids = [e for e in entity_ids if e]
    clean_cids = [c for c in complaint_ids if c]

    if _use_supabase():
        try:
            from db.supabase_client import supabase
            if clean_eids:
                res_e = supabase.table("potential_network_members").select("cluster_id").in_("entity_id", clean_eids).limit(1).execute()
                if res_e.data and res_e.data[0].get("cluster_id"):
                    return res_e.data[0]["cluster_id"]
            if clean_cids:
                res_c = supabase.table("potential_network_members").select("cluster_id").in_("complaint_id", clean_cids).limit(1).execute()
                if res_c.data and res_c.data[0].get("cluster_id"):
                    return res_c.data[0]["cluster_id"]
        except Exception:
            pass

    conn = get_connection()
    c = conn.cursor()
    for eid in clean_eids:
        c.execute("SELECT cluster_id FROM potential_network_members WHERE entity_id = ? LIMIT 1", (eid,))
        row = c.fetchone()
        if row:
            conn.close()
            return row[0]
    for cid in clean_cids:
        c.execute("SELECT cluster_id FROM potential_network_members WHERE complaint_id = ? LIMIT 1", (cid,))
        row = c.fetchone()
        if row:
            conn.close()
            return row[0]
    conn.close()
    return None


# -----------------------------------------------------------------------------
# 4. AUTONOMY EVENT OUTBOX (IDEMPOTENT EVENT PERSISTENCE)
# -----------------------------------------------------------------------------

def create_autonomy_event(
    event_type: str,
    entity_type: str,
    entity_id: str,
    complaint_id: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    idempotency_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Persists an autonomy event with deterministic idempotency.
    Guarantees no duplicate events from repeated webhooks or intake calls.
    """
    idem_key = idempotency_key or f"evt:{event_type}:{entity_type}:{entity_id}:{complaint_id or 'none'}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    payl = payload or {}

    if _use_supabase():
        try:
            from db.supabase_client import supabase
            existing = supabase.table("autonomy_events").select("*").eq("idempotency_key", idem_key).execute()
            if existing.data:
                return existing.data[0]

            new_id = str(uuid.uuid4())
            new_row = {
                "event_id": new_id,
                "event_type": event_type,
                "entity_type": entity_type,
                "entity_id": str(entity_id),
                "complaint_id": complaint_id,
                "payload": payl,
                "processing_status": "pending",
                "idempotency_key": idem_key,
                "created_at": now_iso,
            }
            res = supabase.table("autonomy_events").insert(new_row).execute()
            if res.data:
                return res.data[0]
            return new_row
        except Exception as e:
            logger.debug(f"[SUPABASE AUTONOMY EVENT FALLBACK]: {e}")

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM autonomy_events WHERE idempotency_key = ?", (idem_key,))
    row = c.fetchone()
    if row:
        conn.close()
        d = dict(row)
        if isinstance(d.get("payload"), str):
            try:
                d["payload"] = json.loads(d["payload"])
            except Exception:
                d["payload"] = {}
        return d

    new_id = str(uuid.uuid4())
    c.execute("""
        INSERT INTO autonomy_events (
            event_id, event_type, entity_type, entity_id, complaint_id,
            payload, processing_status, idempotency_key, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    """, (new_id, event_type, entity_type, str(entity_id), complaint_id, json.dumps(payl), idem_key, now_iso))
    conn.commit()
    conn.close()

    return {
        "event_id": new_id,
        "event_type": event_type,
        "entity_type": entity_type,
        "entity_id": str(entity_id),
        "complaint_id": complaint_id,
        "payload": payl,
        "processing_status": "pending",
        "idempotency_key": idem_key,
        "created_at": now_iso,
    }


def get_pending_autonomy_events(limit: int = 50) -> List[Dict[str, Any]]:
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            res = supabase.table("autonomy_events").select("*").eq("processing_status", "pending").order("created_at", desc=False).limit(limit).execute()
            if res.data:
                return res.data
        except Exception:
            pass

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM autonomy_events WHERE processing_status = 'pending' ORDER BY created_at ASC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


def update_autonomy_event_status(
    event_id: str,
    status: str,
    error_message: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            update_data = {"processing_status": status, "processed_at": now_iso}
            if error_message:
                update_data["error_message"] = error_message
            res = supabase.table("autonomy_events").update(update_data).eq("event_id", event_id).execute()
            if res.data:
                return res.data[0]
        except Exception:
            pass

    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        UPDATE autonomy_events
        SET processing_status = ?, processed_at = ?, error_message = ?
        WHERE event_id = ?
    """, (status, now_iso, error_message, event_id))
    conn.commit()
    c.execute("SELECT * FROM autonomy_events WHERE event_id = ?", (event_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None


def get_autonomy_event_by_id(event_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single autonomy event by its UUID."""
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            res = supabase.table("autonomy_events").select("*").eq("event_id", event_id).execute()
            if res.data:
                row = res.data[0]
                if isinstance(row.get("payload"), str):
                    try:
                        row["payload"] = json.loads(row["payload"])
                    except Exception:
                        row["payload"] = {}
                return row
        except Exception:
            pass

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM autonomy_events WHERE event_id = ?", (event_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    if isinstance(d.get("payload"), str):
        try:
            d["payload"] = json.loads(d["payload"])
        except Exception:
            d["payload"] = {}
    return d


def get_autonomy_event_by_idempotency_key(idempotency_key: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single autonomy event by its unique idempotency key."""
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            res = supabase.table("autonomy_events").select("*").eq("idempotency_key", idempotency_key).limit(1).execute()
            if res.data:
                row = res.data[0]
                if isinstance(row.get("payload"), str):
                    try:
                        row["payload"] = json.loads(row["payload"])
                    except Exception:
                        row["payload"] = {}
                return row
        except Exception:
            pass

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM autonomy_events WHERE idempotency_key = ?", (idempotency_key,))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    if isinstance(d.get("payload"), str):
        try:
            d["payload"] = json.loads(d["payload"])
        except Exception:
            d["payload"] = {}
    return d




def safe_emit_autonomy_event(
    event_type: str,
    entity_type: str,
    entity_id: str,
    complaint_id: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    idempotency_key: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Non-blocking wrapper around create_autonomy_event.
    Guarantees that an autonomy event failure NEVER disrupts primary business operations.
    """
    try:
        return create_autonomy_event(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=str(entity_id),
            complaint_id=complaint_id,
            payload=payload,
            idempotency_key=idempotency_key,
        )
    except Exception as e:
        logger.warning(f"[AUTONOMY EMISSION SAFE WARN] Failed to emit {event_type} for entity {entity_id}: {e}")
        return None


def claim_pending_autonomy_events(limit: int = 10) -> List[Dict[str, Any]]:
    """
    Atomically claims up to `limit` pending autonomy events by transitioning
    their status from 'pending' to 'processing'.
    Guarantees no two watcher instances or concurrent cycles can process the same event.
    """
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    claimed: List[Dict[str, Any]] = []

    if _use_supabase():
        try:
            from db.supabase_client import supabase
            # Query candidate pending events
            res = supabase.table("autonomy_events").select("*").eq("processing_status", "pending").order("created_at", desc=False).limit(limit).execute()
            candidates = res.data or []
            for cand in candidates:
                eid = cand["event_id"]
                # Atomically claim if still pending
                upd = supabase.table("autonomy_events").update({
                    "processing_status": "processing",
                    "processed_at": now_iso
                }).eq("event_id", eid).eq("processing_status", "pending").execute()
                if upd.data:
                    claimed.append(upd.data[0])
            return claimed
        except Exception as e:
            logger.debug(f"[SUPABASE CLAIM AUTONOMY EVENTS FALLBACK]: {e}")

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM autonomy_events WHERE processing_status = 'pending' ORDER BY created_at ASC LIMIT ?", (limit,))
    candidates = [dict(r) for r in c.fetchall()]
    for cand in candidates:
        eid = cand["event_id"]
        c.execute("""
            UPDATE autonomy_events
            SET processing_status = 'processing', processed_at = ?
            WHERE event_id = ? AND processing_status = 'pending'
        """, (now_iso, eid))
        if c.rowcount > 0:
            cand["processing_status"] = "processing"
            cand["processed_at"] = now_iso
            if isinstance(cand.get("payload"), str):
                try:
                    cand["payload"] = json.loads(cand["payload"])
                except Exception:
                    cand["payload"] = {}
            claimed.append(cand)
    conn.commit()
    conn.close()
    return claimed


def get_autonomy_event_counts() -> Dict[str, int]:
    """Returns counts of autonomy events by processing_status."""
    counts = {"pending": 0, "processing": 0, "processed": 0, "failed": 0, "ignored": 0, "total": 0}
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            res = supabase.table("autonomy_events").select("processing_status").execute()
            if res.data:
                for row in res.data:
                    st = row.get("processing_status", "pending")
                    counts[st] = counts.get(st, 0) + 1
                    counts["total"] += 1
                return counts
        except Exception:
            pass

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT processing_status, COUNT(*) as cnt FROM autonomy_events GROUP BY processing_status")
    for row in c.fetchall():
        st = row["processing_status"]
        cnt = row["cnt"]
        counts[st] = cnt
        counts["total"] += cnt
    conn.close()
    return counts



# -----------------------------------------------------------------------------
# 5. AUTONOMY AUDIT LOG (STRUCTURED REASONING CODES)
# -----------------------------------------------------------------------------

def create_autonomy_audit_log(
    trigger_event_type: str,
    action_type: str,
    decision_factors: Dict[str, Any],
    complaint_id: Optional[str] = None,
    trigger_event_id: Optional[str] = None,
    action_payload: Optional[Dict[str, Any]] = None,
    requires_approval: bool = False,
    approval_status: str = "not_required",
) -> Dict[str, Any]:
    """
    Records an immutable audit trace of autonomous system reasoning.
    Enforces structured machine-readable reason codes; forbids raw LLM hidden transcripts.
    """
    clean_factors = dict(decision_factors)
    if "reason_codes" not in clean_factors:
        clean_factors["reason_codes"] = [str(action_type)]

    new_id = str(uuid.uuid4())
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    payl = action_payload or {}

    if _use_supabase():
        try:
            from db.supabase_client import supabase
            new_row = {
                "log_id": new_id,
                "complaint_id": complaint_id,
                "trigger_event_id": trigger_event_id,
                "trigger_event_type": trigger_event_type,
                "action_type": action_type,
                "decision_factors": clean_factors,
                "action_payload": payl,
                "requires_approval": requires_approval,
                "approval_status": approval_status,
                "created_at": now_iso,
            }
            res = supabase.table("autonomy_audit_log").insert(new_row).execute()
            if res.data:
                return res.data[0]
            return new_row
        except Exception as e:
            logger.debug(f"[SUPABASE AUDIT LOG FALLBACK]: {e}")

    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO autonomy_audit_log (
            log_id, complaint_id, trigger_event_id, trigger_event_type,
            action_type, decision_factors, action_payload, requires_approval,
            approval_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        new_id, complaint_id, trigger_event_id, trigger_event_type,
        action_type, json.dumps(clean_factors), json.dumps(payl),
        1 if requires_approval else 0, approval_status, now_iso
    ))
    conn.commit()
    conn.close()

    return {
        "log_id": new_id,
        "complaint_id": complaint_id,
        "trigger_event_id": trigger_event_id,
        "trigger_event_type": trigger_event_type,
        "action_type": action_type,
        "decision_factors": clean_factors,
        "action_payload": payl,
        "requires_approval": requires_approval,
        "approval_status": approval_status,
        "created_at": now_iso,
    }


def get_autonomy_audit_logs(complaint_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            query = supabase.table("autonomy_audit_log").select("*").order("created_at", desc=True).limit(limit)
            if complaint_id:
                query = query.eq("complaint_id", complaint_id)
            res = query.execute()
            if res.data:
                return res.data
        except Exception:
            pass

    conn = get_connection()
    c = conn.cursor()
    if complaint_id:
        c.execute("SELECT * FROM autonomy_audit_log WHERE complaint_id = ? ORDER BY created_at DESC LIMIT ?", (complaint_id, limit))
    else:
        c.execute("SELECT * FROM autonomy_audit_log ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = []
    for r in c.fetchall():
        d = dict(r)
        if isinstance(d.get("decision_factors"), str):
            try:
                d["decision_factors"] = json.loads(d["decision_factors"])
            except Exception:
                pass
        if isinstance(d.get("action_payload"), str):
            try:
                d["action_payload"] = json.loads(d["action_payload"])
            except Exception:
                pass
        rows.append(d)
    conn.close()
    return rows


# -----------------------------------------------------------------------------
# 6. VICTIM PROACTIVE ADVISORIES
# -----------------------------------------------------------------------------

def create_victim_advisory(
    complaint_id: str,
    phone_number_masked: str,
    channel: str,
    advisory_type: str,
    advisory_text: str,
    advisory_version: str = "v1.0",
) -> Dict[str, Any]:
    """Persists a deterministic citizen scam warning or case advisory."""
    new_id = str(uuid.uuid4())
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    chan = channel.upper()

    if _use_supabase():
        try:
            from db.supabase_client import supabase
            new_row = {
                "advisory_id": new_id,
                "complaint_id": complaint_id,
                "phone_number_masked": phone_number_masked,
                "channel": chan,
                "advisory_type": advisory_type,
                "advisory_version": advisory_version,
                "advisory_text": advisory_text,
                "delivery_status": "queued",
                "created_at": now_iso,
            }
            res = supabase.table("victim_advisories").insert(new_row).execute()
            if res.data:
                return res.data[0]
            return new_row
        except Exception as e:
            logger.debug(f"[SUPABASE VICTIM ADVISORY FALLBACK]: {e}")

    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO victim_advisories (
            advisory_id, complaint_id, phone_number_masked, channel,
            advisory_type, advisory_version, advisory_text, delivery_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?)
    """, (new_id, complaint_id, phone_number_masked, chan, advisory_type, advisory_version, advisory_text, now_iso))
    conn.commit()
    conn.close()

    return {
        "advisory_id": new_id,
        "complaint_id": complaint_id,
        "phone_number_masked": phone_number_masked,
        "channel": chan,
        "advisory_type": advisory_type,
        "advisory_version": advisory_version,
        "advisory_text": advisory_text,
        "delivery_status": "queued",
        "created_at": now_iso,
    }


def get_victim_advisories(complaint_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            query = supabase.table("victim_advisories").select("*").order("created_at", desc=True).limit(limit)
            if complaint_id:
                query = query.eq("complaint_id", complaint_id)
            res = query.execute()
            if res.data:
                return res.data
        except Exception:
            pass

    conn = get_connection()
    c = conn.cursor()
    if complaint_id:
        c.execute("SELECT * FROM victim_advisories WHERE complaint_id = ? ORDER BY created_at DESC LIMIT ?", (complaint_id, limit))
    else:
        c.execute("SELECT * FROM victim_advisories ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


# -----------------------------------------------------------------------------
# 7. MODEL EVALUATIONS (PREDICTION OUTCOME COMPARISON)
# -----------------------------------------------------------------------------

def create_model_evaluation(
    prediction_id: str,
    complaint_id: str,
    incident_id: Optional[str] = None,
    predicted_lat: Optional[float] = None,
    predicted_lon: Optional[float] = None,
    predicted_h3: Optional[str] = None,
    predicted_time_start: Optional[str] = None,
    predicted_time_end: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Creates an additive outcome evaluation record against a prediction.
    DOES NOT overwrite or mutate the original prediction row.
    """
    new_id = str(uuid.uuid4())
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if _use_supabase():
        try:
            from db.supabase_client import supabase
            new_row = {
                "eval_id": new_id,
                "prediction_id": str(prediction_id),
                "complaint_id": str(complaint_id),
                "incident_id": str(incident_id) if incident_id else None,
                "predicted_lat": predicted_lat,
                "predicted_lon": predicted_lon,
                "predicted_h3": predicted_h3,
                "predicted_time_start": predicted_time_start,
                "predicted_time_end": predicted_time_end,
                "evaluation_status": "pending",
                "created_at": now_iso,
            }
            res = supabase.table("model_evaluations").insert(new_row).execute()
            if res.data:
                return res.data[0]
            return new_row
        except Exception as e:
            logger.debug(f"[SUPABASE MODEL EVALUATION FALLBACK]: {e}")

    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO model_evaluations (
            eval_id, prediction_id, complaint_id, incident_id,
            predicted_lat, predicted_lon, predicted_h3,
            predicted_time_start, predicted_time_end, evaluation_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    """, (
        new_id, str(prediction_id), str(complaint_id), str(incident_id) if incident_id else None,
        predicted_lat, predicted_lon, predicted_h3,
        predicted_time_start, predicted_time_end, now_iso
    ))
    conn.commit()
    conn.close()

    return {
        "eval_id": new_id,
        "prediction_id": str(prediction_id),
        "complaint_id": str(complaint_id),
        "incident_id": str(incident_id) if incident_id else None,
        "predicted_lat": predicted_lat,
        "predicted_lon": predicted_lon,
        "predicted_h3": predicted_h3,
        "predicted_time_start": predicted_time_start,
        "predicted_time_end": predicted_time_end,
        "evaluation_status": "pending",
        "created_at": now_iso,
    }


def update_model_evaluation_outcome(
    eval_id: str,
    actual_lat: float,
    actual_lon: float,
    actual_cashout_at: Optional[str] = None,
    actual_h3: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes spatial and temporal accuracy when actual ground-truth field data is known.
    Additive computation — original prediction remains completely preserved.
    """
    eval_row = get_model_evaluation(eval_id)
    if not eval_row:
        raise ValueError(f"Model evaluation record '{eval_id}' not found")

    pred_lat = eval_row.get("predicted_lat")
    pred_lon = eval_row.get("predicted_lon")

    dist_km = None
    geo_correct = None
    if pred_lat is not None and pred_lon is not None and actual_lat is not None and actual_lon is not None:
        # Haversine distance
        R = 6371.0
        dlat = math.radians(actual_lat - pred_lat)
        dlon = math.radians(actual_lon - pred_lon)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(pred_lat)) * math.cos(math.radians(actual_lat)) * math.sin(dlon / 2) ** 2
        dist_km = round(R * 2 * math.asin(math.sqrt(a)), 3)
        geo_correct = bool(dist_km <= 2.5)

    time_error_min = None
    time_correct = None
    if actual_cashout_at and eval_row.get("predicted_time_start"):
        try:
            t_act = datetime.datetime.fromisoformat(actual_cashout_at.replace("Z", "+00:00"))
            t_start = datetime.datetime.fromisoformat(eval_row["predicted_time_start"].replace("Z", "+00:00"))
            time_error_min = round(abs((t_act - t_start).total_seconds()) / 60, 1)
            if eval_row.get("predicted_time_end"):
                t_end = datetime.datetime.fromisoformat(eval_row["predicted_time_end"].replace("Z", "+00:00"))
                time_correct = bool(t_start <= t_act <= t_end)
        except Exception:
            pass

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    status = "evaluated"

    if _use_supabase():
        try:
            from db.supabase_client import supabase
            update_data = {
                "actual_lat": actual_lat,
                "actual_lon": actual_lon,
                "actual_h3": actual_h3,
                "actual_cashout_at": actual_cashout_at,
                "distance_error_km": dist_km,
                "time_error_minutes": time_error_min,
                "geo_correct_2_5km": geo_correct,
                "time_correct_window": time_correct,
                "evaluation_status": status,
                "evaluated_at": now_iso,
            }
            res = supabase.table("model_evaluations").update(update_data).eq("eval_id", eval_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.debug(f"[SUPABASE UPDATE EVAL FALLBACK]: {e}")

    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        UPDATE model_evaluations
        SET actual_lat = ?, actual_lon = ?, actual_h3 = ?, actual_cashout_at = ?,
            distance_error_km = ?, time_error_minutes = ?, geo_correct_2_5km = ?,
            time_correct_window = ?, evaluation_status = ?, evaluated_at = ?
        WHERE eval_id = ?
    """, (
        actual_lat, actual_lon, actual_h3, actual_cashout_at,
        dist_km, time_error_min, 1 if geo_correct else 0,
        1 if time_correct else 0, status, now_iso, eval_id
    ))
    conn.commit()
    conn.close()

    eval_row.update({
        "actual_lat": actual_lat,
        "actual_lon": actual_lon,
        "actual_h3": actual_h3,
        "actual_cashout_at": actual_cashout_at,
        "distance_error_km": dist_km,
        "time_error_minutes": time_error_min,
        "geo_correct_2_5km": geo_correct,
        "time_correct_window": time_correct,
        "evaluation_status": status,
        "evaluated_at": now_iso,
    })
    return eval_row


def get_model_evaluation(eval_id: str) -> Optional[Dict[str, Any]]:
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            res = supabase.table("model_evaluations").select("*").eq("eval_id", eval_id).execute()
            if res.data:
                return res.data[0]
        except Exception:
            pass

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM model_evaluations WHERE eval_id = ?", (eval_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None


def get_model_evaluations_for_complaint(complaint_id: str) -> List[Dict[str, Any]]:
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            res = supabase.table("model_evaluations").select("*").eq("complaint_id", complaint_id).execute()
            if res.data:
                return res.data
        except Exception:
            pass

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM model_evaluations WHERE complaint_id = ?", (complaint_id,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


def register_user(name: str, email: str, password_hash: str, role: str, badge_id: str, agency: str, status: str = "pending_approval") -> Dict[str, Any]:
    conn = get_connection()
    c = conn.cursor()
    user_id = f"usr_{int(datetime.datetime.now().timestamp())}"
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    c.execute(
        "INSERT INTO users (id, name, email, password_hash, role, badge_id, agency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (user_id, name.strip(), email.strip().lower(), password_hash.strip(), role.strip(), badge_id.strip(), agency.strip(), status, now_str)
    )
    conn.commit()
    conn.close()
    return {
        "id": user_id,
        "name": name.strip(),
        "email": email.strip().lower(),
        "role": role.strip(),
        "badgeId": badge_id.strip(),
        "agency": agency.strip(),
        "status": status,
        "created_at": now_str
    }

def get_pending_users() -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id, name, email, role, badge_id as badgeId, agency, status, created_at FROM users WHERE status = 'pending_approval' ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def update_user_status(target: str, status: str) -> bool:
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE users SET status = ? WHERE id = ? OR LOWER(email) = LOWER(?)", (status, target, target.strip()))
    affected = c.rowcount
    conn.commit()
    conn.close()
    return affected > 0


# -----------------------------------------------------------------------------
# 9. CASE ATTENTION STATE PERSISTENCE (PHASE 2B)
# -----------------------------------------------------------------------------

def upsert_case_attention_state(
    complaint_id: str,
    attention_score: float,
    attention_level: str,
    reason_codes: List[str],
    decision_factors: Dict[str, Any],
    source_event_id: Optional[str] = None,
    policy_version: str = "phase2b-v1",
    active: bool = True,
) -> Dict[str, Any]:
    """
    Persists or updates the single active operational attention state for a complaint.
    Stores structured machine-readable reason codes and normalized signal contributions.
    """
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    cid = str(complaint_id)
    att_score = round(float(attention_score), 2)
    att_lvl = str(attention_level).upper()

    if _use_supabase():
        try:
            from db.supabase_client import supabase
            existing = supabase.table("case_attention_state").select("attention_id").eq("complaint_id", cid).execute()
            if existing.data:
                att_id = existing.data[0]["attention_id"]
                row_data = {
                    "attention_score": att_score,
                    "attention_level": att_lvl,
                    "reason_codes": reason_codes,
                    "decision_factors": decision_factors,
                    "source_event_id": source_event_id,
                    "calculated_at": now_iso,
                    "policy_version": policy_version,
                    "active": active,
                    "updated_at": now_iso,
                }
                upd = supabase.table("case_attention_state").update(row_data).eq("attention_id", att_id).execute()
                if upd.data:
                    return upd.data[0]
            else:
                att_id = str(uuid.uuid4())
                row_data = {
                    "attention_id": att_id,
                    "complaint_id": cid,
                    "attention_score": att_score,
                    "attention_level": att_lvl,
                    "reason_codes": reason_codes,
                    "decision_factors": decision_factors,
                    "source_event_id": source_event_id,
                    "calculated_at": now_iso,
                    "policy_version": policy_version,
                    "active": active,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                }
                ins = supabase.table("case_attention_state").insert(row_data).execute()
                if ins.data:
                    return ins.data[0]
        except Exception as e:
            logger.debug(f"[SUPABASE CASE ATTENTION UPSERT FALLBACK]: {e}")

    conn = get_connection()
    c = conn.cursor()
    new_id = str(uuid.uuid4())
    rc_json = json.dumps(reason_codes)
    df_json = json.dumps(decision_factors)
    act_int = 1 if active else 0

    c.execute("""
        INSERT INTO case_attention_state (
            attention_id, complaint_id, attention_score, attention_level,
            reason_codes, decision_factors, source_event_id, calculated_at,
            policy_version, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(complaint_id) DO UPDATE SET
            attention_score = excluded.attention_score,
            attention_level = excluded.attention_level,
            reason_codes = excluded.reason_codes,
            decision_factors = excluded.decision_factors,
            source_event_id = excluded.source_event_id,
            calculated_at = excluded.calculated_at,
            policy_version = excluded.policy_version,
            active = excluded.active,
            updated_at = excluded.updated_at
    """, (
        new_id, cid, att_score, att_lvl,
        rc_json, df_json, source_event_id, now_iso,
        policy_version, act_int, now_iso, now_iso
    ))
    conn.commit()
    c.execute("SELECT * FROM case_attention_state WHERE complaint_id = ?", (cid,))
    row = c.fetchone()
    conn.close()

    if row:
        d = dict(row)
        if isinstance(d.get("reason_codes"), str):
            try:
                d["reason_codes"] = json.loads(d["reason_codes"])
            except Exception:
                d["reason_codes"] = []
        if isinstance(d.get("decision_factors"), str):
            try:
                d["decision_factors"] = json.loads(d["decision_factors"])
            except Exception:
                d["decision_factors"] = {}
        d["active"] = bool(d.get("active", 1))
        return d

    return {
        "attention_id": new_id,
        "complaint_id": cid,
        "attention_score": att_score,
        "attention_level": att_lvl,
        "reason_codes": reason_codes,
        "decision_factors": decision_factors,
        "source_event_id": source_event_id,
        "calculated_at": now_iso,
        "policy_version": policy_version,
        "active": active,
    }


def get_case_attention_state(complaint_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves current active operational attention state for a complaint."""
    cid = str(complaint_id)
    if _use_supabase():
        try:
            from db.supabase_client import supabase
            res = supabase.table("case_attention_state").select("*").eq("complaint_id", cid).eq("active", True).limit(1).execute()
            if res.data:
                row = res.data[0]
                if isinstance(row.get("reason_codes"), str):
                    try:
                        row["reason_codes"] = json.loads(row["reason_codes"])
                    except Exception:
                        row["reason_codes"] = []
                if isinstance(row.get("decision_factors"), str):
                    try:
                        row["decision_factors"] = json.loads(row["decision_factors"])
                    except Exception:
                        row["decision_factors"] = {}
                return row
        except Exception:
            pass

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM case_attention_state WHERE complaint_id = ? AND active = 1", (cid,))
    row = c.fetchone()
    conn.close()

    if not row:
        return None

    d = dict(row)
    if isinstance(d.get("reason_codes"), str):
        try:
            d["reason_codes"] = json.loads(d["reason_codes"])
        except Exception:
            d["reason_codes"] = []
    if isinstance(d.get("decision_factors"), str):
        try:
            d["decision_factors"] = json.loads(d["decision_factors"])
        except Exception:
            d["decision_factors"] = {}
    d["active"] = bool(d.get("active", 1))
    return d


def get_case_attention_queue(
    limit: int = 50,
    offset: int = 0,
    attention_level: Optional[str] = None,
    fraud_type: Optional[str] = None,
    victim_state: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Retrieves the prioritized active attention queue ordered by attention_score descending.
    Enriches results with complaint details for investigator triage.
    """
    raw_attention: List[Dict[str, Any]] = []

    if _use_supabase():
        try:
            from db.supabase_client import supabase
            query = supabase.table("case_attention_state").select("*").eq("active", True).order("attention_score", desc=True)
            if attention_level:
                query = query.eq("attention_level", attention_level.upper())
            res = query.execute()
            if res.data:
                raw_attention = res.data
        except Exception as e:
            logger.debug(f"[SUPABASE CASE ATTENTION QUEUE FALLBACK]: {e}")

    if not raw_attention:
        conn = get_connection()
        c = conn.cursor()
        if attention_level:
            c.execute(
                "SELECT * FROM case_attention_state WHERE active = 1 AND attention_level = ? ORDER BY attention_score DESC",
                (attention_level.upper(),)
            )
        else:
            c.execute("SELECT * FROM case_attention_state WHERE active = 1 ORDER BY attention_score DESC")
        raw_attention = [dict(r) for r in c.fetchall()]
        conn.close()

    # Parse JSON fields and enrich with complaint metadata
    enriched_cases: List[Dict[str, Any]] = []
    for att in raw_attention:
        if isinstance(att.get("reason_codes"), str):
            try:
                att["reason_codes"] = json.loads(att["reason_codes"])
            except Exception:
                att["reason_codes"] = []
        if isinstance(att.get("decision_factors"), str):
            try:
                att["decision_factors"] = json.loads(att["decision_factors"])
            except Exception:
                att["decision_factors"] = {}

        cid = att.get("complaint_id")
        comp = get_complaint_by_id(cid) if cid else None

        # Filter by complaint attributes if provided
        if fraud_type and comp and comp.get("fraud_type", "").lower() != fraud_type.lower():
            continue
        if victim_state and comp and comp.get("victim_state", "").lower() != victim_state.lower():
            continue

        item = {
            **att,
            "complaint": {
                "complaint_id": cid,
                "ncrp_id": comp.get("ncrp_id") if comp else None,
                "fraud_type": comp.get("fraud_type") if comp else None,
                "amount_inr": comp.get("amount_inr") if comp else None,
                "victim_state": comp.get("victim_state") if comp else None,
                "suspect_phone": comp.get("suspect_phone") if comp else None,
                "status": comp.get("status") if comp else "active",
                "created_at": comp.get("created_at") if comp else None,
            } if comp else None,
        }
        enriched_cases.append(item)

    total_count = len(enriched_cases)
    paginated = enriched_cases[offset: offset + limit]

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "cases": paginated,
    }


# Initialize SQLite only if in development and explicitly enabled
if os.getenv("NEXUS_ENV", "").lower() != "production" and os.getenv("USE_LOCAL_SQLITE", "").lower() == "true":
    init_db()
    seed_if_empty()

