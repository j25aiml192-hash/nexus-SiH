import os
import sys
import unittest
import uuid
import datetime

# Ensure backend root is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from db import repo

class TestTruthGraphAndAutonomyDataFoundation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Ensure SQLite tables exist for local testing
        repo.init_db()

    # =========================================================================
    # 1. TRUTH GRAPH: DETERMINISTIC ENTITY CREATION & SENSITIVE DATA PROTECTION
    # =========================================================================

    def test_deterministic_entity_resolution_and_masking(self):
        """Test that same phone number creates same canonical reference and is masked."""
        raw_phone = "+91 9876543210"
        canon, fp, masked = repo.normalize_entity_identity("phone", raw_phone)

        # Phone must be masked: ******3210
        self.assertEqual(masked, "******3210")
        self.assertNotIn("987654", masked)
        self.assertTrue(canon.startswith("phone:"))
        self.assertEqual(len(fp), 64)  # Valid SHA-256

        # Second normalization with different formatting must match
        canon2, fp2, masked2 = repo.normalize_entity_identity("phone", "98765-43210")
        self.assertEqual(canon, canon2)
        self.assertEqual(fp, fp2)
        self.assertEqual(masked, masked2)

        # Persist entity
        ent1 = repo.create_or_get_truth_entity("phone", raw_phone, {"source": "call_1"})
        ent2 = repo.create_or_get_truth_entity("phone", "98765-43210", {"source": "call_2"})

        # Must resolve to identical entity_id
        self.assertEqual(ent1["entity_id"], ent2["entity_id"])
        self.assertEqual(ent1["canonical_reference"], ent2["canonical_reference"])
        self.assertEqual(ent1["masked_value"], "******3210")

    def test_bank_account_and_upi_identity_normalization(self):
        """Test bank account and UPI deterministic normalization."""
        raw_account = "HDFC-001234567890"
        canon_acc, fp_acc, masked_acc = repo.normalize_entity_identity("bank_account", raw_account)
        self.assertTrue(canon_acc.startswith("account:"))
        self.assertTrue(masked_acc.endswith("7890"))
        self.assertTrue(set(masked_acc[:-4]) == {"*"})

        raw_upi = "suspect.mule@okaxis"
        canon_upi, fp_upi, masked_upi = repo.normalize_entity_identity("upi_id", raw_upi)
        self.assertTrue(canon_upi.startswith("upi:"))
        self.assertEqual(masked_upi, "***@okaxis")

    def test_cross_case_entity_matching(self):
        """Test that PHONE A in Complaint 1 matches PHONE A in Complaint 27."""
        complaint_1 = str(uuid.uuid4())
        complaint_27 = str(uuid.uuid4())
        suspect_phone = "7091234567"

        ent_c1 = repo.create_or_get_truth_entity("phone", suspect_phone, {"complaint_id": complaint_1})
        ent_c27 = repo.create_or_get_truth_entity("phone", suspect_phone, {"complaint_id": complaint_27})

        self.assertEqual(ent_c1["entity_id"], ent_c27["entity_id"])
        self.assertEqual(ent_c1["masked_value"], "******4567")

        # Create relations linking the same phone entity to both complaints
        comp_ent1 = repo.create_or_get_truth_entity("complaint", complaint_1)
        comp_ent27 = repo.create_or_get_truth_entity("complaint", complaint_27)

        rel1 = repo.create_truth_relation(
            source_entity_id=ent_c1["entity_id"],
            target_entity_id=comp_ent1["entity_id"],
            relation_type="APPEARED_IN_COMPLAINT",
            complaint_id=complaint_1,
            source_record_type="complaints",
            source_record_id=complaint_1,
        )
        rel2 = repo.create_truth_relation(
            source_entity_id=ent_c27["entity_id"],
            target_entity_id=comp_ent27["entity_id"],
            relation_type="APPEARED_IN_COMPLAINT",
            complaint_id=complaint_27,
            source_record_type="complaints",
            source_record_id=complaint_27,
        )

        cross_links = repo.get_entity_cross_case_links(ent_c1["entity_id"])
        self.assertGreaterEqual(cross_links["cross_case_count"], 2)
        self.assertIn(complaint_1, cross_links["linked_complaints"])
        self.assertIn(complaint_27, cross_links["linked_complaints"])

    # =========================================================================
    # 2. TRUTH GRAPH: RELATIONS WITH PROVENANCE & FACT VS INFERENCE SEMANTICS
    # =========================================================================

    def test_truth_relations_provenance_and_semantics(self):
        """Test provenance-backed edges and semantic levels (DIRECT_OBSERVED vs INFERRED)."""
        acc1 = repo.create_or_get_truth_entity("bank_account", "SBIN0001234567")
        acc2 = repo.create_or_get_truth_entity("bank_account", "PUNB0007654321")

        # Direct observed relation (transaction)
        rel_direct = repo.create_truth_relation(
            source_entity_id=acc1["entity_id"],
            target_entity_id=acc2["entity_id"],
            relation_type="SENT_FUNDS_TO",
            semantic_level="DIRECT_OBSERVED",
            source_record_type="transactions",
            source_record_id="TXN-998877",
            confidence=1.0,
            evidence_metadata={"amount_inr": 45000, "utr": "UTR123456"},
        )
        self.assertEqual(rel_direct["semantic_level"], "DIRECT_OBSERVED")
        self.assertEqual(rel_direct["confidence"], 1.0)
        self.assertEqual(rel_direct["source_record_id"], "TXN-998877")

        # Inferred relation (shared operational network)
        rel_inferred = repo.create_truth_relation(
            source_entity_id=acc1["entity_id"],
            target_entity_id=acc2["entity_id"],
            relation_type="USED_INFRASTRUCTURE",
            semantic_level="INFERRED",
            source_record_type="analysis",
            source_record_id="CLUSTER-INFRA-1",
            confidence=0.75,
            evidence_metadata={"reason": "Overlapping withdrawal corridor within 15km"},
        )
        self.assertEqual(rel_inferred["semantic_level"], "INFERRED")
        self.assertEqual(rel_inferred["confidence"], 0.75)

    # =========================================================================
    # 3. INFERRED POTENTIAL NETWORKS (WITHOUT OVERLOADING AUTHORITATIVE SYNDICATES)
    # =========================================================================

    def test_potential_network_clusters_and_members(self):
        """Test inferred network cluster creation and membership."""
        cluster = repo.create_potential_network_cluster(
            cluster_label="POTENTIAL-NET-DEOGHAR-01",
            cluster_type="POTENTIAL_SHARED_INFRASTRUCTURE",
            status="candidate",
            confidence_score=0.82,
            summary_metadata={"corridor": "Deoghar-Jamtara", "dominant_bank": "State Bank of India"},
        )
        cid = cluster["cluster_id"]
        self.assertTrue(bool(cid))
        self.assertEqual(cluster["status"], "candidate")

        # Add member entity and member complaint
        device_ent = repo.create_or_get_truth_entity("device", "A1B2C3D4E5F6")
        comp_id = str(uuid.uuid4())

        m1 = repo.add_potential_network_member(
            cluster_id=cid,
            member_type="entity",
            entity_id=device_ent["entity_id"],
            evidence_basis="SHARED_DEVICE_FINGERPRINT",
            confidence=0.95,
        )
        m2 = repo.add_potential_network_member(
            cluster_id=cid,
            member_type="complaint",
            complaint_id=comp_id,
            evidence_basis="SHARED_ATM_CORRIDOR",
            confidence=0.80,
        )

        self.assertEqual(m1["cluster_id"], cid)
        self.assertEqual(m2["complaint_id"], comp_id)

        clusters = repo.get_potential_network_clusters(limit=10)
        self.assertTrue(any(c["cluster_id"] == cid for c in clusters))

    # =========================================================================
    # 4. AUTONOMY EVENT OUTBOX: IDEMPOTENCY & STATUS
    # =========================================================================

    def test_autonomy_events_idempotency_and_status(self):
        """Test event persistence, idempotency key guarantees, and status transitions."""
        comp_id = str(uuid.uuid4())
        idem_key = f"evt:complaint_ingested:{comp_id}"

        # Insert first time
        evt1 = repo.create_autonomy_event(
            event_type="complaint_ingested",
            entity_type="complaint",
            entity_id=comp_id,
            complaint_id=comp_id,
            payload={"amount_inr": 50000, "fraud_type": "UPI_PHISHING"},
            idempotency_key=idem_key,
        )
        self.assertEqual(evt1["processing_status"], "pending")
        self.assertEqual(evt1["idempotency_key"], idem_key)

        # Duplicate insert attempt must return the EXACT same event without duplicating
        evt2 = repo.create_autonomy_event(
            event_type="complaint_ingested",
            entity_type="complaint",
            entity_id=comp_id,
            complaint_id=comp_id,
            payload={"amount_inr": 50000},
            idempotency_key=idem_key,
        )
        self.assertEqual(evt1["event_id"], evt2["event_id"])

        # Status transition to processed
        updated = repo.update_autonomy_event_status(evt1["event_id"], "processed")
        self.assertEqual(updated["processing_status"], "processed")
        self.assertIsNotNone(updated["processed_at"])

    # =========================================================================
    # 5. AUTONOMY AUDIT LOG: MACHINE-READABLE REASON CODES (NO HIDDEN LLM DUMPS)
    # =========================================================================

    def test_autonomy_audit_log_structured_reason_codes(self):
        """Test audit log persistence with machine-readable reason codes."""
        comp_id = str(uuid.uuid4())
        audit = repo.create_autonomy_audit_log(
            trigger_event_type="operational_window_approaching",
            action_type="PRIORITY_ESCALATION",
            decision_factors={
                "reason_codes": [
                    "CASHOUT_WINDOW_LESS_THAN_2_HOURS",
                    "SHARED_DEVICE_CORROBORATION",
                    "HIGH_RECOVERY_SCORE",
                ],
                "recovery_score": 92.5,
            },
            complaint_id=comp_id,
            requires_approval=False,
            approval_status="not_required",
        )
        self.assertTrue(bool(audit["log_id"]))
        self.assertEqual(audit["action_type"], "PRIORITY_ESCALATION")
        self.assertIn("CASHOUT_WINDOW_LESS_THAN_2_HOURS", audit["decision_factors"]["reason_codes"])

        logs = repo.get_autonomy_audit_logs(complaint_id=comp_id)
        self.assertTrue(len(logs) > 0)
        self.assertEqual(logs[0]["log_id"], audit["log_id"])

    # =========================================================================
    # 6. VICTIM PROACTIVE ADVISORIES
    # =========================================================================

    def test_victim_advisory_persistence_and_masking(self):
        """Test victim advisory persistence with masked phone reference and versioning."""
        comp_id = str(uuid.uuid4())
        masked_phone = "******3210"

        adv = repo.create_victim_advisory(
            complaint_id=comp_id,
            phone_number_masked=masked_phone,
            channel="SMS",
            advisory_type="IMMEDIATE_OTP_WARNING",
            advisory_text="NCRP Alert: Never share OTPs or click unverified links. For cyber fraud assistance, dial 1930.",
            advisory_version="v1.0",
        )
        self.assertTrue(bool(adv["advisory_id"]))
        self.assertEqual(adv["phone_number_masked"], "******3210")
        self.assertEqual(adv["delivery_status"], "queued")
        self.assertEqual(adv["advisory_version"], "v1.0")

        advisories = repo.get_victim_advisories(complaint_id=comp_id)
        self.assertEqual(len(advisories), 1)
        self.assertEqual(advisories[0]["advisory_id"], adv["advisory_id"])

    # =========================================================================
    # 7. MODEL EVALUATIONS: PREDICTION OUTCOME COMPARISON WITHOUT OVERWRITING
    # =========================================================================

    def test_model_evaluation_lifecycle_preserves_prediction(self):
        """Test outcome evaluation compares actuals against predictions without modifying predictions."""
        pred_id = str(uuid.uuid4())
        comp_id = str(uuid.uuid4())

        # 1. Create baseline evaluation when prediction is generated
        pred_lat, pred_lon = 24.4853, 86.6936  # Deoghar
        now = datetime.datetime.now(datetime.timezone.utc)
        time_start = now.isoformat()
        time_end = (now + datetime.timedelta(hours=4)).isoformat()

        eval_rec = repo.create_model_evaluation(
            prediction_id=pred_id,
            complaint_id=comp_id,
            predicted_lat=pred_lat,
            predicted_lon=pred_lon,
            predicted_time_start=time_start,
            predicted_time_end=time_end,
        )
        self.assertEqual(eval_rec["evaluation_status"], "pending")
        self.assertEqual(eval_rec["predicted_lat"], pred_lat)
        self.assertEqual(eval_rec["predicted_lon"], pred_lon)

        # 2. Later, when field ground truth is recorded: Actual cashout happened 1.2 km away
        actual_lat, actual_lon = 24.4920, 86.7010
        actual_time = (now + datetime.timedelta(hours=2)).isoformat()

        updated_eval = repo.update_model_evaluation_outcome(
            eval_id=eval_rec["eval_id"],
            actual_lat=actual_lat,
            actual_lon=actual_lon,
            actual_cashout_at=actual_time,
        )

        self.assertEqual(updated_eval["evaluation_status"], "evaluated")
        self.assertIsNotNone(updated_eval["distance_error_km"])
        self.assertLess(updated_eval["distance_error_km"], 2.5)  # Within 2.5 km
        self.assertTrue(updated_eval["geo_correct_2_5km"])       # True
        self.assertTrue(updated_eval["time_correct_window"])      # True: within 4h window
        self.assertEqual(updated_eval["predicted_lat"], pred_lat) # PREDICTION PRESERVED!


if __name__ == "__main__":
    unittest.main()
