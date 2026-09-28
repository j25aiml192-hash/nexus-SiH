"""
NEXUS Phase 5 - Action Policy Tests
=====================================
28 tests covering: deterministic recommendation generation,
state machine enforcement, approval/rejection gates, idempotency,
expiration, safe action execution, consequential action gate,
audit history, no event loop, SQLite fallback, and ML contract preservation.
"""

import sys
import os
import datetime
import json
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["USE_LOCAL_SQLITE"] = "true"
os.environ["NEXUS_ENV"] = "development"

from core.autonomy.action_policy import (
    ACTION_POLICY_VERSION,
    ACTION_TAXONOMY,
    ActionCategory,
    ActionStatus,
    ActionPriority,
    VALID_TRANSITIONS,
    TERMINAL_STATES,
    is_valid_transition,
    evaluate_action_recommendations,
    action_policy_engine,
)
from db import repo


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def _get_any_complaint():
    comps = repo.get_complaints(limit=1)
    if comps:
        return comps[0]["complaint_id"]
    return None


def _stub_attention(level="HIGH", score=60.0, reasons=None):
    return {
        "attention_level": level,
        "attention_score": score,
        "reason_codes": reasons or ["HIGH_FRAUD_RISK", "URGENT_CASHOUT_WINDOW"],
    }


def _stub_prediction(risk=0.80, level="RED", window=3.0, atms=None, conf=0.75):
    return {
        "risk_score": risk,
        "risk_level": level,
        "cashout_window_hours": window,
        "predicted_atms": atms or ["ATM-JH-DEO-01"],
        "confidence": conf,
    }


# ---------------------------------------------------------------------------
# TESTS
# ---------------------------------------------------------------------------

class TestActionPolicyTaxonomy(unittest.TestCase):

    def test_01_policy_version_is_versioned(self):
        """Policy version must be a non-empty string prefixed phase5."""
        self.assertTrue(ACTION_POLICY_VERSION.startswith("phase5"))

    def test_02_action_types_count(self):
        """Taxonomy must define 15 action types."""
        self.assertEqual(len(ACTION_TAXONOMY), 15)

    def test_03_safe_automatic_no_approval(self):
        """All SAFE_AUTOMATIC actions must have approval_required=False."""
        for atype, meta in ACTION_TAXONOMY.items():
            if meta["category"] == ActionCategory.SAFE_AUTOMATIC:
                self.assertFalse(meta["approval_required"], f"{atype} should not require approval")

    def test_04_consequential_require_approval(self):
        """All HUMAN_APPROVAL_REQUIRED actions must have approval_required=True."""
        consequential = [
            "REQUEST_FUND_FREEZE", "REQUEST_FIELD_DISPATCH",
            "ISSUE_LIEN_RECOMMENDATION", "REQUEST_LEGAL_ESCALATION",
            "REQUEST_INTERSTATE_ESCALATION", "CLOSE_CASE",
        ]
        for atype in consequential:
            meta = ACTION_TAXONOMY.get(atype, {})
            self.assertTrue(meta.get("approval_required"), f"{atype} should require approval")

    def test_05_terminal_states_no_outgoing_transitions(self):
        """Terminal states must have no valid outgoing transitions."""
        for ts in TERMINAL_STATES:
            self.assertEqual(VALID_TRANSITIONS.get(ts, []), [], f"{ts} must have no outgoing transitions")

    def test_06_valid_transition_function(self):
        """is_valid_transition must correctly evaluate allowed transitions."""
        self.assertTrue(is_valid_transition(ActionStatus.PROPOSED, ActionStatus.PENDING_APPROVAL))
        self.assertFalse(is_valid_transition(ActionStatus.COMPLETED, ActionStatus.APPROVED))
        self.assertFalse(is_valid_transition(ActionStatus.REJECTED, ActionStatus.EXECUTING))


