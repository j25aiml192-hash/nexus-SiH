"""
NEXUS Case Attention Policy (Phase 2B)
======================================
Defines deterministic weighting parameters, threshold boundaries, and machine-readable
reason codes for operational case attention scoring.

CRITICAL DESIGN PRINCIPLES:
1. Operational Priority, NOT Guilt:
   Evaluates "Which active cases require immediate investigator attention?",
   never accusing any individual or replacing model risk scores.
2. Independent Separation:
   - Fraud Risk = ML prediction (XGBoost) -> preserved without modification.
   - Geo Prediction = LightGBM -> preserved without modification.
   - Operational Attention = Deterministic multi-factor operational synthesis.
3. Fully Explainable:
   Every score must be decomposable into structured, machine-readable reason codes
   and decision factors with zero hidden chain-of-thought.
"""

from typing import Dict, Any, List, Tuple, Optional
import datetime

ATTENTION_POLICY_VERSION = "phase2b-v1"

# Attention Level Thresholds (0.0 to 100.0 scale)
THRESHOLD_CRITICAL = 75.0
THRESHOLD_HIGH = 50.0
THRESHOLD_MEDIUM = 25.0


def compute_attention(
    complaint: Optional[Dict[str, Any]],
    prediction: Optional[Dict[str, Any]] = None,
    truth_graph: Optional[Dict[str, Any]] = None,
    linked_complaint_ids: Optional[List[str]] = None,
    active_alerts: Optional[List[Dict[str, Any]]] = None,
    incidents: Optional[List[Dict[str, Any]]] = None,
    trigger_event: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Computes a deterministic operational attention score and level for a case.
    Returns:
    {
        "attention_score": float (0.0 - 100.0),
        "attention_level": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
        "reason_codes": List[str],
        "decision_factors": Dict[str, Any],
        "policy_version": "phase2b-v1"
    }
    """
    complaint = complaint or {}
    prediction = prediction or {}
    truth_graph = truth_graph or {}
    linked_complaints = [cid for cid in (linked_complaint_ids or []) if cid != complaint.get("complaint_id")]
    active_alerts = active_alerts or []
    incidents = incidents or []
    trigger_event = trigger_event or {}

    reason_codes: List[str] = []
    decision_factors: Dict[str, Any] = {
        "policy_version": ATTENTION_POLICY_VERSION,
        "evaluated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "contributions": {},
    }

    # 1. Fraud Risk Signal (Weight: max 25.0 pts)
    # Uses prediction.risk_score without altering it
    raw_risk = float(prediction.get("risk_score") or 0.0)
    risk_pts = round(min(1.0, max(0.0, raw_risk)) * 25.0, 2)
    decision_factors["contributions"]["fraud_risk"] = {
        "raw_score": raw_risk,
        "points": risk_pts,
        "max_points": 25.0,
    }
    if raw_risk >= 0.70:
        reason_codes.append("HIGH_FRAUD_RISK")
    elif raw_risk >= 0.45:
        reason_codes.append("ELEVATED_FRAUD_RISK")

    # 2. Operational Urgency Signal (Weight: max 25.0 pts)
    # Evaluates cashout window timing & approaching events
    urgency_pts = 0.0
    cashout_window = prediction.get("cashout_window_hours")
    evt_type = trigger_event.get("event_type")

    if evt_type == "operational_window_approaching" or (cashout_window is not None and float(cashout_window) <= 1.0):
        urgency_pts = 25.0
        reason_codes.append("CRITICAL_WINDOW_APPROACHING")
    elif cashout_window is not None and float(cashout_window) <= 4.0:
        urgency_pts = 18.0
        reason_codes.append("OPERATIONAL_WINDOW_APPROACHING")
    elif cashout_window is not None and float(cashout_window) <= 12.0:
        urgency_pts = 10.0
        reason_codes.append("ACTIVE_CASH_OUT_WINDOW")
    elif cashout_window is not None and float(cashout_window) <= 24.0:
        urgency_pts = 5.0
    else:
        # Check staleness if prediction is older than 48 hours
        pred_created = prediction.get("created_at")
        if pred_created:
            try:
                # Basic check for stale window
                created_dt = datetime.datetime.fromisoformat(pred_created.replace("Z", "+00:00"))
                age_hours = (datetime.datetime.now(datetime.timezone.utc) - created_dt).total_seconds() / 3600.0
                if age_hours > 48.0 and (cashout_window is None or float(cashout_window) < age_hours):
                    urgency_pts = -10.0
                    reason_codes.append("STALE_PREDICTION_PENALTY")
            except Exception:
                pass

    decision_factors["contributions"]["operational_urgency"] = {
        "cashout_window_hours": cashout_window,
        "points": urgency_pts,
        "max_points": 25.0,
    }

    # 3. Financial Exposure Signal (Weight: max 20.0 pts)
    # Scaled logarithmically/categorically by reported INR loss
    amount = float(complaint.get("amount_inr") or 0.0)
    financial_pts = 0.0
    if amount >= 500000.0:  # 5 Lakhs+
        financial_pts = 20.0
        reason_codes.append("HIGH_FINANCIAL_EXPOSURE")
    elif amount >= 100000.0:  # 1 Lakh+
        financial_pts = 14.0
        reason_codes.append("SIGNIFICANT_FINANCIAL_EXPOSURE")
    elif amount >= 50000.0:
        financial_pts = 8.0
        reason_codes.append("MODERATE_FINANCIAL_EXPOSURE")
    elif amount >= 10000.0:
        financial_pts = 4.0
    elif amount > 0.0:
        financial_pts = 2.0

    decision_factors["contributions"]["financial_exposure"] = {
        "amount_inr": amount,
        "points": financial_pts,
        "max_points": 20.0,
    }

    # 4. Cross-Case Correlation Signal (Weight: max 20.0 pts)
    # Detects shared infrastructure in Truth Graph
    correlation_pts = 0.0
    entities = truth_graph.get("entities", [])
    relations = truth_graph.get("relations", [])

    shared_acc = any(r.get("relation_type") == "SHARED_ACCOUNT" for r in relations)
    shared_dev = any(r.get("relation_type") == "SHARED_DEVICE" for r in relations)
    shared_ip = any(r.get("relation_type") == "SHARED_IP" for r in relations)

    if shared_acc:
        correlation_pts += 10.0
        reason_codes.append("SHARED_ACCOUNT_DETECTED")
    if shared_dev:
        correlation_pts += 10.0
        reason_codes.append("SHARED_DEVICE_DETECTED")
    if shared_ip:
        correlation_pts += 6.0
        reason_codes.append("SHARED_IP_DETECTED")

    # Multi-complaint linkages
    linked_count = len(linked_complaints)
    if linked_count >= 3:
        correlation_pts += 10.0
        reason_codes.append("MULTI_CASE_CORRELATION")
    elif linked_count >= 1:
        correlation_pts += 5.0
        reason_codes.append("CROSS_CASE_LINK_DETECTED")

    correlation_pts = min(20.0, correlation_pts)
    decision_factors["contributions"]["cross_case_correlation"] = {
        "linked_complaints_count": linked_count,
        "linked_complaints": linked_complaints[:5],
        "shared_account": shared_acc,
        "shared_device": shared_dev,
        "shared_ip": shared_ip,
        "points": correlation_pts,
        "max_points": 20.0,
    }

    # 5. Evidence Quality & Discrepancies (Weight: max 10.0 pts)
    evidence_pts = 0.0
    evt_payload = trigger_event.get("payload") or {}
    if isinstance(evt_payload, str):
        import json
        try:
            evt_payload = json.loads(evt_payload)
        except Exception:
            evt_payload = {}

    has_discrepancy = (
        evt_type == "evidence_discrepancy_detected"
        or evt_payload.get("discrepancy_detected") is True
    )
    if has_discrepancy:
        evidence_pts += 10.0
        reason_codes.append("EVIDENCE_DISCREPANCY")
    elif evt_type == "evidence_updated":
        evidence_pts += 5.0
        reason_codes.append("RECENT_EVIDENCE_UPDATE")

    evidence_pts = min(10.0, evidence_pts)
    decision_factors["contributions"]["evidence_signals"] = {
        "discrepancy_detected": has_discrepancy,
        "event_type": evt_type,
        "points": evidence_pts,
        "max_points": 10.0,
    }

    # 6. Geographic Actionability (Weight: max 10.0 pts)
    # Actionable if high confidence geospatial target with accessible ATMs
    geo_pts = 0.0
    atms = prediction.get("predicted_atms") or []
    atm_count = len(atms) if isinstance(atms, list) else 0
    pred_conf = float(prediction.get("confidence") or 0.0)

    if atm_count > 0 and pred_conf >= 0.60:
        geo_pts = 10.0
        reason_codes.append("HIGH_GEO_ACTIONABILITY")
    elif atm_count > 0:
        geo_pts = 5.0
        reason_codes.append("MODERATE_GEO_ACTIONABILITY")

    decision_factors["contributions"]["geographic_actionability"] = {
        "atm_count": atm_count,
        "confidence": pred_conf,
        "points": geo_pts,
        "max_points": 10.0,
    }

    # 7. Case Lifecycle Modifiers
    lifecycle_mod = 0.0
    # Unacknowledged alerts boost attention
    unacked = any(a.get("status") == "pending" for a in active_alerts)
    if unacked and raw_risk >= 0.50:
        lifecycle_mod += 5.0
        reason_codes.append("UNACKNOWLEDGED_ALERT")

    # Resolved incidents reduce operational priority drastically
    is_resolved = (
        complaint.get("status") in ("resolved", "closed")
        or any(inc.get("status") == "resolved" for inc in incidents)
        or evt_type == "incident_resolved"
    )
    if is_resolved:
        lifecycle_mod -= 50.0
        reason_codes.append("INCIDENT_RESOLVED")

    decision_factors["contributions"]["lifecycle_modifier"] = {
        "unacknowledged_alerts": unacked,
        "is_resolved": is_resolved,
        "points": lifecycle_mod,
    }

    # Aggregate & Bound Score
    total_score = risk_pts + urgency_pts + financial_pts + correlation_pts + evidence_pts + geo_pts + lifecycle_mod
    bounded_score = round(min(100.0, max(0.0, total_score)), 2)

    # Classify Attention Level
    if bounded_score >= THRESHOLD_CRITICAL:
        level = "CRITICAL"
    elif bounded_score >= THRESHOLD_HIGH:
        level = "HIGH"
    elif bounded_score >= THRESHOLD_MEDIUM:
        level = "MEDIUM"
    else:
        level = "LOW"

    # Default reason code if none triggered
    if not reason_codes:
        reason_codes.append("BASELINE_CASE_WATCH")

    return {
        "attention_score": bounded_score,
        "attention_level": level,
        "reason_codes": list(dict.fromkeys(reason_codes)),  # Preserve order, unique
        "decision_factors": decision_factors,
        "policy_version": ATTENTION_POLICY_VERSION,
    }
