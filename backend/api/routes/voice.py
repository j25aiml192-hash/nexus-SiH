import json
import logging
import re
from typing import Any, Dict, Optional
from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import JSONResponse

from core.pipeline import run_pipeline
from db import repo

logger = logging.getLogger("nexus.api.voice")
router = APIRouter()

SENSITIVE_HEADERS = {
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "apikey",
    "proxy-authorization",
}

USABLE_KEYS = {
    "fraud_type", "type", "incident_type", "crime_type",
    "amount_inr", "amount", "disputed_amount", "loss_amount",
    "channel", "payment_channel", "intake_channel", "mode",
    "victim_state", "state",
    "victim_district", "district",
    "accused_phone", "phone", "mobile", "suspect_phone", "accused_mobile",
    "accused_bank", "bank", "suspect_bank",
    "ncrp_id", "ncrp", "complaint_number", "ticket_id",
    "status",
    "mule_chain_depth", "depth", "chain_depth",
}

FIELD_ALIASES = {
    "fraud_type": ["fraud_type", "type", "incident_type", "crime_type"],
    "amount_inr": ["amount_inr", "amount", "disputed_amount", "loss_amount"],
    "channel": ["channel", "payment_channel", "intake_channel", "mode"],
    "victim_state": ["victim_state", "state"],
    "victim_district": ["victim_district", "district"],
    "accused_phone": ["accused_phone", "phone", "mobile", "suspect_phone", "accused_mobile"],
    "accused_bank": ["accused_bank", "bank", "suspect_bank"],
    "ncrp_id": ["ncrp_id", "ncrp", "complaint_number", "ticket_id"],
    "status": ["status"],
    "mule_chain_depth": ["mule_chain_depth", "depth", "chain_depth"],
}


def mask_phone_or_account(val: str) -> str:
    """Masks phone or account numbers showing only the last 4 digits (e.g., ******3210)."""
    if not val:
        return ""
    digits = re.sub(r"\D", "", val)
    if len(digits) >= 6:
        masked = "*" * (len(digits) - 4) + digits[-4:]
        if val.startswith("+"):
            return "+" + masked
        return masked
    elif len(val) > 4:
        return "*" * (len(val) - 4) + val[-4:]
    return "****"


def sanitize_text(text: str) -> str:
    """Masks potential phone numbers, long digits, and sensitive tokens in raw text preview."""
    if not text:
        return ""
    # Mask 7 to 16 digit numbers (phones, accounts)
    def _mask_match(match):
        num = match.group(0)
        return "*" * (len(num) - 4) + num[-4:]

    sanitized = re.sub(r"\b\d{7,16}\b", _mask_match, text)
    sanitized = re.sub(
        r"(token|secret|key|password|auth|authorization)=([^&\s]+)",
        r"\1=******",
        sanitized,
        flags=re.IGNORECASE,
    )
    return sanitized


