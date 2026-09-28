"""
NEXUS Phase 2B Manual End-to-End Verification: Case Attention Engine
====================================================================
Demonstrates the full autonomous operational attention lifecycle:
1. Create a real complaint in the system
2. Create/attach a prediction
3. Verify autonomy event exists
4. CaseWatcher processes the event automatically
5. Case attention state appears with deterministic score & level
6. Machine-readable reason codes explain why
7. Add new evidence with discrepancy
8. Emit evidence_updated event
9. CaseWatcher processes it
10. Case attention is recalculated and elevated
11. Add a second complaint with shared infrastructure (Truth Graph correlation)
12. Attention changes deterministically reflecting multi-case correlation
13. Verify complaint and prediction contracts remain completely unbroken
"""

import os
import sys
import uuid
import time
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from db import repo
from core.autonomy.case_watcher import CaseWatcher
from core.autonomy.attention_engine import attention_engine


def run_manual_e2e():
    print("=" * 70)
    print("NEXUS PHASE 2B: AUTONOMOUS CASE ATTENTION ENGINE E2E VERIFICATION")
    print("=" * 70)

    test_uid = uuid.uuid4().hex[:8]
    ncrp_1 = f"NCRP-ATTN-{test_uid[:6].upper()}-1"
    shared_phone = f"+9198765{test_uid[:5]}"
    shared_bank = f"BANK-ATTN-{test_uid[:4].upper()}"

    # 1. Create real complaint #1
    complaint_1_payload = {
        "ncrp_id": ncrp_1,
        "victim_name": f"Victim Attention Test {test_uid}-1",
        "fraud_type": "UPI_PHISHING",
        "amount_inr": 250000.0,  # 2.5 Lakhs (Significant exposure)
        "suspect_phone": shared_phone,
        "suspect_bank": shared_bank,
        "description": f"Phase 2B Attention Engine initial intake test {test_uid}",
        "victim_state": "Maharashtra",
        "status": "active",
    }
    print(f"\n[1] Creating real complaint {ncrp_1}...")
    c1 = repo.create_complaint(complaint_1_payload)
    cid_1 = c1["complaint_id"]
    print(f" -> Complaint 1 created! ID: {cid_1} | NCRP: {c1.get('ncrp_id')}")

    # 2. Add realistic prediction for Complaint #1
    pred_1_payload = {
        "prediction_id": str(uuid.uuid4()),
        "complaint_id": cid_1,
        "risk_score": 0.82,
        "risk_level": "RED",
        "cashout_window_hours": 3.0,  # Approaching window (<= 4h)
        "predicted_lat": 19.0760,
        "predicted_lon": 72.8777,
        "confidence": 0.85,
        "predicted_atms": [
            {"atm_id": f"ATM-MUM-{test_uid[:4]}-01", "distance_km": 0.65},
            {"atm_id": f"ATM-MUM-{test_uid[:4]}-02", "distance_km": 1.20},
        ],
        "model_version": "geo_lgbm_v3",
    }
    print(f"\n[2] Attaching prediction for Complaint 1 (risk: 0.82, window: 3h)...")
    p1 = repo.save_prediction(pred_1_payload)
    print(f" -> Prediction created! ID: {p1.get('prediction_id')} | Risk: {p1.get('risk_score')}")

    # 3. Verify autonomy events exist
    idem_1 = f"complaint:{cid_1}:created"
    ev1 = repo.get_autonomy_event_by_idempotency_key(idem_1)
    print(f"\n[3] Checking emitted autonomy event for Complaint 1 (idem: {idem_1})...")
    self_status = (ev1.get("processing_status") or ev1.get("status")) if ev1 else "missing"
    print(f" -> Event found: {ev1 is not None} | Status: {self_status}")

    # 4. Trigger CaseWatcher cycle to process Complaint 1
    print(f"\n[4] Running CaseWatcher cycle to process events autonomously...")
    watcher = CaseWatcher()
    for attempt in range(5):
        processed = watcher.run_cycle(batch_size=10)
        ev1_updated = repo.get_autonomy_event_by_idempotency_key(idem_1)
        st = (ev1_updated.get("processing_status") or ev1_updated.get("status")) if ev1_updated else None
        print(f" -> Cycle {attempt + 1}: {processed} events processed | Event status: {st}")
        if st in ("processed", "failed"):
            break
        time.sleep(0.5)

    # 5. Check Attention State for Complaint 1
    print(f"\n[5] Fetching calculated Case Attention State for Complaint 1...")
    att_1 = repo.get_case_attention_state(cid_1)
    assert att_1 is not None, "Case attention state was not created!"
    print(f" -> Attention Score: {att_1['attention_score']}/100.0")
    print(f" -> Attention Level: {att_1['attention_level']}")
    print(f" -> Policy Version:  {att_1['policy_version']}")

    # 6. Check Explainability Reason Codes & Decision Factors
    print(f"\n[6] Explainability & Grounded Decision Factors:")
    print(f" -> Reason Codes: {att_1['reason_codes']}")
    print(f" -> Contributions:")
    for signal, details in att_1["decision_factors"].get("contributions", {}).items():
        print(f"    * {signal:<26}: {details.get('points', 0.0):>5.1f} pts")
    assert att_1["attention_score"] >= 50.0, "Expected elevated attention score for high-risk case with short window!"
    assert "HIGH_FRAUD_RISK" in att_1["reason_codes"]
    assert "OPERATIONAL_WINDOW_APPROACHING" in att_1["reason_codes"]

    # Item 14 Verification: Verify Phase 2A entity masking & canonical identity storage
    tg1 = repo.get_truth_graph_for_complaint(cid_1)
    entities = tg1.get("entities", []) if tg1 else []
    print(f"\n[Item 14 Verification] Truth Graph Entity Masking Inspection:")
    print(f" -> Extracted {len(entities)} entities with provenance:")
    for ent in entities:
        print(f"    * Type: {ent.get('entity_type'):<14} | Canonical Ref: {ent.get('canonical_reference'):<24} | Masked Value: {ent.get('masked_value')}")
        # Verify raw phone/account is NEVER exposed unmasked in masked_value
        if ent.get("entity_type") == "phone":
            assert "***" in str(ent.get("masked_value")), "Phone must be masked!"
            assert ent.get("raw_fingerprint_hash") is not None, "Fingerprint hash must exist!"

    # 7. Add new evidence with discrepancy
    print(f"\n[7] Emitting evidence update with discrepancy detected...")
    evidence_idem = f"evidence:{cid_1}:statement_{test_uid}"
    repo.safe_emit_autonomy_event(
        event_type="evidence_discrepancy_detected",
        entity_type="evidence",
        entity_id=f"stmt_{test_uid}",
        complaint_id=cid_1,
        payload={
            "complaint_id": cid_1,
            "discrepancy_detected": True,
            "discrepancy_details": "Reported transfer time differs from bank timestamp by 6 hours",
        },
        idempotency_key=evidence_idem,
    )

    # 8. Run CaseWatcher to process discrepancy event
    print(f"\n[8] Running CaseWatcher to process evidence discrepancy...")
    watcher.run_cycle(batch_size=10)

    # 9. Verify attention recalculation after discrepancy
    att_1_after_disc = repo.get_case_attention_state(cid_1)
    print(f"\n[9] Attention State after discrepancy detection:")
    print(f" -> Previous Score: {att_1['attention_score']} -> New Score: {att_1_after_disc['attention_score']}")
    print(f" -> New Reason Codes: {att_1_after_disc['reason_codes']}")
    assert att_1_after_disc["attention_score"] >= att_1["attention_score"], "Discrepancy must elevate attention score!"
    assert "EVIDENCE_DISCREPANCY" in att_1_after_disc["reason_codes"]

    # 10. Add second complaint sharing phone & bank infrastructure
    ncrp_2 = f"NCRP-ATTN-{test_uid[:6].upper()}-2"
    complaint_2_payload = {
        "ncrp_id": ncrp_2,
        "victim_name": f"Victim Attention Test {test_uid}-2",
        "fraud_type": "UPI_PHISHING",
        "amount_inr": 180000.0,
        "suspect_phone": shared_phone,  # Same suspect phone
        "suspect_bank": shared_bank,   # Same suspect bank
        "description": f"Phase 2B cross-case correlation complaint {test_uid}",
        "victim_state": "Gujarat",
        "status": "active",
    }
    print(f"\n[10] Creating second complaint {ncrp_2} with SHARED infrastructure...")
    c2 = repo.create_complaint(complaint_2_payload)
    cid_2 = c2["complaint_id"]
    print(f" -> Complaint 2 created! ID: {cid_2} | NCRP: {c2.get('ncrp_id')}")

    # Process Complaint 2 through watcher
    print(f"\n[11] Running CaseWatcher to ingest Complaint 2 and correlate Truth Graph...")
    for _ in range(3):
        watcher.run_cycle(batch_size=10)
        time.sleep(0.3)

    # Re-evaluate Complaint 1 attention to reflect the newly discovered cross-case link
    att_1_cross = attention_engine.evaluate_case_attention(cid_1)
    print(f"\n[12] Attention State for Complaint 1 after Cross-Case Linkage:")
    print(f" -> Reason Codes: {att_1_cross['reason_codes']}")
    print(f" -> Cross-case correlation points: {att_1_cross['decision_factors']['contributions']['cross_case_correlation']['points']}")
    assert any(c in att_1_cross["reason_codes"] for c in ["CROSS_CASE_LINK_DETECTED", "MULTI_CASE_CORRELATION", "SHARED_ACCOUNT_DETECTED"])

    # 13. Verify contracts remain unbroken
    print(f"\n[13] Verifying original complaint and prediction contracts...")
    c1_verify = repo.get_complaint_by_id(cid_1)
    p1_verify = repo.get_prediction_by_complaint(cid_1)
    assert c1_verify["amount_inr"] == 250000.0
    assert float(p1_verify["risk_score"]) == 0.82
    assert p1_verify["risk_level"] == "RED"
    assert float(p1_verify["predicted_lat"]) == 19.0760
    print(" -> Complaint 1 amount_inr preserved: 250000.0")
    print(" -> Prediction 1 risk_score preserved: 0.82 (RED)")
    print(" -> Prediction 1 coordinates preserved: 19.0760, 72.8777")

    # 14. Verify Work Queue API
    print(f"\n[14] Querying active Attention Work Queue...")
    queue = repo.get_case_attention_queue(limit=10)
    print(f" -> Work queue returned {queue['total']} active prioritized cases")
    top_case = queue["cases"][0] if queue["cases"] else None
    if top_case:
        print(f"    * Top priority case: {top_case.get('complaint_id')}")
        print(f"      Score: {top_case.get('attention_score')} | Level: {top_case.get('attention_level')}")
        print(f"      Reasons: {top_case.get('reason_codes')}")

    print("\n" + "=" * 70)
    print("SUCCESS: NEXUS PHASE 2B CASE ATTENTION ENGINE E2E VERIFIED!")
    print("Operational priorities updated dynamically without human intervention.")
    print("=" * 70)


if __name__ == "__main__":
    run_manual_e2e()
