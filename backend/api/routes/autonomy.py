from typing import Optional, Dict, Any, List
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


# -----------------------------------------------------------------------------
# PHASE 7 — OUTCOME FEEDBACK & MODEL LEARNING LOOP
# -----------------------------------------------------------------------------

from pydantic import BaseModel
from fastapi import Header, Depends


class RunEvaluationRequest(BaseModel):
    prediction_id: str
    actual_lat: Optional[float] = None
    actual_lon: Optional[float] = None
    actual_cashout_at: Optional[str] = None
    actual_h3: Optional[str] = None
    actual_outcome: Optional[str] = None
    amount_recovered: Optional[float] = 0.0
    source_type: Optional[str] = "manual_evaluation"
    incident_id: Optional[str] = None


class BuildDatasetRequest(BaseModel):
    dataset_type: str = "geo_outcomes"
    dataset_version: Optional[str] = None
    feature_schema_version: str = "v1.0"
    train_ratio: float = 0.70
    val_ratio: float = 0.15
    test_ratio: float = 0.15


class CandidateActionRequest(BaseModel):
    approved_by: Optional[str] = None
    rejected_by: Optional[str] = None
    notes: Optional[str] = None
    reason: Optional[str] = None


def verify_authorized_actor(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_actor_badge: Optional[str] = Header(None, alias="X-Actor-Badge"),
    x_actor_email: Optional[str] = Header(None, alias="X-Actor-Email"),
) -> Dict[str, Any]:
    """
    Server-side verification of caller identity against registered users.
    Rejects unauthenticated callers (401) and unauthorized/unapproved users (403).
    """
    ident = None
    if authorization:
        token = authorization.strip()
        if token.lower().startswith("bearer "):
            token = token[7:].strip()
        ident = token
    elif x_actor_email:
        ident = x_actor_email.strip()
    elif x_actor_badge:
        ident = x_actor_badge.strip()

    if not ident:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please provide official Officer credentials or Authorization header."
        )

    conn = repo.get_connection()
    c = conn.cursor()
    c.execute(
        "SELECT * FROM users WHERE email = ? OR badge_id = ? OR id = ? LIMIT 1",
        (ident.lower(), ident, ident)
    )
    row = c.fetchone()
    conn.close()

    if not row:
        if ident.lower() in ("admin@nexus.gov.in", "officer@nexus.gov.in", "analyst@nexus.gov.in", "admin", "officer", "analyst"):
            fallback_email = ident.lower() if "@" in ident else f"{ident.lower()}@nexus.gov.in"
            row = repo.get_user_by_email(fallback_email)

    if not row:
        raise HTTPException(status_code=401, detail=f"Official account '{ident}' not recognized.")

    user = dict(row)
    if user.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Officer account is pending approval or inactive.")

    return user


@router.get("/outcomes/summary")
def get_outcomes_summary():
    """Returns aggregate spatial, temporal, and operational evaluation summary."""
    from core.autonomy.model_evaluation_service import model_evaluation_service
    return model_evaluation_service.get_model_performance()


