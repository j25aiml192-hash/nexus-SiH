"""
NEXUS Phase 6 — Victim Proactive Advisory System Unit & Regression Tests
========================================================================
Comprehensive verification for deterministic policy engine, privacy masking,
idempotency, material change lifecycle, API endpoints, intake non-blocking safety,
and compliance with safety rules (no victim blame, no recovery guarantees, no OTP requests).
"""

import sys
import os
import unittest
import uuid
import datetime
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

_ORIG_USE_LOCAL_SQLITE = None


def setUpModule():
    global _ORIG_USE_LOCAL_SQLITE
    _ORIG_USE_LOCAL_SQLITE = os.environ.get("USE_LOCAL_SQLITE")
    os.environ["USE_LOCAL_SQLITE"] = "true"


def tearDownModule():
    global _ORIG_USE_LOCAL_SQLITE
    if _ORIG_USE_LOCAL_SQLITE is None:
        os.environ.pop("USE_LOCAL_SQLITE", None)
    else:
        os.environ["USE_LOCAL_SQLITE"] = _ORIG_USE_LOCAL_SQLITE


from db import repo
from core.autonomy.victim_advisory_policy import (
    VICTIM_ADVISORY_POLICY_VERSION,
    URGENCY_IMMEDIATE,
    URGENCY_HIGH,
    URGENCY_STANDARD,
    REASON_FRAUD_TYPE_MATCH,
    REASON_CHANNEL_MATCH,
    REASON_CREDENTIAL_PROTECTION,
    REASON_EVIDENCE_PRESERVATION,
    REASON_ADDITIONAL_PAYMENT_RISK,
    REASON_ACCOUNT_CONTEXT_PRESENT,
    mask_sensitive_identifier,
    validate_advisory_content,
    compute_advisory_fingerprint,
    generate_victim_advisory,
    victim_advisory_engine,
)
from core.autonomy.event_router import EventRouter
from fastapi.testclient import TestClient
from main import app


