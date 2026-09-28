"""
NEXUS Action Policy Engine (Phase 5)
=====================================
Deterministic, centrally versioned policy engine that converts existing NEXUS
analytical signals into structured action recommendations for investigators.

DESIGN PRINCIPLES:
1. OBSERVE -> UNDERSTAND -> REASON -> RECOMMEND -> HUMAN APPROVAL -> EXECUTE
2. Hard action taxonomy: SAFE_AUTOMATIC vs HUMAN_APPROVAL_REQUIRED.
3. Every recommendation is auditable, idempotent, and expirable.
4. NEXUS NEVER autonomously executes consequential actions.
5. Policy is deterministic: zero hidden chain-of-thought.
6. No ML model modification. No Truth Graph core modification.
7. No event-loop amplification: strict idempotency keys prevent cycles.
"""

import logging
import datetime
import hashlib
import json
from typing import Dict, Any, List, Optional

from db import repo

logger = logging.getLogger("nexus.autonomy.action_policy")

# ---------------------------------------------------------------------------
# POLICY VERSION
# ---------------------------------------------------------------------------
ACTION_POLICY_VERSION = "phase5-v1"


# ---------------------------------------------------------------------------
# ACTION TAXONOMY
# ---------------------------------------------------------------------------

class ActionCategory:
    SAFE_AUTOMATIC = "SAFE_AUTOMATIC"
    HUMAN_APPROVAL_REQUIRED = "HUMAN_APPROVAL_REQUIRED"


ACTION_TAXONOMY: Dict[str, Dict[str, Any]] = {
    # --- SAFE_AUTOMATIC ---
    "REFRESH_CASE_ANALYSIS": {
        "category": ActionCategory.SAFE_AUTOMATIC,
        "approval_required": False,
        "description": "Re-evaluate all analytical signals and update cached state.",
        "priority_default": "MEDIUM",
        "expiry_hours": 24,
    },
    "RECHECK_EVIDENCE": {
        "category": ActionCategory.SAFE_AUTOMATIC,
        "approval_required": False,
        "description": "Re-synchronize Truth Graph entities and re-run consistency checks.",
        "priority_default": "MEDIUM",
        "expiry_hours": 24,
    },
    "UPDATE_ATTENTION": {
        "category": ActionCategory.SAFE_AUTOMATIC,
        "approval_required": False,
        "description": "Recalculate case attention score based on latest signals.",
        "priority_default": "LOW",
        "expiry_hours": 12,
    },
    "UPDATE_CROSS_CASE_RELATIONSHIPS": {
        "category": ActionCategory.SAFE_AUTOMATIC,
        "approval_required": False,
        "description": "Re-run cross-case correlation to detect newly shared entities.",
        "priority_default": "MEDIUM",
        "expiry_hours": 24,
    },
    "PREPARE_INVESTIGATOR_BRIEF": {
        "category": ActionCategory.SAFE_AUTOMATIC,
        "approval_required": False,
        "description": "Synthesize current signals into a structured investigator briefing.",
        "priority_default": "HIGH",
        "expiry_hours": 12,
    },
    "PREPARE_ALERT_DRAFT": {
        "category": ActionCategory.SAFE_AUTOMATIC,
        "approval_required": False,
        "description": "Generate a draft operational alert for investigator review.",
        "priority_default": "HIGH",
        "expiry_hours": 6,
    },
    "PREPARE_VICTIM_ADVISORY_DRAFT": {
        "category": ActionCategory.SAFE_AUTOMATIC,
        "approval_required": False,
        "description": "Prepare a draft citizen safety advisory for investigator review.",
        "priority_default": "MEDIUM",
        "expiry_hours": 24,
    },
    "REQUEST_REVIEW": {
        "category": ActionCategory.SAFE_AUTOMATIC,
        "approval_required": False,
        "description": "Flag case for manual investigator review.",
        "priority_default": "MEDIUM",
        "expiry_hours": 48,
    },
    # --- HUMAN_APPROVAL_REQUIRED ---
    "ISSUE_LIEN_RECOMMENDATION": {
        "category": ActionCategory.HUMAN_APPROVAL_REQUIRED,
        "approval_required": True,
        "description": "Prepare formal lien recommendation for authorized investigator approval.",
        "priority_default": "CRITICAL",
        "expiry_hours": 4,
    },
    "REQUEST_FUND_FREEZE": {
        "category": ActionCategory.HUMAN_APPROVAL_REQUIRED,
        "approval_required": True,
        "description": "Prepare fund freeze request for authorized investigator approval.",
        "priority_default": "CRITICAL",
        "expiry_hours": 4,
    },
    "REQUEST_ACCOUNT_RESTRICTION": {
        "category": ActionCategory.HUMAN_APPROVAL_REQUIRED,
        "approval_required": True,
        "description": "Prepare account restriction for authorized investigator approval.",
        "priority_default": "HIGH",
        "expiry_hours": 8,
    },
    "REQUEST_FIELD_DISPATCH": {
        "category": ActionCategory.HUMAN_APPROVAL_REQUIRED,
        "approval_required": True,
        "description": "Prepare field dispatch recommendation for authorized investigator approval.",
        "priority_default": "CRITICAL",
        "expiry_hours": 2,
    },
    "REQUEST_LEGAL_ESCALATION": {
        "category": ActionCategory.HUMAN_APPROVAL_REQUIRED,
        "approval_required": True,
        "description": "Prepare legal escalation for authorized investigator approval.",
        "priority_default": "HIGH",
        "expiry_hours": 24,
    },
    "REQUEST_INTERSTATE_ESCALATION": {
        "category": ActionCategory.HUMAN_APPROVAL_REQUIRED,
        "approval_required": True,
        "description": "Prepare inter-state operational escalation for authorized investigator approval.",
        "priority_default": "HIGH",
        "expiry_hours": 12,
    },
    "CLOSE_CASE": {
        "category": ActionCategory.HUMAN_APPROVAL_REQUIRED,
        "approval_required": True,
        "description": "Prepare case closure for authorized investigator approval.",
        "priority_default": "MEDIUM",
        "expiry_hours": 72,
    },
}


