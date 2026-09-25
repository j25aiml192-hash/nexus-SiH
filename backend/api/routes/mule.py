from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db import repo

router = APIRouter()


class MuleCreate(BaseModel):
    complaint_id: str
    node_index: int
    account_hash: Optional[str] = None
    bank: Optional[str] = None
    state: Optional[str] = None
    transaction_velocity: int = 0
    is_flagged: bool = False
    kyc_lat: Optional[float] = None
    kyc_lng: Optional[float] = None


class MuleFlagRequest(BaseModel):
    account_id: str
    reason: Optional[str] = "High risk velocity detected"


@router.post("/flag")
def flag_mule_account(req: MuleFlagRequest):
    conn = repo.get_connection()
    c = conn.cursor()
    c.execute("UPDATE mule_accounts SET risk_score = 0.99 WHERE account_id = ?", (req.account_id,))
    conn.commit()
    conn.close()
    return {
        "status": "flagged",
        "account_id": req.account_id,
        "new_risk_score": 0.99,
        "message": f"Entity {req.account_id} has been flagged across inter-bank networks."
    }


@router.get("/{complaint_id}")
def get_mules(complaint_id: str):
    complaint = repo.get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(
            status_code=404,
            detail=f"Complaint '{complaint_id}' not found"
        )

    chain = repo.get_mule_chain(complaint_id)
    mules = chain.get("mule_nodes", [])

    # Format mule nodes to match frontend Cytoscape expectations
    formatted_nodes = []
    for idx, m in enumerate(mules):
        formatted_nodes.append({
            "id": m.get("account_id"),
            "account_id": m.get("account_id"),
            "bank_name": m.get("bank_name"),
            "bank": m.get("bank_name"),
            "risk_score": m.get("risk_score", 0.75),
            "hop_position": m.get("hop_position", idx + 1),
            "parent_account_id": m.get("parent_account_id"),
            "kyc_lat": m.get("kyc_lat"),
            "kyc_lng": m.get("kyc_lon") or m.get("kyc_lng"),
            "kyc_lon": m.get("kyc_lon"),
            "transaction_velocity": m.get("transaction_velocity", 4)
        })

    # Build edges from hop sequence
    edges = []
    prev_id = f"VICTIM-{complaint_id}"
    for idx, m in enumerate(formatted_nodes):
        target_id = m.get("account_id")
        edges.append({
            "id": f"edge-{prev_id}-{target_id}",
            "source": prev_id,
            "target": target_id,
            "hop": m.get("hop_position", idx + 1)
        })
        prev_id = target_id

    return {
        "complaint_id": complaint_id,
        "complaint": complaint,
        "mule_nodes": formatted_nodes,
        "nodes": formatted_nodes,
        "edges": edges,
        "transactions": chain.get("transactions", [])
    }


@router.get("/details/{complaint_id}")
def get_mule_complaint_full_details(complaint_id: str):
    return get_mules(complaint_id)