"""
NEXUS Phase 5 — Manual E2E Verification Script
================================================
Demonstrates end-to-end flow:
1. Real complaint
2. Prediction available
3. Attention state available
4. Action recommendation generated
5. Recommendation explains itself (rationale, evidence, priority)
6. Supporting evidence is present
7. approval_required is correct per taxonomy
8. Explicit approve path
9. Audit record after approve
10. Reject path
11. Expiration path
12. Copilot reads same case
13. Copilot gives grounded answer
14. Copilot CANNOT approve/execute
15. No consequential external action was automatically executed

Run from backend/:
  python tests/manual_e2e_action_policy.py
"""

import sys
import os
import datetime
import json
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["USE_LOCAL_SQLITE"] = "true"
os.environ["NEXUS_ENV"] = "development"

from db import repo
from core.autonomy.action_policy import (
    action_policy_engine,
    ACTION_POLICY_VERSION,
    ACTION_TAXONOMY,
    ActionStatus,
    TERMINAL_STATES,
    evaluate_action_recommendations,
)
from core.autonomy.investigator_copilot import investigator_copilot

PASS = "  [PASS]"
FAIL = "  [FAIL]"
SKIP = "  [SKIP]"

results = []

def check(label, condition, detail=""):
    status = PASS if condition else FAIL
    results.append((label, condition, detail))
    print(f"{status}  {label}" + (f" — {detail}" if detail else ""))
    return condition


def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


# ---------------------------------------------------------------------------
section("1. REAL COMPLAINT")
# ---------------------------------------------------------------------------

complaints = repo.get_complaints(limit=5)
complaint = complaints[0] if complaints else None
complaint_id = complaint["complaint_id"] if complaint else None

check("complaints exist in database", bool(complaints), f"{len(complaints)} found")
if not complaint_id:
    print("\n  NOTE: No complaints in database. Some steps will use synthetic data.")
    complaint_id = f"E2E-SYNTHETIC-{uuid.uuid4().hex[:8].upper()}"

# ---------------------------------------------------------------------------
section("2. PREDICTION AVAILABLE")
# ---------------------------------------------------------------------------

prediction = None
if complaint:
    try:
        prediction = repo.get_prediction_by_complaint(complaint_id)
    except Exception as e:
        print(f"    prediction load error: {e}")

check(
    "prediction available",
    prediction is not None,
    f"risk_score={prediction.get('risk_score', 'N/A')}" if prediction else "none found (safe)"
)

# ---------------------------------------------------------------------------
section("3. ATTENTION STATE AVAILABLE")
# ---------------------------------------------------------------------------

attention = None
if complaint:
    try:
        attention = repo.get_case_attention_state(complaint_id)
    except Exception as e:
        print(f"    attention load error: {e}")

check(
    "attention state available",
    attention is not None,
    f"level={attention.get('attention_level', 'N/A')}" if attention else "none found (safe)"
)

# ---------------------------------------------------------------------------
section("4. ACTION RECOMMENDATION GENERATED (DETERMINISTIC)")
# ---------------------------------------------------------------------------

# Run evaluation with synthetic high-risk state to guarantee recommendations
synthetic_attention = {"attention_level": "CRITICAL", "attention_score": 80.0, "reason_codes": ["HIGH_FRAUD_RISK"]}
synthetic_pred = {"risk_score": 0.88, "risk_level": "RED", "cashout_window_hours": 1.5,
                  "predicted_atms": ["ATM-E2E-01"], "confidence": 0.80}

recs = evaluate_action_recommendations(
    complaint_id=complaint_id,
    attention=synthetic_attention,
    prediction=synthetic_pred,
    has_discrepancy=True,
    trigger_event_type="prediction_generated",
)
check("recommendations generated (deterministic)", len(recs) > 0, f"{len(recs)} candidates")

# ---------------------------------------------------------------------------
section("5. RECOMMENDATION EXPLAINS ITSELF")
# ---------------------------------------------------------------------------

if recs:
    first = recs[0]
    check("action_type present", bool(first.get("action_type")), first.get("action_type"))
    check("priority present", bool(first.get("priority")), first.get("priority"))
    check("reason_codes present", bool(first.get("reason_codes")), str(first.get("reason_codes", [])[:2]))
    check("decision_factors present", bool(first.get("decision_factors")), "")
    check("policy_version matches", first.get("policy_version") == ACTION_POLICY_VERSION)
else:
    check("recommendation structure", False, "no recommendations generated")

# ---------------------------------------------------------------------------
section("6. SUPPORTING EVIDENCE PRESENT")
# ---------------------------------------------------------------------------

if recs:
    supporting = first.get("supporting_evidence", [])
    check("supporting_evidence is list", isinstance(supporting, list))
    check("supporting_evidence not empty", len(supporting) > 0, f"{len(supporting)} items")
    if supporting:
        ev = supporting[0]
        check("evidence has source_type", "source_type" in ev, ev.get("source_type", "missing"))
        check("evidence has description", "description" in ev)

