"""
NEXUS Autonomous Case Attention Engine (Phase 2B)
=================================================
Orchestrates operational case prioritization across incoming events and evidence.
Calculates deterministic attention scores, classifies priority levels, records structured
explainability factors, and maintains the active investigator work queue.

CRITICAL ARCHITECTURE:
- Safe execution: An attention calculation error NEVER breaks complaint intake or event routing.
- Purely analytical: Prioritizes cases for human investigators without triggering consequential actions.
- Preserves models: Never modifies or overwrites XGBoost risk_score or LightGBM coordinates.
"""

import logging
import uuid
import datetime
from typing import Dict, Any, List, Optional

from db import repo
from core.autonomy import attention_policy

logger = logging.getLogger("nexus.autonomy.attention_engine")


class CaseAttentionEngine:
    """Evaluates and manages operational case attention states."""

    def __init__(self):
        self.policy_version = attention_policy.ATTENTION_POLICY_VERSION

    def evaluate_case_attention(
        self,
        complaint_id: str,
        trigger_event: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates operational attention for a single complaint.
        Gathers available signals, evaluates policy, persists active attention state,
        and logs structured decision factors in autonomy_audit_log.
        """
        cid = str(complaint_id)
        trigger_event = trigger_event or {}
        evt_id = trigger_event.get("event_id")
        evt_type = trigger_event.get("event_type") or "manual_evaluation"

        # 1. Fetch Grounded Context
        complaint = None
        try:
            complaint = repo.get_complaint_by_id(cid)
        except Exception as e:
            logger.debug(f"[Attention Engine] Error fetching complaint {cid}: {e}")

        if not complaint:
            logger.warning(f"[Attention Engine] Cannot evaluate attention for non-existent complaint: {cid}")
            return {
                "complaint_id": cid,
                "attention_score": 0.0,
                "attention_level": "LOW",
                "reason_codes": ["COMPLAINT_NOT_FOUND"],
                "decision_factors": {},
                "policy_version": self.policy_version,
            }

        # Ensure canonical UUID is used for all downstream evaluation and persistence
        cid = str(complaint.get("complaint_id") or cid)

        # Fetch Prediction
        prediction = None
        try:
            prediction = repo.get_prediction_by_complaint(cid)
        except Exception as e:
            logger.debug(f"[Attention Engine] Error fetching prediction for {cid}: {e}")

        # If prediction not yet in DB, check trigger event payload
        if not prediction and trigger_event.get("payload"):
            payload = trigger_event["payload"]
            if isinstance(payload, str):
                import json
                try:
                    payload = json.loads(payload)
                except Exception:
                    payload = {}
            if "risk_score" in payload:
                prediction = payload

        # Fetch Truth Graph & Linked Complaints
        truth_graph = None
        linked_complaint_ids: List[str] = []
        try:
            truth_graph = repo.get_truth_graph_for_complaint(cid)
            entities = truth_graph.get("entities", []) if truth_graph else []
            for ent in entities:
                eid = ent.get("entity_id")
                if eid:
                    cross_info = repo.get_entity_cross_case_links(eid)
                    if isinstance(cross_info, dict):
                        linked = cross_info.get("linked_complaints") or []
                    else:
                        linked = cross_info or []
                    for lcid in linked:
                        if lcid != cid and lcid not in linked_complaint_ids:
                            linked_complaint_ids.append(lcid)
        except Exception as e:
            logger.debug(f"[Attention Engine] Error fetching truth graph for {cid}: {e}")

        # Fetch Active Alerts
        active_alerts: List[Dict[str, Any]] = []
        try:
            alerts = repo.get_alerts_for_complaint(cid)
            active_alerts = alerts or []
        except Exception as e:
            logger.debug(f"[Attention Engine] Error fetching alerts for {cid}: {e}")

        # Fetch Incidents
        incidents: List[Dict[str, Any]] = []
        try:
            all_incidents = repo.get_incidents(limit=50)
            incidents = [i for i in (all_incidents or []) if str(i.get("complaint_id")) == cid]
        except Exception as e:
            logger.debug(f"[Attention Engine] Error fetching incidents for {cid}: {e}")

        # 2. Compute Deterministic Attention
        result = attention_policy.compute_attention(
            complaint=complaint,
            prediction=prediction,
            truth_graph=truth_graph,
            linked_complaint_ids=linked_complaint_ids,
            active_alerts=active_alerts,
            incidents=incidents,
            trigger_event=trigger_event,
        )

        score = result["attention_score"]
        level = result["attention_level"]
        reasons = result["reason_codes"]
        factors = result["decision_factors"]

        # 3. Persist Active Case Attention State
        try:
            repo.upsert_case_attention_state(
                complaint_id=cid,
                attention_score=score,
                attention_level=level,
                reason_codes=reasons,
                decision_factors=factors,
                source_event_id=evt_id,
                policy_version=self.policy_version,
            )
        except Exception as e:
            logger.error(f"[Attention Engine] Failed persisting attention state for {cid}: {e}", exc_info=True)

        # 4. Record Structured Audit Log
        try:
            repo.create_autonomy_audit_log(
                complaint_id=cid,
                trigger_event_id=evt_id,
                trigger_event_type=evt_type,
                action_type="EVALUATE_CASE_ATTENTION",
                decision_factors={
                    "reason_codes": reasons,
                    "attention_score": score,
                    "attention_level": level,
                    "contributions": factors.get("contributions", {}),
                    "policy_version": self.policy_version,
                },
                action_payload={
                    "attention_score": score,
                    "attention_level": level,
                    "complaint_id": cid,
                },
                requires_approval=False,
            )
        except Exception as e:
            logger.debug(f"[Attention Engine] Failed logging audit entry for {cid}: {e}")

        logger.info(
            f"[Attention] Evaluated case {cid} | "
            f"score: {score:.1f} | "
            f"level: {level} | "
            f"reasons: {','.join(reasons[:3])}"
        )

        return {
            "complaint_id": cid,
            "attention_score": score,
            "attention_level": level,
            "reason_codes": reasons,
            "decision_factors": factors,
            "policy_version": self.policy_version,
            "source_event_id": evt_id,
            "calculated_at": factors.get("evaluated_at"),
        }

    def get_attention_state(self, complaint_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves active attention state for a complaint."""
        return repo.get_case_attention_state(complaint_id)

    def get_attention_queue(
        self,
        limit: int = 50,
        offset: int = 0,
        attention_level: Optional[str] = None,
        fraud_type: Optional[str] = None,
        victim_state: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieves active attention queue ordered by priority score descending."""
        return repo.get_case_attention_queue(
            limit=limit,
            offset=offset,
            attention_level=attention_level,
            fraud_type=fraud_type,
            victim_state=victim_state,
        )


# Global singleton instance
attention_engine = CaseAttentionEngine()
