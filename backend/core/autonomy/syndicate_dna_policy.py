"""
NEXUS PHASE 3A: SYNDICATE DNA / CROSS-CASE INTELLIGENCE POLICY
=============================================================
Centralized, deterministic policy for evaluating structural similarity,
relationship evidence, and potential operational network clustering.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. SEMANTIC SEPARATION:
   - Evaluates "Potential Shared Operational Networks" ONLY.
   - NEVER claims or writes to authoritative `syndicates`.
   - Never infers criminal guilt or attribution.
2. DETERMINISTIC & EXPLAINABLE:
   - Pure functional calculations; zero hidden stochastic weights.
   - Fully traceable to concrete Truth Graph entities, transactions, and geography.
3. PRIVACY PRESERVING:
   - References canonical entities and masked values (e.g., *******3210).
   - Never leaks raw credentials, PINs, or unmasked sensitive PII.
"""

from typing import Dict, Any, List, Optional, Tuple
import datetime
import math
import logging

logger = logging.getLogger("nexus.autonomy.syndicate_dna_policy")

SYNDICATE_DNA_POLICY_VERSION = "phase3a-v1"

# Similarity Thresholds
SIMILARITY_THRESHOLD_STRONG = 0.75
SIMILARITY_THRESHOLD_MODERATE = 0.50
SIMILARITY_THRESHOLD_EMERGING = 0.25


def _haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points on Earth in km."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def _parse_timestamp(ts_val: Any) -> Optional[datetime.datetime]:
    """Safely parses timestamp string or returns None."""
    if not ts_val:
        return None
    if isinstance(ts_val, datetime.datetime):
        return ts_val
    try:
        s = str(ts_val).replace("Z", "+00:00")
        return datetime.datetime.fromisoformat(s)
    except Exception:
        return None


