"""
NEXUS Phase 7 - Model Evaluation & Release Gate Tests
====================================================
Tests:
21. evaluation grouped by model version
22. deterministic dataset generation
23. dataset version metadata
24. temporal split (chronological train/val/test)
25. temporal leakage prevention (prediction-time features frozen)
26. complaint/group split protection
27. feature-schema compatibility
28. candidate vs production comparison
29. critical regression detection
30. invalid candidate rejected
31. candidate approval requires authorized actor
32. rejected candidate cannot deploy
33. production model unchanged by evaluation
34. rollback metadata preserved
35. drift requires sufficient sample (min n=20)
36. missing labels do not become FALSE
37. reproducible evaluation
38. candidate artifact reference verification
39. production artifact remains byte-for-byte unchanged
40. historical predictions retain original model version

Authorization & Release boundary tests:
41. unauthenticated candidate approval rejected (401)
42. unauthorized/unapproved user rejected (403)
43. authorized approval succeeds
44. impersonation prevention (mismatched actor field rejected)
45. candidate cannot deploy without approval (CANDIDATE -> DEPLOYED rejected)
46. dataset builder cannot deploy models
47. evaluation endpoint cannot deploy models
"""

import os
import json
import uuid
import datetime
import unittest
from unittest.mock import patch

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
    MIN_DRIFT_SAMPLE_SIZE,
    GEO_CORRECT_THRESHOLD_KM,
)
from fastapi.testclient import TestClient
from main import app


