import os
import random
import hashlib
import datetime
from faker import Faker
from dotenv import load_dotenv
from db.supabase_client import supabase
from core.pipeline import run_pipeline
load_dotenv()

fake = Faker("en_IN")

FRAUD_PATTERNS = [
    {
        "fraud_type": "upi_fraud",
        "amount_range": (5000, 500000),
        "prefixes": ["76", "70", "91"],
        "banks": ["Paytm Payments Bank", "UCO Bank", "SBI"],
        "states": ["Karnataka", "Maharashtra", "Delhi", "Tamil Nadu"],
        "weight": 0.30
    },
    {
        "fraud_type": "digital_arrest",
        "amount_range": (200000, 5000000),
        "prefixes": ["70", "76", "63"],
        "banks": ["Airtel Payments Bank", "Paytm Payments Bank"],
        "states": ["Delhi", "Maharashtra", "Gujarat", "Uttar Pradesh"],
        "weight": 0.25
    },
    {
        "fraud_type": "investment_scam",
        "amount_range": (100000, 3000000),
        "prefixes": ["91", "78", "98"],
        "banks": ["HDFC Bank", "Axis Bank", "Kotak Bank"],
        "states": ["Maharashtra", "Gujarat", "Rajasthan"],
        "weight": 0.20
    },
    {
        "fraud_type": "vishing",
        "amount_range": (2000, 150000),
        "prefixes": ["77", "63", "88"],
        "banks": ["SBI", "Bank of Baroda", "UCO Bank"],
        "states": ["Uttar Pradesh", "Bihar", "Madhya Pradesh"],
        "weight": 0.15
    },
    {
        "fraud_type": "job_fraud",
        "amount_range": (5000, 80000),
        "prefixes": ["88", "99", "78"],
        "banks": ["SBI", "Bank of Baroda"],
        "states": ["Bihar", "Jharkhand", "Odisha", "West Bengal"],
        "weight": 0.10
    }
]

def generate_complaint() -> dict:
    weights = [p["weight"] for p in FRAUD_PATTERNS]
    pattern = random.choices(FRAUD_PATTERNS, weights=weights, k=1)[0]
    year = datetime.datetime.now().year
    complaint_id = f"NCRP-{year}-{random.randint(100000, 999999)}"
    prefix = random.choice(pattern["prefixes"])
    phone = prefix + str(random.randint(10000000, 99999999))
    account_hash = hashlib.sha256(complaint_id.encode()).hexdigest()[:16]
    return {
        "complaint_id": complaint_id,
        "fraud_type": pattern["fraud_type"],
        "amount": random.randint(*pattern["amount_range"]),
        "filed_at": datetime.datetime.now().isoformat(),
        "victim_state": random.choice(pattern["states"]),
        "victim_district": fake.city(),
        "accused_phone_prefix": phone,
        "accused_bank": random.choice(pattern["banks"]),
        "accused_account_hash": account_hash,
        "mule_chain_depth": 2,
        "status": "pending"
    }

def run_autosim() -> None:
    try:
        complaint = generate_complaint()
        supabase.table("complaints").insert(complaint).execute()
        run_pipeline(complaint["complaint_id"])
        print(f"AutoSim: processed {complaint['complaint_id']} "
              f"[{complaint['fraud_type']}] Rs {complaint['amount']}")
    except Exception as e:
        print(f"AutoSim error: {e}")
