import os
import sys
import unittest
import logging
from unittest.mock import patch
from fastapi.testclient import TestClient

# Ensure backend root is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from db import repo
from db.supabase_client import supabase
from api.routes.voice import mask_phone_or_account, sanitize_text, sanitize_headers

client = TestClient(app)


class TestVoiceSubmitFlow(unittest.TestCase):
    def setUp(self):
        self.created_cids = []

    def tearDown(self):
        # Clean up any created test complaints/predictions in Supabase
        for cid in self.created_cids:
            try:
                supabase.table("predictions").delete().eq("complaint_id", cid).execute()
            except Exception:
                pass
            try:
                supabase.table("complaints").delete().eq("complaint_id", cid).execute()
            except Exception:
                pass

    # 1. Health check
    def test_voice_health(self):
        resp = client.get("/voice/health")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"status": "ok"})

    # TEST 1 — JSON
    def test_1_json_submission_success(self):
        payload = {
            "fraud_type": "UPI_PHISHING",
            "amount_inr": 45000.0,
            "channel": "UPI",
            "victim_state": "Jharkhand",
            "victim_district": "Deoghar",
            "accused_phone": "7091234567",
            "accused_bank": "State Bank of India",
        }
        resp = client.post("/voice/submit", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"), f"Expected success: true, got: {data}")
        cid = data.get("complaint_id")
        self.assertTrue(repo.is_valid_uuid(cid), f"Complaint ID {cid} is not a valid UUID")
        self.created_cids.append(cid)

        # Expected reference format: NCRP-<first 6 chars of uuid uppercased>
        expected_ref = f"NCRP-{cid[:6].upper()}"
        self.assertEqual(data.get("complaint_reference"), expected_ref)
        self.assertEqual(set(data.keys()), {"success", "complaint_id", "complaint_reference"})

        # Verify complaint persisted in Supabase
        c_res = supabase.table("complaints").select("*").eq("complaint_id", cid).execute()
        self.assertTrue(len(c_res.data) > 0, f"Complaint {cid} was not saved in Supabase")
        persisted = c_res.data[0]
        self.assertEqual(persisted["fraud_type"], "UPI_PHISHING")
        self.assertEqual(float(persisted["amount_inr"]), 45000.0)
        self.assertEqual(persisted["victim_state"], "Jharkhand")

    # TEST 2 — Form encoded (application/x-www-form-urlencoded)
    def test_2_form_encoded_submission(self):
        form_data = {
            "fraud_type": "UPI_PHISHING",
            "amount_inr": "47,000",
            "channel": "UPI",
            "victim_state": "Jharkhand",
            "victim_district": "Ranchi",
            "accused_phone": "9876543210",
        }
        resp = client.post(
            "/voice/submit",
            data=form_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"), f"Expected success: true, got: {data}")
        cid = data.get("complaint_id")
        self.assertTrue(repo.is_valid_uuid(cid))
        self.created_cids.append(cid)

        c_res = supabase.table("complaints").select("*").eq("complaint_id", cid).execute()
        self.assertTrue(len(c_res.data) > 0)
        self.assertEqual(float(c_res.data[0]["amount_inr"]), 47000.0)
        self.assertEqual(c_res.data[0]["victim_state"], "Jharkhand")

    # TEST 3 — Multipart form (multipart/form-data)
    def test_3_multipart_form_submission(self):
        multipart_data = {
            "fraud_type": (None, "INVESTMENT_SCAM"),
            "amount_inr": (None, "60,000"),
            "channel": (None, "NEFT"),
            "victim_state": (None, "Karnataka"),
            "victim_district": (None, "Bengaluru"),
        }
        resp = client.post("/voice/submit", files=multipart_data)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"), f"Expected success: true, got: {data}")
        cid = data.get("complaint_id")
        self.assertTrue(repo.is_valid_uuid(cid))
        self.created_cids.append(cid)

        c_res = supabase.table("complaints").select("*").eq("complaint_id", cid).execute()
        self.assertTrue(len(c_res.data) > 0)
        self.assertEqual(float(c_res.data[0]["amount_inr"]), 60000.0)
        self.assertEqual(c_res.data[0]["channel"], "NEFT")

    # TEST 4 — Query parameters with empty body
    def test_4_query_parameters_submission(self):
        query_url = "/voice/submit?fraud_type=UPI_PHISHING&amount_inr=47000&channel=UPI&victim_state=Jharkhand"
        resp = client.post(query_url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"), f"Expected success: true, got: {data}")
        cid = data.get("complaint_id")
        self.assertTrue(repo.is_valid_uuid(cid))
        self.created_cids.append(cid)

        c_res = supabase.table("complaints").select("*").eq("complaint_id", cid).execute()
        self.assertTrue(len(c_res.data) > 0)
        self.assertEqual(float(c_res.data[0]["amount_inr"]), 47000.0)

    # TEST 5 — Empty body but query params present
    def test_5_empty_body_with_query_params(self):
        query_url = "/voice/submit?fraud_type=TASK_FRAUD&amount_inr=25000&channel=IMPS&victim_state=Maharashtra"
        resp = client.post(
            query_url,
            content="",
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"), f"Expected success: true, got: {data}")
        cid = data.get("complaint_id")
        self.assertTrue(repo.is_valid_uuid(cid))
        self.created_cids.append(cid)

    # TEST 6 — Malformed JSON but valid form data
    def test_6_malformed_json_but_valid_form_data(self):
        # Sending urlencoded body with text/plain or malformed content
        raw_body = "fraud_type=UPI_PHISHING&amount_inr=35000&channel=UPI&victim_state=Bihar"
        resp = client.post(
            "/voice/submit",
            content=raw_body,
            headers={"Content-Type": "text/plain"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"), f"Expected success: true, got: {data}")
        cid = data.get("complaint_id")
        self.assertTrue(repo.is_valid_uuid(cid))
        self.created_cids.append(cid)

    # TEST 7 — Nothing usable returns HTTP 200 with {"success": false, "error": "Could not parse request"}
    def test_7_nothing_usable(self):
        # 7A: Empty body + no form + no query params
        resp1 = client.post("/voice/submit", content="", headers={"Content-Type": "application/json"})
        self.assertEqual(resp1.status_code, 200)
        self.assertEqual(resp1.json(), {"success": False, "error": "Could not parse request"})

        # 7B: Totally malformed text body without usable fields
        resp2 = client.post("/voice/submit", content="gibberish text without fields", headers={"Content-Type": "text/plain"})
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.json(), {"success": False, "error": "Could not parse request"})

        # 7C: JSON array or empty JSON dict without usable fields
        resp3 = client.post("/voice/submit", json={})
        self.assertEqual(resp3.status_code, 200)
        self.assertEqual(resp3.json(), {"success": False, "error": "Could not parse request"})

    # TEST 8 — Sensitive logging & debug endpoint
    def test_8_sensitive_logging_and_debug_endpoint(self):
        # 8A: Test masking utility directly
        phone = "9876543210"
        masked_phone = mask_phone_or_account(phone)
        self.assertEqual(masked_phone, "******3210")
        self.assertNotIn("987654", masked_phone)

        # 8B: Test header sanitization
        headers = {
            "Authorization": "Bearer secret_jwt_token_12345",
            "x-api-key": "secret_key_abcdef",
            "cookie": "session=xyz123",
            "Content-Type": "application/json",
        }
        sanitized_hdrs = sanitize_headers(headers)
        self.assertEqual(sanitized_hdrs["Authorization"], "******")
        self.assertEqual(sanitized_hdrs["x-api-key"], "******")
        self.assertEqual(sanitized_hdrs["cookie"], "******")
        self.assertEqual(sanitized_hdrs["Content-Type"], "application/json")

        # 8C: Test GET /voice/debug endpoint
        debug_resp = client.get(
            "/voice/debug?accused_phone=9876543210&fraud_type=UPI_PHISHING",
            headers={"Authorization": "Bearer supersecret", "x-api-key": "myapikey123"},
        )
        self.assertEqual(debug_resp.status_code, 200)
        debug_data = debug_resp.json()
        self.assertEqual(debug_data["method"], "GET")
        self.assertEqual(debug_data["headers"].get("authorization"), "******")
        self.assertEqual(debug_data["headers"].get("x-api-key"), "******")
        self.assertEqual(debug_data["query_params"].get("accused_phone"), "******3210")
        self.assertNotIn("9876543210", str(debug_data))

        # 8D: Test logger masking during POST /voice/submit
        with self.assertLogs("nexus.api.voice", level="INFO") as log_capture:
            payload = {
                "fraud_type": "UPI_PHISHING",
                "amount_inr": 15000,
                "channel": "UPI",
                "victim_state": "Delhi",
                "accused_phone": "9876543210",
            }
            resp = client.post("/voice/submit", json=payload)
            self.assertEqual(resp.status_code, 200)
            self.created_cids.append(resp.json().get("complaint_id"))

            joined_logs = "\n".join(log_capture.output)
            # Verify phone is masked
            self.assertIn("******3210", joined_logs)
            self.assertNotIn("9876543210", joined_logs)

    # 9. Amount parsing tests ("47,000" and "1,50,000")
    def test_amount_parsing_with_commas(self):
        payload_1 = {
            "fraud_type": "UPI_PHISHING",
            "amount_inr": "47,000",
            "channel": "UPI",
            "victim_state": "Delhi",
        }
        resp_1 = client.post("/voice/submit", json=payload_1)
        self.assertEqual(resp_1.status_code, 200)
        data_1 = resp_1.json()
        self.assertTrue(data_1.get("success"))
        cid_1 = data_1.get("complaint_id")
        self.created_cids.append(cid_1)

        c_res_1 = supabase.table("complaints").select("*").eq("complaint_id", cid_1).execute()
        self.assertEqual(float(c_res_1.data[0]["amount_inr"]), 47000.0)

        payload_2 = {
            "fraud_type": "DIGITAL_ARREST",
            "amount_inr": "1,50,000",
            "channel": "NEFT",
            "victim_state": "Haryana",
        }
        resp_2 = client.post("/voice/submit", json=payload_2)
        self.assertEqual(resp_2.status_code, 200)
        data_2 = resp_2.json()
        self.assertTrue(data_2.get("success"))
        cid_2 = data_2.get("complaint_id")
        self.created_cids.append(cid_2)

        c_res_2 = supabase.table("complaints").select("*").eq("complaint_id", cid_2).execute()
        self.assertEqual(float(c_res_2.data[0]["amount_inr"]), 150000.0)

    # 10. Missing required fields returns validation failure
    def test_missing_required_fields(self):
        base_payload = {
            "fraud_type": "UPI_PHISHING",
            "amount_inr": 25000,
            "channel": "UPI",
            "victim_state": "Jharkhand",
        }

        for required_field in ["fraud_type", "amount_inr", "channel", "victim_state"]:
            payload = dict(base_payload)
            del payload[required_field]

            resp = client.post("/voice/submit", json=payload)
            self.assertEqual(resp.status_code, 200, f"Failed for missing {required_field}")
            self.assertEqual(resp.json(), {"success": False, "error": "Complaint save nahi ho payi"})

            if required_field != "amount_inr":
                payload_empty = dict(base_payload)
                payload_empty[required_field] = "   "
                resp_empty = client.post("/voice/submit", json=payload_empty)
                self.assertEqual(resp_empty.status_code, 200)
                self.assertEqual(resp_empty.json(), {"success": False, "error": "Complaint save nahi ho payi"})

    # 11. Invalid amounts (abc, "", 0, -100)
    def test_invalid_amounts(self):
        invalid_amounts = ["abc", "", 0, -100, "-50,000", None, 0.0]
        for inv_amt in invalid_amounts:
            payload = {
                "fraud_type": "UPI_PHISHING",
                "amount_inr": inv_amt,
                "channel": "UPI",
                "victim_state": "Jharkhand",
            }
            resp = client.post("/voice/submit", json=payload)
            self.assertEqual(resp.status_code, 200, f"Expected 200 for invalid amount {inv_amt}")
            self.assertEqual(
                resp.json(),
                {"success": False, "error": "Complaint save nahi ho payi"},
                f"Failed for amount: {inv_amt}",
            )

    # 12. Optional defaults
    def test_optional_defaults_succeed(self):
        minimal_payload = {
            "fraud_type": "TASK_FRAUD",
            "amount_inr": 30000,
            "channel": "IMPS",
            "victim_state": "Karnataka",
        }
        resp = client.post("/voice/submit", json=minimal_payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"))
        cid = data.get("complaint_id")
        self.created_cids.append(cid)

        c_res = supabase.table("complaints").select("*").eq("complaint_id", cid).execute()
        persisted = c_res.data[0]
        self.assertEqual(persisted["status"], "active")

    # 13. Empty optional strings
    def test_empty_optional_strings_accepted(self):
        payload = {
            "fraud_type": "SEXTORTION",
            "amount_inr": 12000,
            "channel": "UPI",
            "victim_state": "Maharashtra",
            "victim_district": "",
            "accused_phone": "",
            "accused_bank": "",
            "ncrp_id": "",
            "status": "",
            "mule_chain_depth": "",
        }
        resp = client.post("/voice/submit", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"), f"Empty optional strings failed: {data}")
        self.created_cids.append(data.get("complaint_id"))

    # 14. Database failure handling
    @patch("db.repo.create_complaint")
    def test_database_failure_returns_graceful_200(self, mock_create):
        mock_create.side_effect = RuntimeError("Database connection timeout")
        payload = {
            "fraud_type": "AEPS_FRAUD",
            "amount_inr": 20000,
            "channel": "AEPS",
            "victim_state": "Delhi",
        }
        resp = client.post("/voice/submit", json=payload)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"success": False, "error": "Complaint save nahi ho payi"})

    # 15. Background prediction scheduled with actual UUID
    @patch("api.routes.voice.run_pipeline")
    def test_background_prediction_scheduled_with_real_uuid(self, mock_pipeline):
        payload = {
            "fraud_type": "UPI_PHISHING",
            "amount_inr": 99000,
            "channel": "UPI",
            "victim_state": "Jharkhand",
            "victim_district": "Deoghar",
        }
        resp = client.post("/voice/submit", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        cid = data.get("complaint_id")
        self.created_cids.append(cid)

        # TestClient executes background tasks after response
        mock_pipeline.assert_called_once_with(cid)


if __name__ == "__main__":
    unittest.main()