# ---------------------------------------------------------------------------
# ACTION STATES
# ---------------------------------------------------------------------------

class ActionStatus:
    PROPOSED = "PROPOSED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"


VALID_TRANSITIONS: Dict[str, List[str]] = {
    ActionStatus.PROPOSED: [
        ActionStatus.PENDING_APPROVAL,
        ActionStatus.APPROVED,
        ActionStatus.EXECUTING,
        ActionStatus.REJECTED,
        ActionStatus.CANCELLED,
        ActionStatus.EXPIRED,
    ],
    ActionStatus.PENDING_APPROVAL: [
        ActionStatus.APPROVED,
        ActionStatus.REJECTED,
        ActionStatus.EXPIRED,
        ActionStatus.CANCELLED,
    ],
    ActionStatus.APPROVED: [
        ActionStatus.EXECUTING,
        ActionStatus.COMPLETED,
        ActionStatus.EXPIRED,
        ActionStatus.CANCELLED,
    ],
    ActionStatus.EXECUTING: [
        ActionStatus.COMPLETED,
        ActionStatus.FAILED,
    ],
    ActionStatus.COMPLETED: [],
    ActionStatus.REJECTED: [],
    ActionStatus.EXPIRED: [],
    ActionStatus.CANCELLED: [],
    ActionStatus.FAILED: [],
}

TERMINAL_STATES = {
    ActionStatus.COMPLETED,
    ActionStatus.REJECTED,
    ActionStatus.EXPIRED,
    ActionStatus.CANCELLED,
    ActionStatus.FAILED,
}


def is_valid_transition(from_state: str, to_state: str) -> bool:
    return to_state in VALID_TRANSITIONS.get(from_state, [])


# ---------------------------------------------------------------------------
# PRIORITY
# ---------------------------------------------------------------------------

class ActionPriority:
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


# ---------------------------------------------------------------------------
# IDEMPOTENCY
# ---------------------------------------------------------------------------