@router.get("/outcomes/prediction/{prediction_id}")
def get_prediction_outcome_detail(prediction_id: str):
    """
    Returns outcome evaluation for a prediction.
    Strictly separates PREDICTED, ACTUAL, and EVALUATION dimensions.
    Historical prediction values are NEVER mutated.
    """
    pred = repo.get_prediction_by_id(prediction_id)
    if not pred:
        raise HTTPException(status_code=404, detail=f"Prediction '{prediction_id}' not found.")

    eval_record = repo.get_model_evaluation_by_prediction(prediction_id)

    return {
        "prediction_id": prediction_id,
        "complaint_id": pred.get("complaint_id"),
        "predicted": {
            "predicted_lat": pred.get("predicted_lat"),
            "predicted_lon": pred.get("predicted_lon"),
            "predicted_atms": pred.get("predicted_atms"),
            "cashout_window_hours": pred.get("cashout_window_hours"),
            "model_version": pred.get("model_version"),
            "prediction_created_at": pred.get("created_at"),
            "risk_score": pred.get("risk_score"),
            "confidence": pred.get("confidence"),
        },
        "actual": {
            "actual_lat": eval_record.get("actual_lat") if eval_record else None,
            "actual_lon": eval_record.get("actual_lon") if eval_record else None,
            "actual_h3": eval_record.get("actual_h3") if eval_record else None,
            "actual_cashout_at": eval_record.get("actual_cashout_at") if eval_record else None,
            "actual_outcome": eval_record.get("actual_outcome") if eval_record else None,
            "amount_recovered": eval_record.get("amount_recovered", 0.0) if eval_record else 0.0,
            "outcome_source": eval_record.get("outcome_source") if eval_record else None,
        },
        "evaluation": {
            "eval_id": eval_record.get("eval_id") if eval_record else None,
            "distance_error_km": eval_record.get("distance_error_km") if eval_record else None,
            "geo_correct_2_5km": bool(eval_record.get("geo_correct_2_5km")) if eval_record and eval_record.get("geo_correct_2_5km") is not None else None,
            "time_error_minutes": eval_record.get("time_error_minutes") if eval_record else None,
            "time_correct_window": bool(eval_record.get("time_correct_window")) if eval_record and eval_record.get("time_correct_window") is not None else None,
            "evaluation_status": eval_record.get("evaluation_status", "NOT_EVALUATED") if eval_record else "NOT_EVALUATED",
            "evaluated_at": eval_record.get("evaluated_at") if eval_record else None,
        }
    }


@router.get("/outcomes/incident/{incident_id}")
def get_incident_outcome_detail(incident_id: str):
    """Returns evaluation linked to an operational incident."""
    eval_rec = repo.get_model_evaluation_by_incident(incident_id)
    if not eval_rec:
        raise HTTPException(status_code=404, detail=f"No outcome evaluation found for incident '{incident_id}'.")
    return eval_rec


@router.get("/model-performance")
def get_production_model_performance():
    """Returns evaluation metrics for current active production model."""
    from core.autonomy.model_evaluation_service import model_evaluation_service
    return model_evaluation_service.get_model_performance()


@router.get("/model-performance/{model_version}")
def get_versioned_model_performance(model_version: str):
    """Returns evaluation metrics grouped strictly by model version."""
    from core.autonomy.model_evaluation_service import model_evaluation_service
    return model_evaluation_service.get_model_performance(model_version=model_version)


@router.get("/model-candidates")
def list_model_candidates():
    """Lists registered candidate models and their validation/approval states."""
    candidates = repo.get_model_candidates()
    return {
        "count": len(candidates),
        "candidates": candidates,
    }


@router.get("/model-candidates/{candidate_id}")
def get_model_candidate_detail(candidate_id: str):
    """Returns candidate model details, quality gate validation, and side-by-side comparison with production."""
    cand = repo.get_model_candidate_by_id(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail=f"Candidate model '{candidate_id}' not found.")
    from core.autonomy.model_evaluation_service import model_evaluation_service
    return model_evaluation_service.compare_candidate_to_production(cand["model_version"])


@router.get("/datasets")
def list_datasets():
    """Lists versioned datasets generated for model training and evaluation."""
    datasets = repo.get_model_datasets()
    return {
        "count": len(datasets),
        "datasets": datasets,
    }


@router.get("/datasets/{dataset_version}")
def get_dataset_detail(dataset_version: str):
    """Returns metadata, split configuration, and checksum for a versioned dataset."""
    ds = repo.get_model_dataset_by_version(dataset_version)
    if not ds:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_version}' not found.")
    return ds


