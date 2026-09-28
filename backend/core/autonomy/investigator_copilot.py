"""
NEXUS Investigator Copilot (Phase 5)
=====================================
Grounded investigator assistant that answers case questions using only
structured NEXUS data. Zero unsupported claims. Zero invented facts.

DESIGN PRINCIPLES:
- Grounding-first: every statement traces to a concrete NEXUS record.
- Read-only: copilot cannot approve, reject, execute, or modify any record.
- Masking-compliant: uses masked values from Truth Graph.
- Explicit uncertainty: says "Insufficient evidence" when data is absent.
- Explicit inference labeling: "Inferred relationship" not stated as fact.
- No LLM chain-of-thought stored; only structured rationale + source refs.
"""

import logging
import datetime
import json
from typing import Dict, Any, List, Optional

from db import repo

logger = logging.getLogger("nexus.autonomy.copilot")

COPILOT_VERSION = "phase5-v1"


class InvestigatorCopilot:
    """
    Grounded investigator copilot. All responses are derived from
    structured NEXUS database records, never invented.
    """

    # -------------------------------------------------------------------------
    # MAIN ENTRY POINT
    # -------------------------------------------------------------------------

    def answer(self, complaint_id: str, question: str) -> Dict[str, Any]:
        """
        Routes the investigator question to the appropriate grounded handler.
        Returns a structured response with summary, evidence, and source citations.
        """
        q = question.strip().lower()

        if any(kw in q for kw in ["what is happening", "status", "overview", "summary"]):
            return self.case_summary(complaint_id)
        elif any(kw in q for kw in ["change", "recent", "latest", "update"]):
            return self.what_changed(complaint_id)
        elif any(kw in q for kw in ["attention", "why high", "why critical", "priority"]):
            return self.explain_attention(complaint_id)
        elif any(kw in q for kw in ["related", "linked", "connected", "syndicate", "cross"]):
            return self.related_cases(complaint_id)
        elif any(kw in q for kw in ["evidence", "proof", "relation", "graph"]):
            return self.explain_evidence(complaint_id)
        elif any(kw in q for kw in ["action", "recommend", "next", "what should"]):
            return self.current_actions(complaint_id)
        elif any(kw in q for kw in ["approve", "approval", "review"]):
            return self.approval_status(complaint_id)
        else:
            return self.case_summary(complaint_id)

    # -------------------------------------------------------------------------
    # CASE SUMMARY
    # -------------------------------------------------------------------------

    def case_summary(self, complaint_id: str) -> Dict[str, Any]:
        """Returns a grounded overview of the current case state."""
        sections: Dict[str, Any] = {}
        sources: List[Dict[str, str]] = []

        complaint = self._safe_get(repo.get_complaint_by_id, complaint_id)
        prediction = self._safe_get(repo.get_prediction_by_complaint, complaint_id)
        attention = self._safe_get(repo.get_case_attention_state, complaint_id)

        if not complaint:
            return self._not_found(complaint_id)

        # Summary
        fraud_type = complaint.get("fraud_type", "Unknown")
        amount = complaint.get("amount_inr", 0)
        state = complaint.get("victim_state") or "Unknown state"
        status = complaint.get("status", "unknown")
        ncrp = complaint.get("ncrp_id") or complaint_id[:8]
        sections["summary"] = (
            f"Case {ncrp}: {fraud_type} incident reported from {state}. "
            f"Reported exposure: INR {amount:,.0f}. Case status: {status.upper()}."
        )
        sources.append({"type": "complaint", "id": complaint_id, "field": "complaint record"})

        # Risk
        if prediction:
            risk_score = prediction.get("risk_score", 0)
            risk_level = prediction.get("risk_level", "UNKNOWN")
            window = prediction.get("cashout_window_hours")
            window_str = f"Cashout window: {window}h remaining." if window is not None else "No cashout window data."
            sections["current_risk"] = (
                f"Fraud risk: {risk_level} ({risk_score:.0%}). {window_str}"
            )
            sources.append({"type": "prediction", "id": prediction.get("prediction_id", ""), "field": "risk_score, cashout_window_hours"})
        else:
            sections["current_risk"] = "Insufficient evidence in current NEXUS records: no prediction available."

        # Attention
        if attention:
            attn_level = attention.get("attention_level", "UNKNOWN")
            attn_score = attention.get("attention_score", 0)
            reason_codes = attention.get("reason_codes") or []
            if isinstance(reason_codes, str):
                try:
                    reason_codes = json.loads(reason_codes)
                except Exception:
                    reason_codes = []
            sections["attention"] = (
                f"Operational attention: {attn_level} ({attn_score:.1f}/100). "
                f"Signals: {', '.join(reason_codes[:4]) if reason_codes else 'None recorded'}."
            )
            sources.append({"type": "attention", "id": attention.get("attention_id", ""), "field": "attention_level, reason_codes"})
        else:
            sections["attention"] = "Insufficient evidence in current NEXUS records: attention not yet evaluated."

        # Actions
        actions_result = repo.list_action_recommendations(
            complaint_id=complaint_id, status="PROPOSED", limit=3
        )
        if actions_result:
            action_summaries = [
                f"{a.get('action_type')} ({a.get('priority')}, approval={'required' if a.get('approval_required') else 'not required'})"
                for a in actions_result
            ]
            sections["recommended_actions"] = "; ".join(action_summaries)
        else:
            sections["recommended_actions"] = "No pending action recommendations at this time."

        return self._build_response(complaint_id, "CASE_SUMMARY", sections, sources)

    # -------------------------------------------------------------------------
    # WHAT CHANGED
    # -------------------------------------------------------------------------

    def what_changed(self, complaint_id: str) -> Dict[str, Any]:
        """Returns recent events and state changes for this case."""
        sections: Dict[str, Any] = {}
        sources: List[Dict[str, str]] = []

        audit_entries = self._safe_call(
            repo.get_autonomy_audit_log_for_complaint, complaint_id, limit=5
        ) or []

        if not audit_entries:
            sections["recent_changes"] = "Insufficient evidence in current NEXUS records: no audit events recorded for this case."
        else:
            changes = []
            for entry in audit_entries:
                created = entry.get("created_at", "")[:19]
                action_type = entry.get("action_type", "")
                trigger = entry.get("trigger_event_type", "")
                df = entry.get("decision_factors") or {}
                if isinstance(df, str):
                    try:
                        df = json.loads(df)
                    except Exception:
                        df = {}
                reason_codes = df.get("reason_codes", [])
                changes.append(
                    f"[{created}] {action_type} triggered by {trigger}. "
                    f"Signals: {', '.join(reason_codes[:3]) if reason_codes else 'recorded'}."
                )
                sources.append({"type": "audit_log", "id": entry.get("log_id", ""), "field": "action_type, trigger_event_type"})
            sections["recent_changes"] = "\n".join(changes)

        return self._build_response(complaint_id, "WHAT_CHANGED", sections, sources)

    # -------------------------------------------------------------------------
    # EXPLAIN ATTENTION
    # -------------------------------------------------------------------------

    def explain_attention(self, complaint_id: str) -> Dict[str, Any]:
        """Explains why a case has its current attention level."""
        sections: Dict[str, Any] = {}
        sources: List[Dict[str, str]] = []

        attention = self._safe_get(repo.get_case_attention_state, complaint_id)
        if not attention:
            sections["attention_explanation"] = (
                "Insufficient evidence in current NEXUS records: "
                "attention state has not been evaluated for this case."
            )
            return self._build_response(complaint_id, "EXPLAIN_ATTENTION", sections, sources)

        level = attention.get("attention_level", "UNKNOWN")
        score = attention.get("attention_score", 0)
        reason_codes = attention.get("reason_codes") or []
        if isinstance(reason_codes, str):
            try:
                reason_codes = json.loads(reason_codes)
            except Exception:
                reason_codes = []

        df = attention.get("decision_factors") or {}
        if isinstance(df, str):
            try:
                df = json.loads(df)
            except Exception:
                df = {}

        contributions = df.get("contributions", {})
        contrib_lines = []
        for factor, data in contributions.items():
            pts = data.get("points", 0)
            max_pts = data.get("max_points", 0)
            if pts != 0:
                contrib_lines.append(f"  {factor}: {pts:+.1f} of {max_pts} pts")

        sections["attention_explanation"] = (
            f"Attention level: {level} (score: {score:.1f}/100).\n"
            f"Active signals: {', '.join(reason_codes) if reason_codes else 'None'}.\n"
            f"Score contributions:\n" + ("\n".join(contrib_lines) if contrib_lines else "  None recorded.")
        )
        sources.append({"type": "attention", "id": attention.get("attention_id", ""), "field": "decision_factors.contributions"})

        return self._build_response(complaint_id, "EXPLAIN_ATTENTION", sections, sources)

    # -------------------------------------------------------------------------
    # RELATED CASES
    # -------------------------------------------------------------------------

    def related_cases(self, complaint_id: str) -> Dict[str, Any]:
        """Returns related case information from Syndicate DNA and Truth Graph."""
        sections: Dict[str, Any] = {}
        sources: List[Dict[str, str]] = []

        cross = self._safe_call(repo.get_entity_cross_case_links_for_complaint, complaint_id)
        if not cross:
            sections["related_cases"] = (
                "Insufficient evidence in current NEXUS records: "
                "no cross-case entity links found for this complaint."
            )
        else:
            linked = []
            if isinstance(cross, dict):
                linked = cross.get("linked_complaints", [])
            elif isinstance(cross, list):
                linked = [c for c in cross if c != complaint_id]

            if not linked:
                sections["related_cases"] = "No related cases detected through shared entity analysis."
            else:
                linked_filtered = [c for c in linked if c != complaint_id][:10]
                sections["related_cases"] = (
                    f"Inferred relationship: {len(linked_filtered)} case(s) share one or more "
                    f"forensic entities with this complaint (phone, bank account, or device fingerprint). "
                    f"Related complaint IDs: {', '.join(linked_filtered[:5])}."
                    + (" (and more)" if len(linked_filtered) > 5 else "")
                )
                sections["inference_label"] = (
                    "These are inferred relationships based on shared entity analysis "
                    "(Truth Graph DERIVED/INFERRED semantic level). "
                    "They are not confirmed as belonging to the same criminal network."
                )
                for c in linked_filtered[:5]:
                    sources.append({"type": "truth_graph_relation", "id": c, "field": "shared_entity_cross_case"})

        return self._build_response(complaint_id, "RELATED_CASES", sections, sources)

    # -------------------------------------------------------------------------
    # EXPLAIN EVIDENCE
    # -------------------------------------------------------------------------

    def explain_evidence(self, complaint_id: str) -> Dict[str, Any]:
        """Explains the evidence graph state for this case."""
        sections: Dict[str, Any] = {}
        sources: List[Dict[str, str]] = []

        # Verify the complaint exists first
        complaint = self._safe_get(repo.get_complaint_by_id, complaint_id)
        if not complaint:
            sections["evidence"] = (
                "Insufficient evidence in current NEXUS records: "
                "complaint not found — no evidence graph available."
            )
            return self._build_response(complaint_id, "EXPLAIN_EVIDENCE", sections, sources)

        try:
            from core.autonomy.evidence_service import evidence_service
            graph = evidence_service.get_case_evidence_graph(complaint_id, depth=1, max_nodes=30)
        except Exception as e:
            logger.debug(f"[Copilot] evidence graph load: {e}")
            graph = None

        if not graph or not graph.get("nodes") or (graph.get("summary", {}).get("total_edges", 0) == 0
                                                     and graph.get("summary", {}).get("total_nodes", 0) <= 1):
            sections["evidence"] = (
                "Insufficient evidence in current NEXUS records: "
                "no Truth Graph entities or relations found for this complaint."
            )
            return self._build_response(complaint_id, "EXPLAIN_EVIDENCE", sections, sources)

        summary = graph.get("summary", {})
        total_nodes = summary.get("total_nodes", 0)
        total_edges = summary.get("total_edges", 0)
        breakdown = summary.get("semantic_breakdown", {})
        consistency = graph.get("consistency", {})
        consistency_status = consistency.get("status", "UNKNOWN")

        breakdown_parts = [
            f"{level}: {count}" for level, count in breakdown.items() if count > 0
        ]

        sections["evidence"] = (
            f"Evidence graph: {total_nodes} entities, {total_edges} relationships.\n"
            f"Semantic breakdown: {', '.join(breakdown_parts) if breakdown_parts else 'none'}.\n"
            f"Consistency status: {consistency_status}."
        )

        if consistency_status in ("REVIEW", "DISCREPANCY"):
            sections["evidence_caution"] = (
                "Conflicting evidence requires review. "
                "One or more consistency checks did not pass."
            )

        sources.append({"type": "truth_graph", "id": complaint_id, "field": "entities, relations, consistency"})
        return self._build_response(complaint_id, "EXPLAIN_EVIDENCE", sections, sources)

    # -------------------------------------------------------------------------
    # CURRENT ACTIONS
    # -------------------------------------------------------------------------

    def current_actions(self, complaint_id: str) -> Dict[str, Any]:
        """Explains current action recommendations for this case."""
        sections: Dict[str, Any] = {}
        sources: List[Dict[str, str]] = []

        actions = repo.list_action_recommendations(complaint_id=complaint_id, limit=10) or []

        if not actions:
            sections["actions"] = "No action recommendations currently exist for this case."
            sections["approval_note"] = (
                "Consequential actions (fund freeze, field dispatch, legal escalation, case closure) "
                "REQUIRE explicit investigator approval through the Action Center UI. "
                "They are never automatically executed."
            )
            return self._build_response(complaint_id, "CURRENT_ACTIONS", sections, sources)

        pending = [a for a in actions if a.get("status") in ("PROPOSED", "PENDING_APPROVAL")]
        completed = [a for a in actions if a.get("status") == "COMPLETED"]
        rejected = [a for a in actions if a.get("status") == "REJECTED"]

        if pending:
            lines = []
            for a in pending:
                approval_text = "REQUIRES EXPLICIT INVESTIGATOR APPROVAL" if a.get("approval_required") else "Safe automatic action"
                rc = a.get("reason_codes") or []
                if isinstance(rc, str):
                    try:
                        rc = json.loads(rc)
                    except Exception:
                        rc = []
                lines.append(
                    f"  [{a.get('priority')}] {a.get('action_type')}: "
                    f"{approval_text}. Signals: {', '.join(rc[:3]) if rc else 'recorded'}. "
                    f"Expires: {(a.get('expires_at') or '')[:16]}."
                )
                sources.append({"type": "action_recommendation", "id": a.get("action_id", ""), "field": "action_type, priority, approval_required"})
            sections["pending_actions"] = "\n".join(lines)
        else:
            sections["pending_actions"] = "No pending action recommendations."

        sections["completed_actions"] = f"{len(completed)} action(s) completed."
        sections["rejected_actions"] = f"{len(rejected)} action(s) rejected by investigator."
        sections["approval_note"] = (
            "Consequential actions (fund freeze, field dispatch, legal escalation, case closure) "
            "REQUIRE explicit investigator approval through the Action Center UI. "
            "They are never automatically executed."
        )

        return self._build_response(complaint_id, "CURRENT_ACTIONS", sections, sources)

    # -------------------------------------------------------------------------
    # APPROVAL STATUS
    # -------------------------------------------------------------------------

    def approval_status(self, complaint_id: str) -> Dict[str, Any]:
        """Returns current approval status for pending actions on this case."""
        sections: Dict[str, Any] = {}
        sources: List[Dict[str, str]] = []

        actions = repo.list_action_recommendations(
            complaint_id=complaint_id, status="PROPOSED", limit=10
        ) or []
        approval_needed = [a for a in actions if a.get("approval_required")]

        if not approval_needed:
            sections["approval_status"] = (
                "No consequential actions are currently pending approval for this case."
            )
        else:
            lines = []
            for a in approval_needed:
                lines.append(
                    f"  [{a.get('priority')}] {a.get('action_type')} — "
                    f"status: {a.get('status')}, expires: {(a.get('expires_at') or '')[:16]}"
                )
                sources.append({"type": "action_recommendation", "id": a.get("action_id", ""), "field": "approval_required, status"})
            sections["approval_status"] = (
                f"{len(approval_needed)} action(s) awaiting investigator approval:\n"
                + "\n".join(lines)
            )
        sections["approval_note"] = (
            "Approval requires an authenticated investigator to explicitly click "
            "Approve in the Action Center. Approval is never inferred from page load, "
            "button focus, or automatic acknowledgment."
        )
        return self._build_response(complaint_id, "APPROVAL_STATUS", sections, sources)

    # -------------------------------------------------------------------------
    # UTILITIES
    # -------------------------------------------------------------------------

    def _safe_get(self, fn, *args):
        try:
            return fn(*args)
        except Exception as e:
            logger.debug(f"[Copilot] safe_get {fn.__name__}: {e}")
            return None

    def _safe_call(self, fn, *args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            logger.debug(f"[Copilot] safe_call {fn.__name__}: {e}")
            return None

    def _not_found(self, complaint_id: str) -> Dict[str, Any]:
        return self._build_response(
            complaint_id,
            "NOT_FOUND",
            {"summary": f"Insufficient evidence in current NEXUS records: complaint '{complaint_id}' not found."},
            [],
        )

    def _build_response(
        self,
        complaint_id: str,
        intent: str,
        sections: Dict[str, Any],
        sources: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        return {
            "complaint_id": complaint_id,
            "intent": intent,
            "copilot_version": COPILOT_VERSION,
            "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "sections": sections,
            "sources": sources,
            "disclaimer": (
                "All statements are derived from structured NEXUS records. "
                "Inferred relationships are explicitly labeled. "
                "This copilot is read-only and cannot approve, execute, or modify any record."
            ),
        }


# Singleton
investigator_copilot = InvestigatorCopilot()
