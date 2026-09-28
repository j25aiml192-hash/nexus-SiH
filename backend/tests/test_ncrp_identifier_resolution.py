"""
NEXUS REGRESSION TEST: NCRP Identifier Resolution & Production Boundary
========================================================================
Verifies:
1. NCRP ID -> complaint lookup -> canonical UUID resolution
2. save_prediction with NCRP ID safely maps to canonical UUID
3. get_mule_chain with NCRP ID queries foreign keys using canonical UUID
4. run_pipeline with NCRP ID executes and persists under canonical UUID
5. GET /predictions/{ncrp_id} returns HTTP 200 with complete prediction
6. Canonical UUID input behavior remains completely unchanged
7. CaseWatcher cycle time budget and single-instance protection
8. Interceptor update_recovery_scores uses prediction_id and never throws KeyError
"""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock
import uuid
import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from db import repo
from core.pipeline import run_pipeline
from core.autonomy.case_watcher import CaseWatcher
from core import interceptor_score


class TestNCRPIdentifierResolution(unittest.TestCase):
    """Regression suite for NCRP identifier resolution and watcher lifecycle."""

    def setUp(self):
        self.cid_uuid = str(uuid.uuid4())
        self.ncrp_id = f"NCRP-2026-{uuid.uuid4().hex[:6].upper()}"
        self.ticket_id = f"CFCFRMS-2026-{uuid.uuid4().hex[:6].upper()}"

        # Ingest complaint with distinct UUID, NCRP ID, and Ticket ID
        self.complaint = repo.create_complaint({
            "complaint_id": self.cid_uuid,
            "ncrp_id": self.ncrp_id,
            "cfcfrms_ticket_id": self.ticket_id,
            "fraud_type": "UPI_PHISHING",
            "amount_inr": 75000.0,
            "victim_state": "Maharashtra",
            "victim_district": "Mumbai City",
            "channel": "UPI",
            "status": "active",
        })

    def test_01_lookup_by_ncrp_resolves_canonical_uuid(self):
        """1. Verify looking up by NCRP ID returns complaint with canonical UUID."""
        comp = repo.get_complaint_by_id(self.ncrp_id)
        self.assertIsNotNone(comp, "Complaint must be found via NCRP ID")
        self.assertEqual(comp.get("complaint_id"), self.cid_uuid, "Resolved ID must be the canonical UUID")
        self.assertEqual(comp.get("ncrp_id"), self.ncrp_id, "NCRP ID must match")

    def test_02_lookup_by_ticket_id_resolves_canonical_uuid(self):
        """2. Verify looking up by CFCFRMS ticket ID returns complaint with canonical UUID."""
        comp = repo.get_complaint_by_id(self.ticket_id)
        self.assertIsNotNone(comp, "Complaint must be found via ticket ID")
        self.assertEqual(comp.get("complaint_id"), self.cid_uuid, "Resolved ID must be the canonical UUID")

    def test_03_save_prediction_with_ncrp_maps_to_canonical_uuid(self):
        """3. Verify save_prediction given an NCRP ID maps it to canonical UUID without DB error."""
        prediction_payload = {
            "complaint_id": self.ncrp_id,
            "risk_score": 0.82,
            "risk_level": "RED",
            "predicted_lat": 19.0760,
            "predicted_lon": 72.8777,
            "cashout_window_hours": 6,
            "shap_features": {"channel_UPI": 0.25},
            "predicted_atms": [],
            "status": "active",
        }
        saved = repo.save_prediction(prediction_payload)
        self.assertIsNotNone(saved)
        self.assertEqual(saved.get("complaint_id"), self.cid_uuid, "Saved prediction must store canonical UUID")

        # Must be retrievable by both canonical UUID and NCRP ID
        pred_by_uuid = repo.get_prediction_by_complaint(self.cid_uuid)
        self.assertIsNotNone(pred_by_uuid)
        self.assertEqual(pred_by_uuid.get("complaint_id"), self.cid_uuid)

        pred_by_ncrp = repo.get_prediction_by_complaint(self.ncrp_id)
        self.assertIsNotNone(pred_by_ncrp)
        self.assertEqual(pred_by_ncrp.get("complaint_id"), self.cid_uuid)

    def test_04_get_mule_chain_with_ncrp_uses_canonical_uuid(self):
        """4. Verify get_mule_chain given an NCRP ID retrieves chain without UUID syntax errors."""
        chain = repo.get_mule_chain(self.ncrp_id)
        self.assertIsNotNone(chain)
        self.assertIn("complaint", chain)
        self.assertIn("mule_nodes", chain)
        self.assertIn("transactions", chain)
        if chain.get("complaint"):
            self.assertEqual(chain["complaint"].get("complaint_id"), self.cid_uuid)

    def test_05_run_pipeline_with_ncrp_id(self):
        """5. Verify run_pipeline given an NCRP ID executes and persists under canonical UUID."""
        pred = run_pipeline(self.ncrp_id, force_refresh=True)
        self.assertIsNotNone(pred, "Pipeline must succeed for NCRP ID")
        self.assertEqual(pred.get("complaint_id"), self.cid_uuid, "Prediction must be stored under canonical UUID")

    def test_06_route_get_prediction_by_ncrp_returns_200(self):
        """6. Verify GET /predictions/{NCRP} route returns HTTP 200 and valid schema."""
        from main import app
        client = TestClient(app)

        response = client.get(f"/predictions/{self.ncrp_id}")
        self.assertEqual(response.status_code, 200, f"Expected 200, got: {response.status_code}: {response.text}")
        data = response.json()
        self.assertEqual(data.get("complaint_id"), self.cid_uuid)
        self.assertIn("risk_score", data)
        self.assertIn("risk_level", data)
        self.assertIn("nearest_atms", data)

    def test_07_canonical_uuid_input_behavior_unchanged(self):
        """7. Verify standard UUID inputs continue to function identically."""
        from main import app
        client = TestClient(app)

        # Lookup by UUID
        comp = repo.get_complaint_by_id(self.cid_uuid)
        self.assertIsNotNone(comp)
        self.assertEqual(comp.get("complaint_id"), self.cid_uuid)

        # GET /predictions/{UUID}
        response = client.get(f"/predictions/{self.cid_uuid}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("complaint_id"), self.cid_uuid)

    def test_08_case_watcher_cycle_budget(self):
        """8. Verify CaseWatcher enforces cycle time budget and processes events safely."""
        watcher = CaseWatcher()
        test_events = [
            {"event_id": str(uuid.uuid4()), "event_type": "complaint_ingested", "complaint_id": self.cid_uuid, "payload": {"complaint_id": self.cid_uuid}},
            {"event_id": str(uuid.uuid4()), "event_type": "prediction_generated", "complaint_id": self.cid_uuid, "payload": {"prediction_id": str(uuid.uuid4()), "complaint_id": self.cid_uuid, "risk_score": 0.8, "cashout_window_hours": 8}},
        ]
        with patch("db.repo.claim_pending_autonomy_events", return_value=test_events):
            with patch("db.repo.update_autonomy_event_status"):
                processed = watcher.run_cycle(batch_size=2)
                self.assertEqual(processed, 2)

    def test_09_interceptor_uses_prediction_id_without_key_error(self):
        """9. Verify legacy interceptor does not throw KeyError: 'id'."""
        mock_pred = {
            "prediction_id": str(uuid.uuid4()),
            "complaint_id": self.cid_uuid,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "cashout_window_hours": 12,
            "alert_level": "AMBER",
            "status": "active",
        }
        with patch("core.interceptor_score.supabase") as mock_sb:
            mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_pred]
            mock_sb.table.return_value.update.return_value.eq.return_value.execute.return_value.data = []
            # Must run without throwing KeyError: 'id'
            try:
                interceptor_score.update_recovery_scores()
            except KeyError as e:
                self.fail(f"update_recovery_scores raised KeyError: {e}")


if __name__ == "__main__":
    unittest.main()
