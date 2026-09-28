import os
import sys
import uuid
import datetime
import unittest
from fastapi.testclient import TestClient

# Ensure backend directory in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from db import repo
from core.autonomy.evidence_service import evidence_service


class TestEvidenceIntelligence(unittest.TestCase):
    """Test suite for Phase 4A Evidence Intelligence API and Service."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.cid = str(uuid.uuid4())

        # Create a test case
        repo.create_complaint({
            "complaint_id": cls.cid,
            "ncrp_id": f"NCRP-{uuid.uuid4().hex[:6].upper()}",
            "fraud_type": "UPI_PHISHING",
            "amount_inr": 250000.0,
            "status": "active",
            "victim_state": "Karnataka",
            "victim_district": "Bengaluru Urban",
            "channel": "National Cybercrime Portal",
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "filed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        })

        # Create test entities
        cls.phone_ent = repo.create_or_get_truth_entity("phone", "+919876543210")
        cls.bank_ent = repo.create_or_get_truth_entity("bank_account", "987654321098")
        cls.dev_ent = repo.create_or_get_truth_entity("device", "DEV-IMEI-889900")

        # Create test relations
        cls.rel1 = repo.create_truth_relation(
            source_entity_id=cls.phone_ent["entity_id"],
            target_entity_id=cls.phone_ent["entity_id"],
            relation_type="APPEARED_IN_COMPLAINT",
            semantic_level="DIRECT_OBSERVED",
            complaint_id=cls.cid,
            source_record_type="complaints",
            source_record_id=cls.cid,
            confidence=1.0,
        )
        cls.rel2 = repo.create_truth_relation(
            source_entity_id=cls.bank_ent["entity_id"],
            target_entity_id=cls.dev_ent["entity_id"],
            relation_type="SHARED_DEVICE",
            semantic_level="DERIVED",
            complaint_id=cls.cid,
            source_record_type="audit",
            source_record_id="AUDIT-REC-01",
            confidence=0.92,
        )

    def test_01_list_evidence_cases(self):
        """1. Verify GET /autonomy/evidence/cases returns valid cases."""
        r = self.client.get("/autonomy/evidence/cases?limit=10")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        item = data[0]
        self.assertIn("complaint_id", item)
        self.assertIn("relation_count", item)

    def test_02_get_case_evidence_graph_depth_1(self):
        """2. Verify GET /autonomy/evidence/case/{cid} returns unified evidence graph."""
        r = self.client.get(f"/autonomy/evidence/case/{self.cid}?depth=1")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["complaint_id"], self.cid)
        self.assertEqual(data["depth"], 1)
        self.assertIn("nodes", data)
        self.assertIn("edges", data)
        self.assertIn("summary", data)
        self.assertIn("consistency", data)

        # Check semantic breakdown
        breakdown = data["summary"]["semantic_breakdown"]
        self.assertIn("DIRECT_OBSERVED", breakdown)
        self.assertIn("DERIVED", breakdown)

        # Check consistency analysis
        self.assertIn(data["consistency"]["status"], ("CONSISTENT", "REVIEW", "DISCREPANCY"))
        self.assertIn("checks", data["consistency"])

    def test_03_get_case_evidence_graph_depth_2(self):
        """3. Verify bounded depth 2 expansion."""
        r = self.client.get(f"/autonomy/evidence/case/{self.cid}?depth=2&max_nodes=30")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["depth"], 2)
        self.assertLessEqual(len(data["nodes"]), 30)

    def test_04_get_case_timeline(self):
        """4. Verify chronological evidence timeline generation."""
        r = self.client.get(f"/autonomy/evidence/case/{self.cid}/timeline")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["complaint_id"], self.cid)
        self.assertIn("timeline", data)
        self.assertIsInstance(data["timeline"], list)
        self.assertGreater(len(data["timeline"]), 0)

        # Check timeline event structure
        first_event = data["timeline"][0]
        self.assertIn("id", first_event)
        self.assertIn("title", first_event)
        self.assertIn("timestamp", first_event)
        self.assertIn("semantic_level", first_event)

    def test_05_get_relation_provenance(self):
        """5. Verify relation detail and provenance structure."""
        rel_id = self.rel1["relation_id"]
        r = self.client.get(f"/autonomy/evidence/relation/{rel_id}")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["relation_id"], rel_id)
        self.assertEqual(data["semantic_level"], "DIRECT_OBSERVED")
        self.assertIn("provenance", data)
        self.assertEqual(data["provenance"]["source_record_type"], "complaints")
        self.assertEqual(data["provenance"]["source_record_id"], self.cid)
        self.assertTrue(data["provenance"]["is_provenance_verified"])

    def test_06_get_entity_details(self):
        """6. Verify entity detail and cross-case linkages."""
        eid = self.phone_ent["entity_id"]
        r = self.client.get(f"/autonomy/evidence/entity/{eid}")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn("entity", data)
        self.assertIn("cross_case_links", data)
        self.assertEqual(data["entity"]["entity_id"], eid)

    def test_07_masking_privacy_preserved(self):
        """7. Verify raw sensitive numbers are masked and never leaked in cleartext."""
        r = self.client.get(f"/autonomy/evidence/case/{self.cid}")
        self.assertEqual(r.status_code, 200)
        raw_text = r.text
        # Raw phone +919876543210 must not appear in cleartext
        self.assertNotIn("+919876543210", raw_text)
        # Raw bank 987654321098 must not appear in cleartext
        self.assertNotIn("987654321098", raw_text)

    def test_08_deterministic_consistency_checks(self):
        """8. Verify deterministic consistency logic reports neutral terminology."""
        audit = evidence_service.check_case_consistency(self.cid, [self.rel1, self.rel2])
        self.assertIn(audit["status"], ("CONSISTENT", "REVIEW", "DISCREPANCY"))
        for check in audit["checks"]:
            self.assertIn(check["status"], ("PASS", "WARN", "FAIL"))
            # Must not use biased or accusatory words
            self.assertNotIn("fraudulent evidence", check["name"].lower())
            self.assertNotIn("lying", check["name"].lower())


if __name__ == "__main__":
    unittest.main()