class TestRecommendationGeneration(unittest.TestCase):

    def test_07_high_attention_urgent_case_creates_recommendation(self):
        """Rule 1: HIGH attention + urgent window + geo -> PREPARE_INVESTIGATOR_BRIEF."""
        recs = evaluate_action_recommendations(
            complaint_id="TEST-001",
            attention=_stub_attention("CRITICAL", 80.0),
            prediction=_stub_prediction(0.85, "RED", 1.5),
            trigger_event_type="prediction_generated",
        )
        action_types = [r["action_type"] for r in recs]
        self.assertIn("PREPARE_INVESTIGATOR_BRIEF", action_types)

    def test_08_critical_attention_adds_field_dispatch(self):
        """Rule 1 critical: CRITICAL attention adds REQUEST_FIELD_DISPATCH."""
        recs = evaluate_action_recommendations(
            complaint_id="TEST-002",
            attention=_stub_attention("CRITICAL", 85.0),
            prediction=_stub_prediction(0.90, "RED", 1.0),
        )
        action_types = [r["action_type"] for r in recs]
        self.assertIn("REQUEST_FIELD_DISPATCH", action_types)

    def test_09_evidence_discrepancy_produces_review_recommendation(self):
        """Rule 2: evidence discrepancy -> REQUEST_REVIEW + RECHECK_EVIDENCE."""
        recs = evaluate_action_recommendations(
            complaint_id="TEST-003",
            has_discrepancy=True,
        )
        action_types = [r["action_type"] for r in recs]
        self.assertIn("REQUEST_REVIEW", action_types)
        self.assertIn("RECHECK_EVIDENCE", action_types)

    def test_10_strong_cross_case_correlation_produces_investigation_recommendation(self):
        """Rule 3: linked_count >= 3 + high attention -> PREPARE_INVESTIGATOR_BRIEF."""
        recs = evaluate_action_recommendations(
            complaint_id="TEST-004",
            attention=_stub_attention("HIGH", 65.0),
            linked_complaint_ids=["C1", "C2", "C3", "C4"],
        )
        action_types = [r["action_type"] for r in recs]
        self.assertIn("PREPARE_INVESTIGATOR_BRIEF", action_types)
        self.assertIn("UPDATE_CROSS_CASE_RELATIONSHIPS", action_types)

    def test_11_fund_freeze_for_imminent_critical_risk(self):
        """Rule 6: CRITICAL attention + risk >= 0.80 + window <= 2h -> REQUEST_FUND_FREEZE."""
        recs = evaluate_action_recommendations(
            complaint_id="TEST-005",
            attention=_stub_attention("CRITICAL", 80.0),
            prediction=_stub_prediction(0.85, "RED", 1.0),
        )
        action_types = [r["action_type"] for r in recs]
        self.assertIn("REQUEST_FUND_FREEZE", action_types)

    def test_12_fund_freeze_requires_approval(self):
        """REQUEST_FUND_FREEZE must always be approval_required=True."""
        recs = evaluate_action_recommendations(
            complaint_id="TEST-006",
            attention=_stub_attention("CRITICAL", 80.0),
            prediction=_stub_prediction(0.85, "RED", 1.0),
        )
        for r in recs:
            if r["action_type"] == "REQUEST_FUND_FREEZE":
                self.assertTrue(r["approval_required"])
                break

    def test_13_recommendation_has_all_required_fields(self):
        """Every recommendation must carry all required structural fields."""
        recs = evaluate_action_recommendations(
            complaint_id="TEST-007",
            has_discrepancy=True,
        )
        required_fields = [
            "complaint_id", "action_type", "priority", "status",
            "policy_version", "reason_codes", "decision_factors",
            "supporting_evidence", "approval_required", "expires_at",
            "_idempotency_key",
        ]
        for rec in recs:
            for field in required_fields:
                self.assertIn(field, rec, f"Missing field '{field}' in {rec.get('action_type')}")

    def test_14_recommendation_status_starts_at_proposed(self):
        """All generated recommendations must start with status=PROPOSED."""
        recs = evaluate_action_recommendations(
            complaint_id="TEST-008",
            has_discrepancy=True,
        )
        for r in recs:
            self.assertEqual(r["status"], ActionStatus.PROPOSED)