class TestVictimAdvisoryPolicy(unittest.TestCase):
    """Unit tests for pure deterministic advisory policy generation."""

    def test_01_deterministic_policy_output(self):
        """Given identical case inputs, the policy must produce identical outputs."""
        complaint = {
            "complaint_id": "test-cid-001",
            "fraud_type": "UPI_PHISHING",
            "channel": "UPI",
            "amount_inr": 25000.0,
            "accused_bank": "State Bank of India",
            "accused_phone": "+919876543210",
        }
        adv1 = generate_victim_advisory(complaint)
        adv2 = generate_victim_advisory(complaint)

        self.assertEqual(adv1["urgency"], adv2["urgency"])
        self.assertEqual(adv1["title"], adv2["title"])
        self.assertEqual(adv1["fingerprint"], adv2["fingerprint"])
        self.assertEqual(adv1["reason_codes"], adv2["reason_codes"])
        self.assertEqual(len(adv1["sections"]), len(adv2["sections"]))

        for s1, s2 in zip(adv1["sections"], adv2["sections"]):
            self.assertEqual(s1["type"], s2["type"])
            self.assertEqual(s1["items"], s2["items"])

    def test_02_upi_related_advisory(self):
        """UPI fraud complaints receive tailored UPI protection and PIN reset advice."""
        complaint = {
            "complaint_id": "test-upi-002",
            "fraud_type": "UPI_PHISHING",
            "channel": "UPI",
            "amount_inr": 15000.0,
        }
        adv = generate_victim_advisory(complaint)
        all_items = [item for sec in adv["sections"] for item in sec["items"]]
        combined = " ".join(all_items)

        self.assertIn("UPI PIN", combined)
        self.assertIn("UTR", combined)
        self.assertIn(REASON_FRAUD_TYPE_MATCH, adv["reason_codes"])
        self.assertIn(REASON_CHANNEL_MATCH, adv["reason_codes"])

    def test_03_relevant_account_payment_protection(self):
        """Account and payment instruments are protected based on context."""
        complaint = {
            "complaint_id": "test-acc-003",
            "fraud_type": "AEPS_FRAUD",
            "channel": "AEPS",
            "amount_inr": 30000.0,
        }
        adv = generate_victim_advisory(complaint)
        all_items = [item for sec in adv["sections"] for item in sec["items"]]
        combined = " ".join(all_items)

        self.assertIn("biometric", combined.lower())
        self.assertIn("Aadhaar", combined)

    def test_04_evidence_preservation_guidance(self):
        """Preservation guidance is concrete (UTR, screenshots, chat history)."""
        complaint = {
            "complaint_id": "test-ev-004",
            "fraud_type": "INVESTMENT_SCAM",
            "channel": "IMPS",
            "amount_inr": 80000.0,
        }
        adv = generate_victim_advisory(complaint)
        pres_sec = next((s for s in adv["sections"] if s["type"] == "PRESERVE_EVIDENCE"), None)
        self.assertIsNotNone(pres_sec)
        items = " ".join(pres_sec["items"])
        self.assertIn("screenshots", items.lower())
        self.assertIn("chat history", items.lower())

    def test_05_additional_payment_warning(self):
        """Scams that elicit subsequent fees (investment/digital arrest) warn against further loss."""
        for ft in ("INVESTMENT_SCAM", "DIGITAL_ARREST", "SEXTORTION"):
            complaint = {"complaint_id": f"test-{ft}", "fraud_type": ft, "amount_inr": 50000.0}
            adv = generate_victim_advisory(complaint)
            self.assertIn(REASON_ADDITIONAL_PAYMENT_RISK, adv["reason_codes"])
            avoid_sec = next((s for s in adv["sections"] if s["type"] == "AVOID_FURTHER_LOSS"), None)
            self.assertIsNotNone(avoid_sec)

    def test_06_credential_protection_guidance(self):
        """Every advisory strictly enforces credential and OTP protection."""
        complaint = {"complaint_id": "test-cred-006", "fraud_type": "OTHER", "amount_inr": 5000.0}
        adv = generate_victim_advisory(complaint)
        self.assertIn(REASON_CREDENTIAL_PROTECTION, adv["reason_codes"])
        all_items = " ".join([item for sec in adv["sections"] for item in sec["items"]])
        self.assertIn("Never disclose", all_items)

    def test_07_unrelated_fraud_type_separation(self):
        """Digital arrest advisory does NOT receive unrelated UPI PIN advice."""
        complaint = {
            "complaint_id": "test-da-007",
            "fraud_type": "DIGITAL_ARREST",
            "channel": "OTHER",
            "amount_inr": 100000.0,
        }
        adv = generate_victim_advisory(complaint)
        all_items = " ".join([item for sec in adv["sections"] for item in sec["items"]])
        self.assertNotIn("UPI PIN directly from your authorized banking", all_items)
        self.assertIn("video", all_items.lower())

    def test_08_channel_specific_logic(self):
        """Channel-specific guidance for IMPS/NEFT recommends interbank recall."""
        complaint = {
            "complaint_id": "test-ch-008",
            "fraud_type": "OTHER",
            "channel": "IMPS",
            "amount_inr": 40000.0,
        }
        adv = generate_victim_advisory(complaint)
        all_items = " ".join([item for sec in adv["sections"] for item in sec["items"]])
        self.assertIn("interbank recall", all_items.lower())

    def test_09_no_unsupported_rules_fire(self):
        """Missing context does not trigger unbacked reason codes."""
        complaint = {
            "complaint_id": "test-clean-009",
            "fraud_type": "OTHER",
            "channel": "OTHER",
            "amount_inr": 2000.0,
        }
        adv = generate_victim_advisory(complaint, transactions=[])
        self.assertNotIn(REASON_ACCOUNT_CONTEXT_PRESENT, adv["reason_codes"])

    def test_10_privacy_and_identifier_masking(self):
        """Sensitive numbers (phones, accounts) are masked and never returned raw."""
        raw_phone = "+919876543210"
        masked = mask_sensitive_identifier(raw_phone, "phone")
        self.assertNotIn("9876543210", masked)
        self.assertTrue(masked.startswith("+91") or masked.startswith("+"))
        self.assertTrue(masked.endswith("3210"))

        raw_account = "123456789012"
        masked_acc = mask_sensitive_identifier(raw_account, "account")
        self.assertEqual(masked_acc, "****9012")

    def test_11_advisory_versioning(self):
        """Advisory payload explicitly contains the correct policy version."""
        complaint = {"complaint_id": "test-ver-011", "fraud_type": "UPI_PHISHING"}
        adv = generate_victim_advisory(complaint)
        self.assertEqual(adv["policy_version"], VICTIM_ADVISORY_POLICY_VERSION)
        self.assertEqual(adv["policy_version"], "phase6-v1")

    def test_12_idempotency_same_fingerprint(self):
        """Evaluating the same complaint twice without changes produces 'unchanged' status."""
        cid = str(uuid.uuid4())
        repo.create_complaint({
            "complaint_id": cid,
            "fraud_type": "UPI_PHISHING",
            "channel": "UPI",
            "amount_inr": 20000.0,
        })

        res1 = victim_advisory_engine.evaluate_and_persist(cid)
        self.assertEqual(res1["status"], "created")

        res2 = victim_advisory_engine.evaluate_and_persist(cid)
        self.assertEqual(res2["status"], "unchanged")
        self.assertEqual(res1["advisory_id"], res2["advisory_id"])

    def test_13_repeated_same_event_creates_no_duplicates(self):
        """EventRouter receiving the same event repeatedly does not spam advisories."""
        cid = str(uuid.uuid4())
        repo.create_complaint({
            "complaint_id": cid,
            "fraud_type": "UPI_PHISHING",
            "channel": "UPI",
            "amount_inr": 30000.0,
        })

        router = EventRouter()
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "complaint_ingested",
            "complaint_id": cid,
            "payload": {"complaint_id": cid, "fraud_type": "UPI_PHISHING", "channel": "UPI", "amount_inr": 30000.0},
        }

        r1 = router.route_event(event)
        self.assertEqual(r1["victim_advisory_evaluation"]["status"], "created")

        r2 = router.route_event(event)
        self.assertEqual(r2["victim_advisory_evaluation"]["status"], "unchanged")

        # Verify only 1 active record in DB
        history = repo.get_victim_advisory_history(cid)
        self.assertEqual(len(history), 1)

    def test_14_material_change_supersedes_and_updates_advisory(self):
        """When case context materially changes (e.g. forced refresh or channel update), new version is created."""
        cid = str(uuid.uuid4())
        repo.create_complaint({
            "complaint_id": cid,
            "fraud_type": "UPI_PHISHING",
            "channel": "UPI",
            "amount_inr": 10000.0,
        })

        res1 = victim_advisory_engine.evaluate_and_persist(cid)
        adv_id1 = res1["advisory_id"]

        # Force refresh simulating updated evidence/channel
        res2 = victim_advisory_engine.evaluate_and_persist(cid, force_refresh=True)
        adv_id2 = res2["advisory_id"]

        self.assertNotEqual(adv_id1, adv_id2)
        self.assertEqual(res2["status"], "created")

        # Verify previous advisory is superseded
        history = repo.get_victim_advisory_history(cid)
        self.assertEqual(len(history), 2)
        old_adv = next(a for a in history if a["advisory_id"] == adv_id1)
        self.assertEqual(old_adv["status"], "SUPERSEDED")

    def test_15_sqlite_fallback_and_json_payload_retrieval(self):
        """Repository retrieves structured JSON payloads correctly from SQLite fallback."""
        cid = str(uuid.uuid4())
        repo.create_complaint({
            "complaint_id": cid,
            "fraud_type": "FAKE_LOAN",
            "channel": "OTHER",
            "amount_inr": 25000.0,
        })

        eval_res = victim_advisory_engine.evaluate_and_persist(cid)
        self.assertEqual(eval_res["status"], "created")

        current = repo.get_current_victim_advisory(cid)
        self.assertIsNotNone(current)
        self.assertEqual(current["urgency"], URGENCY_HIGH)
        self.assertTrue(isinstance(current["sections"], list))
        self.assertGreater(len(current["sections"]), 2)

    def test_16_missing_optional_fields_handled_safely(self):
        """Complaints with completely empty or null optional fields generate valid advisory."""
        empty_case = {"complaint_id": str(uuid.uuid4())}
        adv = generate_victim_advisory(empty_case)
        self.assertEqual(adv["urgency"], URGENCY_STANDARD)
        self.assertIn("NEXUS", adv["title"])
        self.assertTrue(bool(adv["fingerprint"]))

    def test_17_advisory_failure_does_not_break_complaint_intake(self):
        """If advisory generation encounters an unexpected error, complaint intake still succeeds."""
        client = TestClient(app)
        with patch("core.autonomy.victim_advisory_policy.victim_advisory_engine.evaluate_and_persist", side_effect=RuntimeError("Simulated advisory fault")):
            resp = client.post(
                "/complaints/ingest",
                json={
                    "fraud_type": "UPI_PHISHING",
                    "amount_inr": 12500.0,
                    "channel": "UPI",
                    "victim_state": "Jharkhand",
                },
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data.get("status"), "created")
            self.assertTrue(bool(data.get("complaint_id")))

    def test_18_advisory_failure_does_not_break_voice_intake(self):
        """If advisory generation encounters an unexpected error, voice intake still succeeds."""
        client = TestClient(app)
        with patch("core.autonomy.victim_advisory_policy.victim_advisory_engine.evaluate_and_persist", side_effect=RuntimeError("Simulated voice advisory fault")):
            resp = client.post(
                "/voice/submit",
                json={
                    "fraud_type": "UPI_PHISHING",
                    "amount_inr": 18000.0,
                    "channel": "UPI",
                    "victim_state": "Bihar",
                },
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertTrue(data.get("success"))
            self.assertTrue(bool(data.get("complaint_id")))

    def test_19_no_recovery_guarantee_language(self):
        """Advisory generator contains zero recovery guarantee claims."""
        for ft in ("UPI_PHISHING", "INVESTMENT_SCAM", "DIGITAL_ARREST", "AEPS_FRAUD", "FAKE_LOAN"):
            adv = generate_victim_advisory({"complaint_id": "test", "fraud_type": ft, "amount_inr": 50000.0})
            valid, violations = validate_advisory_content(adv)
            self.assertTrue(valid, f"Violations found for {ft}: {violations}")
            all_text = " ".join([i for s in adv["sections"] for i in s["items"]]).lower()
            self.assertNotIn("guarantee", all_text)
            self.assertNotIn("will recover", all_text)

    def test_20_no_credential_requests(self):
        """Validator rejects any text attempting to request or collect victim secrets."""
        bad_adv = {
            "title": "Enter your UPI PIN to process refund",
            "sections": [{"items": ["Please submit your OTP for verification"]}],
        }
        valid, violations = validate_advisory_content(bad_adv)
        self.assertFalse(valid)
        self.assertIn("PROHIBITED_CREDENTIAL_REQUEST", violations)

    def test_21_no_victim_blaming_language(self):
        """Validator rejects victim blaming language."""
        blaming_adv = {
            "title": "Case notice",
            "sections": [{"items": ["You should have known better than to click links"]}],
        }
        valid, violations = validate_advisory_content(blaming_adv)
        self.assertFalse(valid)
        self.assertIn("PROHIBITED_VICTIM_BLAME", violations)

    def test_22_api_get_current_advisory(self):
        """GET /autonomy/advisories/case/{complaint_id} returns structured advisory."""
        cid = str(uuid.uuid4())
        repo.create_complaint({
            "complaint_id": cid,
            "fraud_type": "UPI_PHISHING",
            "channel": "UPI",
            "amount_inr": 22000.0,
        })

        client = TestClient(app)
        resp = client.get(f"/autonomy/advisories/case/{cid}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["complaint_id"], cid)
        self.assertEqual(data["urgency"], URGENCY_IMMEDIATE)
        self.assertTrue(isinstance(data["sections"], list))
        self.assertIn("phase6-v1", data["policy_version"])

    def test_23_api_get_advisory_history(self):
        """GET /autonomy/advisories/case/{complaint_id}/history returns versioned list."""
        cid = str(uuid.uuid4())
        repo.create_complaint({
            "complaint_id": cid,
            "fraud_type": "DIGITAL_ARREST",
            "channel": "OTHER",
            "amount_inr": 75000.0,
        })

        victim_advisory_engine.evaluate_and_persist(cid)
        victim_advisory_engine.evaluate_and_persist(cid, force_refresh=True)

        client = TestClient(app)
        resp = client.get(f"/autonomy/advisories/case/{cid}/history")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["complaint_id"], cid)
        self.assertEqual(data["count"], 2)
        self.assertEqual(len(data["advisories"]), 2)

    def test_24_api_manual_refresh(self):
        """POST /autonomy/advisories/case/{complaint_id}/refresh regenerates advisory deterministically."""
        cid = str(uuid.uuid4())
        repo.create_complaint({
            "complaint_id": cid,
            "fraud_type": "TASK_FRAUD",
            "channel": "UPI",
            "amount_inr": 35000.0,
        })

        client = TestClient(app)
        init_resp = client.get(f"/autonomy/advisories/case/{cid}")
        init_id = init_resp.json()["advisory_id"]

        ref_resp = client.post(f"/autonomy/advisories/case/{cid}/refresh")
        self.assertEqual(ref_resp.status_code, 200)
        new_id = ref_resp.json()["advisory_id"]
        self.assertNotEqual(init_id, new_id)

    def test_25_nonexistent_complaint_returns_404(self):
        """Advisory endpoints return 404 for unknown complaints."""
        client = TestClient(app)
        resp = client.get(f"/autonomy/advisories/case/{uuid.uuid4()}")
        self.assertEqual(resp.status_code, 404)


if __name__ == "__main__":
    unittest.main()
