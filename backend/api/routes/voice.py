import logging
from typing import Any, Optional
from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import JSONResponse

from core.pipeline import run_pipeline
from db import repo

logger = logging.getLogger("nexus.api.voice")
router = APIRouter()


def _normalize_amount(val: Any) -> Optional[float]:
    """
    Normalizes amount inputs like 45000, "45000", "45,000", "1,50,000" into float > 0.
    Returns None if null, empty, <= 0, or non-numeric.
    """
    if val is None:
        return None
    val_str = str(val).strip().replace(",", "")
    if not val_str:
        return None
    try:
        amt = float(val_str)
        # Check for positive number and not NaN / inf
        if amt > 0 and amt == amt and amt != float("inf"):
            return amt
        return None
    except (ValueError, TypeError):
        return None


def _run_prediction_background(complaint_id: str):
    """
    Asynchronous background worker to execute the prediction pipeline
    without delaying the voice response.
    """
    try:
        logger.info(f"[VOICE BACKGROUND] Starting async prediction pipeline for complaint: {complaint_id}")
        run_pipeline(complaint_id)
        logger.info(f"[VOICE BACKGROUND] Prediction completed for complaint: {complaint_id}")
    except Exception as e:
        logger.error(
            f"[VOICE BACKGROUND ERROR] Async prediction failed for complaint {complaint_id}: {type(e).__name__}: {str(e)}",
            exc_info=True,
        )


@router.get("/health")
def voice_health():
    """
    Lightweight health/liveness check for Exotel / Voicebot integrations.
    Zero external dependencies or DB calls.
    """
    return {"status": "ok"}


@router.post("/submit")
async def submit_voice_complaint(request: Request, background_tasks: BackgroundTasks):
    """
    Exotel Voicebot complaint intake endpoint.
    Accepts voice intake data, persists the complaint using the shared NEXUS repository,
    schedules prediction in the background, and returns immediately (< 2s).
    Always returns HTTP 200 with structured JSON success or failure.
    """
    try:
        try:
            body = await request.json()
            if not isinstance(body, dict):
                logger.warning("[VOICE SUBMIT] Request body is not a JSON object")
                return JSONResponse(
                    status_code=200,
                    content={"success": False, "error": "Complaint save nahi ho payi"},
                )
        except Exception as parse_err:
            logger.warning(f"[VOICE SUBMIT] Malformed JSON received: {parse_err}")
            return JSONResponse(
                status_code=200,
                content={"success": False, "error": "Complaint save nahi ho payi"},
            )

        # 1. Validate required fields: fraud_type, amount_inr, channel, victim_state
        raw_fraud_type = body.get("fraud_type")
        if not raw_fraud_type or not isinstance(raw_fraud_type, str) or not raw_fraud_type.strip():
            logger.warning("[VOICE SUBMIT VALIDATION] Missing or empty required field: fraud_type")
            return JSONResponse(
                status_code=200,
                content={"success": False, "error": "Complaint save nahi ho payi"},
            )
        fraud_type = raw_fraud_type.strip()

        raw_channel = body.get("channel")
        if not raw_channel or not isinstance(raw_channel, str) or not raw_channel.strip():
            logger.warning("[VOICE SUBMIT VALIDATION] Missing or empty required field: channel")
            return JSONResponse(
                status_code=200,
                content={"success": False, "error": "Complaint save nahi ho payi"},
            )
        channel = raw_channel.strip()

        raw_state = body.get("victim_state")
        if not raw_state or not isinstance(raw_state, str) or not raw_state.strip():
            logger.warning("[VOICE SUBMIT VALIDATION] Missing or empty required field: victim_state")
            return JSONResponse(
                status_code=200,
                content={"success": False, "error": "Complaint save nahi ho payi"},
            )
        victim_state = raw_state.strip()

        amount_inr = _normalize_amount(body.get("amount_inr"))
        if amount_inr is None:
            logger.warning(f"[VOICE SUBMIT VALIDATION] Invalid amount_inr value: {body.get('amount_inr')}")
            return JSONResponse(
                status_code=200,
                content={"success": False, "error": "Complaint save nahi ho payi"},
            )

        # 2. Extract optional fields with safe defaults
        victim_district = body.get("victim_district")
        if victim_district is None:
            victim_district = "Unknown"
        else:
            victim_district = str(victim_district).strip()

        accused_phone = str(body.get("accused_phone") or "").strip()
        accused_bank = str(body.get("accused_bank") or "").strip()
        ncrp_id = str(body.get("ncrp_id") or "").strip()
        status = str(body.get("status") or "active").strip() or "active"

        mule_chain_depth = 1
        raw_depth = body.get("mule_chain_depth")
        if raw_depth not in (None, ""):
            try:
                mule_chain_depth = int(raw_depth)
            except (ValueError, TypeError):
                mule_chain_depth = 1

        logger.info(
            f"[VOICE SUBMIT] Processing voice complaint intake: fraud_type={fraud_type}, "
            f"amount_inr={amount_inr}, channel={channel}, state={victim_state}, district={victim_district}"
        )

        # 3. Build complaint record and persist using shared NEXUS repository
        complaint_data = {
            "fraud_type": fraud_type,
            "amount_inr": amount_inr,
            "amount": amount_inr,
            "channel": channel,
            "victim_state": victim_state,
            "victim_district": victim_district,
            "accused_phone": accused_phone,
            "accused_bank": accused_bank,
            "ncrp_id": ncrp_id if ncrp_id else None,
            "status": status,
            "mule_chain_depth": mule_chain_depth,
        }

        created = repo.create_complaint(complaint_data)
        if not created or not created.get("complaint_id"):
            logger.error("[VOICE SUBMIT] create_complaint failed to return a valid complaint record")
            return JSONResponse(
                status_code=200,
                content={"success": False, "error": "Complaint save nahi ho payi"},
            )

        cid = str(created["complaint_id"])
        # Reference derived from first 6 characters of actual UUID uppercased
        reference = f"NCRP-{cid[:6].upper()}"

        logger.info(f"[VOICE SUBMIT SUCCESS] Complaint persisted with UUID: {cid}, reference: {reference}")

        # 4. Schedule background prediction task (non-blocking)
        background_tasks.add_task(_run_prediction_background, cid)
        logger.info(f"[VOICE SUBMIT] Background prediction task scheduled for complaint UUID: {cid}")

        # 5. Return success response immediately
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "complaint_id": cid,
                "complaint_reference": reference,
            },
        )

    except Exception as e:
        logger.error(f"[VOICE SUBMIT UNHANDLED ERROR]: {type(e).__name__}: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=200,
            content={"success": False, "error": "Complaint save nahi ho payi"},
        )