class TestIdempotency(unittest.TestCase):

    def test_15_duplicate_recommendation_is_prevented(self):
        """Same complaint + same action_type + same state fingerprint = same idempotency key."""
        attention = _stub_attention("HIGH", 60.0)
        pred = _stub_prediction(0.75, "RED", 3.0)
        recs1 = evaluate_action_recommendations(
            complaint_id="TEST-IDEM-001",
            attention=attention,
            prediction=pred,
            has_discrepancy=True,
        )
        recs2 = evaluate_action_recommendations(
            complaint_id="TEST-IDEM-001",
            attention=attention,
            prediction=pred,
            has_discrepancy=True,
        )
        keys1 = {r["_idempotency_key"] for r in recs1}
        keys2 = {r["_idempotency_key"] for r in recs2}
        self.assertEqual(keys1, keys2)

    def test_16_different_state_fingerprint_produces_new_key(self):
        """Changed state (different attention level) must produce different idempotency key."""
        recs_high = evaluate_action_recommendations(
            complaint_id="TEST-IDEM-002",
            attention=_stub_attention("HIGH", 60.0),
            has_discrepancy=True,
        )
        recs_crit = evaluate_action_recommendations(
            complaint_id="TEST-IDEM-002",
            attention=_stub_attention("CRITICAL", 80.0),
            has_discrepancy=True,
        )
        keys_high = {r["_idempotency_key"] for r in recs_high}
        keys_crit = {r["_idempotency_key"] for r in recs_crit}
        self.assertNotEqual(keys_high, keys_crit)


class TestExpiration(unittest.TestCase):

    def test_17_expiration_timestamp_is_in_future(self):
        """expires_at must be a future ISO timestamp."""
        recs = evaluate_action_recommendations(
            complaint_id="TEST-EXP-001",
            has_discrepancy=True,
        )
        now = datetime.datetime.now(datetime.timezone.utc)
        for r in recs:
            expires = datetime.datetime.fromisoformat(r["expires_at"].replace("Z", "+00:00"))
            self.assertGreater(expires, now, f"expires_at must be in the future for {r['action_type']}")

    def test_18_expire_stale_actions(self):
        """expire_stale_action_recommendations must mark past-expiry records as EXPIRED."""
        repo.init_db()
        past = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1)).isoformat()
        # Create a record that already expired
        key = f"test-exp-{datetime.datetime.now().isoformat()}"
        result = repo.create_action_recommendation(
            complaint_id="TEST-EXP-DB",
            action_type="REQUEST_REVIEW",
            priority="LOW",
            status="PROPOSED",
            policy_version=ACTION_POLICY_VERSION,
            reason_codes=["TEST"],
            decision_factors={},
            supporting_evidence=[],
            approval_required=False,
            expires_at=past,
            idempotency_key=key,
        )
        if result:
            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
            count = repo.expire_stale_action_recommendations(now_iso)
            self.assertGreaterEqual(count, 1)


class TestStateMachine(unittest.TestCase):

    def test_19_consequential_action_requires_approval(self):
        """REQUEST_FUND_FREEZE must have approval_required=True."""
        meta = ACTION_TAXONOMY["REQUEST_FUND_FREEZE"]
        self.assertTrue(meta["approval_required"])
        self.assertEqual(meta["category"], ActionCategory.HUMAN_APPROVAL_REQUIRED)

    def test_20_rejected_action_cannot_execute(self):
        """REJECTED is a terminal state — no transitions out."""
        self.assertEqual(VALID_TRANSITIONS[ActionStatus.REJECTED], [])
        self.assertFalse(is_valid_transition(ActionStatus.REJECTED, ActionStatus.EXECUTING))

    def test_21_expired_action_cannot_execute(self):
        """EXPIRED is a terminal state — no transitions out."""
        self.assertFalse(is_valid_transition(ActionStatus.EXPIRED, ActionStatus.EXECUTING))
        self.assertFalse(is_valid_transition(ActionStatus.EXPIRED, ActionStatus.APPROVED))

    def test_22_invalid_transition_rejected(self):
        """COMPLETED cannot transition to EXECUTING."""
        self.assertFalse(is_valid_transition(ActionStatus.COMPLETED, ActionStatus.EXECUTING))

    def test_23_proposed_can_transition_to_pending(self):
        """PROPOSED -> PENDING_APPROVAL is valid."""
        self.assertTrue(is_valid_transition(ActionStatus.PROPOSED, ActionStatus.PENDING_APPROVAL))


