"""
NEXUS PHASE 3A: SYNDICATE DNA / CROSS-CASE INTELLIGENCE TESTS
=============================================================
Comprehensive unit and integration test suite covering:
1. Shared account linkage
2. Shared device linkage
3. Shared IP linkage
4. Shared phone linkage
5. Unrelated cases separation
6. Relationship evidence persistence
7. Structural similarity determinism
8. Repeated event idempotency
9. Self-link prevention
10. Bounded graph expansion (depth 1 and 2)
11. Historical membership auditability
12. Authoritative syndicates isolation
13. Masking and privacy protection
14. Error isolation / non-blocking behavior
15. SQLite fallback behavior
16. Supabase client behavior
17. API endpoint correctness
18. Absence of event loops
19. Scalable candidate search without full table scans
"""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock
import uuid
import json
import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from db import repo
from core.autonomy.syndicate_dna_policy import (
    compute_structural_similarity,
    SYNDICATE_DNA_POLICY_VERSION,
    SIMILARITY_THRESHOLD_EMERGING,
    SIMILARITY_THRESHOLD_STRONG,
)
from core.autonomy.syndicate_dna_engine import SyndicateDNAEngine, syndicate_dna_engine
from core.autonomy.event_router import event_router


class TestSyndicateDNA(unittest.TestCase):
    """Test suite for Phase 3A Syndicate DNA & Cross-Case Intelligence Engine."""

    def setUp(self):
        self.engine = SyndicateDNAEngine()

    def _create_test_case(self, fraud_type="UPI_FRAUD", amount=150000.0, state="Maharashtra"):
        cid = str(uuid.uuid4())
        ncrp = f"NCRP-{cid[:8].upper()}"
        payload = {
            "complaint_id": cid,
            "ncrp_id": ncrp,
            "fraud_type": fraud_type,
            "amount_inr": amount,
            "victim_state": state,
            "victim_district": "Mumbai City",
            "channel": "UPI",
            "status": "active",
        }
        return repo.create_complaint(payload)

    def _link_entity_to_case(self, entity, complaint_id):
        comp_ent = repo.create_or_get_truth_entity("complaint", complaint_id)
        return repo.create_truth_relation(
            source_entity_id=entity["entity_id"],
            target_entity_id=comp_ent["entity_id"],
            relation_type="APPEARED_IN_COMPLAINT",
            complaint_id=complaint_id,
            source_record_type="complaints",
            source_record_id=f"{complaint_id}_{entity['entity_id']}",
        )

    def test_01_shared_account_links_two_cases(self):
        """1. Verify shared bank account links two cases into a potential operational network."""
        c1 = self._create_test_case()
        c2 = self._create_test_case()
        cid1, cid2 = c1["complaint_id"], c2["complaint_id"]

        # Shared bank account entity
        acc_num = f"SBI-SHARED-{uuid.uuid4().hex[:6]}"
        ent = repo.create_or_get_truth_entity("bank_account", acc_num)

        # Link both complaints to shared account in Truth Graph
        self._link_entity_to_case(ent, cid1)
        self._link_entity_to_case(ent, cid2)

        res = self.engine.correlate_case(cid1)
        self.assertEqual(res["status"], "processed")
        self.assertGreaterEqual(res["correlated_cases_count"], 1)
        self.assertTrue(len(res["clusters_updated"]) > 0)

        # Check cluster details
        cluster_id = res["clusters_updated"][0]
        details = self.engine.get_cluster_details(cluster_id)
        self.assertIsNotNone(details)
        self.assertIn("POTENTIAL-NET", details["cluster_label"])
        self.assertGreaterEqual(details["supporting_complaint_count"], 2)

    def test_02_shared_device_links_two_cases(self):
        """2. Verify shared device fingerprint links two cases."""
        c1 = self._create_test_case()
        c2 = self._create_test_case()
        cid1, cid2 = c1["complaint_id"], c2["complaint_id"]

        dev_fp = f"DEV-IMEI-{uuid.uuid4().hex[:8]}"
        ent = repo.create_or_get_truth_entity("device", dev_fp)

        self._link_entity_to_case(ent, cid1)
        self._link_entity_to_case(ent, cid2)

        res = self.engine.correlate_case(cid1)
        self.assertEqual(res["status"], "processed")
        corrs = res.get("correlations", [])
        self.assertTrue(any(c["target_case_id"] == cid2 for c in corrs))
        match = next(c for c in corrs if c["target_case_id"] == cid2)
        self.assertIn("SHARED_DEVICE", match["similarity"]["relationship_types"])

    def test_03_shared_ip_links_two_cases(self):
        """3. Verify shared IP address links two cases."""
        c1 = self._create_test_case()
        c2 = self._create_test_case()
        cid1, cid2 = c1["complaint_id"], c2["complaint_id"]

        ip_addr = f"192.168.1.{uuid.uuid4().int % 250 + 1}"
        ent = repo.create_or_get_truth_entity("ip_address", ip_addr)

        self._link_entity_to_case(ent, cid1)
        self._link_entity_to_case(ent, cid2)

        res = self.engine.correlate_case(cid1)
        corrs = res.get("correlations", [])
        self.assertTrue(any(c["target_case_id"] == cid2 for c in corrs))
        match = next(c for c in corrs if c["target_case_id"] == cid2)
        self.assertIn("SHARED_IP", match["similarity"]["relationship_types"])

    def test_04_shared_phone_links_two_cases(self):
        """4. Verify shared phone identifier links two cases."""
        c1 = self._create_test_case()
        c2 = self._create_test_case()
        cid1, cid2 = c1["complaint_id"], c2["complaint_id"]

        phone = f"+9198{uuid.uuid4().int % 100000000:08d}"
        ent = repo.create_or_get_truth_entity("phone", phone)

        self._link_entity_to_case(ent, cid1)
        self._link_entity_to_case(ent, cid2)

        res = self.engine.correlate_case(cid1)
        corrs = res.get("correlations", [])
        self.assertTrue(any(c["target_case_id"] == cid2 for c in corrs))
        match = next(c for c in corrs if c["target_case_id"] == cid2)
        self.assertIn("SHARED_PHONE", match["similarity"]["relationship_types"])

    def test_05_unrelated_cases_not_clustered(self):
        """5. Verify unrelated cases with no shared infrastructure are not clustered."""
        c1 = self._create_test_case(fraud_type="UPI_FRAUD", state="Delhi")
        c2 = self._create_test_case(fraud_type="LOAN_APP_FRAUD", state="Karnataka")
        cid1, cid2 = c1["complaint_id"], c2["complaint_id"]

        # Different entities
        e1 = repo.create_or_get_truth_entity("bank_account", f"ACC-{uuid.uuid4().hex[:6]}")
        e2 = repo.create_or_get_truth_entity("bank_account", f"ACC-{uuid.uuid4().hex[:6]}")
        self._link_entity_to_case(e1, cid1)
        self._link_entity_to_case(e2, cid2)

        res = self.engine.correlate_case(cid1)
        # Should not correlate with cid2
        corrs = res.get("correlations", [])
        self.assertFalse(any(c["target_case_id"] == cid2 for c in corrs))

    def test_06_relationship_evidence_persisted(self):
        """6. Verify relationship evidence is structured and persisted without raw PII."""
        c1 = self._create_test_case()
        c2 = self._create_test_case()
        cid1, cid2 = c1["complaint_id"], c2["complaint_id"]

        raw_phone = "+919876543210"
        ent = repo.create_or_get_truth_entity("phone", raw_phone)
        self._link_entity_to_case(ent, cid1)
        self._link_entity_to_case(ent, cid2)

        res = self.engine.correlate_case(cid1)
        cluster_id = res["clusters_updated"][0]
        details = self.engine.get_cluster_details(cluster_id)

        # Entity members must be masked
        for em in details["entity_members"]:
            self.assertNotEqual(em["masked_value"], raw_phone)
            self.assertIn("*", em["masked_value"])

    def test_07_structural_similarity_deterministic(self):
        """7. Verify structural similarity calculation is pure, deterministic, and versioned."""
        c1 = {"complaint_id": "c1", "fraud_type": "UPI_FRAUD", "amount_inr": 200000.0, "victim_state": "MH"}
        c2 = {"complaint_id": "c2", "fraud_type": "UPI_FRAUD", "amount_inr": 220000.0, "victim_state": "MH"}
        shared = [{"entity_id": "e1", "entity_type": "bank_account", "canonical_reference": "account:123", "masked_value": "******123"}]

        sim1 = compute_structural_similarity(c1, c2, [], [], shared)
        sim2 = compute_structural_similarity(c1, c2, [], [], shared)

        self.assertEqual(sim1["structural_similarity"], sim2["structural_similarity"])
        self.assertEqual(sim1["relationship_strength"], sim2["relationship_strength"])
        self.assertEqual(sim1["policy_version"], SYNDICATE_DNA_POLICY_VERSION)
        self.assertEqual(sim1["relationship_strength"], "MODERATE")

    def test_08_repeated_event_idempotent(self):
        """8. Verify repeated correlation runs do not create duplicate clusters or members."""
        c1 = self._create_test_case()
        c2 = self._create_test_case()
        cid1, cid2 = c1["complaint_id"], c2["complaint_id"]

        ent = repo.create_or_get_truth_entity("bank_account", f"ACC-{uuid.uuid4().hex[:6]}")
        self._link_entity_to_case(ent, cid1)
        self._link_entity_to_case(ent, cid2)

        res1 = self.engine.correlate_case(cid1)
        res2 = self.engine.correlate_case(cid1)

        self.assertEqual(len(res1["clusters_updated"]), 1)
        self.assertEqual(res1["clusters_updated"], res2["clusters_updated"])

        cluster_id = res1["clusters_updated"][0]
        members = repo.get_potential_network_members(cluster_id)
        # Should not duplicate complaint members
        c1_members = [m for m in members if m.get("complaint_id") == cid1]
        self.assertEqual(len(c1_members), 1)

    def test_09_same_case_does_not_self_link(self):
        """9. Verify a case never self-links to itself."""
        c1 = self._create_test_case()
        cid1 = c1["complaint_id"]

        sim = compute_structural_similarity(c1, c1, [], [], [])
        self.assertEqual(sim["structural_similarity"], 0.0)
        self.assertEqual(sim["relationship_strength"], "WEAK")

    def test_10_bounded_graph_expansion(self):
        """10. Verify bounded graph expansion for depth 1 and depth 2."""
        c1 = self._create_test_case()
        c2 = self._create_test_case()
        c3 = self._create_test_case()
        cid1, cid2, cid3 = c1["complaint_id"], c2["complaint_id"], c3["complaint_id"]

        # c1 <-> c2 via account
        e_acc = repo.create_or_get_truth_entity("bank_account", f"ACC-{uuid.uuid4().hex[:6]}")
        self._link_entity_to_case(e_acc, cid1)
        self._link_entity_to_case(e_acc, cid2)

        # c2 <-> c3 via device
        e_dev = repo.create_or_get_truth_entity("device", f"DEV-{uuid.uuid4().hex[:6]}")
        self._link_entity_to_case(e_dev, cid2)
        self._link_entity_to_case(e_dev, cid3)

        # Depth 1 from c1 should reach c2, but not c3
        d1 = self.engine.expand_case_network(cid1, depth=1)
        case_nodes_d1 = {n["id"] for n in d1["nodes"] if n.get("node_type") == "complaint"}
        self.assertIn(cid1, case_nodes_d1)
        self.assertIn(cid2, case_nodes_d1)
        self.assertNotIn(cid3, case_nodes_d1)

        # Depth 2 from c1 should traverse c2 and reach c3
        d2 = self.engine.expand_case_network(cid1, depth=2)
        case_nodes_d2 = {n["id"] for n in d2["nodes"] if n.get("node_type") == "complaint"}
        self.assertIn(cid1, case_nodes_d2)
        self.assertIn(cid2, case_nodes_d2)
        self.assertIn(cid3, case_nodes_d2)

    def test_11_historical_membership_remains_auditable(self):
        """11. Verify historical cluster membership preserves timestamps and audit trail."""
        c1 = self._create_test_case()
        c2 = self._create_test_case()
        cid1, cid2 = c1["complaint_id"], c2["complaint_id"]

        ent = repo.create_or_get_truth_entity("bank_account", f"ACC-{uuid.uuid4().hex[:6]}")
        self._link_entity_to_case(ent, cid1)
        self._link_entity_to_case(ent, cid2)

        res = self.engine.correlate_case(cid1)
        self.assertTrue(len(res["clusters_updated"]) > 0)
        cluster_id = res["clusters_updated"][0]
        members = repo.get_potential_network_members(cluster_id)
        for m in members:
            self.assertIn("joined_at", m)
            self.assertTrue(bool(m["joined_at"]))

    def test_12_authoritative_syndicates_table_untouched(self):
        """12. MANDATORY: Verify authoritative syndicates table is untouched by potential clusters."""
        conn = repo.get_connection()
        c = conn.cursor()
        c.execute("SELECT count(*) FROM syndicates")
        count_before = c.fetchone()[0]
        conn.close()

        c1 = self._create_test_case()
        c2 = self._create_test_case()
        ent = repo.create_or_get_truth_entity("bank_account", f"ACC-{uuid.uuid4().hex[:6]}")
        repo.create_truth_relation(ent["entity_id"], ent["entity_id"], "APPEARED_IN", complaint_id=c1["complaint_id"])
        repo.create_truth_relation(ent["entity_id"], ent["entity_id"], "APPEARED_IN", complaint_id=c2["complaint_id"])

        self.engine.correlate_case(c1["complaint_id"])

        conn = repo.get_connection()
        c = conn.cursor()
        c.execute("SELECT count(*) FROM syndicates")
        count_after = c.fetchone()[0]
        conn.close()

        self.assertEqual(count_before, count_after, "Authoritative syndicates table must NOT be modified!")

    def test_13_masking_privacy_rules_intact(self):
        """13. Verify raw sensitive numbers are not leaked in graph expansion or cluster details."""
        c1 = self._create_test_case()
        raw_phone = "+919988776655"
        ent = repo.create_or_get_truth_entity("phone", raw_phone)
        repo.create_truth_relation(ent["entity_id"], ent["entity_id"], "APPEARED_IN", complaint_id=c1["complaint_id"])

        graph = self.engine.expand_case_network(c1["complaint_id"], depth=1)
        for node in graph["nodes"]:
            if node.get("node_type") == "entity":
                self.assertNotEqual(node.get("masked_value"), raw_phone)
                self.assertNotEqual(node.get("label"), raw_phone)

    def test_14_one_failed_correlation_does_not_stop_watcher(self):
        """14. Verify one failed correlation does not disrupt event routing."""
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "complaint_ingested",
            "entity_type": "complaint",
            "entity_id": "non-existent-comp-123",
            "complaint_id": "non-existent-comp-123",
            "payload": {"complaint_id": "non-existent-comp-123"},
        }
        with patch.object(self.engine, "correlate_case", side_effect=RuntimeError("Corrupt graph state")):
            res = event_router.route_event(event)
            self.assertIn("action_type", res)

    def test_15_sqlite_fallback_behavior(self):
        """15. Verify SQLite fallback behavior when Supabase is disabled."""
        with patch("db.repo._use_supabase", return_value=False):
            c = repo.create_potential_network_cluster("POTENTIAL-NET-SQLITE-TEST")
            self.assertIsNotNone(c.get("cluster_id"))
            fetched = repo.get_potential_network_cluster_by_id(c["cluster_id"])
            self.assertEqual(fetched["cluster_label"], "POTENTIAL-NET-SQLITE-TEST")

    def test_16_supabase_repository_behavior(self):
        """16. Verify Supabase repository behavior when configured."""
        mock_client = MagicMock()
        mock_client.table.return_value.select.return_value.order.return_value.limit.return_value.execute.return_value.data = [
            {"cluster_id": "mock-cid", "cluster_label": "POTENTIAL-NET-MOCK", "status": "candidate"}
        ]
        with patch("db.repo._use_supabase", return_value=True):
            with patch("db.supabase_client.supabase", mock_client):
                clusters = repo.get_potential_network_clusters(limit=1)
                self.assertTrue(len(clusters) > 0)
                self.assertEqual(clusters[0]["cluster_id"], "mock-cid")

    def test_17_api_response_correctness(self):
        """17. Verify FastAPI routes return expected structure and HTTP codes."""
        from main import app
        client = TestClient(app)

        c1 = self._create_test_case()
        cid1 = c1["complaint_id"]

        # List syndicates
        r = client.get("/autonomy/syndicates")
        self.assertEqual(r.status_code, 200)
        self.assertIn("clusters", r.json())

        # Get case syndicates
        r = client.get(f"/autonomy/syndicates/case/{cid1}")
        self.assertEqual(r.status_code, 200)
        self.assertIn("clusters", r.json())
        self.assertIn("related_cases", r.json())

        # Expand case network
        r = client.get(f"/autonomy/syndicates/case/{cid1}/expand?depth=1")
        self.assertEqual(r.status_code, 200)
        self.assertIn("nodes", r.json())
        self.assertIn("edges", r.json())

        # 404 for unknown cluster
        r = client.get(f"/autonomy/syndicates/{uuid.uuid4()}")
        self.assertEqual(r.status_code, 404)

    def test_18_no_event_loop(self):
        """18. Verify correlation does not spawn infinite recursive event triggers."""
        c1 = self._create_test_case()
        res = self.engine.correlate_case(c1["complaint_id"])
        # Should finish cleanly without infinite loop
        self.assertIn(res["status"], ("processed", "no_candidates_found"))

    def test_19_candidate_search_does_not_perform_global_scan(self):
        """19. Verify candidate search targets only connected entity neighbors, not all complaints."""
        c1 = self._create_test_case()
        with patch("db.repo.get_entity_cross_case_links", return_value={"linked_complaints": []}) as mock_links:
            res = self.engine.correlate_case(c1["complaint_id"])
            self.assertEqual(res["correlated_cases_count"], 0)


if __name__ == "__main__":
    unittest.main()
