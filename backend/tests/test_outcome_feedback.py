"""
NEXUS Phase 7 - Outcome Feedback Loop Tests
===========================================
Tests:
1. prediction + incident produces evaluation
2. actual coordinates produce Haversine error
3. actual timestamp produces time error
4. 2.5 km threshold applied correctly
5. predicted H3 / actual H3 comparison
6. missing actual location handled safely
7. missing actual timestamp handled safely
8. duplicate evaluation suppressed (idempotency)
9. conflicting outcomes marked review
10. historical prediction unchanged (immutability)
11. model_version unchanged
12. prediction feature vector unchanged
13. privacy masking maintained
14. source provenance maintained
15. SQLite fallback
16. Supabase persistence handled gracefully
17. event integration (_handle_outcome_recorded)
18. no feedback loop (no retrain or deploy triggered)
19. incomplete outcome handling
20. deterministic metric output
"""

import os
import uuid
import datetime
import unittest
from unittest.mock import patch, MagicMock

# Isolated SQLite test environment
_ORIG_USE_LOCAL_SQLITE = None

def setUpModule():
    global _ORIG_USE_LOCAL_SQLITE
    _ORIG_USE_LOCAL_SQLITE = os.environ.get("USE_LOCAL_SQLITE")
    os.environ["USE_LOCAL_SQLITE"] = "true"
    repo.init_db()

def tearDownModule():
    global _ORIG_USE_LOCAL_SQLITE
    if _ORIG_USE_LOCAL_SQLITE is None:
        os.environ.pop("USE_LOCAL_SQLITE", None)
    else:
        os.environ["USE_LOCAL_SQLITE"] = _ORIG_USE_LOCAL_SQLITE

from db import repo
from core.autonomy.model_evaluation_service import (
    model_evaluation_service,
    calculate_haversine_km,
    GEO_CORRECT_THRESHOLD_KM,
)
from core.autonomy.event_router import event_router


