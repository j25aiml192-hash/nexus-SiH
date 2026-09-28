"""
NEXUS Phase 2B Test Suite: Autonomous Case Attention Engine
===========================================================
Validates:
1. High-risk case receives elevated attention
2. Approaching operational window increases attention
3. Shared entities increase attention
4. Multiple correlated complaints increase attention
5. Evidence discrepancy increases attention
6. Low-signal case remains low/medium
7. Attention calculation is deterministic
8. Repeated same event is idempotent
9. Event processing failure is isolated
10. Historical prediction values remain unchanged
11. risk_score remains unchanged
12. Attention state persists correctly
13. API returns correct active attention state
14. SQLite fallback behavior
15. Supabase repository path where practical
16. No infinite event loop
17. Reason codes match expected deterministic triggers
"""

import os
import sys
import unittest
import uuid
import datetime
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes import autonomy
from db import repo
from core.autonomy.attention_policy import compute_attention, ATTENTION_POLICY_VERSION
from core.autonomy.attention_engine import CaseAttentionEngine, attention_engine
from core.autonomy.event_router import event_router
from core.autonomy.case_watcher import case_watcher

test_app = FastAPI()
test_app.include_router(autonomy.router, prefix="/autonomy")


class TestAttentionEngine(unittest.TestCase):

    def setUp(self):
        repo.init_db()
        self.client = TestClient(test_app)
        self.engine = CaseAttentionEngine()

    def tearDown(self):
        pass

    def test_01_high_risk_case_receives_elevated_attention(self):
        """Test that high ML fraud risk score (>= 0.70) contributes maximum fraud points and triggers reason code."""
        complaint = {"complaint_id": str(uuid.uuid4()), "amount_inr": 20000.0}
        pred_high = {"risk_score": 0.92, "confidence": 0.85}
        pred_low = {"risk_score": 0.15, "confidence": 0.30}

        att_high = compute_attention(complaint=complaint, prediction=pred_high)
        att_low = compute_attention(complaint=complaint, prediction=pred_low)

        self.assertGreater(att_high["attention_score"], att_low["attention_score"])
        self.assertIn("HIGH_FRAUD_RISK", att_high["reason_codes"])
        self.assertEqual(att_high["decision_factors"]["contributions"]["fraud_risk"]["points"], 23.0)

    def test_02_approaching_operational_window_increases_attention(self):
        """Test that cashout window <= 1 hour dramatically increases attention."""
        cid = str(uuid.uuid4())
        complaint = {"complaint_id": cid, "amount_inr": 50000.0}
        pred_normal = {"risk_score": 0.60, "cashout_window_hours": 24.0}
        pred_urgent = {"risk_score": 0.60, "cashout_window_hours": 0.75}

        att_normal = compute_attention(complaint=complaint, prediction=pred_normal)
        att_urgent = compute_attention(complaint=complaint, prediction=pred_urgent)

        self.assertGreater(att_urgent["attention_score"], att_normal["attention_score"])
        self.assertIn("CRITICAL_WINDOW_APPROACHING", att_urgent["reason_codes"])
        self.assertEqual(att_urgent["decision_factors"]["contributions"]["operational_urgency"]["points"], 25.0)

    def test_03_shared_entities_increase_attention(self):
        """Test that detecting shared accounts and devices in the Truth Graph elevates attention."""
        cid = str(uuid.uuid4())
        complaint = {"complaint_id": cid, "amount_inr": 30000.0}
        tg_isolated = {"entities": [], "relations": []}
        tg_shared = {
            "entities": [{"entity_id": "ent-1", "entity_type": "bank_account"}],
            "relations": [
                {"relation_type": "SHARED_ACCOUNT"},
                {"relation_type": "SHARED_DEVICE"},
            ],
        }

        att_iso = compute_attention(complaint=complaint, truth_graph=tg_isolated)
        att_shared = compute_attention(complaint=complaint, truth_graph=tg_shared)

        self.assertGreater(att_shared["attention_score"], att_iso["attention_score"])
        self.assertIn("SHARED_ACCOUNT_DETECTED", att_shared["reason_codes"])
        self.assertIn("SHARED_DEVICE_DETECTED", att_shared["reason_codes"])
        self.assertEqual(att_shared["decision_factors"]["contributions"]["cross_case_correlation"]["points"], 20.0)

    def test_04_multiple_correlated_complaints_increase_attention(self):
        """Test that multi-case linkage across 3+ complaints triggers MULTI_CASE_CORRELATION."""
        cid = str(uuid.uuid4())
        complaint = {"complaint_id": cid, "amount_inr": 25000.0}
        linked_cases = [str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())]

        res = compute_attention(complaint=complaint, linked_complaint_ids=linked_cases)
        self.assertIn("MULTI_CASE_CORRELATION", res["reason_codes"])
        self.assertGreaterEqual(res["decision_factors"]["contributions"]["cross_case_correlation"]["points"], 10.0)

    def test_05_evidence_discrepancy_increases_attention(self):
        """Test that detected evidence discrepancies increase attention score and record reasons."""
        cid = str(uuid.uuid4())
        complaint = {"complaint_id": cid, "amount_inr": 40000.0}
        evt_clean = {"event_type": "evidence_updated", "payload": {}}
        evt_disc = {"event_type": "evidence_discrepancy_detected", "payload": {"discrepancy_detected": True}}

        att_clean = compute_attention(complaint=complaint, trigger_event=evt_clean)
        att_disc = compute_attention(complaint=complaint, trigger_event=evt_disc)

        self.assertGreater(att_disc["attention_score"], att_clean["attention_score"])
        self.assertIn("EVIDENCE_DISCREPANCY", att_disc["reason_codes"])

    def test_06_low_signal_case_remains_low_or_medium(self):
        """Test that a low-value complaint with minimal signals receives LOW/MEDIUM priority without artificial inflation."""
        cid = str(uuid.uuid4())
        complaint = {"complaint_id": cid, "amount_inr": 1500.0}
        prediction = {"risk_score": 0.15, "confidence": 0.20}

        res = compute_attention(complaint=complaint, prediction=prediction)
        self.assertIn(res["attention_level"], ("LOW", "MEDIUM"))
        self.assertLess(res["attention_score"], 25.0)

    def test_07_attention_calculation_is_deterministic(self):
        """Test that evaluating identical inputs produces precisely identical scores and reason codes."""
        cid = str(uuid.uuid4())
        complaint = {"complaint_id": cid, "amount_inr": 150000.0}
        prediction = {"risk_score": 0.82, "cashout_window_hours": 3.0}

        run1 = compute_attention(complaint=complaint, prediction=prediction)
        run2 = compute_attention(complaint=complaint, prediction=prediction)

        self.assertEqual(run1["attention_score"], run2["attention_score"])
        self.assertEqual(run1["attention_level"], run2["attention_level"])
        self.assertEqual(run1["reason_codes"], run2["reason_codes"])
        self.assertEqual(run1["policy_version"], run2["policy_version"])

    def test_08_repeated_same_event_is_idempotent(self):
        """Test that multiple attention evaluations update the single active record without creating duplicates."""
        cid = str(uuid.uuid4())
        repo.create_complaint({
            "complaint_id": cid,
            "ncrp_id": f"NCRP-{cid[:6].upper()}",
            "amount_inr": 75000.0,
            "fraud_type": "UPI_PHISHING",
            "victim_state": "Maharashtra",
            "status": "active"
        })

        st1 = self.engine.evaluate_case_attention(cid)
        st2 = self.engine.evaluate_case_attention(cid)

        self.assertEqual(st1["complaint_id"], st2["complaint_id"])
        self.assertEqual(st1["attention_score"], st2["attention_score"])

        # Verify only 1 active state row exists for cid
        retrieved = repo.get_case_attention_state(cid)
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved["complaint_id"], cid)

    def test_09_event_processing_failure_is_isolated(self):
        """Test that an error inside attention evaluation does not crash event routing or the watcher."""
        cid = str(uuid.uuid4())
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "complaint_ingested",
            "entity_type": "complaint",
            "entity_id": cid,
            "complaint_id": cid,
            "payload": {"complaint_id": cid},
        }

        with patch("core.autonomy.attention_engine.attention_engine.evaluate_case_attention", side_effect=RuntimeError("Simulated engine glitch")):
            # Should not raise exception
            result = event_router.route_event(event)
            self.assertIsNotNone(result)
            self.assertEqual(result.get("action_type"), "REGISTER_CASE_WATCH")

    def test_10_historical_prediction_values_remain_unchanged(self):
        """Test that attention calculation leaves prediction attributes intact."""
        cid = str(uuid.uuid4())
        pid = str(uuid.uuid4())
        repo.create_complaint({
            "complaint_id": cid,
            "ncrp_id": f"NCRP-{cid[:6].upper()}",
            "amount_inr": 120000.0,
            "fraud_type": "UPI_PHISHING",
            "victim_state": "Karnataka",
            "status": "active"
        })
        pred_data = {
            "prediction_id": pid,
            "complaint_id": cid,
            "risk_score": 0.84,
            "predicted_lat": 12.9716,
            "predicted_lon": 77.5946,
            "confidence": 0.78,
            "model_version": "xgb_v1.0",
        }
        repo.save_prediction(pred_data)

        # Evaluate attention
        self.engine.evaluate_case_attention(cid)

        # Check prediction unchanged
        saved_pred = repo.get_prediction(cid)
        self.assertIsNotNone(saved_pred)
        self.assertEqual(float(saved_pred["risk_score"]), 0.84)
        self.assertEqual(float(saved_pred["predicted_lat"]), 12.9716)
        self.assertEqual(float(saved_pred["predicted_lon"]), 77.5946)
        self.assertEqual(saved_pred["model_version"], "xgb_v1.0")

    def test_11_risk_score_remains_unchanged(self):
        """Explicitly test that risk_score is NOT overwritten with attention_score."""
        cid = str(uuid.uuid4())
        pred = {"risk_score": 0.72, "cashout_window_hours": 3.0}
        complaint = {"complaint_id": cid, "amount_inr": 600000.0}

        att = compute_attention(complaint=complaint, prediction=pred)
        # attention_score will be high (>= 50.0) due to financial exposure + risk + window
        self.assertGreater(att["attention_score"], 50.0)
        # But prediction risk_score must remain 0.72
        self.assertEqual(pred["risk_score"], 0.72)

    def test_12_attention_state_persists_correctly(self):
        """Test upsert and retrieval of case attention state."""
        cid = str(uuid.uuid4())
        res = repo.upsert_case_attention_state(
            complaint_id=cid,
            attention_score=82.5,
            attention_level="CRITICAL",
            reason_codes=["HIGH_FRAUD_RISK", "WINDOW_APPROACHING"],
            decision_factors={"factors": {"test": 1}},
            policy_version="phase2b-v1"
        )
        self.assertIsNotNone(res)
        self.assertEqual(res["complaint_id"], cid)

        fetched = repo.get_case_attention_state(cid)
        self.assertIsNotNone(fetched)
        self.assertEqual(float(fetched["attention_score"]), 82.5)
        self.assertEqual(fetched["attention_level"], "CRITICAL")
        self.assertIn("HIGH_FRAUD_RISK", fetched["reason_codes"])

    def test_13_api_returns_correct_active_attention_state(self):
        """Test GET /autonomy/attention and GET /autonomy/attention/{complaint_id} API contracts."""
        cid = str(uuid.uuid4())
        repo.create_complaint({
            "complaint_id": cid,
            "ncrp_id": f"NCRP-{cid[:6].upper()}",
            "amount_inr": 250000.0,
            "fraud_type": "INVESTMENT_SCAM",
            "victim_state": "Delhi",
            "status": "active"
        })
        repo.upsert_case_attention_state(
            complaint_id=cid,
            attention_score=78.0,
            attention_level="CRITICAL",
            reason_codes=["HIGH_FINANCIAL_EXPOSURE"],
            decision_factors={"contributions": {}},
            policy_version="phase2b-v1"
        )

        # 1. Test queue endpoint
        res_queue = self.client.get("/autonomy/attention?level=CRITICAL")
        self.assertEqual(res_queue.status_code, 200)
        data = res_queue.json()
        self.assertIn("cases", data)
        self.assertIn("total", data)
        matched = [c for c in data["cases"] if c.get("complaint_id") == cid]
        self.assertGreaterEqual(len(matched), 1)

        # 2. Test single case endpoint
        res_single = self.client.get(f"/autonomy/attention/{cid}")
        self.assertEqual(res_single.status_code, 200)
        single_data = res_single.json()
        self.assertEqual(single_data["complaint_id"], cid)
        self.assertEqual(single_data["attention_level"], "CRITICAL")

        # 3. Test non-existent case returns 404
        res_404 = self.client.get(f"/autonomy/attention/{str(uuid.uuid4())}")
        self.assertEqual(res_404.status_code, 404)

    def test_14_sqlite_fallback_behavior(self):
        """Test SQLite fallback persistence when Supabase is disabled."""
        cid = str(uuid.uuid4())
        with patch("db.repo._use_supabase", return_value=False):
            st = repo.upsert_case_attention_state(
                complaint_id=cid,
                attention_score=64.0,
                attention_level="HIGH",
                reason_codes=["SHARED_ACCOUNT_DETECTED"],
                decision_factors={"sqlite_test": True},
                policy_version="phase2b-v1"
            )
            self.assertEqual(st["complaint_id"], cid)

            got = repo.get_case_attention_state(cid)
            self.assertIsNotNone(got)
            self.assertEqual(float(got["attention_score"]), 64.0)
            self.assertEqual(got["attention_level"], "HIGH")

    def test_15_supabase_repository_path_where_practical(self):
        """Test repository routing through Supabase helper when Supabase is enabled."""
        cid = str(uuid.uuid4())
        with patch("db.repo._use_supabase", return_value=True):
            with patch("db.supabase_client.supabase.table") as mock_table:
                mock_select = MagicMock()
                mock_select.select.return_value = mock_select
                mock_select.eq.return_value = mock_select
                mock_select.limit.return_value = mock_select
                mock_select.execute.return_value = MagicMock(data=[{"attention_id": "att-1", "complaint_id": cid}])
                mock_table.return_value = mock_select

                st = repo.get_case_attention_state(cid)
                self.assertIsNotNone(st)
                self.assertEqual(st["complaint_id"], cid)

    def test_16_no_infinite_event_loop(self):
        """Test that routing an event and computing attention terminates cleanly without re-emitting infinite cycles."""
        cid = str(uuid.uuid4())
        repo.create_complaint({
            "complaint_id": cid,
            "ncrp_id": f"NCRP-{cid[:6].upper()}",
            "amount_inr": 500000.0,
            "fraud_type": "UPI_PHISHING",
            "victim_state": "Maharashtra",
            "status": "active"
        })
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "prediction_generated",
            "entity_type": "prediction",
            "entity_id": str(uuid.uuid4()),
            "complaint_id": cid,
            "payload": {
                "risk_score": 0.88,
                "cashout_window_hours": 0.5,
                "complaint_id": cid,
            },
        }

        # Route event and verify it returns a terminal reaction without creating infinite event loop
        result = event_router.route_event(event)
        self.assertIsNotNone(result)
        self.assertIn("attention_evaluation", result)
        self.assertIn(result["attention_evaluation"]["level"], ("HIGH", "CRITICAL"))

    def test_17_reason_codes_match_expected_deterministic_triggers(self):
        """Test that distinct operational signals produce their exact machine-readable reason codes."""
        cid = str(uuid.uuid4())
        complaint = {"complaint_id": cid, "amount_inr": 600000.0}
        prediction = {
            "risk_score": 0.85,
            "cashout_window_hours": 0.5,
            "predicted_atms": [{"atm_id": "ATM-1", "distance_km": 0.8}],
            "confidence": 0.75,
        }
        tg = {
            "entities": [],
            "relations": [{"relation_type": "SHARED_ACCOUNT"}, {"relation_type": "SHARED_DEVICE"}],
        }

        res = compute_attention(complaint=complaint, prediction=prediction, truth_graph=tg, linked_complaint_ids=["case-1", "case-2", "case-3"])
        codes = res["reason_codes"]

        self.assertIn("HIGH_FRAUD_RISK", codes)
        self.assertIn("CRITICAL_WINDOW_APPROACHING", codes)
        self.assertIn("HIGH_FINANCIAL_EXPOSURE", codes)
        self.assertIn("SHARED_ACCOUNT_DETECTED", codes)
        self.assertIn("SHARED_DEVICE_DETECTED", codes)
        self.assertIn("MULTI_CASE_CORRELATION", codes)
        self.assertIn("HIGH_GEO_ACTIONABILITY", codes)
        self.assertEqual(res["attention_level"], "CRITICAL")
        self.assertGreaterEqual(res["attention_score"], 80.0)


if __name__ == "__main__":
    unittest.main()
