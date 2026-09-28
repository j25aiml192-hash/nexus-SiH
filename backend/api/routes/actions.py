"""
NEXUS Phase 5 - Action Policy API Routes
==========================================
Exposes action recommendation list, detail, approve, reject, and cancel.
Copilot endpoint at /autonomy/copilot/{complaint_id}/ask.

DESIGN:
- All consequential actions require explicit HTTP POST with action_id.
- Approval is NEVER inferred from GET, page load, or timeout.
- Copilot is strictly read-only.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()


# ---------------------------------------------------------------------------
# REQUEST MODELS
# ---------------------------------------------------------------------------

class ApproveActionRequest(BaseModel):
    approved_by: str
    notes: Optional[str] = None


class RejectActionRequest(BaseModel):
    rejected_by: str
    reason: Optional[str] = None


class CancelActionRequest(BaseModel):
    cancelled_by: str
    reason: Optional[str] = None


class CopilotAskRequest(BaseModel):
    question: str


class EvaluateActionRequest(BaseModel):
    complaint_id: str
    trigger_event_type: Optional[str] = None


# ---------------------------------------------------------------------------
# ACTION RECOMMENDATION ROUTES
# ---------------------------------------------------------------------------

@router.get("/")
@router.get("")
def list_actions(
    status: Optional[str] = Query(None, description="Filter: PROPOSED, PENDING_APPROVAL, APPROVED, COMPLETED, REJECTED, EXPIRED, CANCELLED, FAILED"),
    priority: Optional[str] = Query(None, description="Filter: CRITICAL, HIGH, MEDIUM, LOW"),
    action_type: Optional[str] = Query(None, description="Filter by action type e.g. REQUEST_FUND_FREEZE"),
    complaint_id: Optional[str] = Query(None, description="Filter by complaint UUID or NCRP ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    Returns paginated list of action recommendations.
    Ordered by priority (CRITICAL first) then created_at descending.
    """
    from core.autonomy.action_policy import action_policy_engine
    return action_policy_engine.get_action_list(
        status=status,
        priority=priority,
        action_type=action_type,
        complaint_id=complaint_id,
        limit=limit,
        offset=offset,
    )


@router.get("/{action_id}")
def get_action_detail(action_id: str):
    """Returns full action recommendation with case context and audit history."""
    from core.autonomy.action_policy import action_policy_engine
    detail = action_policy_engine.get_action_detail(action_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Action recommendation '{action_id}' not found.")
    return detail


@router.post("/{action_id}/approve")
def approve_action(action_id: str, req: ApproveActionRequest):
    """
    Explicit human approval gate for HUMAN_APPROVAL_REQUIRED actions.
    Requires: approved_by (investigator identifier).
    Approval is NEVER automatic — this explicit POST is the ONLY mechanism.
    """
    if not req.approved_by or not req.approved_by.strip():
        raise HTTPException(
            status_code=400,
            detail="approved_by is required. Approval must identify the authorizing investigator."
        )
    from core.autonomy.action_policy import action_policy_engine
    try:
        result = action_policy_engine.approve_action(
            action_id=action_id,
            approved_by=req.approved_by.strip(),
            notes=req.notes,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{action_id}/reject")
def reject_action(action_id: str, req: RejectActionRequest):
    """
    Explicit investigator rejection of an action recommendation.
    Requires: rejected_by (investigator identifier).
    """
    if not req.rejected_by or not req.rejected_by.strip():
        raise HTTPException(status_code=400, detail="rejected_by is required.")
    from core.autonomy.action_policy import action_policy_engine
    try:
        result = action_policy_engine.reject_action(
            action_id=action_id,
            rejected_by=req.rejected_by.strip(),
            reason=req.reason,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{action_id}/cancel")
def cancel_action(action_id: str, req: CancelActionRequest):
    """
    Cancels a non-terminal action recommendation.
    """
    if not req.cancelled_by or not req.cancelled_by.strip():
        raise HTTPException(status_code=400, detail="cancelled_by is required.")
    from core.autonomy.action_policy import action_policy_engine
    try:
        result = action_policy_engine.cancel_action(
            action_id=action_id,
            cancelled_by=req.cancelled_by.strip(),
            reason=req.reason,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate")
def evaluate_actions_for_complaint(req: EvaluateActionRequest):
    """
    Manually trigger action policy evaluation for a complaint.
    Used for testing and manual re-evaluation.
    """
    from core.autonomy.action_policy import action_policy_engine
    from db import repo
    comp = repo.get_complaint_by_id(req.complaint_id)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Complaint '{req.complaint_id}' not found.")
    trigger = {"event_type": req.trigger_event_type} if req.trigger_event_type else {}
    result = action_policy_engine.evaluate_and_persist(
        complaint_id=req.complaint_id,
        trigger_event=trigger,
    )
    return result