def sanitize_dict(d: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively or shallowly sanitizes dictionary values for safe logging/inspection."""
    sanitized = {}
    for k, v in d.items():
        k_str = str(k)
        v_str = str(v)
        k_lower = k_str.lower()
        if any(sens in k_lower for sens in ["phone", "mobile", "contact", "accused_phone"]):
            sanitized[k_str] = mask_phone_or_account(v_str)
        elif any(sens in k_lower for sens in ["account", "acc_no", "acct", "card", "pan", "aadhar", "upi", "utr", "txn", "transaction"]):
            sanitized[k_str] = mask_phone_or_account(v_str)
        elif any(sens in k_lower for sens in ["token", "secret", "password", "key", "auth", "credential", "bearer"]):
            sanitized[k_str] = "******"
        else:
            sanitized[k_str] = sanitize_text(v_str)
    return sanitized


def sanitize_headers(headers: Any) -> Dict[str, str]:
    """Sanitizes HTTP request headers removing authorization, tokens, and cookies."""
    clean = {}
    for k, v in headers.items():
        k_lower = k.lower()
        if k_lower in SENSITIVE_HEADERS or any(s in k_lower for s in ["auth", "cookie", "key", "secret"]):
            clean[k] = "******"
        else:
            clean[k] = str(v)
    return clean


def has_usable_fields(data: Any) -> bool:
    """Checks if a dictionary-like object contains any known complaint field names."""
    if not isinstance(data, dict):
        return False
    return any(str(k).strip().lower() in USABLE_KEYS for k in data.keys())


def normalize_payload(raw_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Maps parameter aliases into the canonical NEXUS complaint field names."""
    normalized = {}
    cleaned_input = {str(k).strip().lower(): v for k, v in raw_dict.items()}

    for target_field, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            if alias in cleaned_input:
                normalized[target_field] = cleaned_input[alias]
                break
            elif alias in raw_dict:
                normalized[target_field] = raw_dict[alias]
                break
    return normalized


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


@router.api_route("/debug", methods=["GET", "POST"])
async def voice_debug(request: Request):
    """
    Development/debugging endpoint to inspect incoming Exotel request structure.
    Returns sanitized representation without exposing credentials or unmasked phones.
    """
    try:
        raw_bytes = await request.body()
        raw_text = raw_bytes.decode("utf-8", errors="replace")
        body_preview = sanitize_text(raw_text[:500])

        content_type = request.headers.get("content-type", "")
        headers = sanitize_headers(dict(request.headers))
        query_params = sanitize_dict(dict(request.query_params))

        form_data = {}
        try:
            form_obj = await request.form()
            if form_obj:
                extracted = {}
                for k, v in form_obj.items():
                    if hasattr(v, "read"):
                        try:
                            content_bytes = await v.read()
                            extracted[str(k)] = content_bytes.decode("utf-8", errors="replace").strip()
                        except Exception:
                            extracted[str(k)] = str(v)
                    else:
                        extracted[str(k)] = str(v)
                form_data = sanitize_dict(extracted)
        except Exception:
            form_data = {}

        if not form_data and raw_text.strip() and "=" in raw_text:
            try:
                from urllib.parse import parse_qs
                parsed_qs = {k: v[0] if len(v) == 1 else v for k, v in parse_qs(raw_text).items()}
                form_data = sanitize_dict(parsed_qs)
            except Exception:
                pass

        return JSONResponse(
            status_code=200,
            content={
                "method": request.method,
                "content_type": content_type,
                "headers": headers,
                "body": body_preview,
                "query_params": query_params,
                "form_data": form_data,
            },
        )
    except Exception as e:
        logger.error(f"[VOICE DEBUG ERROR]: {e}", exc_info=True)
        return JSONResponse(
            status_code=200,
            content={
                "method": request.method,
                "error": "Failed to inspect request",
            },
        )


@router.post("/submit")
async def submit_voice_complaint(request: Request, background_tasks: BackgroundTasks):
    """
    Exotel Voicebot complaint intake endpoint.
    Supports JSON, form-data (urlencoded & multipart), and query parameters.
    Persists the complaint using shared NEXUS repository logic, schedules
    background prediction, and returns immediately (< 2s).
    Always returns HTTP 200.
    """
    try:
        # Step 1: Capture raw request body and parameters
        raw_bytes = await request.body()
        raw_text = raw_bytes.decode("utf-8", errors="replace")
        content_type = request.headers.get("content-type", "")
        body_preview = sanitize_text(raw_text[:500])
        raw_query = dict(request.query_params)

        # Step 2: Fallback parsing order: JSON -> FORM DATA -> QUERY PARAMETERS
        parser_used: Optional[str] = None
        raw_payload: Optional[Dict[str, Any]] = None

        # 2A: Try JSON first
        if raw_text.strip():
            try:
                parsed_json = json.loads(raw_text)
                if isinstance(parsed_json, dict) and has_usable_fields(parsed_json):
                    raw_payload = parsed_json
                    parser_used = "json"
            except Exception:
                raw_payload = None

        # 2B: Try Form data (application/x-www-form-urlencoded & multipart/form-data)
        raw_form: Dict[str, str] = {}
        try:
            form_obj = await request.form()
            if form_obj:
                for k, v in form_obj.items():
                    if hasattr(v, "read"):
                        try:
                            content_bytes = await v.read()
                            raw_form[str(k)] = content_bytes.decode("utf-8", errors="replace").strip()
                        except Exception:
                            raw_form[str(k)] = str(v)
                    else:
                        raw_form[str(k)] = str(v)
                if parser_used is None and has_usable_fields(raw_form):
                    raw_payload = raw_form
                    parser_used = "form"
        except Exception:
            raw_form = {}

        # 2B.1: Fallback for urlencoded string if form_obj was empty but raw body has key=value pairs
        if parser_used is None and raw_text.strip() and "=" in raw_text:
            try:
                from urllib.parse import parse_qs
                parsed_qs = {k: v[0] if len(v) == 1 else v for k, v in parse_qs(raw_text).items()}
                if has_usable_fields(parsed_qs):
                    raw_payload = parsed_qs
                    parser_used = "form"
                    if not raw_form:
                        raw_form = parsed_qs
            except Exception:
                pass

        # 2C: Try Query Parameters
        if parser_used is None and raw_query and has_usable_fields(raw_query):
            raw_payload = raw_query
            parser_used = "query"

        # Step 3: Structured, safe logging of request inspection
        logger.info(
            f"[VOICE DEBUG] content_type={content_type} parser={parser_used or 'none'} "
            f"body_preview={body_preview} query_params={sanitize_dict(raw_query)} "
            f"form_fields={list(raw_form.keys())}"
        )

        # Step 4: If all parsing methods fail and there are no usable fields, return parse failure
        if raw_payload is None:
            logger.warning("[VOICE SUBMIT] All parsing methods failed; no usable complaint fields found")
            return JSONResponse(
                status_code=200,
                content={"success": False, "error": "Could not parse request"},
            )

        # Step 5: Normalize field names from aliases
        payload = normalize_payload(raw_payload)

        # Step 6: Validate required fields (fraud_type, channel, victim_state, amount_inr)
        raw_fraud_type = payload.get("fraud_type")
        if not raw_fraud_type or not isinstance(raw_fraud_type, str) or not raw_fraud_type.strip():
            logger.warning("[VOICE SUBMIT VALIDATION] Missing or empty required field: fraud_type")
            return JSONResponse(
                status_code=200,
                content={"success": False, "error": "Complaint save nahi ho payi"},
            )
        fraud_type = raw_fraud_type.strip()

        raw_channel = payload.get("channel")
        if not raw_channel or not isinstance(raw_channel, str) or not raw_channel.strip():
            logger.warning("[VOICE SUBMIT VALIDATION] Missing or empty required field: channel")
            return JSONResponse(
                status_code=200,
                content={"success": False, "error": "Complaint save nahi ho payi"},
            )
        channel = raw_channel.strip()

        raw_state = payload.get("victim_state")
        if not raw_state or not isinstance(raw_state, str) or not raw_state.strip():
            logger.warning("[VOICE SUBMIT VALIDATION] Missing or empty required field: victim_state")
            return JSONResponse(
                status_code=200,
                content={"success": False, "error": "Complaint save nahi ho payi"},
            )
        victim_state = raw_state.strip()

        amount_inr = _normalize_amount(payload.get("amount_inr"))
        if amount_inr is None:
            logger.warning(f"[VOICE SUBMIT VALIDATION] Invalid amount_inr value: {payload.get('amount_inr')}")
            return JSONResponse(
                status_code=200,
                content={"success": False, "error": "Complaint save nahi ho payi"},
            )

        # Step 7: Extract optional fields with safe defaults (accept empty strings without error)
        if "victim_district" in payload and payload["victim_district"] is not None:
            victim_district = str(payload["victim_district"]).strip()
        else:
            victim_district = "Unknown"

        accused_phone = str(payload.get("accused_phone") or "").strip()
        accused_bank = str(payload.get("accused_bank") or "").strip()
        ncrp_id = str(payload.get("ncrp_id") or "").strip()
        status = str(payload.get("status") or "active").strip() or "active"

        mule_chain_depth = 1
        raw_depth = payload.get("mule_chain_depth")
        if raw_depth not in (None, ""):
            try:
                mule_chain_depth = int(raw_depth)
            except (ValueError, TypeError):
                mule_chain_depth = 1

        logger.info(
            f"[VOICE SUBMIT] Processing voice complaint intake (parser={parser_used}): "
            f"fraud_type={fraud_type}, amount_inr={amount_inr}, channel={channel}, "
            f"state={victim_state}, district={victim_district}"
        )

        # Step 8: Build complaint record and persist using shared NEXUS repository logic
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
        reference = f"NCRP-{cid[:6].upper()}"

        logger.info(f"[VOICE SUBMIT SUCCESS] Complaint persisted with UUID: {cid}, reference: {reference}")

        # Step 9: Schedule background prediction task (non-blocking)
        background_tasks.add_task(_run_prediction_background, cid)
        logger.info(f"[VOICE SUBMIT] Background prediction scheduled for complaint UUID: {cid}")

        # Step 10: Return success response immediately
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
