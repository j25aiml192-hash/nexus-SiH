from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from core.autonomy.case_watcher import get_autonomy_status
from core.autonomy.attention_engine import attention_engine
from db import repo

router = APIRouter()


@router.get("/status")
def get_status():
    """Returns real-time telemetry and heartbeat of the autonomous case watcher."""
    return get_autonomy_status()


@router.get("/attention")
def get_attention_queue(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    level: Optional[str] = Query(None, description="Filter by attention level: CRITICAL, HIGH, MEDIUM, LOW"),
    fraud_type: Optional[str] = Query(None, description="Filter by fraud type"),
    state: Optional[str] = Query(None, description="Filter by victim state"),
):
    """
    Returns prioritized operational work queue ordered by attention_score descending.
    Enables investigators to immediately see which active cases require attention and why.
    """
    return attention_engine.get_attention_queue(
        limit=limit,
        offset=offset,
        attention_level=level,
        fraud_type=fraud_type,
        victim_state=state,
    )


@router.get("/attention/{complaint_id}")
def get_case_attention(complaint_id: str):
    """
    Returns the current operational attention state, machine-readable reason codes,
    and structured decision factor contributions for a specific case.
    """
    state = repo.get_case_attention_state(complaint_id)
    if state:
        return state

    # If not yet evaluated, verify complaint exists and evaluate on demand
    comp = repo.get_complaint_by_id(complaint_id)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found")

    return attention_engine.evaluate_case_attention(complaint_id)


# -----------------------------------------------------------------------------
# SYNDICATE DNA / CROSS-CASE INTELLIGENCE ENDPOINTS (PHASE 3A)
# -----------------------------------------------------------------------------

@router.get("/syndicates")
def list_potential_syndicates(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    cluster_type: Optional[str] = Query(None, description="Filter by cluster type: POTENTIAL_SHARED_INFRASTRUCTURE, STRUCTURAL_SIMILARITY, GEOGRAPHIC_CORRIDOR"),
    status: Optional[str] = Query(None, description="Filter by status: candidate, under_review, dismissed"),
):
    """
    Returns paginated list of Potential Shared Operational Networks (inferred clusters).
    NOTE: These are analytical clusters and strictly distinct from authoritative syndicates.
    """
    from core.autonomy.syndicate_dna_engine import syndicate_dna_engine
    return syndicate_dna_engine.get_clusters_list(
        limit=limit,
        offset=offset,
        cluster_type=cluster_type,
        status=status,
    )


@router.get("/syndicates/case/{complaint_id}/expand")
def expand_case_syndicate_network(
    complaint_id: str,
    depth: int = Query(1, ge=1, le=2, description="Bounded expansion depth (1 or 2)"),
    max_nodes: int = Query(50, ge=5, le=100, description="Max nodes to return"),
):
    """
    Returns a bounded structural subgraph (depth 1 or 2) linking the target case
    to shared entities and connected cases for visual intelligence.
    """
    from core.autonomy.syndicate_dna_engine import syndicate_dna_engine
    comp = repo.get_complaint_by_id(complaint_id)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found")

    return syndicate_dna_engine.expand_case_network(
        complaint_id=complaint_id,
        depth=depth,
        max_nodes=max_nodes,
    )


@router.get("/syndicates/case/{complaint_id}")
def get_case_syndicates(complaint_id: str):
    """
    Returns Potential Shared Operational Network clusters and direct structural
    relationships for a given case.
    """
    from core.autonomy.syndicate_dna_engine import syndicate_dna_engine
    comp = repo.get_complaint_by_id(complaint_id)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found")

    return syndicate_dna_engine.get_case_syndicates(complaint_id)


@router.get("/syndicates/{cluster_id}")
def get_syndicate_cluster_details(cluster_id: str):
    """
    Returns detailed summary, complaint members, entity members, and relationship
    evidence for a specific Potential Shared Operational Network cluster.
    """
    from core.autonomy.syndicate_dna_engine import syndicate_dna_engine
    cluster = syndicate_dna_engine.get_cluster_details(cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail=f"Potential network cluster '{cluster_id}' not found")

    return cluster


# -----------------------------------------------------------------------------
# EVIDENCE INTELLIGENCE / TRUTH GRAPH ENDPOINTS (PHASE 4A)
# -----------------------------------------------------------------------------

@router.get("/evidence/cases")
def list_evidence_cases(limit: int = Query(50, ge=1, le=100)):
    """
    Returns list of complaints with active Truth Graph evidence.
    Populates case selector and search on /evidence workspace.
    """
    from core.autonomy.evidence_service import evidence_service
    return evidence_service.get_evidence_cases_list(limit=limit)


@router.get("/evidence/case/{complaint_id}")
def get_case_evidence(
    complaint_id: str,
    depth: int = Query(1, ge=1, le=2, description="Evidence graph expansion depth"),
    max_nodes: int = Query(60, ge=5, le=100, description="Max graph nodes"),
):
    """
    Returns the unified Evidence Graph, semantic-level breakdown, and deterministic
    consistency analysis for a given complaint.
    """
    from core.autonomy.evidence_service import evidence_service
    return evidence_service.get_case_evidence_graph(
        complaint_id=complaint_id,
        depth=depth,
        max_nodes=max_nodes,
    )