def compute_structural_similarity(
    case_a: Dict[str, Any],
    case_b: Dict[str, Any],
    entities_a: List[Dict[str, Any]],
    entities_b: List[Dict[str, Any]],
    shared_entities: List[Dict[str, Any]],
    prediction_a: Optional[Dict[str, Any]] = None,
    prediction_b: Optional[Dict[str, Any]] = None,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Computes deterministic structural similarity between two active cases.

    Returns:
        {
            "structural_similarity": float (0.0 to 1.0),
            "relationship_strength": str ("STRONG" | "MODERATE" | "EMERGING" | "WEAK"),
            "relationship_types": List[str],
            "evidence": List[Dict[str, Any]],
            "similarity_contributions": Dict[str, float],
            "policy_version": str,
        }
    """
    cid_a = str(case_a.get("complaint_id") or "")
    cid_b = str(case_b.get("complaint_id") or "")

    # Prevent self-linkage
    if cid_a and cid_b and cid_a == cid_b:
        return {
            "structural_similarity": 0.0,
            "relationship_strength": "WEAK",
            "relationship_types": [],
            "evidence": [],
            "similarity_contributions": {
                "shared_entities": 0.0,
                "transaction_financial": 0.0,
                "geographic_overlap": 0.0,
                "temporal_overlap": 0.0,
            },
            "policy_version": SYNDICATE_DNA_POLICY_VERSION,
        }

    reason_codes: List[str] = []
    relationship_types: List[str] = []
    evidence_items: List[Dict[str, Any]] = []

    # -------------------------------------------------------------------------
    # 1. SHARED ENTITY EVIDENCE (Max: 0.40)
    # Concrete infrastructure overlap from Truth Graph
    # -------------------------------------------------------------------------
    entity_pts = 0.0
    has_shared_account = False
    has_shared_device = False
    has_shared_phone = False
    has_shared_ip = False

    for ent in shared_entities:
        etype = ent.get("entity_type", "").lower()
        eid = ent.get("entity_id")
        can_ref = ent.get("canonical_reference") or ""
        masked = ent.get("masked_value") or ent.get("canonical_reference") or "UNKNOWN"

        if etype == "bank_account":
            has_shared_account = True
            entity_pts += 0.25
            evidence_items.append({
                "type": "SHARED_ACCOUNT",
                "entity_type": "bank_account",
                "entity_id": eid,
                "canonical_reference": can_ref,
                "masked_value": masked,
                "source_case_id": cid_a,
                "target_case_id": cid_b,
                "provenance": "truth_graph_shared_entity",
            })
        elif etype in ("device", "device_fingerprint"):
            has_shared_device = True
            entity_pts += 0.20
            evidence_items.append({
                "type": "SHARED_DEVICE",
                "entity_type": "device",
                "entity_id": eid,
                "canonical_reference": can_ref,
                "masked_value": masked,
                "source_case_id": cid_a,
                "target_case_id": cid_b,
                "provenance": "truth_graph_shared_entity",
            })
        elif etype in ("phone", "phone_number"):
            has_shared_phone = True
            entity_pts += 0.15
            evidence_items.append({
                "type": "SHARED_PHONE",
                "entity_type": "phone",
                "entity_id": eid,
                "canonical_reference": can_ref,
                "masked_value": masked,
                "source_case_id": cid_a,
                "target_case_id": cid_b,
                "provenance": "truth_graph_shared_entity",
            })
        elif etype in ("ip_address", "ip_subnet"):
            has_shared_ip = True
            entity_pts += 0.10
            evidence_items.append({
                "type": "SHARED_IP",
                "entity_type": "ip_address",
                "entity_id": eid,
                "canonical_reference": can_ref,
                "masked_value": masked,
                "source_case_id": cid_a,
                "target_case_id": cid_b,
                "provenance": "truth_graph_shared_entity",
            })

    if has_shared_account:
        relationship_types.append("SHARED_ACCOUNT")
        reason_codes.append("SHARED_BANK_ACCOUNT")
    if has_shared_device:
        relationship_types.append("SHARED_DEVICE")
        reason_codes.append("SHARED_DEVICE_FINGERPRINT")
    if has_shared_phone:
        relationship_types.append("SHARED_PHONE")
        reason_codes.append("SHARED_PHONE_IDENTIFIER")
    if has_shared_ip:
        relationship_types.append("SHARED_IP")
        reason_codes.append("SHARED_NETWORK_INFRASTRUCTURE")

    entity_pts = min(0.40, entity_pts)

    # -------------------------------------------------------------------------
    # 2. TRANSACTION & FINANCIAL MODUS OPERANDI (Max: 0.25)
    # Shared behavioral pattern and exposure tier
    # -------------------------------------------------------------------------
    tx_pts = 0.0
    fraud_a = str(case_a.get("fraud_type") or "").upper()
    fraud_b = str(case_b.get("fraud_type") or "").upper()
    chan_a = str(case_a.get("channel") or "").upper()
    chan_b = str(case_b.get("channel") or "").upper()

    if fraud_a and fraud_b and fraud_a == fraud_b:
        tx_pts += 0.10
        reason_codes.append("COMMON_MODUS_OPERANDI")
        relationship_types.append("COMMON_MODUS_OPERANDI")

    if chan_a and chan_b and chan_a == chan_b:
        tx_pts += 0.05
        reason_codes.append("SHARED_FINANCIAL_CHANNEL")

    amt_a = float(case_a.get("amount_inr") or 0.0)
    amt_b = float(case_b.get("amount_inr") or 0.0)
    if amt_a > 0.0 and amt_b > 0.0:
        # Check if amounts are within a factor of 3.0 of each other
        ratio = max(amt_a, amt_b) / min(amt_a, amt_b)
        if ratio <= 3.0:
            tx_pts += 0.10
            reason_codes.append("SIMILAR_FINANCIAL_EXPOSURE")

    tx_pts = min(0.25, tx_pts)

    # -------------------------------------------------------------------------
    # 3. GEOGRAPHIC PROXIMITY & OVERLAP (Max: 0.20)
    # Proximity of reported jurisdiction, cashout coordinates, or predicted location
    # -------------------------------------------------------------------------
    geo_pts = 0.0
    state_a = str(case_a.get("victim_state") or "").strip().upper()
    state_b = str(case_b.get("victim_state") or "").strip().upper()

    if state_a and state_b and state_a == state_b:
        geo_pts += 0.08
        reason_codes.append("SAME_JURISDICTION_OVERLAP")
        relationship_types.append("GEOGRAPHIC_OVERLAP")

    # Coordinate comparison (from complaint or attached predictions)
    lat_a = case_a.get("latitude") or (prediction_a.get("predicted_lat") if prediction_a else None)
    lon_a = case_a.get("longitude") or (prediction_a.get("predicted_lon") if prediction_a else None)
    lat_b = case_b.get("latitude") or (prediction_b.get("predicted_lat") if prediction_b else None)
    lon_b = case_b.get("longitude") or (prediction_b.get("predicted_lon") if prediction_b else None)

    if lat_a is not None and lon_a is not None and lat_b is not None and lon_b is not None:
        try:
            dist_km = _haversine_distance_km(float(lat_a), float(lon_a), float(lat_b), float(lon_b))
            if dist_km <= 25.0:
                geo_pts += 0.12
                reason_codes.append("GEOGRAPHIC_PROXIMITY_HIGH")
                if "GEOGRAPHIC_OVERLAP" not in relationship_types:
                    relationship_types.append("GEOGRAPHIC_OVERLAP")
                evidence_items.append({
                    "type": "GEOGRAPHIC_PROXIMITY",
                    "distance_km": round(dist_km, 2),
                    "proximity_tier": "HIGH (<=25km)",
                    "source_case_id": cid_a,
                    "target_case_id": cid_b,
                })
            elif dist_km <= 75.0:
                geo_pts += 0.06
                reason_codes.append("GEOGRAPHIC_PROXIMITY_MODERATE")
                if "GEOGRAPHIC_OVERLAP" not in relationship_types:
                    relationship_types.append("GEOGRAPHIC_OVERLAP")
                evidence_items.append({
                    "type": "GEOGRAPHIC_PROXIMITY",
                    "distance_km": round(dist_km, 2),
                    "proximity_tier": "MODERATE (<=75km)",
                    "source_case_id": cid_a,
                    "target_case_id": cid_b,
                })
        except Exception:
            pass

    geo_pts = min(0.20, geo_pts)

    # -------------------------------------------------------------------------
    # 4. TEMPORAL OVERLAP (Max: 0.15)
    # Proximity of complaint filing / incident occurrence
    # -------------------------------------------------------------------------
    temp_pts = 0.0
    dt_a = _parse_timestamp(case_a.get("created_at") or case_a.get("incident_date"))
    dt_b = _parse_timestamp(case_b.get("created_at") or case_b.get("incident_date"))

    if dt_a and dt_b:
        diff_hours = abs((dt_a - dt_b).total_seconds()) / 3600.0
        if diff_hours <= 48.0:
            temp_pts = 0.15
            reason_codes.append("OPERATIONAL_WINDOW_CONCURRENT")
            relationship_types.append("TEMPORAL_OVERLAP")
            evidence_items.append({
                "type": "TEMPORAL_OVERLAP",
                "delta_hours": round(diff_hours, 1),
                "temporal_tier": "CONCURRENT (<=48h)",
                "source_case_id": cid_a,
                "target_case_id": cid_b,
            })
        elif diff_hours <= 168.0:  # 7 days
            temp_pts = 0.10
            reason_codes.append("OPERATIONAL_WINDOW_CLOSE")
            relationship_types.append("TEMPORAL_OVERLAP")
            evidence_items.append({
                "type": "TEMPORAL_OVERLAP",
                "delta_hours": round(diff_hours, 1),
                "temporal_tier": "CLOSE (<=7d)",
                "source_case_id": cid_a,
                "target_case_id": cid_b,
            })
        elif diff_hours <= 720.0:  # 30 days
            temp_pts = 0.05
            reason_codes.append("OPERATIONAL_WINDOW_EXTENDED")

    temp_pts = min(0.15, temp_pts)

    # -------------------------------------------------------------------------
    # AGGREGATE STRUCTURAL SIMILARITY
    # -------------------------------------------------------------------------
    total_score = entity_pts + tx_pts + geo_pts + temp_pts
    # Safety clamp: if NO shared entities exist at all, maximum structural similarity is 0.20
    # to avoid false clusters based purely on generic state or fraud type.
    if len(shared_entities) == 0:
        total_score = min(0.20, total_score)

    total_score = round(min(1.0, max(0.0, total_score)), 3)

    if total_score >= SIMILARITY_THRESHOLD_STRONG:
        strength = "STRONG"
    elif total_score >= SIMILARITY_THRESHOLD_MODERATE:
        strength = "MODERATE"
    elif total_score >= SIMILARITY_THRESHOLD_EMERGING:
        strength = "EMERGING"
    else:
        strength = "WEAK"

    return {
        "structural_similarity": total_score,
        "relationship_strength": strength,
        "relationship_types": sorted(list(set(relationship_types))),
        "reason_codes": reason_codes,
        "evidence": evidence_items,
        "similarity_contributions": {
            "shared_entities": round(entity_pts, 3),
            "transaction_financial": round(tx_pts, 3),
            "geographic_overlap": round(geo_pts, 3),
            "temporal_overlap": round(temp_pts, 3),
        },
        "policy_version": SYNDICATE_DNA_POLICY_VERSION,
    }
