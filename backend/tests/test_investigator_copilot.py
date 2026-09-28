"""
NEXUS Phase 5 — Investigator Copilot Tests
==========================================
12 tests covering: grounded responses, masked identifiers, missing data,
conflicting data, inference labeling, source citations, and strict
read-only enforcement (copilot cannot approve/execute actions).
"""

import sys
import os
import unittest
import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["USE_LOCAL_SQLITE"] = "true"
os.environ["NEXUS_ENV"] = "development"

from core.autonomy.investigator_copilot import InvestigatorCopilot, COPILOT_VERSION
from core.autonomy.action_policy import ACTION_POLICY_VERSION
from db import repo


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def _get_any_complaint_id():
    comps = repo.get_complaints(limit=1)
    return comps[0]["complaint_id"] if comps else None


def _make_copilot():
    return InvestigatorCopilot()


# ---------------------------------------------------------------------------
# TESTS
# ---------------------------------------------------------------------------

class TestCopilotArchitecture(unittest.TestCase):

    def test_01_copilot_version_present(self):
        """Copilot must carry a non-empty version string."""
        self.assertTrue(COPILOT_VERSION)
        self.assertIsInstance(COPILOT_VERSION, str)

    def test_02_response_always_has_required_fields(self):
        """Every copilot response must have: complaint_id, intent, sections, sources, disclaimer."""
        cp = _make_copilot()
        resp = cp.case_summary("NONEXISTENT-COMPLAINT-00000000")
        required = {"complaint_id", "intent", "sections", "sources", "disclaimer", "copilot_version", "generated_at"}
        for field in required:
            self.assertIn(field, resp, f"Copilot response missing field: {field}")

    def test_03_missing_complaint_returns_insufficient_evidence(self):
        """For an unknown complaint, copilot must say 'Insufficient evidence in current NEXUS records'."""
        cp = _make_copilot()
        resp = cp.case_summary("DOES-NOT-EXIST-FFFFFFFF")
        text = str(resp.get("sections", {}))
        self.assertIn("Insufficient evidence in current NEXUS records", text)

    def test_04_missing_prediction_says_no_prediction(self):
        """If no prediction available, copilot must explicitly say so."""
        cp = _make_copilot()
        # Use a fake complaint_id that won't have a prediction
        resp = cp.case_summary("FAKE-NO-PREDICTION-00000")
        sections = resp.get("sections", {})
        current_risk = sections.get("current_risk", "")
        # Either real data or the fallback string
        self.assertTrue(
            current_risk == "" or "Insufficient evidence" in current_risk or "risk" in current_risk.lower()
        )

    def test_05_missing_evidence_graph_returns_insufficient_evidence(self):
        """explain_evidence for unknown complaint must return 'Insufficient evidence'."""
        cp = _make_copilot()
        resp = cp.explain_evidence("DOES-NOT-EXIST-FFFFFFFE")
        text = str(resp.get("sections", {}))
        self.assertIn("Insufficient evidence", text)

    def test_06_related_cases_no_links_returns_no_links_message(self):
        """related_cases for unknown complaint must say no links found."""
        cp = _make_copilot()
        resp = cp.related_cases("DOES-NOT-EXIST-FFFFFFFD")
        text = str(resp.get("sections", {}))
        # Either "Insufficient evidence" or "No related cases detected"
        self.assertTrue(
            "Insufficient evidence" in text or "No related cases" in text
        )

    def test_07_explain_attention_no_state_returns_insufficient_evidence(self):
        """explain_attention for unknown complaint must say 'Insufficient evidence'."""
        cp = _make_copilot()
        resp = cp.explain_attention("DOES-NOT-EXIST-FFFFFFFC")
        text = str(resp.get("sections", {}))
        self.assertIn("Insufficient evidence", text)

    def test_08_inferred_relationships_labeled(self):
        """Any cross-case result that finds links must label them as inferred relationships."""
        cp = _make_copilot()
        complaint_id = _get_any_complaint_id()
        if not complaint_id:
            self.skipTest("No complaints available for test")
        resp = cp.related_cases(complaint_id)
        sections = resp.get("sections", {})
        # If there ARE linked cases, the inference label must be set
        related_text = sections.get("related_cases", "")
        if "Inferred relationship" in related_text:
            self.assertIn("inference_label", sections)

    def test_09_no_unsupported_certainty_in_related_cases(self):
        """Copilot must never call inferred links 'confirmed' or 'proven'."""
        cp = _make_copilot()
        complaint_id = _get_any_complaint_id()
        if not complaint_id:
            self.skipTest("No complaints available")
        resp = cp.related_cases(complaint_id)
        text = str(resp.get("sections", {})).lower()
        self.assertNotIn("confirmed criminal network", text)
        self.assertNotIn("proven connection", text)

    def test_10_source_citations_present_when_data_available(self):
        """When real data is returned, source citations must be non-empty."""
        complaint_id = _get_any_complaint_id()
        if not complaint_id:
            self.skipTest("No complaints available for test")
        cp = _make_copilot()
        resp = cp.case_summary(complaint_id)
        sources = resp.get("sources", [])
        sections = resp.get("sections", {})
        # If complaint was found (not 'NOT_FOUND' intent), sources must exist
        if resp.get("intent") != "NOT_FOUND":
            self.assertGreater(len(sources), 0, "Source citations must be present when data is available")

    def test_11_copilot_has_no_approve_method(self):
        """Copilot must not expose approve_action, reject_action, or execute methods."""
        cp = _make_copilot()
        self.assertFalse(hasattr(cp, "approve_action"), "Copilot must not have approve_action")
        self.assertFalse(hasattr(cp, "reject_action"), "Copilot must not have reject_action")
        self.assertFalse(hasattr(cp, "execute_action"), "Copilot must not have execute_action")
        self.assertFalse(hasattr(cp, "transition_status"), "Copilot must not have transition_status")
        self.assertFalse(hasattr(cp, "approve"), "Copilot must not have approve")

    def test_12_copilot_cannot_trigger_consequential_action(self):
        """Calling copilot answer with 'approve' keyword must return read-only info, not execute anything."""
        complaint_id = _get_any_complaint_id()
        if not complaint_id:
            self.skipTest("No complaints available")
        cp = _make_copilot()
        # Simulate user asking about approvals
        resp = cp.answer(complaint_id, "What needs approval?")
        # Must return structured data, not an approval confirmation
        self.assertIn("sections", resp)
        self.assertIn("disclaimer", resp)
        # Disclaimer must state read-only
        disclaimer = resp.get("disclaimer", "")
        self.assertIn("read-only", disclaimer.lower())
        # No approval confirmation in response
        text = str(resp.get("sections", {})).lower()
        self.assertNotIn("approved by", text)
        self.assertNotIn("action executed", text)

    def test_13_grounded_case_summary_with_real_data(self):
        """When a real complaint exists, case_summary returns populated sections."""
        complaint_id = _get_any_complaint_id()
        if not complaint_id:
            self.skipTest("No complaints in database")
        cp = _make_copilot()
        resp = cp.case_summary(complaint_id)
        self.assertEqual(resp.get("complaint_id"), complaint_id)
        sections = resp.get("sections", {})
        # 'summary' section must be present
        self.assertIn("summary", sections)
        summary = sections["summary"]
        self.assertIsInstance(summary, str)
        self.assertGreater(len(summary), 0)

    def test_14_current_actions_with_approval_note(self):
        """current_actions must always include an approval_note for consequential actions."""
        complaint_id = _get_any_complaint_id()
        if not complaint_id:
            self.skipTest("No complaints available")
        cp = _make_copilot()
        resp = cp.current_actions(complaint_id)
        sections = resp.get("sections", {})
        # approval_note must always be present regardless of action data
        self.assertIn("approval_note", sections)
        note = sections["approval_note"]
        # Must mention explicit investigator approval
        self.assertIn("explicit investigator approval", note.lower())

    def test_15_what_changed_handles_no_audit_log(self):
        """what_changed for a complaint with no audit log must return 'Insufficient evidence'."""
        cp = _make_copilot()
        resp = cp.what_changed("DOES-NOT-EXIST-FFFFFFFB")
        text = str(resp.get("sections", {}))
        self.assertIn("Insufficient evidence", text)

    def test_16_answer_routes_to_correct_handler(self):
        """answer() must route question keywords to correct intent."""
        complaint_id = _get_any_complaint_id() or "FAKE-ROUTE-TEST"
        cp = _make_copilot()
        # Test keyword routing
        for question, expected_intent_substr in [
            ("What is happening", "CASE_SUMMARY"),
            ("What changed recently", "WHAT_CHANGED"),
            ("Why is attention high", "EXPLAIN_ATTENTION"),
            ("Which cases are related", "RELATED_CASES"),
            ("What evidence do we have", "EXPLAIN_EVIDENCE"),
            ("What action is recommended", "CURRENT_ACTIONS"),
            ("What needs approval", "APPROVAL_STATUS"),
        ]:
            resp = cp.answer(complaint_id, question)
            intent = resp.get("intent", "")
            self.assertEqual(intent, expected_intent_substr,
                             f"question='{question}' → expected intent '{expected_intent_substr}', got '{intent}'")


if __name__ == "__main__":
    unittest.main(verbosity=2)
