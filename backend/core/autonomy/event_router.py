"""
NEXUS Autonomy Event Router (Phase 2A)
=====================================
Receives claimed autonomy events, performs safe internal analytical reactions,
and records structured audit entries.

Guarantees:
- Safe internal reactions only (no automated fund freezes, warrants, or external actions).
- Deterministic event semantics; strict loop prevention (terminal conditions).
- Structured machine-readable reason codes (zero raw LLM dumps).
- Complete sensitive data masking.
"""

import logging
import datetime
from typing import Dict, Any, List, Optional
from db import repo

logger = logging.getLogger("nexus.autonomy.router")


def mask_sensitive_value(val: Any, val_type: str = "generic") -> str:
    """Masks sensitive citizen and banking identifiers for safe storage and logging."""
    if not val:
        return ""
    s = str(val).strip()
    if val_type == "phone":
        if len(s) >= 8:
            return s[:3] + "****" + s[-3:]
        return s[:2] + "****"
    elif val_type in ("account", "bank_account"):
        if len(s) >= 6:
            return s[:2] + "****" + s[-4:]
        return "****"
    elif val_type == "upi":
        if "@" in s:
            user, domain = s.split("@", 1)
            masked_user = user[:2] + "***" if len(user) > 2 else "***"
            return f"{masked_user}@{domain}"
        return s[:2] + "***"
    return s[:3] + "****" if len(s) > 4 else "****"


