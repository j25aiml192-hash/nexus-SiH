import os
import sys
import unittest
from fastapi.testclient import TestClient

# Ensure backend root is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from db import repo
from db.supabase_client import supabase

client = TestClient(app)

class TestComplaintIntakeFlow(unittest.TestCase):
    def setUp(self):
        self.created_cid = None
        self.created_pid = None

    def tearDown(self):
        # Clean up created rows in Supabase if any
        if self.created_pid:
            try:
                supabase.table("predictions").delete().eq("prediction_id", self.created_pid).execute()
            except Exception:
                pass
        if self.created_cid:
            try:
                # Also delete any prediction tied to this complaint
                supabase.table("predictions").delete().eq("complaint_id", self.created_cid).execute()
                supabase.table("complaints").delete().eq("complaint_id", self.created_cid).execute()
            except Exception:
                pass

    def test_01_valid_complaint_ingest_and_uuid_propagation(self):
        payload = {
            "fraud_type": "UPI_PHISHING",
            "amount": 75000.0,
            "victim_state": "Jharkhand",
            "victim_district": "Deoghar",
            "accused_phone": "7091234567",
            "accused_bank": "State Bank of India",
            "channel": "UPI"
        }
        resp = client.post(
            "/complaints/ingest",
            json=payload,
            headers={"Origin": "https://nexus-rouge-nu.vercel.app"}
        )
        self.assertEqual(resp.status_code, 200, f"Expected 200 but got {resp.status_code}: {resp.text}")
        
        # Verify CORS headers
        self.assertEqual(
            resp.headers.get("access-control-allow-origin"),
            "https://nexus-rouge-nu.vercel.app"
        )
        
        data = resp.json()
        self.assertEqual(data.get("status"), "created")
        
        # Verify complaint_id is a valid UUID
        cid = data.get("complaint_id")
        self.assertIsNotNone(cid)
        self.assertTrue(repo.is_valid_uuid(cid), f"Complaint ID {cid} is not a valid UUID!")
        self.created_cid = cid

        # Verify ncrp_id exists
        ncrp_id = data.get("ncrp_id")
        self.assertIsNotNone(ncrp_id)
        
        # Verify row actually persisted to Supabase
        c_res = supabase.table("complaints").select("*").eq("complaint_id", cid).execute()
        self.assertTrue(len(c_res.data) > 0, f"Complaint {cid} not found in Supabase!")
        persisted = c_res.data[0]
        self.assertEqual(persisted["fraud_type"], "UPI_PHISHING")
        self.assertEqual(float(persisted["amount_inr"]), 75000.0)
        self.assertEqual(persisted["victim_state"], "Jharkhand")

        # Verify prediction endpoint resolves using this real UUID
        pred_resp = client.get(
            f"/predictions/{cid}",
            headers={"Origin": "https://nexus-rouge-nu.vercel.app"}
        )
        self.assertEqual(pred_resp.status_code, 200, f"Prediction GET failed: {pred_resp.text}")
        pred_data = pred_resp.json()
        self.assertEqual(pred_data.get("complaint_id"), cid)
        if pred_data.get("prediction_id"):
            self.created_pid = pred_data.get("prediction_id")

    def test_02_invalid_amount_returns_422(self):
        payload = {
            "fraud_type": "UPI_PHISHING",
            "amount": -100.0,
            "victim_state": "Jharkhand",
            "channel": "UPI"
        }
        resp = client.post(
            "/complaints/ingest",
            json=payload,
            headers={"Origin": "https://nexus-rouge-nu.vercel.app"}
        )
        self.assertEqual(resp.status_code, 422)
        data = resp.json()
        self.assertIn("detail", data)

    def test_03_zero_amount_returns_422(self):
        payload = {
            "fraud_type": "UPI_PHISHING",
            "amount": 0,
            "victim_state": "Jharkhand",
            "channel": "UPI"
        }
        resp = client.post(
            "/complaints/ingest",
            json=payload,
            headers={"Origin": "https://nexus-rouge-nu.vercel.app"}
        )
        self.assertEqual(resp.status_code, 422)

    def test_04_enum_normalization(self):
        payload = {
            "fraud_type": "upi intercept / fraud",
            "amount": 25000.0,
            "victim_state": "Maharashtra",
            "victim_district": "Mumbai",
            "accused_phone": "9820000000",
            "accused_bank": "HDFC Bank",
            "channel": "National Cybercrime Portal (NCRP)"
        }
        resp = client.post(
            "/complaints/ingest",
            json=payload,
            headers={"Origin": "https://nexus-rouge-nu.vercel.app"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        cid = data.get("complaint_id")
        self.created_cid = cid
        
        # Verify in Supabase that fraud_type and channel were normalized to valid enums
        c_res = supabase.table("complaints").select("*").eq("complaint_id", cid).execute()
        persisted = c_res.data[0]
        self.assertEqual(persisted["fraud_type"], "UPI_PHISHING")
        self.assertEqual(persisted["channel"], "UPI")

    def test_05_cors_preflight_and_headers(self):
        # OPTIONS preflight
        resp = client.options(
            "/complaints/ingest",
            headers={
                "Origin": "https://nexus-rouge-nu.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type"
            }
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            resp.headers.get("access-control-allow-origin"),
            "https://nexus-rouge-nu.vercel.app"
        )

if __name__ == "__main__":
    unittest.main()