def _compute_idempotency_key(
    complaint_id: str,
    action_type: str,
    policy_version: str,
    state_fingerprint: str,
) -> str:
    raw = f"action:{complaint_id}:{action_type}:{policy_version}:{state_fingerprint}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def _make_state_fingerprint(
    attention_level: Optional[str],
    risk_level: Optional[str],
    cashout_window_hours: Optional[float],
    linked_count: int,
    has_discrepancy: bool,
    is_urgent: bool,
) -> str:
    parts = [
        str(attention_level or "NONE"),
        str(risk_level or "NONE"),
        str(int(cashout_window_hours or 0) // 4 * 4),
        str(linked_count > 3),
        str(has_discrepancy),
        str(is_urgent),
    ]
    return ":".join(parts)


# ---------------------------------------------------------------------------
# POLICY RULES
# ---------------------------------------------------------------------------

def evaluate_action_recommendations(
    complaint_id: str,
    attention: Optional[Dict[str, Any]] = None,
    prediction: Optional[Dict[str, Any]] = None,
    linked_complaint_ids: Optional[List[str]] = None,
    has_discrepancy: bool = False,
    incident_resolved: bool = False,
    trigger_event_type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Deterministic policy evaluation: given current case state, returns zero or more
    action recommendation objects to be persisted (idempotent via fingerprint key).
    """
    attention = attention or {}
    prediction = prediction or {}
    linked_complaints = [c for c in (linked_complaint_ids or []) if c != complaint_id]

    attention_level = attention.get("attention_level", "LOW")
    attention_score = float(attention.get("attention_score", 0.0))
    risk_score = float(prediction.get("risk_score") or 0.0)
    risk_level = prediction.get("risk_level", "LOW")
    cashout_window = prediction.get("cashout_window_hours")
    cashout_hours = float(cashout_window) if cashout_window is not None else None
    atm_count = len(prediction.get("predicted_atms") or [])
    geo_confidence = float(prediction.get("confidence") or 0.0)
    linked_count = len(linked_complaints)

    is_urgent = (
        cashout_hours is not None
        and cashout_hours <= 4.0
        and risk_score >= 0.70
    )
    is_critical_attention = attention_level in ("CRITICAL", "HIGH")
    is_geo_actionable = atm_count > 0 and geo_confidence >= 0.60

    recommendations: List[Dict[str, Any]] = []

    def _add(
        action_type: str,
        priority: str,
        reason_codes: List[str],
        decision_factors: Dict[str, Any],
        supporting_evidence: List[Dict[str, Any]],
    ) -> None:
        meta = ACTION_TAXONOMY.get(action_type, {})
        approval_required = meta.get("approval_required", False)
        expiry_hours = meta.get("expiry_hours", 24)
        fingerprint = _make_state_fingerprint(
            attention_level, risk_level, cashout_hours, linked_count, has_discrepancy, is_urgent
        )
        ikey = _compute_idempotency_key(complaint_id, action_type, ACTION_POLICY_VERSION, fingerprint)
        now = datetime.datetime.now(datetime.timezone.utc)
        expires_at = (now + datetime.timedelta(hours=expiry_hours)).isoformat()
        recommendations.append({
            "complaint_id": complaint_id,
            "action_type": action_type,
            "priority": priority,
            "status": ActionStatus.PROPOSED,
            "policy_version": ACTION_POLICY_VERSION,
            "reason_codes": reason_codes,
            "decision_factors": decision_factors,
            "supporting_evidence": supporting_evidence,
            "approval_required": approval_required,
            "expires_at": expires_at,
            "_idempotency_key": ikey,
        })

    # RULE 1: HIGH attention + urgent cashout + geo actionable
    if is_critical_attention and is_urgent and is_geo_actionable:
        reason_codes = ["HIGH_ATTENTION", "URGENT_CASHOUT_WINDOW", "GEO_ACTIONABLE"]
        df = {
            "attention_level": attention_level,
            "attention_score": attention_score,
            "cashout_window_hours": cashout_hours,
            "risk_score": risk_score,
            "predicted_atm_count": atm_count,
            "geo_confidence": geo_confidence,
        }
        evidence = [
            {"source_type": "attention", "description": f"Attention level: {attention_level} ({attention_score:.1f}/100)"},
            {"source_type": "prediction", "description": f"Risk: {risk_level}, Cashout window: {cashout_hours}h"},
            {"source_type": "prediction", "description": f"Geographic confidence: {geo_confidence:.0%}, ATMs: {atm_count}"},
        ]
        p = ActionPriority.CRITICAL if attention_level == "CRITICAL" else ActionPriority.HIGH
        _add("PREPARE_INVESTIGATOR_BRIEF", p, reason_codes, df, evidence)
        if attention_level == "CRITICAL":
            _add("REQUEST_FIELD_DISPATCH", ActionPriority.CRITICAL,
                 reason_codes + ["REQUIRES_FIELD_RESPONSE"], df, evidence)

    # RULE 2: Evidence discrepancy
    if has_discrepancy:
        reason_codes = ["EVIDENCE_DISCREPANCY_DETECTED", "REVIEW_REQUIRED"]
        df = {"discrepancy_detected": True, "attention_level": attention_level}
        evidence = [{"source_type": "evidence",
                     "description": "Evidence consistency check flagged a discrepancy. Manual review recommended."}]
        _add("RECHECK_EVIDENCE", ActionPriority.HIGH, reason_codes, df, evidence)
        _add("REQUEST_REVIEW", ActionPriority.HIGH, reason_codes, df, evidence)

    # RULE 3: Strong cross-case correlation + high attention
    if linked_count >= 3 and is_critical_attention:
        reason_codes = ["MULTI_CASE_CORRELATION", "SYNDICATE_SIGNAL", "HIGH_ATTENTION"]
        df = {
            "linked_complaint_count": linked_count,
            "attention_level": attention_level,
            "attention_score": attention_score,
        }
        evidence = [
            {"source_type": "syndicate_dna",
             "description": f"{linked_count} related cases detected through shared entity analysis."},
            {"source_type": "attention", "description": f"Attention level: {attention_level}"},
        ]
        _add("UPDATE_CROSS_CASE_RELATIONSHIPS", ActionPriority.HIGH, reason_codes, df, evidence)
        _add("PREPARE_INVESTIGATOR_BRIEF", ActionPriority.HIGH, reason_codes, df, evidence)

    # RULE 4: Prediction updated with elevated risk
    if trigger_event_type == "prediction_updated" and risk_score >= 0.60:
        reason_codes = ["PREDICTION_UPDATED", "RISK_ELEVATED"]
        df = {"risk_score": risk_score, "risk_level": risk_level, "trigger": "prediction_updated"}
        evidence = [{"source_type": "prediction",
                     "description": f"Prediction updated. Risk score: {risk_score:.2f} ({risk_level})."}]
        _add("REFRESH_CASE_ANALYSIS", ActionPriority.MEDIUM, reason_codes, df, evidence)

    # RULE 5: Incident resolved
    if incident_resolved or trigger_event_type == "incident_resolved":
        reason_codes = ["INCIDENT_RESOLVED", "OUTCOME_DOCUMENTATION_REQUIRED"]
        df = {"incident_resolved": True}
        evidence = [{"source_type": "incident",
                     "description": "Associated operational incident has been resolved."}]
        _add("REFRESH_CASE_ANALYSIS", ActionPriority.MEDIUM, reason_codes, df, evidence)

    # RULE 6: Critical risk + imminent window -> fund freeze recommendation
    if (
        attention_level == "CRITICAL"
        and risk_score >= 0.80
        and cashout_hours is not None
        and cashout_hours <= 2.0
    ):
        reason_codes = ["CRITICAL_RISK", "CRITICAL_ATTENTION", "IMMINENT_CASHOUT"]
        df = {
            "attention_level": attention_level,
            "risk_score": risk_score,
            "cashout_window_hours": cashout_hours,
        }
        evidence = [
            {"source_type": "prediction",
             "description": f"Imminent cashout window ({cashout_hours}h). Risk: {risk_score:.2f}."},
            {"source_type": "attention", "description": "Case is at CRITICAL operational attention."},
        ]
        _add("REQUEST_FUND_FREEZE", ActionPriority.CRITICAL, reason_codes, df, evidence)

    # RULE 7: Baseline review for new cases
    if (
        trigger_event_type in ("complaint_ingested", "prediction_generated")
        and attention_level in ("LOW", "MEDIUM")
        and risk_score > 0.0
    ):
        reason_codes = ["NEW_CASE_BASELINE_REVIEW", "PREDICTION_AVAILABLE"]
        df = {"trigger": trigger_event_type, "risk_score": risk_score, "attention_level": attention_level}
        evidence = [{"source_type": "prediction",
                     "description": f"Initial prediction generated. Risk: {risk_score:.2f}."}]
        _add("REQUEST_REVIEW", ActionPriority.LOW, reason_codes, df, evidence)

    return recommendations


# ---------------------------------------------------------------------------
# ACTION POLICY ENGINE
# ---------------------------------------------------------------------------

class ActionPolicyEngine:
    """
    Orchestrates deterministic action policy evaluation and persists recommendations.
    Integrates with Phase 2A EventRouter (called after each event is handled).
    """

    def __init__(self):
        self.policy_version = ACTION_POLICY_VERSION

    def evaluate_and_persist(
        self,
        complaint_id: str,
        trigger_event: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Full evaluation cycle: gather state -> evaluate rules -> persist (idempotent)."""
        trigger_event = trigger_event or {}
        trigger_event_type = trigger_event.get("event_type")

        attention: Optional[Dict[str, Any]] = None
        prediction: Optional[Dict[str, Any]] = None
        linked_ids: List[str] = []
        has_discrepancy = False
        incident_resolved = (trigger_event_type == "incident_resolved")

        try:
            prediction = repo.get_prediction_by_complaint(complaint_id)
        except Exception as e:
            logger.debug(f"[ActionPolicy] prediction load: {e}")

        try:
            att_state = repo.get_case_attention_state(complaint_id)
            if att_state:
                attention = att_state
        except Exception as e:
            logger.debug(f"[ActionPolicy] attention load: {e}")

        try:
            cross = repo.get_entity_cross_case_links_for_complaint(complaint_id)
            if isinstance(cross, dict):
                linked_ids = cross.get("linked_complaints", [])
            elif isinstance(cross, list):
                linked_ids = [c for c in cross if c != complaint_id]
        except Exception as e:
            logger.debug(f"[ActionPolicy] cross-links load: {e}")

        # Check audit log for discrepancy signals
        try:
            audit_entries = repo.get_autonomy_audit_log_for_complaint(complaint_id, limit=5)
            for entry in audit_entries:
                df = entry.get("decision_factors") or {}
                if isinstance(df, str):
                    try:
                        df = json.loads(df)
                    except Exception:
                        df = {}
                if "EVIDENCE_DISCREPANCY" in df.get("reason_codes", []):
                    has_discrepancy = True
                    break
        except Exception as e:
            logger.debug(f"[ActionPolicy] audit check: {e}")

        # Check trigger event payload
        evt_payload = trigger_event.get("payload") or {}
        if isinstance(evt_payload, str):
            try:
                evt_payload = json.loads(evt_payload)
            except Exception:
                evt_payload = {}
        if (
            trigger_event_type == "evidence_discrepancy_detected"
            or evt_payload.get("discrepancy_detected") is True
        ):
            has_discrepancy = True

        candidates = evaluate_action_recommendations(
            complaint_id=complaint_id,
            attention=attention,
            prediction=prediction,
            linked_complaint_ids=linked_ids,
            has_discrepancy=has_discrepancy,
            incident_resolved=incident_resolved,
            trigger_event_type=trigger_event_type,
        )

        persisted: List[str] = []
        skipped = 0
        for rec in candidates:
            try:
                result = repo.create_action_recommendation(
                    complaint_id=rec["complaint_id"],
                    action_type=rec["action_type"],
                    priority=rec["priority"],
                    status=rec["status"],
                    policy_version=rec["policy_version"],
                    reason_codes=rec["reason_codes"],
                    decision_factors=rec["decision_factors"],
                    supporting_evidence=rec["supporting_evidence"],
                    approval_required=rec["approval_required"],
                    expires_at=rec["expires_at"],
                    idempotency_key=rec["_idempotency_key"],
                    trigger_event_id=trigger_event.get("event_id"),
                )
                if result:
                    persisted.append(result.get("action_id"))
                else:
                    skipped += 1
            except Exception as e:
                logger.warning(f"[ActionPolicy] persist failed {complaint_id}/{rec.get('action_type')}: {e}")

        # Execute safe automatic actions immediately
        for action_id in persisted:
            meta = repo.get_action_recommendation(action_id)
            if meta and not meta.get("approval_required"):
                try:
                    self._execute_safe_action(action_id, meta)
                except Exception as e:
                    logger.debug(f"[ActionPolicy] safe action notice {action_id}: {e}")

        logger.info(
            f"[ActionPolicy] {complaint_id}: {len(persisted)} created, "
            f"{skipped} suppressed (idempotent). Policy: {self.policy_version}"
        )
        return {
            "complaint_id": complaint_id,
            "policy_version": self.policy_version,
            "evaluated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "recommendations_created": len(persisted),
            "recommendations_suppressed": skipped,
            "action_ids": persisted,
            "trigger_event_type": trigger_event_type,
        }

    def _execute_safe_action(self, action_id: str, meta: Dict[str, Any]) -> None:
        """Executes SAFE_AUTOMATIC actions internally. Never touches HUMAN_APPROVAL_REQUIRED."""
        action_type = meta.get("action_type", "")
        complaint_id = meta.get("complaint_id", "")
        taxonomy = ACTION_TAXONOMY.get(action_type, {})

        if taxonomy.get("category") != ActionCategory.SAFE_AUTOMATIC:
            logger.info(
                f"[ActionExecutor] {action_type} requires human approval. "
                f"Stopping at PROPOSED. action_id={action_id}"
            )
            return

        ok = repo.transition_action_status(
            action_id=action_id,
            new_status=ActionStatus.EXECUTING,
            actor="system_policy_engine",
        )
        if not ok:
            return

        try:
            result_payload = self._run_safe_internal(action_type, complaint_id, meta)
            repo.transition_action_status(
                action_id=action_id,
                new_status=ActionStatus.COMPLETED,
                actor="system_policy_engine",
                notes=json.dumps(result_payload),
            )
        except Exception as e:
            repo.transition_action_status(
                action_id=action_id,
                new_status=ActionStatus.FAILED,
                actor="system_policy_engine",
                notes=str(e),
            )
            raise

    def _run_safe_internal(
        self, action_type: str, complaint_id: str, meta: Dict[str, Any]
    ) -> Dict[str, Any]:
        if action_type in ("REFRESH_CASE_ANALYSIS", "UPDATE_ATTENTION"):
            from core.autonomy.attention_engine import attention_engine
            att = attention_engine.evaluate_case_attention(complaint_id)
            return {"refreshed": True, "attention_level": att.get("attention_level")}
        # All other safe actions: the recommendation record itself IS the output
        return {"status": "available_in_action_center", "action_type": action_type}

    # -------------------------------------------------------------------------
    # APPROVAL GATE
    # -------------------------------------------------------------------------

    def approve_action(
        self,
        action_id: str,
        approved_by: str,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        rec = repo.get_action_recommendation(action_id)
        if not rec:
            raise ValueError(f"Action recommendation '{action_id}' not found.")

        if not approved_by or not str(approved_by).strip():
            raise ValueError("approved_by is required. Approval must identify the authorizing investigator.")

        current_status = rec.get("status", "")
        if current_status in TERMINAL_STATES:
            raise ValueError(
                f"Action '{action_id}' is in terminal state '{current_status}' and cannot be approved."
            )
        if not rec.get("approval_required"):
            raise ValueError(
                f"Action '{action_id}' ({rec.get('action_type')}) does not require approval."
            )
        if current_status not in (ActionStatus.PROPOSED, ActionStatus.PENDING_APPROVAL):
            raise ValueError(
                f"Action '{action_id}' is in state '{current_status}'. "
                "Can only approve from PROPOSED or PENDING_APPROVAL."
            )
        if not is_valid_transition(current_status, ActionStatus.APPROVED):
            raise ValueError(f"Invalid transition: {current_status} -> APPROVED for '{action_id}'.")

        repo.transition_action_status(
            action_id=action_id,
            new_status=ActionStatus.APPROVED,
            actor=approved_by,
            notes=notes,
        )
        # Consequential action stops at READY_FOR_EXTERNAL_EXECUTION in this phase
        repo.transition_action_status(
            action_id=action_id,
            new_status=ActionStatus.COMPLETED,
            actor="system_policy_engine",
            notes="Approved by investigator. READY_FOR_EXTERNAL_EXECUTION. External integration not configured in Phase 5.",
        )
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        logger.info(f"[ActionPolicy] APPROVED '{action_id}' ({rec.get('action_type')}) by '{approved_by}'.")
        return {
            "action_id": action_id,
            "action_type": rec.get("action_type"),
            "status": ActionStatus.COMPLETED,
            "approved_by": approved_by,
            "approved_at": now,
            "notes": notes,
        }

    def reject_action(
        self,
        action_id: str,
        rejected_by: str,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        rec = repo.get_action_recommendation(action_id)
        if not rec:
            raise ValueError(f"Action recommendation '{action_id}' not found.")
        current_status = rec.get("status", "")
        if current_status in TERMINAL_STATES:
            raise ValueError(f"Action '{action_id}' is in terminal state '{current_status}'.")
        if not is_valid_transition(current_status, ActionStatus.REJECTED):
            raise ValueError(f"Invalid transition: {current_status} -> REJECTED for '{action_id}'.")
        repo.transition_action_status(
            action_id=action_id,
            new_status=ActionStatus.REJECTED,
            actor=rejected_by,
            notes=reason,
        )
        logger.info(f"[ActionPolicy] REJECTED '{action_id}' by '{rejected_by}'.")
        return {
            "action_id": action_id,
            "action_type": rec.get("action_type"),
            "status": ActionStatus.REJECTED,
            "rejected_by": rejected_by,
            "rejected_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "reason": reason,
        }

    def cancel_action(
        self,
        action_id: str,
        cancelled_by: str,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        rec = repo.get_action_recommendation(action_id)
        if not rec:
            raise ValueError(f"Action recommendation '{action_id}' not found.")
        current_status = rec.get("status", "")
        if current_status in TERMINAL_STATES:
            raise ValueError(f"Action '{action_id}' is in terminal state '{current_status}'.")
        if not is_valid_transition(current_status, ActionStatus.CANCELLED):
            raise ValueError(f"Cannot cancel '{action_id}' from state '{current_status}'.")
        repo.transition_action_status(
            action_id=action_id,
            new_status=ActionStatus.CANCELLED,
            actor=cancelled_by,
            notes=reason,
        )
        return {"action_id": action_id, "status": ActionStatus.CANCELLED, "cancelled_by": cancelled_by}

    def expire_stale_actions(self) -> int:
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        count = repo.expire_stale_action_recommendations(now_iso)
        if count > 0:
            logger.info(f"[ActionPolicy] Expired {count} stale action recommendations.")
        return count

    def get_action_list(
        self,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        action_type: Optional[str] = None,
        complaint_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        actions = repo.list_action_recommendations(
            status=status,
            priority=priority,
            action_type=action_type,
            complaint_id=complaint_id,
            limit=limit,
            offset=offset,
        )
        return {
            "actions": actions,
            "count": len(actions),
            "policy_version": self.policy_version,
        }

    def get_action_detail(self, action_id: str) -> Optional[Dict[str, Any]]:
        rec = repo.get_action_recommendation(action_id)
        if not rec:
            return None
        complaint_id = rec.get("complaint_id")
        try:
            rec["complaint"] = repo.get_complaint_by_id(complaint_id)
        except Exception:
            rec["complaint"] = None
        try:
            rec["attention"] = repo.get_case_attention_state(complaint_id)
        except Exception:
            rec["attention"] = None
        try:
            rec["prediction"] = repo.get_prediction_by_complaint(complaint_id)
        except Exception:
            rec["prediction"] = None
        return rec


# Singleton
action_policy_engine = ActionPolicyEngine()