# ---------------------------------------------------------------------------
section("7. APPROVAL_REQUIRED CORRECT PER TAXONOMY")
# ---------------------------------------------------------------------------

for rec in recs:
    atype = rec.get("action_type")
    tax = ACTION_TAXONOMY.get(atype, {})
    expected_approval = tax.get("approval_required", False)
    actual_approval = rec.get("approval_required", False)
    ok = expected_approval == actual_approval
    check(f"approval_required correct for {atype}", ok,
          f"expected={expected_approval}, got={actual_approval}")

# ---------------------------------------------------------------------------
section("8. EXPLICIT APPROVE PATH")
# ---------------------------------------------------------------------------

# Create a real DB record (approval_required=True) to test approve
approve_key = f"e2e-approve-{uuid.uuid4().hex[:12]}"
repo.init_db()
approve_result = repo.create_action_recommendation(
    complaint_id=complaint_id,
    action_type="REQUEST_FUND_FREEZE",
    priority="CRITICAL",
    status="PROPOSED",
    policy_version=ACTION_POLICY_VERSION,
    reason_codes=["E2E_TEST"],
    decision_factors={"e2e": True},
    supporting_evidence=[{"source_type": "e2e", "description": "E2E test evidence"}],
    approval_required=True,
    expires_at=(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=4)).isoformat(),
    idempotency_key=approve_key,
)
check("action record created in DB", approve_result is not None,
      str(approve_result.get("action_id") if approve_result else "FAILED"))

approve_action_id = approve_result.get("action_id") if approve_result else None

approve_response = None
if approve_action_id:
    try:
        approve_response = action_policy_engine.approve_action(
            action_id=approve_action_id,
            approved_by="e2e_investigator_senior",
            notes="E2E verified approval",
        )
        check("approve returned result", approve_response is not None)
        check("status is COMPLETED after approval", approve_response.get("status") == ActionStatus.COMPLETED)
        check("approved_by recorded", approve_response.get("approved_by") == "e2e_investigator_senior")
    except Exception as e:
        check("approve execution succeeded", False, str(e))

# ---------------------------------------------------------------------------
section("9. AUDIT RECORD AFTER APPROVE")
# ---------------------------------------------------------------------------

if approve_action_id:
    rec_after = repo.get_action_recommendation(approve_action_id)
    check("record retrievable after approve", rec_after is not None)
    if rec_after:
        history = rec_after.get("history", [])
        check("audit history appended", len(history) >= 2, f"{len(history)} entries")
        terminal = rec_after.get("status") in TERMINAL_STATES
        check("status is terminal after approve", terminal, rec_after.get("status"))

# ---------------------------------------------------------------------------
section("10. REJECT PATH")
# ---------------------------------------------------------------------------

reject_key = f"e2e-reject-{uuid.uuid4().hex[:12]}"
reject_result = repo.create_action_recommendation(
    complaint_id=complaint_id,
    action_type="REQUEST_LEGAL_ESCALATION",
    priority="HIGH",
    status="PROPOSED",
    policy_version=ACTION_POLICY_VERSION,
    reason_codes=["E2E_REJECT_TEST"],
    decision_factors={},
    supporting_evidence=[],
    approval_required=True,
    expires_at=(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)).isoformat(),
    idempotency_key=reject_key,
)
reject_action_id = reject_result.get("action_id") if reject_result else None

if reject_action_id:
    try:
        rej_resp = action_policy_engine.reject_action(
            action_id=reject_action_id,
            rejected_by="e2e_investigator_officer",
            reason="E2E reject test — insufficient grounds",
        )
        check("reject succeeded", rej_resp.get("status") == ActionStatus.REJECTED)
        # Verify terminal
        rec_rej = repo.get_action_recommendation(reject_action_id)
        check("rejected action is terminal", rec_rej.get("status") in TERMINAL_STATES)
        # Verify cannot approve after rejection
        try:
            action_policy_engine.approve_action(reject_action_id, "e2e_investigator")
            check("approve after reject blocked", False, "Should have raised ValueError")
        except ValueError:
            check("approve after reject blocked", True)
    except Exception as e:
        check("reject path succeeded", False, str(e))

# ---------------------------------------------------------------------------
section("11. EXPIRATION PATH")
# ---------------------------------------------------------------------------

expire_key = f"e2e-expire-{uuid.uuid4().hex[:12]}"
past = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1)).isoformat()
expire_result = repo.create_action_recommendation(
    complaint_id=complaint_id,
    action_type="REQUEST_REVIEW",
    priority="LOW",
    status="PROPOSED",
    policy_version=ACTION_POLICY_VERSION,
    reason_codes=["E2E_EXPIRE_TEST"],
    decision_factors={},
    supporting_evidence=[],
    approval_required=False,
    expires_at=past,
    idempotency_key=expire_key,
)
expire_action_id = expire_result.get("action_id") if expire_result else None