@router.get("/evidence/case/{complaint_id}/timeline")
def get_case_evidence_timeline(complaint_id: str):
    """
    Returns chronological timeline of evidence events, observations, and derived states.
    """
    from core.autonomy.evidence_service import evidence_service
    return {
        "complaint_id": complaint_id,
        "timeline": evidence_service.get_case_evidence_timeline(complaint_id),
    }


@router.get("/evidence/relation/{relation_id}")
def get_evidence_relation_details(relation_id: str):
    """
    Returns full provenance trace and entity links for a specific evidence relationship.
    """
    from core.autonomy.evidence_service import evidence_service
    rel = evidence_service.get_relation_provenance(relation_id)
    if not rel:
        raise HTTPException(status_code=404, detail=f"Evidence relation '{relation_id}' not found")
    return rel


@router.get("/evidence/entity/{entity_id}")
def get_evidence_entity_details(entity_id: str):
    """
    Returns entity details and cross-case linkages for a specific Truth Graph entity.
    """
    ent = repo.get_truth_entity_by_id(entity_id)
    if not ent:
        raise HTTPException(status_code=404, detail=f"Evidence entity '{entity_id}' not found")
    cross = repo.get_entity_cross_case_links(entity_id)
    return {
        "entity": ent,
        "cross_case_links": cross,
    }

# -----------------------------------------------------------------------------
# INVESTIGATOR COPILOT (PHASE 5)
# -----------------------------------------------------------------------------

@router.get("/copilot/{complaint_id}")
def copilot_case_summary(complaint_id: str):
    """
    Returns a grounded case summary via the Investigator Copilot.
    All facts are derived from structured NEXUS records. Read-only.
    """
    from core.autonomy.investigator_copilot import investigator_copilot
    return investigator_copilot.case_summary(complaint_id)


@router.post("/copilot/{complaint_id}/ask")
def copilot_ask(complaint_id: str, body: dict):
    """
    Answer an investigator question about a specific complaint.
    Grounded in NEXUS data. Copilot is strictly read-only.
    Body: { "question": "..." }
    """
    from core.autonomy.investigator_copilot import investigator_copilot
    question = (body or {}).get("question", "summary")
    return investigator_copilot.answer(complaint_id, question)


@router.post("/copilot/{complaint_id}/evidence")
def copilot_evidence(complaint_id: str):
    """Returns grounded evidence graph explanation for a case."""
    from core.autonomy.investigator_copilot import investigator_copilot
    return investigator_copilot.explain_evidence(complaint_id)


@router.post("/copilot/{complaint_id}/attention")
def copilot_attention(complaint_id: str):
    """Returns grounded attention explanation for a case."""
    from core.autonomy.investigator_copilot import investigator_copilot
    return investigator_copilot.explain_attention(complaint_id)


@router.get("/copilot/{complaint_id}/actions")
def copilot_actions(complaint_id: str):
    """Returns current action recommendations explanation from the copilot."""
    from core.autonomy.investigator_copilot import investigator_copilot
    return investigator_copilot.current_actions(complaint_id)


# -----------------------------------------------------------------------------
# VICTIM PROACTIVE ADVISORY (PHASE 6)
# -----------------------------------------------------------------------------

@router.get("/advisories/case/{complaint_id}")
def get_case_victim_advisory(complaint_id: str):
    """
    Returns the current active deterministic proactive advisory for a complaint.
    Evaluates on demand if an advisory has not yet been computed for the case.
    """
    comp = repo.get_complaint_by_id(complaint_id)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found")

    adv = repo.get_current_victim_advisory(complaint_id)
    if not adv:
        from core.autonomy.victim_advisory_policy import victim_advisory_engine
        eval_res = victim_advisory_engine.evaluate_and_persist(complaint_id)
        if eval_res.get("status") in ("created", "unchanged"):
            adv = eval_res.get("advisory") or repo.get_current_victim_advisory(complaint_id)

    if not adv:
        raise HTTPException(status_code=404, detail=f"No advisory available for complaint '{complaint_id}'")

    return adv


@router.get("/advisories/case/{complaint_id}/history")
def get_case_advisory_history(complaint_id: str, limit: int = Query(50, ge=1, le=100)):
    """
    Returns historical advisory versions for audit and compliance.
    """
    comp = repo.get_complaint_by_id(complaint_id)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found")

    history = repo.get_victim_advisory_history(complaint_id, limit=limit)
    return {
        "complaint_id": complaint_id,
        "count": len(history),
        "advisories": history,
    }


@router.post("/advisories/case/{complaint_id}/refresh")
def refresh_case_victim_advisory(complaint_id: str):
    """
    Forces re-evaluation of the deterministic advisory policy against updated case context.
    Previous advisory is superseded and preserved in history.
    """
    comp = repo.get_complaint_by_id(complaint_id)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found")

    from core.autonomy.victim_advisory_policy import victim_advisory_engine
    eval_res = victim_advisory_engine.evaluate_and_persist(complaint_id, force_refresh=True)
    if eval_res.get("status") == "error":
        raise HTTPException(status_code=500, detail=eval_res.get("error", "Failed to refresh advisory"))

    adv = eval_res.get("advisory") or repo.get_current_victim_advisory(complaint_id)
    return adv