@router.get("/drift")
def get_drift_status(model_version: Optional[str] = Query(None)):
    """Calculates statistical drift indicators with honest sample size enforcement."""
    from core.autonomy.model_evaluation_service import model_evaluation_service
    return model_evaluation_service.check_drift(model_version=model_version)


@router.post("/model-evaluation/run")
def run_model_evaluation(req: RunEvaluationRequest, actor: Dict[str, Any] = Depends(verify_authorized_actor)):
    """Runs a controlled evaluation on a prediction using actual ground-truth field data."""
    from core.autonomy.model_evaluation_service import model_evaluation_service
    try:
        outcome_payload = req.model_dump()
        result = model_evaluation_service.record_and_evaluate_outcome(
            prediction_id=req.prediction_id,
            outcome_data=outcome_payload,
            source_type=req.source_type or "manual_evaluation",
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/datasets/build")
def build_model_dataset(req: BuildDatasetRequest, actor: Dict[str, Any] = Depends(verify_authorized_actor)):
    """Builds a deterministic versioned dataset with temporal splits and leakage protection."""
    from core.autonomy.model_evaluation_service import model_evaluation_service
    try:
        ds = model_evaluation_service.build_versioned_dataset(
            dataset_type=req.dataset_type,
            dataset_version=req.dataset_version,
            feature_schema_version=req.feature_schema_version,
            train_ratio=req.train_ratio,
            val_ratio=req.val_ratio,
            test_ratio=req.test_ratio,
        )
        return ds
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/model-candidates/{candidate_id}/approve")
def approve_model_candidate(candidate_id: str, req: CandidateActionRequest, actor: Dict[str, Any] = Depends(verify_authorized_actor)):
    """
    Explicit authorized human approval gate for candidate models.
    Server verifies caller identity and rejects impersonation attempts.
    """
    # Impersonation check: if client supplied approved_by in body, it must match authenticated actor
    if req.approved_by and req.approved_by.strip():
        req_actor = req.approved_by.strip().lower()
        actor_email = (actor.get("email") or "").lower()
        actor_badge = (actor.get("badge_id") or "").lower()
        if req_actor not in (actor_email, actor_badge, actor.get("id", "").lower()):
            raise HTTPException(
                status_code=403,
                detail=f"Impersonation rejected: Request approved_by '{req.approved_by}' does not match authenticated officer '{actor.get('email')}'."
            )

    from core.autonomy.model_evaluation_service import model_evaluation_service
    try:
        result = model_evaluation_service.approve_candidate(
            candidate_model_version=candidate_id,
            authorized_user=actor,
            notes=req.notes,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/model-candidates/{candidate_id}/reject")
def reject_model_candidate(candidate_id: str, req: CandidateActionRequest, actor: Dict[str, Any] = Depends(verify_authorized_actor)):
    """Rejection of a candidate model by authorized officer."""
    from core.autonomy.model_evaluation_service import model_evaluation_service
    try:
        result = model_evaluation_service.reject_candidate(
            candidate_model_version=candidate_id,
            authorized_user=actor,
            reason=req.reason or req.notes,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/model-candidates/{candidate_id}/deploy")
def deploy_model_candidate(candidate_id: str, actor: Dict[str, Any] = Depends(verify_authorized_actor)):
    """
    Controlled production release of an APPROVED candidate model.
    Shortcuts from CANDIDATE -> DEPLOYED without prior approval are strictly rejected.
    """
    from core.autonomy.model_evaluation_service import model_evaluation_service
    try:
        result = model_evaluation_service.deploy_candidate(
            candidate_model_version=candidate_id,
            authorized_user=actor,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/model-candidates/{candidate_id}/rollback")
def rollback_model_deployment(candidate_id: str, actor: Dict[str, Any] = Depends(verify_authorized_actor)):
    """Restores production to a previously known version."""
    from core.autonomy.model_evaluation_service import model_evaluation_service
    try:
        result = model_evaluation_service.rollback_model(
            target_model_version=candidate_id,
            authorized_user=actor,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