class TestOutcomeFeedback(unittest.TestCase):
    def setUp(self):
        self.cid = f"CMP-TEST-OUTCOME-{uuid.uuid4().hex[:8]}"
        self.now = datetime.datetime.now(datetime.timezone.utc)
        self.ts = self.now.isoformat()

        # Direct SQL insert to avoid mule account unique collisions during test runs
        conn = repo.get_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO complaints (
                complaint_id, fraud_type, amount_inr, status,
                created_at, filed_at, victim_state, victim_district
            ) VALUES (?, 'digital_arrest', 250000.0, 'flagged', ?, ?, 'Jharkhand', 'Deoghar')
        """, (self.cid, self.ts, self.ts))
        conn.commit()
        conn.close()

        # Seed prediction with explicit snapshot values
        self.pred_id = f"PRED-{uuid.uuid4().hex[:8]}"
        self.pred_lat = 24.4853
        self.pred_lon = 86.6936
        self.model_version = "geo_lgbm_v3"
        self.features_json = '{"mule_depth": 2, "terminal_risk": 0.88, "amount": 250000}'
        
        conn = repo.get_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO predictions (
                prediction_id, complaint_id, risk_score, risk_level, status,
                created_at, predicted_lat, predicted_lon, cashout_window_hours,
                shap_features, recovery_score, confidence, model_version, predicted_atms
            ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, 12, ?, 100, 0.92, ?, 'ATM-JH-DEO-01')
        """, (
            self.pred_id, self.cid, 0.89, "HIGH",
            self.ts, self.pred_lat, self.pred_lon,
            self.features_json, self.model_version
        ))
        conn.commit()
        conn.close()

    def test_01_prediction_plus_incident_produces_evaluation(self):
        outcome = {
            "incident_id": f"INC-{uuid.uuid4().hex[:6]}",
            "actual_lat": 24.4860,
            "actual_lon": 86.6940,
            "outcome": "RUNNER_APPREHENDED",
            "amount_recovered": 150000.0,
        }
        res = model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data=outcome,
            source_type="incident",
        )
        self.assertIsNotNone(res)
        self.assertEqual(res["prediction_id"], self.pred_id)
        self.assertEqual(res["complaint_id"], self.cid)
        self.assertEqual(res["evaluation_status"], "evaluated")

    def test_02_actual_coordinates_produce_haversine_error(self):
        # Coordinates ~1 km apart
        act_lat, act_lon = 24.4920, 86.6980
        dist = calculate_haversine_km(self.pred_lat, self.pred_lon, act_lat, act_lon)
        self.assertGreater(dist, 0.0)
        self.assertLess(dist, 5.0)

        res = model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"actual_lat": act_lat, "actual_lon": act_lon},
        )
        self.assertIsNotNone(res.get("distance_error_km"))
        self.assertAlmostEqual(res["distance_error_km"], dist, places=2)

    def test_03_actual_timestamp_produces_time_error(self):
        actual_cashout = (self.now + datetime.timedelta(hours=2, minutes=30)).isoformat()
        res = model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"actual_cashout_at": actual_cashout},
        )
        self.assertIsNotNone(res.get("time_error_minutes"))
        self.assertAlmostEqual(res["time_error_minutes"], 150.0, delta=2.0)
        self.assertTrue(res["time_correct_window"])

    def test_04_geo_threshold_2_5km_applied_correctly(self):
        # 1. Close prediction (< 2.5 km)
        close_lat, close_lon = 24.4880, 86.6950
        close_res = model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"actual_lat": close_lat, "actual_lon": close_lon},
            source_type="close_test"
        )
        self.assertTrue(close_res["geo_correct_2_5km"])
        self.assertLessEqual(close_res["distance_error_km"], GEO_CORRECT_THRESHOLD_KM)

        # 2. Far prediction (> 2.5 km)
        far_lat, far_lon = 24.5200, 86.7500
        far_res = model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"actual_lat": far_lat, "actual_lon": far_lon},
            source_type="far_test"
        )
        self.assertFalse(far_res["geo_correct_2_5km"])
        self.assertGreater(far_res["distance_error_km"], GEO_CORRECT_THRESHOLD_KM)

    def test_05_predicted_h3_and_actual_h3_comparison(self):
        res = model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"actual_h3": "ATM-JH-DEO-01"},
            source_type="h3_test"
        )
        self.assertEqual(res.get("actual_h3"), "ATM-JH-DEO-01")
        self.assertEqual(res.get("predicted_h3"), "ATM-JH-DEO-01")

    def test_06_missing_actual_location_handled_safely(self):
        res = model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"actual_outcome": "FUNDS_RECOVERED", "amount_recovered": 50000.0},
            source_type="no_loc_test"
        )
        self.assertIsNone(res.get("distance_error_km"))
        self.assertIsNone(res.get("geo_correct_2_5km"))
        self.assertEqual(res.get("actual_outcome"), "FUNDS_RECOVERED")

    def test_07_missing_actual_timestamp_handled_safely(self):
        res = model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"actual_lat": 24.4853, "actual_lon": 86.6936},
            source_type="no_time_test"
        )
        self.assertIsNone(res.get("time_error_minutes"))
        self.assertIsNone(res.get("time_correct_window"))

    def test_08_duplicate_evaluation_suppressed_idempotently(self):
        eval1 = model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"actual_lat": 24.4855, "actual_lon": 86.6938},
            source_type="incident"
        )
        eval2 = model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"actual_lat": 24.4855, "actual_lon": 86.6938},
            source_type="incident"
        )
        self.assertEqual(eval1["eval_id"], eval2["eval_id"])
        all_evals = repo.get_model_evaluations_for_complaint(self.cid)
        matching = [e for e in all_evals if e["eval_id"] == eval1["eval_id"]]
        self.assertEqual(len(matching), 1)

    def test_09_conflicting_outcomes_marked_review(self):
        # First record close location
        model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"actual_lat": 24.4853, "actual_lon": 86.6936},
            source_type="conflict_src"
        )
        # Second contradictory outcome arrives with wildly divergent coordinates (50 km away)
        conflict_res = model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"actual_lat": 24.8500, "actual_lon": 87.1000},
            source_type="conflict_src"
        )
        self.assertEqual(conflict_res["evaluation_status"], "CONFLICT_REVIEW")
        self.assertIn("Conflict", conflict_res.get("notes") or "")

    def test_10_historical_prediction_remains_strictly_unchanged(self):
        # Fetch initial state
        pred_before = repo.get_prediction_by_id(self.pred_id)
        
        # Run multiple evaluations
        model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"actual_lat": 28.6139, "actual_lon": 77.2090, "outcome": "TARGET_EVADED"},
            source_type="immutability_test"
        )
        
        # Fetch post-evaluation state
        pred_after = repo.get_prediction_by_id(self.pred_id)
        
        # Verify byte/field equivalence
        self.assertEqual(pred_before["predicted_lat"], pred_after["predicted_lat"])
        self.assertEqual(pred_before["predicted_lon"], pred_after["predicted_lon"])
        self.assertEqual(pred_before["risk_score"], pred_after["risk_score"])
        self.assertEqual(pred_before["confidence"], pred_after["confidence"])
        self.assertEqual(pred_before["cashout_window_hours"], pred_after["cashout_window_hours"])
        self.assertEqual(pred_before["created_at"], pred_after["created_at"])
        self.assertEqual(pred_before["model_version"], pred_after["model_version"])

    def test_11_model_version_unchanged(self):
        eval_res = model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"actual_lat": 24.4853, "actual_lon": 86.6936},
            source_type="version_test"
        )
        pred = repo.get_prediction_by_id(self.pred_id)
        self.assertEqual(pred["model_version"], self.model_version)
        self.assertEqual(eval_res["model_version"], self.model_version)

    def test_12_prediction_feature_vector_unchanged(self):
        import json
        model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"actual_lat": 24.4853, "actual_lon": 86.6936},
            source_type="feature_test"
        )
        pred = repo.get_prediction_by_id(self.pred_id)
        self.assertEqual(pred["shap_features"], json.loads(self.features_json))

    def test_13_privacy_masking_maintained(self):
        # Verify evaluation endpoints never leak unmasked victim PII
        from api.routes.autonomy import get_prediction_outcome_detail
        detail = get_prediction_outcome_detail(self.pred_id)
        for key in ["phone", "bank_account", "pan", "aadhar", "otp", "password"]:
            self.assertNotIn(key, detail.get("predicted", {}))
            self.assertNotIn(key, detail.get("actual", {}))
            self.assertNotIn(key, detail.get("evaluation", {}))

    def test_14_source_provenance_maintained(self):
        res = model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"actual_lat": 24.4853, "actual_lon": 86.6936},
            source_type="special_ops_recovery"
        )
        self.assertEqual(res["outcome_source"], "special_ops_recovery")

    def test_15_sqlite_fallback(self):
        res = repo.create_model_evaluation(
            prediction_id=self.pred_id,
            complaint_id=self.cid,
            predicted_lat=self.pred_lat,
            predicted_lon=self.pred_lon,
            outcome_source="fallback_test"
        )
        self.assertIsNotNone(res)
        self.assertIn("eval_id", res)
        self.assertEqual(res["complaint_id"], self.cid)

    def test_16_supabase_persistence_graceful_handling(self):
        eval_rec = repo.create_model_evaluation(
            prediction_id=self.pred_id,
            complaint_id=self.cid,
            outcome_source="sb_graceful"
        )
        updated = repo.update_model_evaluation_outcome(
            eval_id=eval_rec["eval_id"],
            actual_lat=24.5000,
            actual_lon=86.7000
        )
        self.assertIsNotNone(updated)
        self.assertEqual(updated["actual_lat"], 24.5000)

    def test_17_event_integration_incident_resolved(self):
        # Simulate incident resolution event routed through autonomy EventRouter
        ev = {
            "event_id": f"EV-{uuid.uuid4().hex[:6]}",
            "event_type": "outcome_recorded",
            "entity_type": "incident",
            "entity_id": f"INC-{uuid.uuid4().hex[:6]}",
            "complaint_id": self.cid,
            "payload": {
                "actual_lat": 24.4860,
                "actual_lon": 86.6940,
                "status": "RUNNER_APPREHENDED",
                "amount_recovered": 200000.0,
            }
        }
        res = event_router._handle_outcome_recorded(ev)
        self.assertEqual(res["status"], "processed")
        self.assertEqual(res["action_type"], "FINALIZE_MODEL_EVALUATION")

        eval_rec = repo.get_model_evaluation_by_prediction(self.pred_id)
        self.assertIsNotNone(eval_rec)
        self.assertEqual(eval_rec.get("actual_outcome"), "RUNNER_APPREHENDED")

    def test_18_no_feedback_loop_guarantee(self):
        # Verify event router never emits retrain or deploy events from outcome evaluation
        with patch("db.repo.safe_emit_autonomy_event") as mock_emit:
            ev = {
                "event_id": f"EV-{uuid.uuid4().hex[:6]}",
                "event_type": "outcome_recorded",
                "entity_type": "incident",
                "entity_id": f"INC-LOOP-TEST",
                "complaint_id": self.cid,
                "payload": {"actual_lat": 24.4853, "actual_lon": 86.6936}
            }
            event_router._handle_outcome_recorded(ev)
            for call in mock_emit.call_args_list:
                args, kwargs = call
                event_type = kwargs.get("event_type") or (args[0] if args else "")
                self.assertNotIn("retrain", event_type.lower())
                self.assertNotIn("deploy", event_type.lower())

    def test_19_incomplete_outcome_handling(self):
        # An outcome with no coordinates and no timestamps is NOT an error and NOT marked false
        res = model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=self.pred_id,
            outcome_data={"status": "UNDER_INVESTIGATION"},
            source_type="pending_outcome"
        )
        self.assertEqual(res["evaluation_status"], "evaluated")
        self.assertEqual(res["actual_outcome"], "UNDER_INVESTIGATION")
        self.assertIsNone(res["geo_correct_2_5km"])
        self.assertIsNone(res["time_correct_window"])

    def test_20_deterministic_metric_output(self):
        perf1 = model_evaluation_service.get_model_performance(self.model_version)
        perf2 = model_evaluation_service.get_model_performance(self.model_version)
        self.assertEqual(perf1["geo_metrics"], perf2["geo_metrics"])
        self.assertEqual(perf1["time_metrics"], perf2["time_metrics"])
        self.assertEqual(perf1["sample_size_n"], perf2["sample_size_n"])


if __name__ == "__main__":
    unittest.main()