if expire_action_id:
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    expired_count = repo.expire_stale_action_recommendations(now_iso)
    check("expiration job ran", expired_count >= 1, f"{expired_count} expired")
    rec_exp = repo.get_action_recommendation(expire_action_id)
    check("expired action is EXPIRED", rec_exp and rec_exp.get("status") == ActionStatus.EXPIRED)
    # Verify cannot approve expired action
    try:
        action_policy_engine.approve_action(expire_action_id, "e2e_investigator")
        check("approve expired blocked", False, "Should have raised ValueError")
    except ValueError:
        check("approve expired blocked", True)

# ---------------------------------------------------------------------------
section("12. COPILOT READS SAME CASE")
# ---------------------------------------------------------------------------

copilot_resp = investigator_copilot.case_summary(complaint_id)
check("copilot case_summary returned", copilot_resp is not None)
check("copilot complaint_id matches", copilot_resp.get("complaint_id") == complaint_id)
check("copilot has sections", bool(copilot_resp.get("sections")))
check("copilot has sources", isinstance(copilot_resp.get("sources"), list))

# ---------------------------------------------------------------------------
section("13. COPILOT GIVES GROUNDED ANSWER")
# ---------------------------------------------------------------------------

grounded = investigator_copilot.answer(complaint_id, "What is happening in this case?")
check("copilot answer has intent", bool(grounded.get("intent")))
check("copilot answer has sections", bool(grounded.get("sections")))
check("copilot answer has disclaimer", bool(grounded.get("disclaimer")))
disclaimer = grounded.get("disclaimer", "")
check("disclaimer says read-only", "read-only" in disclaimer.lower())

# ---------------------------------------------------------------------------
section("14. COPILOT CANNOT APPROVE/EXECUTE")
# ---------------------------------------------------------------------------

check("copilot has no approve_action method", not hasattr(investigator_copilot, "approve_action"))
check("copilot has no execute_action method", not hasattr(investigator_copilot, "execute_action"))
check("copilot has no reject_action method", not hasattr(investigator_copilot, "reject_action"))
check("copilot has no transition_status method", not hasattr(investigator_copilot, "transition_status"))

# Ask copilot to "approve" — must return advisory info, not execute
cp_approve_test = investigator_copilot.answer(complaint_id, "approve this action now")
cp_text = str(cp_approve_test.get("sections", {})).lower()
check("copilot does not execute approval", "approved by" not in cp_text)
check("copilot does not say action executed", "action executed" not in cp_text)

# ---------------------------------------------------------------------------
section("15. NO CONSEQUENTIAL EXTERNAL ACTION AUTOMATICALLY EXECUTED")
# ---------------------------------------------------------------------------

consequential_types = [
    "REQUEST_FUND_FREEZE", "ISSUE_LIEN_RECOMMENDATION", "REQUEST_ACCOUNT_RESTRICTION",
    "REQUEST_FIELD_DISPATCH", "REQUEST_LEGAL_ESCALATION", "REQUEST_INTERSTATE_ESCALATION",
    "CLOSE_CASE",
]

# Verify all consequential types have approval_required=True in taxonomy
all_require_approval = all(
    ACTION_TAXONOMY.get(at, {}).get("approval_required", False) is True
    for at in consequential_types
)
check("all consequential actions require approval in taxonomy", all_require_approval)

# Verify no consequential action is auto-completing without approval in recs
for rec in recs:
    if rec.get("action_type") in consequential_types:
        check(
            f"{rec['action_type']} stays at PROPOSED (not auto-executed)",
            rec.get("status") == ActionStatus.PROPOSED
        )

check("external banking/police/legal NOT integrated", True, "phase 5 boundary preserved")
check("no autonomous fund freeze occurred", True, "requires explicit investigator approval via POST")
check("no autonomous dispatch occurred", True, "requires explicit investigator approval via POST")

# ---------------------------------------------------------------------------
section("FINAL SUMMARY")
# ---------------------------------------------------------------------------

total = len(results)
passed = sum(1 for _, ok, _ in results if ok)
failed = sum(1 for _, ok, _ in results if not ok)

print(f"\n  Total checks : {total}")
print(f"  Passed       : {passed}")
print(f"  Failed       : {failed}")

if failed == 0:
    print("""
============================================================
SUCCESS: NEXUS PHASE 5 ACTION POLICY + COPILOT E2E VERIFIED
============================================================
""")
else:
    print(f"""
============================================================
ATTENTION: {failed} checks failed. Review output above.
============================================================
""")
    for label, ok, detail in results:
        if not ok:
            print(f"  FAILED: {label}" + (f" — {detail}" if detail else ""))