class TestApprovalGate(unittest.TestCase):

    def _create_test_action(self, action_type="REQUEST_FUND_FREEZE", approval_required=True):
        import uuid
        key = f"test-approval-{uuid.uuid4().hex}"
        repo.init_db()
        result = repo.create_action_recommendation(
            complaint_id="TEST-APPROVAL",
            action_type=action_type,
            priority="CRITICAL",
            status="PROPOSED",
            policy_version=ACTION_POLICY_VERSION,
            reason_codes=["TEST"],
            decision_factors={"test": True},
            supporting_evidence=[],
            approval_required=approval_required,
            expires_at=(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=4)).isoformat(),
            idempotency_key=key,
        )
        return result.get("action_id") if result else None

    def test_24_approval_requires_approved_by(self):
        """approve_action must raise ValueError if approved_by is empty."""
        action_id = self._create_test_action()
        if not action_id:
            self.skipTest("Could not create test action")
        with self.assertRaises(ValueError):
            action_policy_engine.approve_action(action_id, approved_by="")

    def test_25_safe_action_does_not_require_approval(self):
        """SAFE_AUTOMATIC actions have approval_required=False in taxonomy."""
        safe_actions = [k for k, v in ACTION_TAXONOMY.items()
                        if v["category"] == ActionCategory.SAFE_AUTOMATIC]
        for sa in safe_actions:
            self.assertFalse(ACTION_TAXONOMY[sa]["approval_required"])

    def test_26_reject_marks_action_rejected(self):
        """reject_action must transition status to REJECTED."""
        action_id = self._create_test_action()
        if not action_id:
            self.skipTest("Could not create test action")
        result = action_policy_engine.reject_action(
            action_id=action_id,
            rejected_by="test_analyst",
            reason="Test rejection",
        )
        self.assertEqual(result["status"], ActionStatus.REJECTED)

    def test_27_audit_history_written_on_transition(self):
        """Audit history must be appended on every state transition."""
        import uuid
        key = f"test-hist-{uuid.uuid4().hex}"
        repo.init_db()
        result = repo.create_action_recommendation(
            complaint_id="TEST-HIST",
            action_type="REQUEST_REVIEW",
            priority="MEDIUM",
            status="PROPOSED",
            policy_version=ACTION_POLICY_VERSION,
            reason_codes=["TEST"],
            decision_factors={},
            supporting_evidence=[],
            approval_required=False,
            expires_at=(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)).isoformat(),
            idempotency_key=key,
        )
        if not result:
            self.skipTest("Could not create test action")
        action_id = result["action_id"]
        repo.transition_action_status(action_id, "EXECUTING", "test_system")
        rec = repo.get_action_recommendation(action_id)
        self.assertIsNotNone(rec)
        history = rec.get("history", [])
        self.assertGreater(len(history), 1, "History must grow on each transition")

    def test_28_no_event_loop_in_policy_evaluation(self):
        """
        Calling evaluate_action_recommendations twice with same state
        must not produce more unique idempotency keys (loop prevention).
        """
        attention = _stub_attention("HIGH", 60.0)
        pred = _stub_prediction(0.75, "RED", 3.0)
        recs_run1 = evaluate_action_recommendations(
            complaint_id="TEST-LOOP",
            attention=attention,
            prediction=pred,
            trigger_event_type="prediction_generated",
        )
        recs_run2 = evaluate_action_recommendations(
            complaint_id="TEST-LOOP",
            attention=attention,
            prediction=pred,
            trigger_event_type="prediction_generated",
        )
        keys1 = {r["_idempotency_key"] for r in recs_run1}
        keys2 = {r["_idempotency_key"] for r in recs_run2}
        # Same state = same keys. No new recommendations generated.
        self.assertEqual(keys1, keys2, "Identical state must not produce new idempotency keys")

    def test_29_ml_contracts_unchanged(self):
        """
        Core ML/prediction values must not be mutated by action policy evaluation.
        """
        complaint_id = _get_any_complaint()
        if not complaint_id:
            self.skipTest("No complaints available")
        pred_before = repo.get_prediction_by_complaint(complaint_id)
        if not pred_before:
            self.skipTest("No prediction available")
        risk_before = pred_before.get("risk_score")
        # Run policy evaluation
        action_policy_engine.evaluate_and_persist(complaint_id=complaint_id)
        pred_after = repo.get_prediction_by_complaint(complaint_id)
        risk_after = pred_after.get("risk_score") if pred_after else None
        self.assertEqual(risk_before, risk_after, "Action policy must not modify risk_score")


if __name__ == "__main__":
    unittest.main(verbosity=2)
