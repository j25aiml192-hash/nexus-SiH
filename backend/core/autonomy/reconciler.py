"""
NEXUS Autonomy Event Reconciler (Phase 2A)
==========================================
Periodically inspects real operational records and ensures that any missing
autonomy events (e.g., due to temporary database timeouts during creation)
are safely reconstructed without duplicating business records.

Guarantees:
- Safe reconciliation using deterministic idempotency keys.
- Completely non-destructive (never mutates original business records).
- Bounded inspection windows (recent complaints, predictions, incidents).
"""

import logging
from typing import Dict, Any, List
from db import repo

logger = logging.getLogger("nexus.autonomy.reconciler")


class AutonomyReconciler:
    """Detects and recovers dropped or missing autonomy events."""

    def __init__(self, check_limit: int = 50):
        self.check_limit = check_limit

    def run_reconciliation_cycle(self) -> Dict[str, int]:
        """
        Scans recent complaints, predictions, and incidents to backfill
        any missing autonomy events. Returns reconciliation metrics.
        """
        reconciled = {
            "complaints_reconciled": 0,
            "predictions_reconciled": 0,
            "incidents_reconciled": 0,
        }

        # 1. Reconcile Complaints
        try:
            complaints = repo.get_complaints(limit=self.check_limit)
            for c in complaints:
                cid = str(c.get("complaint_id"))
                ch = str(c.get("channel") or "").strip().upper()
                is_voice = ch in ("VOICE", "VOICE_BOT", "VOICE BOT", "EXOTEL")
                evt_type = "voice_complaint_submitted" if is_voice else "complaint_ingested"
                idem_key = f"voice:{cid}:submitted" if is_voice else f"complaint:{cid}:created"

                # Check if event is missing
                existing = repo.get_autonomy_event_by_idempotency_key(idem_key)
                if not existing:
                    res = repo.safe_emit_autonomy_event(
                        event_type=evt_type,
                        entity_type="complaint",
                        entity_id=cid,
                        complaint_id=cid,
                        payload={
                            "complaint_id": cid,
                            "ncrp_id": c.get("ncrp_id"),
                            "fraud_type": c.get("fraud_type"),
                            "amount_inr": c.get("amount_inr"),
                            "victim_state": c.get("victim_state"),
                            "channel": ch or "UPI",
                            "accused_bank": c.get("accused_bank"),
                            "reconciled": True,
                        },
                        idempotency_key=idem_key,
                    )
                    if res:
                        reconciled["complaints_reconciled"] += 1
        except Exception as e:
            logger.warning(f"[Autonomy Reconciler] Complaints scan non-fatal error: {e}")

        # 2. Reconcile Predictions
        try:
            preds = repo.get_all_active_predictions()
            if preds:
                for p in preds[:self.check_limit]:
                    pid = str(p.get("prediction_id"))
                    cid = str(p.get("complaint_id"))
                    idem_key = f"prediction:{pid}:generated"

                    existing = repo.get_autonomy_event_by_idempotency_key(idem_key)
                    if not existing:
                        res = repo.safe_emit_autonomy_event(
                            event_type="prediction_generated",
                            entity_type="prediction",
                            entity_id=pid,
                            complaint_id=cid,
                            payload={
                                "prediction_id": pid,
                                "complaint_id": cid,
                                "risk_score": p.get("risk_score"),
                                "risk_level": p.get("risk_level"),
                                "cashout_window_hours": p.get("cashout_window_hours"),
                                "predicted_lat": p.get("predicted_lat"),
                                "predicted_lon": p.get("predicted_lon"),
                                "reconciled": True,
                            },
                            idempotency_key=idem_key,
                        )
                        if res:
                            reconciled["predictions_reconciled"] += 1
        except Exception as e:
            logger.warning(f"[Autonomy Reconciler] Predictions scan non-fatal error: {e}")

        # 3. Reconcile Resolved Incidents
        try:
            incidents = repo.get_incidents(limit=self.check_limit)
            for inc in incidents:
                st = str(inc.get("status", "")).lower()
                if st in ("resolved", "closed"):
                    iid = str(inc.get("incident_id"))
                    cid = str(inc.get("complaint_id"))
                    idem_key = f"incident:{iid}:resolved"

                    existing = repo.get_autonomy_event_by_idempotency_key(idem_key)
                    if not existing:
                        res = repo.safe_emit_autonomy_event(
                            event_type="incident_resolved",
                            entity_type="incident",
                            entity_id=iid,
                            complaint_id=cid,
                            payload={
                                "incident_id": iid,
                                "complaint_id": cid,
                                "status": st,
                                "action_taken": inc.get("action_taken"),
                                "suspect_apprehended": inc.get("suspect_apprehended", 0),
                                "reconciled": True,
                            },
                            idempotency_key=idem_key,
                        )
                        if res:
                            reconciled["incidents_reconciled"] += 1
        except Exception as e:
            logger.warning(f"[Autonomy Reconciler] Incidents scan non-fatal error: {e}")

        total = sum(reconciled.values())
        if total > 0:
            logger.info(f"[Autonomy Reconciler] Successfully reconciled {total} missing event(s): {reconciled}")

        return reconciled


reconciler = AutonomyReconciler()
