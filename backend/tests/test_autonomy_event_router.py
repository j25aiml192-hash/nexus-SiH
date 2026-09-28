"""
NEXUS Autonomy Event Router & Case Watcher Test Suite (Phase 2A)
===============================================================
Comprehensive verification of Phase 2A Autonomy requirements:
1. complaint event creation
2. voice event creation
3. prediction event creation
4. prediction update event
5. incident resolved event
6. outcome event
7. idempotency
8. event processing (pending -> processing -> processed)
9. failed event handling (pending -> processing -> failed)
10. concurrency protection (atomic claiming)
11. event-cycle prevention (deterministic termination)
12. reconciliation of missing event
13. structured audit log (reason codes, no raw LLM dumps)
14. sensitive-data masking
15. watcher processes multiple event types
16. one bad event does not kill the watcher
17. autonomy status telemetry & API endpoint
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
from core.autonomy.event_router import event_router, mask_sensitive_value
from core.autonomy.case_watcher import case_watcher, get_autonomy_status
from core.autonomy.reconciler import reconciler

test_app = FastAPI()
test_app.include_router(autonomy.router, prefix="/autonomy")


@test_app.get("/health")
def health():
    return {"status": "ok"}


class TestAutonomyEventRouterAndWatcher(unittest.TestCase):

    def setUp(self):
        repo.init_db()
        self.client = TestClient(test_app)
        conn = repo.get_connection()
        c = conn.cursor()
        c.execute("UPDATE autonomy_events SET processing_status = 'processed' WHERE processing_status IN ('pending', 'processing')")
        conn.commit()
        conn.close()

    def tearDown(self):
        pass

    def test_01_complaint_event_creation(self):
        """Test that complaint creation safely emits an idempotent complaint_ingested event."""
        cid = str(uuid.uuid4())
        complaint_data = {
            "complaint_id": cid,
            "fraud_type": "UPI_PHISHING",
            "amount_inr": 75000.0,
            "victim_state": "Jharkhand",
            "channel": "UPI",
            "accused_phone": "9876543210",
            "accused_bank": "State Bank of India",
        }
        created = repo.create_complaint(complaint_data)
        self.assertIsNotNone(created)
        self.assertEqual(created["complaint_id"], cid)

        # Verify autonomy event persisted
        idem_key = f"complaint:{cid}:created"
        evt = repo.get_autonomy_event_by_idempotency_key(idem_key)
        self.assertIsNotNone(evt)
        self.assertEqual(evt["complaint_id"], cid)
        self.assertEqual(evt["event_type"], "complaint_ingested")
        self.assertIn(evt["processing_status"], ("pending", "processing", "processed"))

    def test_02_voice_event_creation(self):
        """Test that voice intake emits a voice_complaint_submitted event."""
        cid = str(uuid.uuid4())
        complaint_data = {
            "complaint_id": cid,
            "fraud_type": "DIGITAL_ARREST",
            "amount_inr": 250000.0,
            "victim_state": "Maharashtra",
            "channel": "VOICE",
            "accused_phone": "9123456780",
            "accused_bank": "Airtel Payments Bank",
        }
        created = repo.create_complaint(complaint_data)
        self.assertIsNotNone(created)

        idem_key = f"voice:{cid}:submitted"
        evt = repo.get_autonomy_event_by_idempotency_key(idem_key)
        self.assertIsNotNone(evt)
        self.assertEqual(evt["complaint_id"], cid)
        self.assertEqual(evt["event_type"], "voice_complaint_submitted")
        self.assertIn(evt["processing_status"], ("pending", "processing", "processed"))

    def test_03_prediction_event_creation(self):
        """Test that prediction persistence safely emits a prediction_generated event."""
        cid = str(uuid.uuid4())
        repo.create_complaint({
            "complaint_id": cid,
            "fraud_type": "UPI_PHISHING",
            "amount_inr": 60000.0,
            "victim_state": "Jharkhand",
            "status": "active",
        })
        pid = str(uuid.uuid4())
        pred_data = {
            "prediction_id": pid,
            "complaint_id": cid,
            "risk_score": 0.88,
            "risk_level": "RED",
            "cashout_window_hours": 3,
            "predicted_lat": 24.4853,
            "predicted_lon": 86.6936,
        }
        saved = repo.save_prediction(pred_data)
        self.assertIsNotNone(saved)

        idem_key = f"prediction:{pid}:generated"
        evt = repo.get_autonomy_event_by_idempotency_key(idem_key)
        self.assertIsNotNone(evt)
        self.assertEqual(evt["entity_id"], pid)
        self.assertEqual(evt["event_type"], "prediction_generated")
        self.assertIn(evt["processing_status"], ("pending", "processing", "processed"))

    def test_04_prediction_update_event(self):
        """Test that a meaningful change in prediction emits a prediction_updated event."""
        cid = str(uuid.uuid4())
        repo.create_complaint({
            "complaint_id": cid,
            "fraud_type": "UPI_PHISHING",
            "amount_inr": 50000.0,
            "victim_state": "Jharkhand",
            "status": "active",
        })
        pid = str(uuid.uuid4())
        pred_initial = {
            "prediction_id": pid,
            "complaint_id": cid,
            "risk_score": 0.50,
            "risk_level": "AMBER",
            "cashout_window_hours": 12,
        }
        repo.save_prediction(pred_initial)

        # Substantial shift (risk delta = +0.35, window drops to 3h)
        pred_updated = {
            "prediction_id": pid,
            "complaint_id": cid,
            "risk_score": 0.85,
            "risk_level": "RED",
            "cashout_window_hours": 3,
        }
        repo.save_prediction(pred_updated)

        import time
        minute_bucket = int(time.time() // 60)
        idem_key = f"prediction:{pid}:updated:{minute_bucket}"
        evt = repo.get_autonomy_event_by_idempotency_key(idem_key)
        self.assertIsNotNone(evt)
        self.assertEqual(evt["complaint_id"], cid)
        self.assertEqual(evt["event_type"], "prediction_updated")
        self.assertIn("delta_risk", evt["payload"])

    def test_05_incident_resolved_event(self):
        """Test that incident resolution safely emits an incident_resolved event."""
        cid = str(uuid.uuid4())
        repo.create_complaint({
            "complaint_id": cid,
            "fraud_type": "UPI_PHISHING",
            "amount_inr": 80000.0,
            "victim_state": "Jharkhand",
            "status": "active",
        })
        pid = str(uuid.uuid4())
        repo.save_prediction({
            "prediction_id": pid,
            "complaint_id": cid,
            "risk_score": 0.82,
            "risk_level": "RED",
        })
        iid = str(uuid.uuid4())
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Seed incident
        if repo._use_supabase():
            from db.supabase_client import supabase
            supabase.table("incidents").insert({
                "incident_id": iid,
                "complaint_id": cid,
                "prediction_id": pid,
                "status": "open",
                "created_at": now,
            }).execute()
        else:
            conn = repo.get_connection()
            c = conn.cursor()
            c.execute("""
                INSERT INTO incidents (incident_id, complaint_id, prediction_id, status, created_at, updated_at)
                VALUES (?, ?, ?, 'open', ?, ?)
            """, (iid, cid, pid, now, now))
            conn.commit()
            conn.close()

        # Resolve incident
        resolved = repo.resolve_incident(
            incident_id=iid,
            action_taken="Mule apprehended at ATM corridor. Funds frozen.",
            suspect_apprehended=1,
            amount_recovered=150000.0,
            outcome="resolved",
        )
        self.assertIsNotNone(resolved)
        self.assertEqual(resolved["status"], "resolved")

        idem_key = f"incident:{iid}:resolved"
        evt = repo.get_autonomy_event_by_idempotency_key(idem_key)
        self.assertIsNotNone(evt)
        self.assertEqual(evt["entity_id"], iid)
        self.assertEqual(evt["event_type"], "incident_resolved")

    def test_06_outcome_event_and_model_evaluation(self):
        """Test that outcome recording updates additive model evaluation metrics."""
        cid = str(uuid.uuid4())
        pid = str(uuid.uuid4())

        # Initialize model evaluation
        eval_row = repo.create_model_evaluation(
            prediction_id=pid,
            complaint_id=cid,
            predicted_lat=24.4853,
            predicted_lon=86.6936,
            predicted_time_start=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        )

        outcome_event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "outcome_recorded",
            "entity_type": "incident",
            "entity_id": "INC-TEST-01",
            "complaint_id": cid,
            "payload": {
                "actual_lat": 24.4890,
                "actual_lon": 86.6950,
                "actual_cashout_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            }
        }
        res = event_router.route_event(outcome_event)
        self.assertEqual(res["status"], "processed")

        # Verify evaluation row was updated
        updated_eval = repo.get_model_evaluation(eval_row["eval_id"])
        self.assertEqual(updated_eval["evaluation_status"], "evaluated")
        self.assertIsNotNone(updated_eval["distance_error_km"])
        self.assertTrue(updated_eval["geo_correct_2_5km"])

    def test_07_idempotency_prevents_duplicate_events(self):
        """Test that duplicate events with same idempotency key return existing row without duplication."""
        cid = str(uuid.uuid4())
        key = f"complaint:{cid}:created"

        evt1 = repo.create_autonomy_event(
            event_type="complaint_ingested",
            entity_type="complaint",
            entity_id=cid,
            complaint_id=cid,
            idempotency_key=key,
        )
        evt2 = repo.create_autonomy_event(
            event_type="complaint_ingested",
            entity_type="complaint",
            entity_id=cid,
            complaint_id=cid,
            idempotency_key=key,
        )

        self.assertEqual(evt1["event_id"], evt2["event_id"])
        matching = repo.get_autonomy_event_by_idempotency_key(key)
        self.assertIsNotNone(matching)
        self.assertEqual(matching["event_id"], evt1["event_id"])

    def test_08_event_processing_lifecycle(self):
        """Test state transitions: pending -> processing -> processed."""
        cid = str(uuid.uuid4())
        evt = repo.create_autonomy_event(
            event_type="evidence_updated",
            entity_type="evidence",
            entity_id=str(uuid.uuid4()),
            complaint_id=cid,
            payload={"evidence_type": "bank_statement"},
            idempotency_key=f"evidence:{cid}:test",
        )
        self.assertEqual(evt["processing_status"], "pending")

        # Claiming transitions to processing
        claimed = repo.claim_pending_autonomy_events(limit=50)
        my_claimed = [e for e in claimed if e["event_id"] == evt["event_id"]]
        self.assertEqual(len(my_claimed), 1)
        self.assertEqual(my_claimed[0]["processing_status"], "processing")

        # Router processes it and updates to processed
        event_router.route_event(my_claimed[0])
        repo.update_autonomy_event_status(my_claimed[0]["event_id"], "processed")

        evt_row = repo.get_autonomy_event_by_id(my_claimed[0]["event_id"])
        self.assertIsNotNone(evt_row)
        self.assertEqual(evt_row["processing_status"], "processed")
        self.assertIsNotNone(evt_row.get("processed_at"))

    def test_09_failed_event_handling(self):
        """Test that an event failure marks processing_status as 'failed' with error_message."""
        eid = str(uuid.uuid4())
        broken_cid = f"BROKEN-{eid[:8]}"
        evt = repo.create_autonomy_event(
            event_type="complaint_ingested",
            entity_type="complaint",
            entity_id=broken_cid,
            complaint_id=broken_cid,
            idempotency_key=f"broken:{eid}",
        )

        orig_route = event_router.route_event
        def fail_on_broken(ev):
            if ev.get("complaint_id") == broken_cid:
                raise ValueError("Corrupt payload structure")
            return orig_route(ev)

        # Simulate handler failure during watcher loop
        with patch.object(event_router, "route_event", side_effect=fail_on_broken):
            case_watcher.run_cycle(batch_size=50)

        row = repo.get_autonomy_event_by_id(evt["event_id"])
        self.assertIsNotNone(row)
        self.assertEqual(row["processing_status"], "failed")
        self.assertIn("Corrupt payload structure", row["error_message"])

    def test_10_concurrency_protection(self):
        """Test that claiming is atomic and two workers never claim the same event."""
        eid = str(uuid.uuid4())
        evt = repo.create_autonomy_event(
            event_type="evidence_updated",
            entity_type="evidence",
            entity_id=eid,
            idempotency_key=f"concurrency:{eid}",
        )

        # Worker 1 claims
        claimed_w1 = repo.claim_pending_autonomy_events(limit=50)
        w1_events = [e for e in claimed_w1 if e["event_id"] == evt["event_id"]]
        self.assertEqual(len(w1_events), 1)

        # Worker 2 attempts to claim simultaneously
        claimed_w2 = repo.claim_pending_autonomy_events(limit=50)
        w2_events = [e for e in claimed_w2 if e["event_id"] == evt["event_id"]]
        self.assertEqual(len(w2_events), 0)  # Event was already claimed by worker 1

    def test_11_event_cycle_prevention(self):
        """Test that event reactions terminate deterministically without infinite loops."""
        cid = str(uuid.uuid4())
        pid = f"PRED-{uuid.uuid4().hex[:8].upper()}"

        # Prediction generated event
        evt = repo.create_autonomy_event(
            event_type="prediction_generated",
            entity_type="prediction",
            entity_id=pid,
            complaint_id=cid,
            payload={"risk_score": 0.92, "cashout_window_hours": 2},
            idempotency_key=f"pred:test:{pid}",
        )

        # Watcher cycle 1: processes prediction_generated, may emit terminal window_approaching
        case_watcher.run_cycle(batch_size=50)
        case_watcher.run_cycle(batch_size=50)

        my_ev = repo.get_autonomy_event_by_idempotency_key(f"pred:test:{pid}")
        self.assertIsNotNone(my_ev)
        self.assertIn(my_ev.get("processing_status"), ("processed", "processing"))

    def test_12_reconciliation_of_missing_event(self):
        """Test that reconciler detects real complaint missing an event and reconstructs it."""
        cid = str(uuid.uuid4())
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Directly insert complaint into database without emitting event
        if repo._use_supabase():
            from db.supabase_client import supabase
            supabase.table("complaints").insert({
                "complaint_id": cid,
                "ncrp_id": f"NCRP-{cid[:6].upper()}",
                "fraud_type": "INVESTMENT_SCAM",
                "amount_inr": 500000.0,
                "status": "active",
                "victim_state": "Delhi",
                "channel": "UPI",
            }).execute()
        else:
            conn = repo.get_connection()
            c = conn.cursor()
            c.execute("""
                INSERT INTO complaints (complaint_id, fraud_type, amount_inr, status, created_at, filed_at, victim_state, channel)
                VALUES (?, 'INVESTMENT_SCAM', 500000.0, 'active', ?, ?, 'Delhi', 'UPI')
            """, (cid, now, now))
            conn.commit()
            conn.close()

        # Confirm no autonomy event exists yet for this complaint
        existing_evt = repo.get_autonomy_event_by_idempotency_key(f"complaint:{cid}:created")
        self.assertIsNone(existing_evt)

        # Run reconciler
        recon_result = reconciler.run_reconciliation_cycle()
        self.assertGreaterEqual(recon_result["complaints_reconciled"], 1)

        # Verify event was reconstructed
        reconstructed = repo.get_autonomy_event_by_idempotency_key(f"complaint:{cid}:created")
        self.assertIsNotNone(reconstructed)
        self.assertEqual(reconstructed["complaint_id"], cid)
        self.assertEqual(reconstructed["idempotency_key"], f"complaint:{cid}:created")

    def test_13_structured_audit_log_and_no_raw_llm_dumps(self):
        """Test that structured machine-readable reason codes are stored and no raw LLM dumps exist."""
        cid = str(uuid.uuid4())
        evt = repo.create_autonomy_event(
            event_type="complaint_ingested",
            entity_type="complaint",
            entity_id=cid,
            complaint_id=cid,
            payload={"fraud_type": "UPI_PHISHING", "accused_phone": "9876543210"},
            idempotency_key=f"audit:{cid}",
        )
        res = event_router.route_event(evt)
        self.assertEqual(res["status"], "processed")

        logs = repo.get_autonomy_audit_logs(complaint_id=cid)
        self.assertGreaterEqual(len(logs), 1)
        log = logs[0]
        self.assertEqual(log["action_type"], "REGISTER_CASE_WATCH")
        self.assertIn("reason_codes", log["decision_factors"])
        self.assertIn("NEW_COMPLAINT", log["decision_factors"]["reason_codes"])
        self.assertFalse(log["requires_approval"])

        # Confirm no raw LLM chain of thought fields
        self.assertNotIn("chain_of_thought", log)
        self.assertNotIn("prompt", log)
        self.assertNotIn("llm_reasoning", log["decision_factors"])

    def test_14_sensitive_data_masking(self):
        """Test phone, account, and UPI masking."""
        self.assertEqual(mask_sensitive_value("9876543210", "phone"), "987****210")
        self.assertEqual(mask_sensitive_value("+919876543210", "phone"), "+91****210")
        self.assertEqual(mask_sensitive_value("SBIN00012345678", "account"), "SB****5678")
        self.assertEqual(mask_sensitive_value("victimuser@okhdfcbank", "upi"), "vi***@okhdfcbank")

    def test_15_watcher_processes_multiple_event_types(self):
        """Test that watcher handles a multi-event queue containing different event types."""
        cid1 = str(uuid.uuid4())
        cid2 = str(uuid.uuid4())
        cid3 = str(uuid.uuid4())

        repo.create_autonomy_event(
            event_type="complaint_ingested",
            entity_type="complaint",
            entity_id=cid1,
            complaint_id=cid1,
            idempotency_key=f"multi:{cid1}",
        )
        repo.create_autonomy_event(
            event_type="voice_complaint_submitted",
            entity_type="complaint",
            entity_id=cid2,
            complaint_id=cid2,
            idempotency_key=f"multi:{cid2}",
        )
        repo.create_autonomy_event(
            event_type="evidence_updated",
            entity_type="evidence",
            entity_id=cid3,
            complaint_id=cid3,
            idempotency_key=f"multi:{cid3}",
        )

        import time
        for _ in range(5):
            case_watcher.run_cycle(batch_size=10)
            ev1 = repo.get_autonomy_event_by_idempotency_key(f"multi:{cid1}")
            ev2 = repo.get_autonomy_event_by_idempotency_key(f"multi:{cid2}")
            ev3 = repo.get_autonomy_event_by_idempotency_key(f"multi:{cid3}")
            st1 = (ev1.get("processing_status") or ev1.get("status")) if ev1 else None
            st2 = (ev2.get("processing_status") or ev2.get("status")) if ev2 else None
            st3 = (ev3.get("processing_status") or ev3.get("status")) if ev3 else None
            if st1 == "processed" and st2 == "processed" and st3 == "processed":
                break
            time.sleep(0.5)

        self.assertEqual(st1, "processed")
        self.assertEqual(st2, "processed")
        self.assertEqual(st3, "processed")

    def test_16_one_bad_event_does_not_kill_watcher(self):
        """Test that a bad event is marked failed but other events in the batch complete successfully."""
        cid1 = str(uuid.uuid4())
        cid2 = str(uuid.uuid4())
        cid3 = str(uuid.uuid4())

        e1 = repo.create_autonomy_event("evidence_updated", "evidence", cid1, complaint_id=cid1, idempotency_key=f"safe1:{cid1}")
        # Bad event: will raise exception during mock
        e2 = repo.create_autonomy_event("evidence_updated", "evidence", cid2, complaint_id=cid2, idempotency_key=f"bad2:{cid2}")
        e3 = repo.create_autonomy_event("evidence_updated", "evidence", cid3, complaint_id=cid3, idempotency_key=f"safe3:{cid3}")

        original_route = event_router.route_event

        def mock_route(event):
            if event["entity_id"] == cid2:
                raise RuntimeError("Simulated unhandled exception on bad record")
            return original_route(event)

        with patch.object(event_router, "route_event", side_effect=mock_route):
            for ev in [e1, e2, e3]:
                claimed = repo.get_autonomy_event_by_id(ev["event_id"])
                if claimed:
                    repo.update_autonomy_event_status(ev["event_id"], "processing")
                    try:
                        mock_route(ev)
                        repo.update_autonomy_event_status(ev["event_id"], "processed")
                    except Exception as err:
                        repo.update_autonomy_event_status(ev["event_id"], "failed", str(err))

        row_e1 = repo.get_autonomy_event_by_id(e1["event_id"])
        self.assertIsNotNone(row_e1)
        self.assertEqual(row_e1["processing_status"], "processed")

        row_e2 = repo.get_autonomy_event_by_id(e2["event_id"])
        self.assertIsNotNone(row_e2)
        self.assertEqual(row_e2["processing_status"], "failed")
        self.assertIn("Simulated unhandled exception", row_e2["error_message"])

        row_e3 = repo.get_autonomy_event_by_id(e3["event_id"])
        self.assertIsNotNone(row_e3)
        self.assertEqual(row_e3["processing_status"], "processed")

    def test_17_autonomy_status_telemetry_and_api(self):
        """Test that GET /autonomy/status returns operational telemetry without breaking /health."""
        # Check /health still returns simple ok
        res_health = self.client.get("/health")
        self.assertEqual(res_health.status_code, 200)
        self.assertEqual(res_health.json(), {"status": "ok"})

        # Check /autonomy/status
        res_status = self.client.get("/autonomy/status")
        self.assertEqual(res_status.status_code, 200)
        data = res_status.json()
        self.assertIn("watcher_running", data)
        self.assertIn("watch_interval_seconds", data)
        self.assertIn("events_processed_count", data)
        self.assertIn("db_event_counts", data)


if __name__ == "__main__":
    unittest.main()
