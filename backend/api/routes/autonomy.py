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