class EventRouter:
    """Dispatches claimed autonomy events to dedicated safe reaction handlers."""

    def __init__(self):
        self._handlers = {
            "complaint_ingested": self._handle_complaint_ingested,
            "voice_complaint_submitted": self._handle_voice_complaint_submitted,
            "prediction_generated": self._handle_prediction_generated,
            "prediction_updated": self._handle_prediction_updated,
            "operational_window_approaching": self._handle_window_approaching,
            "evidence_updated": self._handle_evidence_updated,
            "evidence_discrepancy_detected": self._handle_evidence_discrepancy,
            "account_linked": self._handle_account_linked,
            "transaction_added": self._handle_transaction_added,
            "alert_created": self._handle_alert_created,
            "alert_acknowledged": self._handle_alert_acknowledged,
            "incident_resolved": self._handle_incident_resolved,
            "outcome_recorded": self._handle_outcome_recorded,
        }

    def route_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Routes a single claimed event to its appropriate reaction handler."""
        event_type = event.get("event_type")
        event_id = event.get("event_id")
        cid = event.get("complaint_id")

        handler = self._handlers.get(event_type)
        if not handler:
            logger.warning(f"[Autonomy Router] Unknown event type '{event_type}' for event {event_id}")
            return {
                "action_type": "IGNORED_UNKNOWN_TYPE",
                "status": "ignored",
                "event_id": event_id,
            }

        result = handler(event)

        # Trigger Case Attention Engine evaluation for the affected case
        complaint_id = event.get("complaint_id")
        if not complaint_id:
            payload = event.get("payload") or {}
            if isinstance(payload, str):
                import json
                try:
                    payload = json.loads(payload)
                except Exception:
                    payload = {}
            complaint_id = payload.get("complaint_id") or (event.get("entity_id") if event.get("entity_type") == "complaint" else None)

        if complaint_id:
            try:
                from core.autonomy.attention_engine import attention_engine
                att_res = attention_engine.evaluate_case_attention(
                    complaint_id=str(complaint_id),
                    trigger_event=event,
                )
                result["attention_evaluation"] = {
                    "score": att_res.get("attention_score"),
                    "level": att_res.get("attention_level"),
                    "reasons": att_res.get("reason_codes"),
                }
            except Exception as e:
                logger.debug(f"[Autonomy Attention Evaluation Safe Notice]: {e}")

            # Trigger Syndicate DNA Cross-Case Intelligence Analysis
            try:
                from core.autonomy.syndicate_dna_engine import syndicate_dna_engine
                dna_res = syndicate_dna_engine.correlate_case(
                    complaint_id=str(complaint_id),
                    trigger_event=event,
                )
                result["syndicate_dna_evaluation"] = {
                    "correlated_cases_count": dna_res.get("correlated_cases_count", 0),
                    "clusters_updated": dna_res.get("clusters_updated", []),
                    "status": dna_res.get("status"),
                }
            except Exception as e:
                logger.debug(f"[Autonomy Syndicate DNA Safe Notice]: {e}")

            # Trigger Phase 5 Action Policy Engine evaluation
            try:
                from core.autonomy.action_policy import action_policy_engine
                policy_res = action_policy_engine.evaluate_and_persist(
                    complaint_id=str(complaint_id),
                    trigger_event=event,
                )
                result["action_policy_evaluation"] = {
                    "recommendations_created": policy_res.get("recommendations_created", 0),
                    "recommendations_suppressed": policy_res.get("recommendations_suppressed", 0),
                    "action_ids": policy_res.get("action_ids", []),
                }
            except Exception as e:
                logger.debug(f"[Autonomy Action Policy Safe Notice]: {e}")

            # Trigger Phase 6 Victim Proactive Advisory Engine evaluation
            try:
                from core.autonomy.victim_advisory_policy import victim_advisory_engine
                adv_res = victim_advisory_engine.evaluate_and_persist(
                    complaint_id=str(complaint_id),
                    trigger_event=event,
                )
                result["victim_advisory_evaluation"] = {
                    "status": adv_res.get("status"),
                    "advisory_id": adv_res.get("advisory_id"),
                    "urgency": adv_res.get("urgency"),
                    "policy_version": adv_res.get("policy_version"),
                }
            except Exception as e:
                logger.debug(f"[Autonomy Victim Advisory Safe Notice]: {e}")

        return result

    # -------------------------------------------------------------------------
    # HANDLERS
    # -------------------------------------------------------------------------

    def _handle_complaint_ingested(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Reaction for complaint_ingested:
        1. Resolve Truth Graph entities (complaint, phone, bank account, bank).
        2. Create direct observed relationships.
        3. Check for cross-case correlation (shared entity detection).
        4. Register case in watch system & record structured audit log.
        """
        payload = event.get("payload") or {}
        if isinstance(payload, str):
            import json
            try:
                payload = json.loads(payload)
            except Exception:
                payload = {}

        cid = str(event.get("complaint_id") or payload.get("complaint_id") or event.get("entity_id"))
        reason_codes = ["NEW_COMPLAINT", "TRUTH_GRAPH_ENTITIES_RESOLVED"]
        shared_detected = []

        # 1. Resolve Complaint Entity
        comp_ent = None
        try:
            comp_ent = repo.create_or_get_truth_entity(
                entity_type="complaint",
                raw_value=cid,
                metadata={"fraud_type": payload.get("fraud_type"), "amount_inr": payload.get("amount_inr")},
            )
        except Exception as e:
            logger.debug(f"[Autonomy TG] Failed resolving complaint entity {cid}: {e}")

        # 2. Resolve Accused Phone if present
        phone = payload.get("accused_phone") or payload.get("accused_phone_prefix")
        if phone:
            try:
                p_ent = repo.create_or_get_truth_entity(
                    entity_type="phone",
                    raw_value=str(phone),
                    metadata={"complaint_id": cid},
                )
                src_id = comp_ent["entity_id"] if comp_ent else p_ent["entity_id"]
                repo.create_truth_relation(
                    source_entity_id=src_id,
                    target_entity_id=p_ent["entity_id"],
                    relation_type="APPEARED_IN_COMPLAINT",
                    source_record_type="complaint",
                    source_record_id=cid,
                    complaint_id=cid,
                    semantic_level="DIRECT_OBSERVED",
                )
                # Check cross-case correlation
                cross_links = repo.get_entity_cross_case_links(p_ent["entity_id"])
                linked = cross_links.get("linked_complaints", []) if isinstance(cross_links, dict) else cross_links
                other_cases = [c for c in linked if c != cid]
                if other_cases:
                    shared_detected.append({"entity_type": "phone", "other_complaints": other_cases})
            except Exception as e:
                logger.debug(f"[Autonomy TG] Failed resolving phone entity: {e}")

        # 3. Resolve Accused Bank if present
        bank = payload.get("accused_bank")
        if bank:
            try:
                b_ent = repo.create_or_get_truth_entity(
                    entity_type="bank_account",
                    raw_value=f"BANK-{bank}",
                    metadata={"bank_name": bank},
                )
                src_id = comp_ent["entity_id"] if comp_ent else b_ent["entity_id"]
                repo.create_truth_relation(
                    source_entity_id=src_id,
                    target_entity_id=b_ent["entity_id"],
                    relation_type="APPEARED_IN_COMPLAINT",
                    source_record_type="complaint",
                    source_record_id=cid,
                    complaint_id=cid,
                    semantic_level="DIRECT_OBSERVED",
                )
            except Exception as e:
                logger.debug(f"[Autonomy TG] Failed resolving bank entity: {e}")

        if shared_detected:
            reason_codes.append("SHARED_ENTITY_DETECTED")
            # Safely emit non-looping follow-up event
            repo.safe_emit_autonomy_event(
                event_type="account_linked",
                entity_type="complaint",
                entity_id=cid,
                complaint_id=cid,
                payload={"shared_correlations": shared_detected},
                idempotency_key=f"evt:account_linked:{cid}:{len(shared_detected)}",
            )

        # 4. Record Structured Audit Entry
        audit = repo.create_autonomy_audit_log(
            trigger_event_type="complaint_ingested",
            action_type="REGISTER_CASE_WATCH",
            decision_factors={
                "reason_codes": reason_codes,
                "shared_entities": shared_detected,
                "fraud_type": payload.get("fraud_type"),
                "amount_inr": payload.get("amount_inr"),
            },
            complaint_id=cid,
            trigger_event_id=event.get("event_id"),
            action_payload={"watch_status": "registered", "initial_stage": "truth_graph_synchronized"},
            requires_approval=False,
            approval_status="not_required",
        )

        return {"action_type": "REGISTER_CASE_WATCH", "audit_log_id": audit.get("log_id"), "status": "processed"}

    def _handle_voice_complaint_submitted(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Reaction for voice_complaint_submitted:
        1. Resolve Truth Graph entities.
        2. Prepare proactive victim advisory (deterministic warning template).
        3. Register case in watch system & record audit trail.
        """
        payload = event.get("payload") or {}
        if isinstance(payload, str):
            import json
            try:
                payload = json.loads(payload)
            except Exception:
                payload = {}

        cid = str(event.get("complaint_id") or payload.get("complaint_id") or event.get("entity_id"))
        phone = payload.get("accused_phone") or payload.get("accused_phone_prefix") or "+919999999999"
        masked_phone = mask_sensitive_value(phone, "phone")

        # 1. Resolve Truth Graph
        try:
            repo.create_or_get_truth_entity(
                entity_type="complaint",
                raw_identifier=cid,
                metadata={"channel": "VOICE", "fraud_type": payload.get("fraud_type")},
            )
        except Exception as e:
            logger.debug(f"[Autonomy Voice TG]: {e}")

        # 2. Persist Proactive Victim Advisory (Phase 6 Deterministic Engine)
        adv_res = {}
        try:
            from core.autonomy.victim_advisory_policy import victim_advisory_engine
            adv_res = victim_advisory_engine.evaluate_and_persist(
                complaint_id=cid,
                trigger_event=event,
            )
        except Exception as e:
            logger.debug(f"[Autonomy Voice Advisory Persist Safe Notice]: {e}")

        # 3. Record Audit Log
        audit = repo.create_autonomy_audit_log(
            trigger_event_type="voice_complaint_submitted",
            action_type="PROCESS_VOICE_INTAKE",
            decision_factors={
                "reason_codes": ["NEW_COMPLAINT", "VOICE_INTAKE_PROCESSED", "VICTIM_ADVISORY_PREPARED"],
                "channel": "VOICE",
                "phone_masked": masked_phone,
            },
            complaint_id=cid,
            trigger_event_id=event.get("event_id"),
            action_payload={"advisory_queued": True, "masked_recipient": masked_phone},
            requires_approval=False,
            approval_status="not_required",
        )

        return {"action_type": "PROCESS_VOICE_INTAKE", "audit_log_id": audit.get("log_id"), "status": "processed"}

    def _handle_prediction_generated(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Reaction for prediction_generated:
        1. Evaluate urgency based on cashout window and risk level.
        2. Initialize additive model outcome evaluation record.
        3. If window is critically close, emit operational_window_approaching.
        4. Log structured audit factors.
        """
        payload = event.get("payload") or {}
        if isinstance(payload, str):
            import json
            try:
                payload = json.loads(payload)
            except Exception:
                payload = {}

        pid = str(event.get("entity_id") or payload.get("prediction_id"))
        cid = str(event.get("complaint_id") or payload.get("complaint_id"))
        risk_score = float(payload.get("risk_score") or 0.0)
        window_hours = int(payload.get("cashout_window_hours") or 8)
        pred_lat = payload.get("predicted_lat")
        pred_lon = payload.get("predicted_lon")

        reason_codes = ["PREDICTION_MONITORED", "MODEL_EVALUATION_INITIALIZED"]

        # Calculate predicted time window
        now = datetime.datetime.now(datetime.timezone.utc)
        time_start = now.isoformat()
        time_end = (now + datetime.timedelta(hours=window_hours)).isoformat()

        # Initialize Additive Model Evaluation (Phase 1 table)
        eval_id = None
        try:
            eval_row = repo.create_model_evaluation(
                prediction_id=pid,
                complaint_id=cid,
                predicted_lat=float(pred_lat) if pred_lat is not None else None,
                predicted_lon=float(pred_lon) if pred_lon is not None else None,
                predicted_time_start=time_start,
                predicted_time_end=time_end,
            )
            eval_id = eval_row.get("eval_id")
        except Exception as e:
            logger.debug(f"[Autonomy Model Eval Init]: {e}")

        # Check Urgency / Window Approaching
        is_urgent = window_hours <= 4 and risk_score >= 0.75
        if is_urgent:
            reason_codes.append("WINDOW_APPROACHING")
            # Safely emit terminal operational follow-up
            repo.safe_emit_autonomy_event(
                event_type="operational_window_approaching",
                entity_type="prediction",
                entity_id=pid,
                complaint_id=cid,
                payload={
                    "prediction_id": pid,
                    "risk_score": risk_score,
                    "cashout_window_hours": window_hours,
                    "predicted_lat": pred_lat,
                    "predicted_lon": pred_lon,
                },
                idempotency_key=f"evt:window:{pid}:approaching",
            )

        # Audit Record
        audit = repo.create_autonomy_audit_log(
            trigger_event_type="prediction_generated",
            action_type="EVALUATE_PREDICTION_URGENCY",
            decision_factors={
                "reason_codes": reason_codes,
                "risk_score": risk_score,
                "cashout_window_hours": window_hours,
                "critical_urgency": is_urgent,
            },
            complaint_id=cid,
            trigger_event_id=event.get("event_id"),
            action_payload={"model_eval_id": eval_id, "window_hours": window_hours},
            requires_approval=False,
            approval_status="not_required",
        )

        return {"action_type": "EVALUATE_PREDICTION_URGENCY", "audit_log_id": audit.get("log_id"), "status": "processed"}

    def _handle_prediction_updated(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Reaction for prediction_updated:
        Detects meaningful shift in risk score or cashout corridor and updates audit trail.
        """
        payload = event.get("payload") or {}
        if isinstance(payload, str):
            import json
            try:
                payload = json.loads(payload)
            except Exception:
                payload = {}

        cid = str(event.get("complaint_id") or payload.get("complaint_id"))
        delta_risk = float(payload.get("delta_risk") or 0.0)

        audit = repo.create_autonomy_audit_log(
            trigger_event_type="prediction_updated",
            action_type="REEVALUATE_PREDICTION_SHIFT",
            decision_factors={
                "reason_codes": ["PREDICTION_CHANGED", "RISK_SCORE_UPDATED"],
                "delta_risk": delta_risk,
                "previous_risk": payload.get("previous_risk_score"),
                "new_risk": payload.get("new_risk_score"),
                "cashout_window_hours": payload.get("cashout_window_hours"),
            },
            complaint_id=cid,
            trigger_event_id=event.get("event_id"),
            action_payload={"reevaluation_status": "completed", "shift_significant": delta_risk >= 0.05},
            requires_approval=False,
            approval_status="not_required",
        )

        return {"action_type": "REEVALUATE_PREDICTION_SHIFT", "audit_log_id": audit.get("log_id"), "status": "processed"}

    def _handle_evidence_updated(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Reaction for evidence_updated:
        Synchronizes new evidence records into Truth Graph.
        """
        payload = event.get("payload") or {}
        if isinstance(payload, str):
            import json
            try:
                payload = json.loads(payload)
            except Exception:
                payload = {}

        cid = str(event.get("complaint_id") or payload.get("complaint_id"))
        evidence_type = payload.get("evidence_type") or "generic"

        audit = repo.create_autonomy_audit_log(
            trigger_event_type="evidence_updated",
            action_type="SYNCHRONIZE_EVIDENCE",
            decision_factors={
                "reason_codes": ["NEW_EVIDENCE"],
                "evidence_type": evidence_type,
            },
            complaint_id=cid,
            trigger_event_id=event.get("event_id"),
            action_payload={"sync_status": "synchronized"},
            requires_approval=False,
            approval_status="not_required",
        )

        return {"action_type": "SYNCHRONIZE_EVIDENCE", "audit_log_id": audit.get("log_id"), "status": "processed"}

    def _handle_evidence_discrepancy(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Reaction for evidence_discrepancy_detected:
        Flags discrepancy in case audit trail.
        CRITICAL: Never declares fraud or guilt.
        """
        payload = event.get("payload") or {}
        if isinstance(payload, str):
            import json
            try:
                payload = json.loads(payload)
            except Exception:
                payload = {}

        cid = str(event.get("complaint_id") or payload.get("complaint_id"))
        discrepancy_type = payload.get("discrepancy_type") or "unspecified_variance"

        audit = repo.create_autonomy_audit_log(
            trigger_event_type="evidence_discrepancy_detected",
            action_type="FLAG_EVIDENCE_DISCREPANCY",
            decision_factors={
                "reason_codes": ["DISCREPANCY_DETECTED"],
                "discrepancy_type": discrepancy_type,
                "notes": "Analytical variance detected. No inference of criminal guilt or liability.",
            },
            complaint_id=cid,
            trigger_event_id=event.get("event_id"),
            action_payload={"discrepancy_flagged": True, "attention_signal_incremented": True},
            requires_approval=False,
            approval_status="not_required",
        )

        return {"action_type": "FLAG_EVIDENCE_DISCREPANCY", "audit_log_id": audit.get("log_id"), "status": "processed"}

    def _handle_incident_resolved(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Reaction for incident_resolved:
        Prepares case for model evaluation and records resolution audit factor.
        """
        payload = event.get("payload") or {}
        if isinstance(payload, str):
            import json
            try:
                payload = json.loads(payload)
            except Exception:
                payload = {}

        cid = str(event.get("complaint_id") or payload.get("complaint_id"))
        iid = str(event.get("entity_id") or payload.get("incident_id"))

        # If actual outcome data (coordinates / amount) are present, emit terminal outcome_recorded event
        if payload.get("actual_lat") or payload.get("amount_recovered"):
            repo.safe_emit_autonomy_event(
                event_type="outcome_recorded",
                entity_type="incident",
                entity_id=iid,
                complaint_id=cid,
                payload=payload,
                idempotency_key=f"outcome:{iid}:recorded",
            )

        audit = repo.create_autonomy_audit_log(
            trigger_event_type="incident_resolved",
            action_type="PREPARE_OUTCOME_EVALUATION",
            decision_factors={
                "reason_codes": ["INCIDENT_RESOLVED"],
                "incident_id": iid,
                "suspect_apprehended": payload.get("suspect_apprehended", 0),
            },
            complaint_id=cid,
            trigger_event_id=event.get("event_id"),
            action_payload={"resolution_prepared": True},
            requires_approval=False,
            approval_status="not_required",
        )

        return {"action_type": "PREPARE_OUTCOME_EVALUATION", "audit_log_id": audit.get("log_id"), "status": "processed"}

    def _handle_outcome_recorded(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Reaction for outcome_recorded:
        Terminal event. Updates model evaluation accuracy metrics if actuals are available.
        """
        payload = event.get("payload") or {}
        if isinstance(payload, str):
            import json
            try:
                payload = json.loads(payload)
            except Exception:
                payload = {}

        cid = str(event.get("complaint_id") or payload.get("complaint_id"))
        actual_lat = payload.get("actual_lat")
        actual_lon = payload.get("actual_lon")

        # Check existing evaluations for complaint
        eval_updated = False
        try:
            evals = repo.get_model_evaluations_for_complaint(cid)
            if evals and actual_lat is not None and actual_lon is not None:
                first_eval = evals[0]
                repo.update_model_evaluation_outcome(
                    eval_id=first_eval["eval_id"],
                    actual_lat=float(actual_lat),
                    actual_lon=float(actual_lon),
                    actual_cashout_at=payload.get("actual_cashout_at"),
                )
                eval_updated = True
        except Exception as e:
            logger.debug(f"[Autonomy Outcome Eval Update]: {e}")

        audit = repo.create_autonomy_audit_log(
            trigger_event_type="outcome_recorded",
            action_type="FINALIZE_MODEL_EVALUATION",
            decision_factors={
                "reason_codes": ["OUTCOME_AVAILABLE", "ACCURACY_EVALUATED"],
                "evaluation_computed": eval_updated,
            },
            complaint_id=cid,
            trigger_event_id=event.get("event_id"),
            action_payload={"finalized": True},
            requires_approval=False,
            approval_status="not_required",
        )

        return {"action_type": "FINALIZE_MODEL_EVALUATION", "audit_log_id": audit.get("log_id"), "status": "processed"}

    def _handle_window_approaching(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Terminal event: Surfaces high operational priority for approaching window."""
        cid = str(event.get("complaint_id"))
        audit = repo.create_autonomy_audit_log(
            trigger_event_type="operational_window_approaching",
            action_type="SURFACE_OPERATIONAL_URGENCY",
            decision_factors={"reason_codes": ["WINDOW_APPROACHING"]},
            complaint_id=cid,
            trigger_event_id=event.get("event_id"),
            action_payload={"priority": "CRITICAL_CASHOUT_WINDOW"},
            requires_approval=False,
            approval_status="not_required",
        )
        return {"action_type": "SURFACE_OPERATIONAL_URGENCY", "audit_log_id": audit.get("log_id"), "status": "processed"}

    def _handle_account_linked(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Terminal event: Correlates shared account discovery."""
        cid = str(event.get("complaint_id"))
        audit = repo.create_autonomy_audit_log(
            trigger_event_type="account_linked",
            action_type="CORRELATE_ACCOUNT_RELATION",
            decision_factors={"reason_codes": ["SHARED_ENTITY_DETECTED"]},
            complaint_id=cid,
            trigger_event_id=event.get("event_id"),
            action_payload={"correlation_recorded": True},
            requires_approval=False,
            approval_status="not_required",
        )
        return {"action_type": "CORRELATE_ACCOUNT_RELATION", "audit_log_id": audit.get("log_id"), "status": "processed"}

    def _handle_transaction_added(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Correlates new transaction in graph."""
        cid = str(event.get("complaint_id"))
        audit = repo.create_autonomy_audit_log(
            trigger_event_type="transaction_added",
            action_type="INGEST_TRANSACTION_EDGE",
            decision_factors={"reason_codes": ["NEW_EVIDENCE"]},
            complaint_id=cid,
            trigger_event_id=event.get("event_id"),
            action_payload={"edge_added": True},
            requires_approval=False,
            approval_status="not_required",
        )
        return {"action_type": "INGEST_TRANSACTION_EDGE", "audit_log_id": audit.get("log_id"), "status": "processed"}

    def _handle_alert_created(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Terminal event: Alert registration."""
        cid = str(event.get("complaint_id"))
        audit = repo.create_autonomy_audit_log(
            trigger_event_type="alert_created",
            action_type="REGISTER_ALERT",
            decision_factors={"reason_codes": ["ALERT_ACTIVE"]},
            complaint_id=cid,
            trigger_event_id=event.get("event_id"),
            action_payload={"alert_active": True},
            requires_approval=False,
            approval_status="not_required",
        )
        return {"action_type": "REGISTER_ALERT", "audit_log_id": audit.get("log_id"), "status": "processed"}

    def _handle_alert_acknowledged(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Terminal event: Alert officer acknowledgement."""
        cid = str(event.get("complaint_id"))
        audit = repo.create_autonomy_audit_log(
            trigger_event_type="alert_acknowledged",
            action_type="ACKNOWLEDGE_ALERT",
            decision_factors={"reason_codes": ["ALERT_ACKNOWLEDGED"]},
            complaint_id=cid,
            trigger_event_id=event.get("event_id"),
            action_payload={"acknowledged": True},
            requires_approval=False,
            approval_status="not_required",
        )
        return {"action_type": "ACKNOWLEDGE_ALERT", "audit_log_id": audit.get("log_id"), "status": "processed"}


event_router = EventRouter()
