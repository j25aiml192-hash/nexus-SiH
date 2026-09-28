import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import repo

logger = logging.getLogger("nexus.auth")

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    fullName: str
    email: str
    password: str
    badgeId: Optional[str] = None
    agency: Optional[str] = "I4C National Command Center"
    role: Optional[str] = "Officer"

class StatusUpdateRequest(BaseModel):
    emailOrId: str

ADMIN_EMAIL = "h90519495@gmail.com"

@router.post("/login")
def login(req: LoginRequest):
    clean_email = req.email.strip().lower()
    clean_pass = req.password.strip()

    user = repo.get_user_by_email(clean_email)
    if not user:
        if clean_email == "analyst":
            user = repo.get_user_by_email("analyst@nexus.gov.in")
        elif clean_email == "officer":
            user = repo.get_user_by_email("officer@nexus.gov.in")
        elif clean_email == "admin":
            user = repo.get_user_by_email("admin@nexus.gov.in")

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Official Account not recognized. Please check your credentials or register a new Officer ID."
        )

    if user["password_hash"] != clean_pass:
        raise HTTPException(
            status_code=401,
            detail="Incorrect security password for this Official Account."
        )

    status = user.get("status", "approved").lower()
    if status == "pending_approval":
        badge = user.get("badge_id", "NEX-REG")
        raise HTTPException(
            status_code=403,
            detail=f"Registration Request (Officer ID: {badge}) is PENDING ADMIN APPROVAL by {ADMIN_EMAIL}. You will be able to log in once Admin approves your request."
        )

    if status == "rejected":
        raise HTTPException(
            status_code=403,
            detail=f"Registration Request for {clean_email} was REJECTED by Admin ({ADMIN_EMAIL}). Please contact Admin."
        )

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "badgeId": user["badge_id"],
        "agency": user["agency"],
        "status": "approved"
    }

@router.post("/register")
def register(req: RegisterRequest):
    clean_email = req.email.strip().lower()
    clean_pass = req.password.strip()

    existing = repo.get_user_by_email(clean_email)
    if existing:
        if existing.get("status") == "pending_approval":
            badge = existing.get("badge_id", "NEX-REG")
            raise HTTPException(
                status_code=400,
                detail=f"Registration Request (Officer ID: {badge}) is ALREADY PENDING ADMIN APPROVAL by {ADMIN_EMAIL}."
            )
        raise HTTPException(
            status_code=400,
            detail="An account with this email address already exists in the system."
        )

    role = req.role or "Officer"
    badge_id = (req.badgeId or "").strip() or f"NEX-{abs(hash(clean_email)) % 9000 + 1000}-{ 'AN' if role == 'Analyst' else 'OF' }"
    agency = req.agency or "I4C National Command Center"

    new_user = repo.register_user(
        name=req.fullName,
        email=clean_email,
        password_hash=clean_pass,
        role=role,
        badge_id=badge_id,
        agency=agency,
        status="pending_approval"
    )

    logger.info(f"[REGISTRATION REQUEST DISPATCHED] Officer ID: {badge_id}, Email: {clean_email} -> Sent to Admin ({ADMIN_EMAIL})")

    return {
        "status": "pending_approval",
        "badgeId": badge_id,
        "adminEmail": ADMIN_EMAIL,
        "message": f"Officer ID Registration Request ({badge_id}) has been dispatched to Admin ({ADMIN_EMAIL}) for authorization. Status: PENDING ADMIN APPROVAL.",
        "user": new_user
    }

@router.get("/pending-requests")
def get_pending_requests():
    return repo.get_pending_users()

@router.post("/approve")
def approve_request(req: StatusUpdateRequest):
    success = repo.update_user_status(req.emailOrId, "approved")
    if not success:
        raise HTTPException(status_code=404, detail="User request record not found.")
    return {"status": "approved", "message": f"Officer registration ({req.emailOrId}) approved successfully by Admin ({ADMIN_EMAIL})."}

@router.post("/reject")
def reject_request(req: StatusUpdateRequest):
    success = repo.update_user_status(req.emailOrId, "rejected")
    if not success:
        raise HTTPException(status_code=404, detail="User request record not found.")
    return {"status": "rejected", "message": f"Officer registration ({req.emailOrId}) rejected."}
