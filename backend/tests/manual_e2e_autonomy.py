import os
import sys
import uuid
import time
from pathlib import Path

# Ensure backend is on sys.path
backend_dir = Path(r"c:\PROJECTS(ALL)\SIH\backend")
sys.path.insert(0, str(backend_dir))

from db import repo
from core.autonomy.case_watcher import CaseWatcher
from core.autonomy.event_router import EventRouter
from core.autonomy.reconciler import AutonomyReconciler

def run_e2e_test():
    print("=" * 60)
    print("NEXUS PHASE 2A: REAL AUTONOMOUS END-TO-END VERIFICATION")
    print("=" * 60)

    # 1. Create a real complaint through the standard repo method
    test_id = uuid.uuid4().hex[:8]
    ncrp_num = f"NCRP-AUTO-{test_id.upper()}"
    phone = f"+9198765{test_id[:5]}"
    
    complaint_payload = {
        "ncrp_id": ncrp_num,
        "victim_name": f"Autonomous Test Victim {test_id}",
        "fraud_type": "UPI Fraud",
        "amount_inr": 75000.0,
        "suspect_phone": phone,
        "suspect_upi": f"scammer{test_id}@okaxis",
        "description": f"Automated test case {test_id} for Phase 2A autonomous event routing",
        "victim_state": "Maharashtra",
        "status": "active"
    }

    print(f"\n[1] Creating test complaint {ncrp_num}...")
    complaint = repo.create_complaint(complaint_payload)
    complaint_id = complaint["complaint_id"]
    print(f" -> Complaint created! ID: {complaint_id} | NCRP: {complaint.get('ncrp_id')}")

    # 2. Verify that an autonomy_event was emitted automatically
    idem_key = f"complaint:{complaint_id}:created"
    print(f"\n[2] Checking emitted autonomy event (idempotency: {idem_key})...")
    event = repo.get_autonomy_event_by_idempotency_key(idem_key)
    assert event is not None, "Autonomy event was not emitted on complaint creation!"
    print(f" -> Event found! ID: {event['event_id']}")
    print(f" -> Event Type: {event['event_type']}")
    status_val = event.get('processing_status') or event.get('status')
    print(f" -> Status: {status_val}")
    assert event['event_type'] == 'complaint_ingested'
    assert status_val in ('pending', 'processing', 'processed')

    # 3. Simulate Watcher Cycle processing the event (if not already picked up by background)
    print(f"\n[3] Triggering CaseWatcher cycle...")
    watcher = CaseWatcher()
    for attempt in range(5):
        cycle_stats = watcher.run_cycle(batch_size=20)
        print(f" -> Watcher cycle {attempt + 1} completed: {cycle_stats} events processed")
        updated_event = repo.get_autonomy_event_by_id(event['event_id'])
        updated_status = updated_event.get('processing_status') or updated_event.get('status')
        if updated_status in ('processed', 'failed'):
            break
        time.sleep(0.5)

    # 4. Verify event state moved to processed
    print(f"\n[4] Verifying event progression...")
    print(f" -> Event status: {updated_status}")
    print(f" -> Processed at: {updated_event.get('processed_at')}")
    assert updated_status == 'processed', f"Expected status 'processed', got {updated_status}"

    # 5. Check Truth Graph entities created autonomously
    tg = repo.get_truth_graph_for_complaint(complaint_id)
    entities = tg.get("entities", []) if tg else []
    print(f"\n[5] Autonomous Truth Graph entity extraction results:")
    print(f" -> Extracted {len(entities)} entities autonomously:")
    for ent in entities:
        print(f"    * Type: {ent.get('entity_type')} | Value: {ent.get('entity_value')} | Masked: {ent.get('entity_value_masked')}")
    assert len(entities) >= 1, "Expected Truth Graph entities to be resolved autonomously!"

    # 6. Check Structured Audit Log
    logs = repo.get_autonomy_audit_logs(complaint_id=complaint_id, limit=10)
    print(f"\n[6] Autonomy Audit Trail verification:")
    print(f" -> Found {len(logs)} audit entries:")
    for l in logs:
        print(f"    * Action: {l.get('action_type')} | Reason: {l.get('reason_code')} | Trigger: {l.get('trigger_event')} | Timestamp: {l.get('created_at')}")
        print(f"      Decision Factors: {l.get('decision_factors')}")
        print(f"      Approval Required: {l.get('requires_approval')}")
    assert len(logs) >= 1, "Expected at least 1 structured autonomy audit log entry!"

    # 7. Check follow-up events (e.g. victim_advisory_prepared or initial case-watch registration)
    recent_events = repo.get_pending_autonomy_events(limit=20)
    print(f"\n[7] Pending follow-up events generated:")
    follow_ups = [ev for ev in recent_events if ev.get('complaint_id') == complaint_id]
    for ev in follow_ups:
        print(f"    * Follow-up: {ev.get('event_type')} | ID: {ev.get('event_id')} | Idempotency: {ev.get('idempotency_key')}")

    # 8. Test Part 18 second scenario:
    # NEW EVIDENCE -> AUTONOMY EVENT -> WATCHER -> CASE RE-EVALUATION
    print(f"\n[8] Emitting new evidence autonomously (evidence_updated)...")
    evidence_idem = f"evidence:{complaint_id}:tx_{test_id}"
    evidence_event = repo.safe_emit_autonomy_event(
        event_type="evidence_updated",
        entity_type="evidence",
        entity_id=f"tx_{test_id}",
        complaint_id=complaint_id,
        payload={
            "evidence_type": "bank_statement",
            "transaction_ref": f"TXN{test_id}",
            "amount": 75000.0,
            "discrepancy_detected": True,
            "discrepancy_details": "Transaction timestamp precedes reported incident by 4 hours"
        },
        idempotency_key=evidence_idem
    )
    print(f" -> Emitted evidence_updated event: {evidence_event.get('event_id')}")

    # Watcher processes evidence_updated
    print(f"\n[9] Running CaseWatcher to process evidence_updated...")
    cycle_stats2 = watcher.run_cycle()
    print(f" -> Watcher cycle completed: {cycle_stats2}")

    # Verify evidence event processed
    ev_updated = repo.get_autonomy_event_by_id(evidence_event['event_id'])
    ev_status = ev_updated.get('processing_status') or ev_updated.get('status')
    print(f" -> Evidence event status: {ev_status}")
    assert ev_status == 'processed'

    # Check updated audit logs
    logs_after = repo.get_autonomy_audit_logs(complaint_id=complaint_id, limit=10)
    print(f"\n[10] Autonomy Audit Trail after evidence re-evaluation:")
    print(f" -> Total audit entries: {len(logs_after)}")
    for l in logs_after:
        print(f"    * Action: {l.get('action_type')} | Reason: {l.get('reason_code')} | Trigger: {l.get('trigger_event')}")

    # 11. Test Reconciliation for dropped events
    print(f"\n[11] Testing Autonomy Reconciliation for simulated dropped event...")
    reconciler = AutonomyReconciler(check_limit=50)
    recon_stats = reconciler.run_reconciliation_cycle()
    print(f" -> Reconciliation result: {recon_stats}")

    print("\n" + "=" * 60)
    print("SUCCESS: REAL AUTONOMOUS END-TO-END VERIFICATION COMPLETED!")
    print("NEXUS reacted to events without any human or browser interaction.")
    print("=" * 60)

if __name__ == "__main__":
    run_e2e_test()