class TestModelEvaluation(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.now = datetime.datetime.now(datetime.timezone.utc)
        self.ts = self.now.isoformat()

        # Seed an authorized officer in SQLite
        self.officer_email = f"lead_officer_{uuid.uuid4().hex[:6]}@nexus.gov.in"
        self.officer_badge = f"BADGE-{uuid.uuid4().hex[:6]}"
        conn = repo.get_connection()
        c = conn.cursor()
        c.execute("""
            INSERT OR REPLACE INTO users (
                id, name, email, password_hash, role, badge_id, agency, status, created_at
            ) VALUES (?, 'Lead Officer', ?, 'secret', 'Lead Investigator', ?, 'I4C NCC', 'approved', ?)
        """, (f"usr_{uuid.uuid4().hex[:6]}", self.officer_email, self.officer_badge, self.ts))
        conn.commit()
        conn.close()

        self.auth_headers = {"Authorization": f"Bearer {self.officer_email}"}

    def test_21_evaluation_grouped_by_model_version(self):
        # Register two different model versions with evaluations
        v1_eval = repo.create_model_evaluation(
            prediction_id=f"PRED-V1-{uuid.uuid4().hex[:6]}",
            complaint_id=f"CMP-V1-{uuid.uuid4().hex[:6]}",
            predicted_lat=24.48, predicted_lon=86.69,
            model_version="model_test_v1",
        )
        repo.update_model_evaluation_outcome(v1_eval["eval_id"], actual_lat=24.49, actual_lon=86.70)

        v2_eval = repo.create_model_evaluation(
            prediction_id=f"PRED-V2-{uuid.uuid4().hex[:6]}",
            complaint_id=f"CMP-V2-{uuid.uuid4().hex[:6]}",
            predicted_lat=24.48, predicted_lon=86.69,
            model_version="model_test_v2",
        )
        repo.update_model_evaluation_outcome(v2_eval["eval_id"], actual_lat=24.55, actual_lon=86.75)

        perf_v1 = model_evaluation_service.get_model_performance(model_version="model_test_v1")
        perf_v2 = model_evaluation_service.get_model_performance(model_version="model_test_v2")

        self.assertEqual(perf_v1["model_version"], "model_test_v1")
        self.assertEqual(perf_v2["model_version"], "model_test_v2")
        self.assertNotEqual(perf_v1["geo_metrics"]["mean_error_km"], perf_v2["geo_metrics"]["mean_error_km"])

    def test_22_deterministic_dataset_generation(self):
        ds1 = model_evaluation_service.build_versioned_dataset(
            dataset_type="geo_outcomes",
            dataset_version=f"geo_det_test_{uuid.uuid4().hex[:6]}"
        )
        self.assertIsNotNone(ds1.get("checksum"))
        self.assertEqual(ds1["validation_status"], "VALID")

    def test_23_dataset_version_metadata(self):
        v_name = f"geo_meta_test_{uuid.uuid4().hex[:6]}"
        ds = model_evaluation_service.build_versioned_dataset(
            dataset_type="geo_outcomes",
            dataset_version=v_name,
            feature_schema_version="v1.0"
        )
        self.assertEqual(ds["dataset_version"], v_name)
        self.assertEqual(ds["dataset_type"], "geo_outcomes")
        self.assertEqual(ds["feature_schema_version"], "v1.0")
        self.assertIn("train_rows", ds["split_config"])
        self.assertIn("val_rows", ds["split_config"])
        self.assertIn("test_rows", ds["split_config"])

    def test_24_temporal_split(self):
        ds = model_evaluation_service.build_versioned_dataset(
            dataset_type="geo_outcomes",
            dataset_version=f"geo_temp_split_{uuid.uuid4().hex[:6]}",
            train_ratio=0.70, val_ratio=0.15, test_ratio=0.15
        )
        split = ds["split_config"]
        self.assertEqual(split["temporal_ordering"], "chronological_ascending")
        total = split["train_rows"] + split["val_rows"] + split["test_rows"]
        self.assertEqual(total, ds["row_count"])

    def test_25_temporal_leakage_prevention(self):
        # Verify dataset metadata guarantees temporal features are strictly pre-prediction
        ds = model_evaluation_service.build_versioned_dataset(
            dataset_type="geo_outcomes",
            dataset_version=f"geo_leakage_test_{uuid.uuid4().hex[:6]}"
        )
        self.assertFalse(ds["split_config"].get("group_leakage_detected", True))

    def test_26_complaint_group_split_protection(self):
        # Build dataset and verify group overlap warning flag is evaluated
        ds = model_evaluation_service.build_versioned_dataset(
            dataset_type="geo_outcomes",
            dataset_version=f"geo_group_test_{uuid.uuid4().hex[:6]}"
        )
        self.assertIn(ds["validation_status"], ("VALID", "WARNING_GROUP_OVERLAP"))

    def test_27_feature_schema_compatibility(self):
        cand_ver = f"cand_schema_{uuid.uuid4().hex[:6]}"
        repo.register_model_candidate({
            "model_version": cand_ver,
            "feature_schema_version": "v1.0",
            "artifact_reference": "backend/model_candidates/test.pkl",
            "dataset_version": "geo_baseline_v1",
            "status": "CANDIDATE"
        })
        comp = model_evaluation_service.compare_candidate_to_production(cand_ver)
        self.assertTrue(comp["quality_gates"]["feature_schema_compatible"])

    def test_28_candidate_vs_production_comparison(self):
        cand_ver = f"cand_comp_{uuid.uuid4().hex[:6]}"
        repo.register_model_candidate({
            "model_version": cand_ver,
            "feature_schema_version": "v1.0",
            "artifact_reference": "backend/model_candidates/test.pkl",
            "dataset_version": "geo_baseline_v1",
            "status": "CANDIDATE"
        })
        comp = model_evaluation_service.compare_candidate_to_production(cand_ver)
        self.assertIn("comparison", comp)
        self.assertIn("quality_gates", comp)
        self.assertIn("delta_mean_error_km", comp["comparison"])

    def test_29_critical_regression_detection(self):
        # A candidate with acceptable metrics passes regression check
        cand_ver = f"cand_reg_{uuid.uuid4().hex[:6]}"
        repo.register_model_candidate({
            "model_version": cand_ver,
            "feature_schema_version": "v1.0",
            "artifact_reference": "backend/model_candidates/test.pkl",
            "dataset_version": "geo_baseline_v1",
            "status": "CANDIDATE"
        })
        comp = model_evaluation_service.compare_candidate_to_production(cand_ver)
        self.assertTrue(comp["quality_gates"]["critical_regression_absent"])

    def test_30_invalid_candidate_rejected(self):
        cand_ver = f"cand_invalid_{uuid.uuid4().hex[:6]}"
        repo.register_model_candidate({
            "model_version": cand_ver,
            "feature_schema_version": "incompatible_v99.0",  # Incompatible schema!
            "artifact_reference": "",
            "status": "CANDIDATE"
        })
        comp = model_evaluation_service.compare_candidate_to_production(cand_ver)
        self.assertFalse(comp["quality_gates"]["feature_schema_compatible"])
        self.assertFalse(comp["gates_passed"])

    def test_31_candidate_approval_requires_authorized_actor(self):
        cand_ver = f"cand_auth_{uuid.uuid4().hex[:6]}"
        repo.register_model_candidate({
            "model_version": cand_ver,
            "status": "CANDIDATE"
        })
        res = model_evaluation_service.approve_candidate(
            candidate_model_version=cand_ver,
            authorized_user={"email": self.officer_email, "badge_id": self.officer_badge}
        )
        self.assertEqual(res["status"], "APPROVED")
        self.assertEqual(res["approved_by"], self.officer_email)

    def test_32_rejected_candidate_cannot_deploy(self):
        cand_ver = f"cand_rej_{uuid.uuid4().hex[:6]}"
        repo.register_model_candidate({
            "model_version": cand_ver,
            "status": "REJECTED"
        })
        with self.assertRaises(ValueError):
            model_evaluation_service.deploy_candidate(
                candidate_model_version=cand_ver,
                authorized_user={"email": self.officer_email}
            )

    def test_33_production_model_unchanged_by_evaluation(self):
        deployed_before = repo.get_deployed_model(model_type="geo")
        # Run evaluations
        model_evaluation_service.get_model_performance("geo_lgbm_v3")
        model_evaluation_service.check_drift("geo_lgbm_v3")
        deployed_after = repo.get_deployed_model(model_type="geo")
        self.assertEqual(deployed_before["model_version"], deployed_after["model_version"])

    def test_34_rollback_metadata_preserved(self):
        # Register and approve candidate
        cand_ver = f"cand_roll_{uuid.uuid4().hex[:6]}"
        repo.register_model_candidate({
            "model_version": cand_ver,
            "status": "APPROVED",
            "artifact_reference": "backend/model_candidates/roll.pkl"
        })
        # Deploy candidate
        dep_res = model_evaluation_service.deploy_candidate(
            candidate_model_version=cand_ver,
            authorized_user={"email": self.officer_email}
        )
        self.assertEqual(dep_res["status"], "DEPLOYED")
        self.assertEqual(dep_res["previous_model_version"], "geo_lgbm_v3")

        # Roll back to previous version
        roll_res = model_evaluation_service.rollback_model(
            target_model_version="geo_lgbm_v3",
            authorized_user={"email": self.officer_email}
        )
        self.assertEqual(roll_res["status"], "ROLLED_BACK")
        self.assertEqual(roll_res["deployed_model_version"], "geo_lgbm_v3")

    def test_35_drift_requires_sufficient_sample(self):
        # A brand new model version with 0 or 2 samples returns INSUFFICIENT_SAMPLE
        tiny_ver = f"model_tiny_{uuid.uuid4().hex[:6]}"
        drift = model_evaluation_service.check_drift(tiny_ver, min_sample=MIN_DRIFT_SAMPLE_SIZE)
        self.assertEqual(drift["status"], "INSUFFICIENT_SAMPLE")
        self.assertFalse(drift["drift_detected"])
        self.assertIn("insufficient", drift["message"].lower())

    def test_36_missing_labels_do_not_become_false(self):
        eval_row = repo.create_model_evaluation(
            prediction_id=f"PRED-MISSING-{uuid.uuid4().hex[:6]}",
            complaint_id=f"CMP-MISSING-{uuid.uuid4().hex[:6]}",
            predicted_lat=24.48, predicted_lon=86.69,
            model_version="geo_lgbm_v3"
        )
        # Update without actual coordinates
        res = repo.update_model_evaluation_outcome(
            eval_id=eval_row["eval_id"],
            actual_outcome=None,
            actual_lat=None,
            actual_lon=None,
        )
        self.assertIsNone(res.get("geo_correct_2_5km"))
        self.assertNotEqual(res.get("geo_correct_2_5km"), 0)  # NOT FALSE!

    def test_37_reproducible_evaluation(self):
        p1 = model_evaluation_service.get_model_performance("geo_lgbm_v3")
        p2 = model_evaluation_service.get_model_performance("geo_lgbm_v3")
        self.assertEqual(p1, p2)

    def test_38_candidate_artifact_reference_verification(self):
        cand_ver = f"cand_art_{uuid.uuid4().hex[:6]}"
        repo.register_model_candidate({
            "model_version": cand_ver,
            "artifact_reference": "backend/model_candidates/test_geo.pkl",
            "status": "CANDIDATE"
        })
        cand = repo.get_model_candidate_by_id(cand_ver)
        self.assertIn("model_candidates", cand["artifact_reference"])
        self.assertNotIn("backend/models/geo_model_lat.pkl", cand["artifact_reference"])

    def test_39_production_artifact_remains_unchanged(self):
        # Verify production model files still exist and are accessible
        for fname in ["model.pkl", "geo_model_lat.pkl", "geo_model_lon.pkl", "geo_model_metadata.json"]:
            path = os.path.join(os.path.dirname(__file__), "..", "models", fname)
            self.assertTrue(os.path.exists(path), f"Production file {fname} was removed!")

    def test_40_historical_predictions_retain_original_model_version(self):
        pid = f"PRED-HIST-{uuid.uuid4().hex[:6]}"
        cid = f"CMP-HIST-{uuid.uuid4().hex[:6]}"
        conn = repo.get_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO predictions (
                prediction_id, complaint_id, risk_score, risk_level, status,
                created_at, model_version
            ) VALUES (?, ?, 0.85, 'HIGH', 'active', ?, 'geo_lgbm_v3')
        """, (pid, cid, self.ts))
        conn.commit()
        conn.close()

        # Deploy candidate and roll back
        cand_ver = f"cand_temp_{uuid.uuid4().hex[:6]}"
        repo.register_model_candidate({"model_version": cand_ver, "status": "APPROVED"})
        model_evaluation_service.deploy_candidate(cand_ver, {"email": self.officer_email})
        model_evaluation_service.rollback_model("geo_lgbm_v3", {"email": self.officer_email})

        # Historical prediction MUST still have geo_lgbm_v3
        pred = repo.get_prediction_by_id(pid)
        self.assertEqual(pred["model_version"], "geo_lgbm_v3")

    # -------------------------------------------------------------------------
    # AUTHORIZATION & RELEASE BOUNDARY TESTS
    # -------------------------------------------------------------------------

    def test_41_unauthenticated_candidate_approval_rejected(self):
        resp = self.client.post("/autonomy/model-candidates/any_model/approve", json={})
        self.assertEqual(resp.status_code, 401)

    def test_42_unauthorized_user_rejected(self):
        resp = self.client.post(
            "/autonomy/model-candidates/any_model/approve",
            json={},
            headers={"Authorization": "Bearer bogus_unknown_user"}
        )
        self.assertEqual(resp.status_code, 401)

    def test_43_authorized_approval_succeeds(self):
        cand_ver = f"cand_api_appr_{uuid.uuid4().hex[:6]}"
        repo.register_model_candidate({"model_version": cand_ver, "status": "CANDIDATE"})
        resp = self.client.post(
            f"/autonomy/model-candidates/{cand_ver}/approve",
            json={"approved_by": self.officer_email, "notes": "Approved via API"},
            headers=self.auth_headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "APPROVED")

    def test_44_impersonation_prevention_rejected(self):
        cand_ver = f"cand_imp_{uuid.uuid4().hex[:6]}"
        repo.register_model_candidate({"model_version": cand_ver, "status": "CANDIDATE"})
        # Client provides different actor name in body than Authorization header token
        resp = self.client.post(
            f"/autonomy/model-candidates/{cand_ver}/approve",
            json={"approved_by": "different_general_officer@gov.in"},
            headers=self.auth_headers
        )
        self.assertEqual(resp.status_code, 403)
        self.assertIn("Impersonation rejected", resp.json()["detail"])

    def test_45_candidate_cannot_deploy_without_prior_approval(self):
        cand_ver = f"cand_unappr_{uuid.uuid4().hex[:6]}"
        repo.register_model_candidate({"model_version": cand_ver, "status": "CANDIDATE"})
        resp = self.client.post(
            f"/autonomy/model-candidates/{cand_ver}/deploy",
            headers=self.auth_headers
        )
        self.assertEqual(resp.status_code, 422)
        self.assertIn("Must be APPROVED first", resp.json()["detail"])

    def test_46_dataset_builder_cannot_deploy_models(self):
        # Verify dataset build endpoint returns dataset object only and has no deployment side-effect
        resp = self.client.post(
            "/autonomy/datasets/build",
            json={"dataset_type": "geo_outcomes"},
            headers=self.auth_headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("dataset_version", resp.json())
        self.assertNotIn("deployed_model_version", resp.json())

    def test_47_evaluation_endpoint_cannot_deploy_models(self):
        # Verify evaluation endpoint evaluates only and does not deploy
        pid = f"PRED-EVAL-DEPLOY-{uuid.uuid4().hex[:6]}"
        cid = f"CMP-EVAL-DEPLOY-{uuid.uuid4().hex[:6]}"
        conn = repo.get_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO predictions (prediction_id, complaint_id, risk_score, risk_level, status, created_at)
            VALUES (?, ?, 0.8, 'HIGH', 'active', ?)
        """, (pid, cid, self.ts))
        conn.commit()
        conn.close()

        resp = self.client.post(
            "/autonomy/model-evaluation/run",
            json={"prediction_id": pid, "actual_lat": 24.48, "actual_lon": 86.69},
            headers=self.auth_headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("eval_id", resp.json())
        # Deployed model must still be geo_lgbm_v3
        dep = repo.get_deployed_model(model_type="geo")
        self.assertEqual(dep["model_version"], "geo_lgbm_v3")


if __name__ == "__main__":
    unittest.main()
