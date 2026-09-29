"""
NEXUS Victim Proactive Advisory System (Phase 6)
================================================
Deterministic, evidence-aware advisory policy engine providing concise, contextual,
and actionable guidance to fraud victims immediately upon complaint registration.

CORE SAFETY AND REGULATORY PRINCIPLES:
1. Deterministic & Pure:
   Given identical case inputs, produces identical advisory output. No random tokens,
   no unrestricted model safety decisions, no hallucinated guidance.
2. No Victim Blaming:
   Language is supportive, calm, direct, and non-judgmental.
3. No Recovery Guarantees:
   Never promises fund recovery, account reversal, or specific investigative outcomes.
4. No Fabricated Authority or Contacts:
   No invented emergency numbers, fake helplines, or artificial legal deadlines.
5. Privacy-Safe & Masked:
   Masks all phone numbers, account numbers, device identifiers, and internal entity IDs.
6. Zero Core ML / Truth Graph Contamination:
   Does not mutate predictions, mule chains, Truth Graph entities, or Action Policies.
"""

from typing import Dict, Any, List, Optional, Tuple
import datetime
import hashlib
import json
import logging
import re
import uuid

logger = logging.getLogger("nexus.autonomy.victim_advisory")

VICTIM_ADVISORY_POLICY_VERSION = "phase6-v1"

# Standard Urgency Levels
URGENCY_IMMEDIATE = "IMMEDIATE"
URGENCY_HIGH = "HIGH"
URGENCY_STANDARD = "STANDARD"

# Audit / Traceability Reason Codes
REASON_FRAUD_TYPE_MATCH = "FRAUD_TYPE_MATCH"
REASON_CHANNEL_MATCH = "CHANNEL_MATCH"
REASON_PAYMENT_EVIDENCE_PRESENT = "PAYMENT_EVIDENCE_PRESENT"
REASON_ACCOUNT_CONTEXT_PRESENT = "ACCOUNT_CONTEXT_PRESENT"
REASON_CREDENTIAL_PROTECTION = "CREDENTIAL_PROTECTION"
REASON_EVIDENCE_PRESERVATION = "EVIDENCE_PRESERVATION"
REASON_ADDITIONAL_PAYMENT_RISK = "ADDITIONAL_PAYMENT_RISK"
REASON_RECENT_TRANSACTION_ACTIVITY = "RECENT_TRANSACTION_ACTIVITY"
REASON_VOICE_INTAKE_SOURCE = "VOICE_INTAKE_SOURCE"
REASON_SUSPECT_CONTACT_IDENTIFIED = "SUSPECT_CONTACT_IDENTIFIED"


# -----------------------------------------------------------------------------
# 1. SENSITIVE IDENTIFIER MASKING
# -----------------------------------------------------------------------------

def mask_sensitive_identifier(val: Any, id_type: str = "auto") -> str:
    """
    Masks sensitive values (phones, accounts, emails, IPs) to preserve privacy.
    Never exposes raw victim or suspect identifiers to client advisories.
    """
    if val is None:
        return ""
    s = str(val).strip()
    if not s or s.lower() in ("none", "null", "unknown"):
        return ""

    if id_type == "phone" or (id_type == "auto" and re.match(r"^\+?[\d\s\-()]{7,16}$", s)):
        digits = re.sub(r"\D", "", s)
        prefix = "+" if s.startswith("+") else ""
        if len(digits) >= 10:
            return f"{prefix}{digits[:2]}****{digits[-4:]}"
        elif len(digits) >= 6:
            return f"{prefix}****{digits[-4:]}"
        return "****"

    if id_type == "account" or (id_type == "auto" and (s.isdigit() and len(s) >= 8)):
        return f"****{s[-4:]}"

    if id_type == "email" or ("@" in s and "." in s):
        parts = s.split("@", 1)
        name = parts[0]
        domain = parts[1] if len(parts) > 1 else ""
        masked_name = name[:2] + "****" if len(name) > 2 else "****"
        return f"{masked_name}@{domain}"

    if len(s) > 8:
        return f"{s[:3]}****{s[-3:]}"
    return "****"


# -----------------------------------------------------------------------------
# 2. ADVISORY CONTENT VALIDATION & PROHIBITED LANGUAGE SCANNER
# -----------------------------------------------------------------------------

PROHIBITED_PATTERNS = [
    # Recovery guarantees
    (re.compile(r"\b(100%\s+refund|guaranteed\s+recovery|will\s+recover\s+all|promise\s+to\s+return|full\s+reversal\s+guaranteed)\b", re.IGNORECASE),
     "PROHIBITED_RECOVERY_GUARANTEE"),
    # Victim blame language
    (re.compile(r"\b(you\s+should\s+have\s+known|your\s+fault|you\s+made\s+a\s+mistake|careless\s+behavior|negligence\s+on\s+your\s+part)\b", re.IGNORECASE),
     "PROHIBITED_VICTIM_BLAME"),
    # Fabricated legal threats or emergency arrest deadlines
    (re.compile(r"\b(within\s+24\s+hours\s+or\s+arrest|immediate\s+warrant|court\s+summons\s+issued\s+against\s+you)\b", re.IGNORECASE),
     "PROHIBITED_LEGAL_THREAT"),
]


def validate_advisory_content(advisory: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validates that generated advisory content adheres to safety standards.
    Rejects prohibited words, credential requests, recovery guarantees, and victim blame.
    """
    violations = []
    text_corpus = []

    if advisory.get("title"):
        text_corpus.append(str(advisory["title"]))
    if advisory.get("summary"):
        text_corpus.append(str(advisory["summary"]))

    for sec in advisory.get("sections", []):
        if sec.get("title"):
            text_corpus.append(str(sec["title"]))
        for item in sec.get("items", []):
            text_corpus.append(str(item))

    combined = " ".join(text_corpus)

    # Credential solicitation check (distinguishing negative warnings from requests)
    cred_req_pattern = re.compile(r"\b(enter|share|submit|send|provide|give)\s+(your\s+)?(otp|pin|password|cvv|secret)\b", re.IGNORECASE)
    for m in cred_req_pattern.finditer(combined):
        start = max(0, m.start() - 35)
        prefix = combined[start:m.start()].lower()
        if any(neg in prefix for neg in ("never", "not", "avoid", "refrain", "without", "no")):
            continue
        violations.append("PROHIBITED_CREDENTIAL_REQUEST")
        break

    for pattern, violation_code in PROHIBITED_PATTERNS:
        if pattern.search(combined):
            violations.append(violation_code)

    return len(violations) == 0, violations


# -----------------------------------------------------------------------------
# 3. DETERMINISTIC FINGERPRINTING
# -----------------------------------------------------------------------------

def compute_advisory_fingerprint(
    complaint_id: str,
    fraud_type: str,
    channel: str,
    amount_inr: float,
    accused_bank: Optional[str] = None,
    has_transactions: bool = False,
    policy_version: str = VICTIM_ADVISORY_POLICY_VERSION,
) -> str:
    """
    Generates a deterministic SHA-256 fingerprint representing the current case state.
    Used for idempotency to prevent duplicate advisory spam when case state is unchanged.
    """
    raw_key = (
        f"{complaint_id.strip()}:"
        f"{fraud_type.strip().upper()}:"
        f"{channel.strip().upper()}:"
        f"{round(float(amount_inr or 0.0), 2)}:"
        f"{(accused_bank or '').strip().upper()}:"
        f"{1 if has_transactions else 0}:"
        f"{policy_version}"
    )
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:24]


# -----------------------------------------------------------------------------
# 4. PURE DETERMINISTIC POLICY RULES
# -----------------------------------------------------------------------------

def generate_victim_advisory(
    complaint_data: Dict[str, Any],
    evidence_context: Optional[Dict[str, Any]] = None,
    transactions: Optional[List[Dict[str, Any]]] = None,
    trigger_event: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Pure deterministic policy function.
    Given identical input signals, computes the exact same structured advisory.
    """
    cid = str(complaint_data.get("complaint_id") or uuid.uuid4())
    raw_ft = str(complaint_data.get("fraud_type") or "OTHER").strip().upper()
    raw_ch = str(complaint_data.get("channel") or "OTHER").strip().upper()
    amt = float(complaint_data.get("amount_inr") or complaint_data.get("amount") or 0.0)
    accused_bank = str(complaint_data.get("accused_bank") or "").strip()
    accused_phone = complaint_data.get("accused_phone") or complaint_data.get("accused_phone_prefix")
    phone_masked = mask_sensitive_identifier(accused_phone, "phone") if accused_phone else ""

    txns = transactions or []
    has_txns = len(txns) > 0
    ev_ctx = evidence_context or {}

    # Check if voice intake
    is_voice = (
        raw_ch in ("VOICE", "VOICE_BOT", "VOICE BOT", "EXOTEL")
        or (trigger_event and trigger_event.get("event_type") == "voice_complaint_submitted")
    )

    reason_codes: List[str] = [REASON_CREDENTIAL_PROTECTION, REASON_EVIDENCE_PRESERVATION]
    sources: List[Dict[str, Any]] = []

    # Map fraud type
    ft = raw_ft
    if "UPI" in ft:
        ft = "UPI_PHISHING"
    elif "DIGITAL" in ft or "ARREST" in ft:
        ft = "DIGITAL_ARREST"
    elif "INVEST" in ft or "TASK" in ft:
        ft = "INVESTMENT_SCAM"
    elif "LOAN" in ft:
        ft = "FAKE_LOAN"
    elif "AEPS" in ft:
        ft = "AEPS_FRAUD"
    elif "SEXTORTION" in ft:
        ft = "SEXTORTION"

    sources.append({"signal": "fraud_type", "value": ft})
    reason_codes.append(REASON_FRAUD_TYPE_MATCH)

    # Map channel
    ch = raw_ch
    if "UPI" in ch:
        ch = "UPI"
    elif "IMPS" in ch:
        ch = "IMPS"
    elif "NEFT" in ch:
        ch = "NEFT"
    elif "AEPS" in ch:
        ch = "AEPS"
    elif "ATM" in ch:
        ch = "ATM"
    elif "RTGS" in ch:
        ch = "RTGS"

    sources.append({"signal": "channel", "value": ch})
    reason_codes.append(REASON_CHANNEL_MATCH)

    if has_txns:
        reason_codes.append(REASON_PAYMENT_EVIDENCE_PRESENT)
        sources.append({"signal": "transactions_count", "value": len(txns)})

    if accused_bank and accused_bank.lower() not in ("none", "null", "unknown"):
        reason_codes.append(REASON_ACCOUNT_CONTEXT_PRESENT)
        sources.append({"signal": "accused_bank", "value": accused_bank})

    if phone_masked:
        reason_codes.append(REASON_SUSPECT_CONTACT_IDENTIFIED)
        sources.append({"signal": "accused_phone_masked", "value": phone_masked})

    if is_voice:
        reason_codes.append(REASON_VOICE_INTAKE_SOURCE)
        sources.append({"signal": "intake_channel", "value": "VOICE"})

    # Determine Urgency
    if amt >= 50000.0 or ft in ("DIGITAL_ARREST", "AEPS_FRAUD", "UPI_PHISHING"):
        urgency = URGENCY_IMMEDIATE
    elif amt >= 10000.0 or ft in ("INVESTMENT_SCAM", "FAKE_LOAN", "SEXTORTION"):
        urgency = URGENCY_HIGH
    else:
        urgency = URGENCY_STANDARD

    urgent_actions: List[str] = []
    protect_accounts: List[str] = []
    preserve_evidence: List[str] = []
    avoid_loss: List[str] = []
    followup_actions: List[str] = []

    # Fraud-specific tailored actions
    if ft == "UPI_PHISHING":
        urgent_actions.append(
            "Contact your bank or payment service provider through their official mobile app or verified branch to report the unauthorized UPI transaction reference."
        )
        urgent_actions.append(
            "Do not approve any incoming 'collect' requests or click verification links sent via SMS or messaging apps."
        )
        protect_accounts.append(
            "Change or reset your UPI PIN directly from your authorized banking or UPI payment application."
        )
        protect_accounts.append(
            "Review linked payment accounts and disable UPI services temporarily if further unauthorized payment requests occur."
        )
        preserve_evidence.append(
            "Preserve the 12-digit UPI transaction reference (UTR number), transaction timestamp, and beneficiary UPI ID (VPA)."
        )
        preserve_evidence.append(
            "Take screenshots of payment confirmation screens, chat messages, and suspicious SMS payment requests."
        )
        avoid_loss.append(
            "Remember: Receiving money never requires entering your UPI PIN. Never enter your PIN to accept a refund or prize."
        )
        avoid_loss.append(
            "Do not install screen-sharing or remote-assistance applications requested by unverified contacts."
        )
        reason_codes.append(REASON_ADDITIONAL_PAYMENT_RISK)

    elif ft == "DIGITAL_ARREST":
        urgent_actions.append(
            "Immediately disconnect and block video or voice calls claiming to represent law enforcement, regulatory agencies, or judicial courts."
        )
        urgent_actions.append(
            "Do not transfer funds to any 'safe', 'clearance', or 'verification' accounts under threat of arrest or legal action."
        )
        protect_accounts.append(
            "Do not disclose your bank account balances, fixed deposits, or banking credentials to anyone over the phone or video."
        )
        protect_accounts.append(
            "Inform trusted family members or visit your nearest local police station directly if you feel pressured or threatened."
        )
        preserve_evidence.append(
            "Preserve incoming caller phone numbers, call duration records, and screenshots of caller IDs or uniforms shown on video."
        )
        preserve_evidence.append(
            "Keep copies of any fake warrants, court notices, or agency letters sent via messaging apps."
        )
        avoid_loss.append(
            "Legitimate law enforcement and judicial authorities never conduct arrests or demand money transfers via video calls."
        )
        avoid_loss.append(
            "Do not isolate yourself or follow instructions to remain on continuous surveillance calls."
        )
        reason_codes.append(REASON_ADDITIONAL_PAYMENT_RISK)

    elif ft == "INVESTMENT_SCAM":
        urgent_actions.append(
            "Cease all further fund transfers immediately. Do not pay 'release fees', 'taxes', or 'verification charges' to withdraw your balance."
        )
        urgent_actions.append(
            "Stop engaging with group administrators, investment advisors, or recruiters promoting high-return schemes."
        )
        protect_accounts.append(
            "Notify your bank regarding all transfers made to the investment portal or designated beneficiary accounts."
        )
        protect_accounts.append(
            "Update passwords and enable two-factor authentication on your registered email and online banking accounts."
        )
        preserve_evidence.append(
            "Take screenshots of investment dashboards, advertised profit statements, task instructions, and payment receipts."
        )
        preserve_evidence.append(
            "Export chat history, admin phone numbers, and website URLs from messaging groups."
        )
        avoid_loss.append(
            "Demands for additional payments to unlock previous deposits are part of the fraud scheme; paying more will not recover earlier funds."
        )
        avoid_loss.append(
            "Do not provide remote access to your device or sign up for unverified cryptocurrency or trading platforms."
        )
        reason_codes.append(REASON_ADDITIONAL_PAYMENT_RISK)

    elif ft == "FAKE_LOAN":
        urgent_actions.append(
            "Do not pay upfront processing fees, insurance deposits, or security advances to release approved loan funds."
        )
        urgent_actions.append(
            "Uninstall suspicious loan applications downloaded outside authorized app stores."
        )
        protect_accounts.append(
            "Review app permissions on your mobile device and immediately revoke contact list, photo gallery, and storage access."
        )
        protect_accounts.append(
            "Alert your bank to review active auto-debit mandates or recurring payment authorizations."
        )
        preserve_evidence.append(
            "Preserve copies of loan agreements, sanction letters, payment receipts, and threatening messages or calls."
        )
        preserve_evidence.append(
            "Capture screenshots of app permissions requested and transaction reference numbers."
        )
        avoid_loss.append(
            "Do not respond to blackmail or threats involving contact lists; report harassment to law enforcement."
        )
        avoid_loss.append(
            "Never share banking credentials or one-time passwords with loan recovery agents."
        )
        reason_codes.append(REASON_ADDITIONAL_PAYMENT_RISK)

    elif ft == "AEPS_FRAUD":
        urgent_actions.append(
            "Immediately lock your Aadhaar biometric authentication via the official UIDAI resident portal or mAadhaar application."
        )
        urgent_actions.append(
            "Contact your home bank to report unauthorized AePS or micro-ATM debit transactions."
        )
        protect_accounts.append(
            "Keep your biometric lock active until you specifically require it for legitimate in-person verification."
        )
        protect_accounts.append(
            "Obtain a detailed bank account statement showing the Terminal ID, BC agent code, and transaction timestamp."
        )
        preserve_evidence.append(
            "Preserve SMS alerts and transaction debit notifications received for each unauthorized cashout."
        )
        preserve_evidence.append(
            "Keep a record of any recent physical biometric authentication sessions conducted at public or merchant kiosks."
        )
        avoid_loss.append(
            "Never provide biometric scans (fingerprint or iris) to unverified field agents or door-to-door loan representatives."
        )
        avoid_loss.append(
            "Do not accept monetary offers or subsidies requiring biometric verification at non-banking kiosks."
        )

    elif ft == "SEXTORTION":
        urgent_actions.append(
            "Do not send money or compromise payments; demands typically escalate once an initial payment is made."
        )
        urgent_actions.append(
            "Block the extortionist's profile and phone numbers across all messaging and social media platforms immediately."
        )
        protect_accounts.append(
            "Set your social media profiles to private, hide your contact lists, and deactivate or privatize search visibility."
        )
        protect_accounts.append(
            "Do not engage or negotiate with the caller; avoid responding to subsequent intimidation attempts."
        )
        preserve_evidence.append(
            "Capture screenshots of profiles, usernames, chat messages, threats, and payment instructions before blocking."
        )
        preserve_evidence.append(
            "Preserve caller IDs, URL links, and account identifiers used to solicit money."
        )
        avoid_loss.append(
            "Do not delete chat history before saving clear screenshots and preserving message timestamps."
        )
        avoid_loss.append(
            "Do not share additional personal media or explanations with the extortionist."
        )
        reason_codes.append(REASON_ADDITIONAL_PAYMENT_RISK)

    else:
        # Standard safety guidance for other fraud types
        urgent_actions.append(
            "Contact your financial institution through their official customer care helpline to report the unauthorized incident."
        )
        urgent_actions.append(
            "Do not transfer additional funds or click on unverified links received from unknown sources."
        )
        protect_accounts.append(
            "Review your recent bank and card statements for any unverified or recurring debits."
        )
        protect_accounts.append(
            "Update your online banking passwords and verify that two-factor authentication is active on all accounts."
        )
        preserve_evidence.append(
            "Preserve all transaction receipts, SMS alerts, chat messages, and caller information related to the incident."
        )
        preserve_evidence.append(
            "Record a chronological timeline of events, including dates, times, and amounts transferred."
        )
        avoid_loss.append(
            "Never disclose one-time passwords (OTPs), PINs, or card security codes (CVV) to anyone under any circumstances."
        )
        avoid_loss.append(
            "Do not make hasty financial decisions under urgent pressure or unverified threats."
        )

    # Channel-specific guidance
    if ch in ("IMPS", "NEFT", "RTGS"):
        followup_actions.append(
            f"Provide your bank with the unique transaction reference (UTR) for the {ch} transfer to initiate an interbank recall request."
        )
    elif ch == "UPI":
        followup_actions.append(
            "Request your bank's cyber grievance team to flag the beneficiary UPI ID (VPA) through the NPCI dispute management system."
        )
    elif ch == "AEPS":
        followup_actions.append(
            "Submit a formal disputed transaction grievance to your bank specifying the AePS Terminal ID and Business Correspondent location."
        )

    if accused_bank and accused_bank.lower() not in ("none", "null", "unknown"):
        followup_actions.append(
            f"Notify your home bank that the reported destination account belongs to {accused_bank} to assist with interbank tracing."
        )

    # Next steps summary
    next_steps = [
        "1. Complete Immediate Actions: Secure your payment credentials and contact your bank's cyber fraud desk.",
        "2. Evidence Preservation: Retain all digital receipts, chat history, and transaction references safely.",
        "3. Formal Follow-up: Provide your complaint reference number to banking authorities during dispute intake.",
        "4. Remain Vigilant: Verify any future communication through official bank branches or verified institutional portals."
    ]

    # Assemble structured sections
    sections = []
    if urgent_actions:
        sections.append({
            "type": "URGENT_ACTIONS",
            "title": "Immediate Protective Actions",
            "items": urgent_actions,
        })
    if protect_accounts:
        sections.append({
            "type": "PROTECT_ACCOUNTS",
            "title": "Protect Affected Accounts & Instruments",
            "items": protect_accounts,
        })
    if preserve_evidence:
        sections.append({
            "type": "PRESERVE_EVIDENCE",
            "title": "Preserve Key Incident Evidence",
            "items": preserve_evidence,
        })
    if avoid_loss:
        sections.append({
            "type": "AVOID_FURTHER_LOSS",
            "title": "What to Avoid Right Now",
            "items": avoid_loss,
        })
    if followup_actions:
        sections.append({
            "type": "WHAT_REQUIRES_FOLLOWUP",
            "title": "Bank & Institutional Follow-Up",
            "items": followup_actions,
        })
    sections.append({
        "type": "NEXT_STEPS",
        "title": "Recommended Next Steps",
        "items": next_steps,
    })

    # Summary and Title
    ref_display = f"Ref: NCRP-{cid[:6].upper()}" if len(cid) >= 6 else f"Ref: {cid}"
    title = "NEXUS Proactive Citizen Safety Advisory"
    summary = (
        f"Your cyber incident report ({ref_display}) has been registered in the system. "
        f"Follow these deterministic protective steps immediately to minimize further financial exposure and secure evidence."
    )

    fingerprint = compute_advisory_fingerprint(
        complaint_id=cid,
        fraud_type=ft,
        channel=ch,
        amount_inr=amt,
        accused_bank=accused_bank,
        has_transactions=has_txns,
        policy_version=VICTIM_ADVISORY_POLICY_VERSION,
    )

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    advisory_payload = {
        "complaint_id": cid,
        "advisory_id": str(uuid.uuid4()),
        "urgency": urgency,
        "title": title,
        "summary": summary,
        "sections": sections,
        "reason_codes": list(sorted(set(reason_codes))),
        "sources": sources,
        "policy_version": VICTIM_ADVISORY_POLICY_VERSION,
        "fingerprint": fingerprint,
        "generated_at": now_iso,
        "status": "CURRENT",
        "channel": ch,
        "phone_masked": phone_masked,
    }

    # Validate content against prohibited terms
    is_valid, violations = validate_advisory_content(advisory_payload)
    if not is_valid:
        logger.error(f"[ADVISORY SAFETY VIOLATION] Found prohibited patterns: {violations}")
        # Strip or sanitize any violating content
        advisory_payload["title"] = "Citizen Safety Guidance"
        advisory_payload["summary"] = "Take these verified precautions immediately to protect your accounts and preserve evidence."

    return advisory_payload


# -----------------------------------------------------------------------------
# 5. ENGINE ORCHESTRATION & PERSISTENCE
# -----------------------------------------------------------------------------

class VictimAdvisoryEngine:
    """
    Orchestrates deterministic advisory evaluation, idempotency check,
    and safe persistence to the Phase 1 victim_advisories repository.
    """

    def evaluate_and_persist(
        self,
        complaint_id: str,
        trigger_event: Optional[Dict[str, Any]] = None,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """
        Evaluates the case, verifies idempotency against existing advisories,
        and safely persists the advisory without throwing or blocking intake.
        """
        from db import repo

        try:
            complaint = repo.get_complaint_by_id(complaint_id)
            if not complaint:
                logger.warning(f"[VICTIM ADVISORY] Complaint '{complaint_id}' not found for advisory evaluation.")
                return {"status": "not_found", "complaint_id": complaint_id}

            # Gather supporting signals
            txns = []
            try:
                txns = repo.get_transactions_by_complaint(complaint_id)
            except Exception:
                pass

            evidence_ctx = {}
            try:
                ev_items = repo.get_evidence_by_complaint(complaint_id)
                evidence_ctx["items_count"] = len(ev_items)
            except Exception:
                pass

            # Generate deterministic advisory
            advisory = generate_victim_advisory(
                complaint_data=complaint,
                evidence_context=evidence_ctx,
                transactions=txns,
                trigger_event=trigger_event,
            )

            current_adv = repo.get_current_victim_advisory(complaint_id)

            # Idempotency check: if existing advisory has identical fingerprint and not forcing refresh
            if not force_refresh and current_adv:
                existing_fp = current_adv.get("fingerprint")
                if existing_fp and existing_fp == advisory["fingerprint"]:
                    logger.info(f"[VICTIM ADVISORY IDEMPOTENT] Fingerprint {existing_fp} matches existing advisory.")
                    return {
                        "status": "unchanged",
                        "advisory_id": current_adv.get("advisory_id"),
                        "fingerprint": existing_fp,
                        "advisory": current_adv,
                    }

            # If there was an existing active advisory, mark it SUPERSEDED
            if current_adv and current_adv.get("advisory_id"):
                try:
                    repo.update_victim_advisory_status(
                        advisory_id=current_adv["advisory_id"],
                        delivery_status="SUPERSEDED",
                    )
                except Exception as e:
                    logger.debug(f"[VICTIM ADVISORY SUPERSEDE NOTICE]: {e}")

            # Persist to repository (Phase 1 schema compliant)
            masked_phone = advisory.get("phone_masked") or "******0000"
            chan = advisory.get("channel") or "SMS"
            adv_text = json.dumps(advisory)

            created_row = repo.create_victim_advisory(
                complaint_id=complaint_id,
                phone_number_masked=masked_phone,
                channel=chan,
                advisory_type=advisory["urgency"],
                advisory_text=adv_text,
                advisory_version=VICTIM_ADVISORY_POLICY_VERSION,
                delivery_status="CURRENT",
            )

            # Record non-blocking audit trail
            try:
                repo.create_autonomy_audit_log(
                    trigger_event_type=(trigger_event.get("event_type") if trigger_event else "complaint_ingested"),
                    action_type="GENERATE_VICTIM_ADVISORY",
                    decision_factors={
                        "reason_codes": advisory["reason_codes"],
                        "urgency": advisory["urgency"],
                        "fingerprint": advisory["fingerprint"],
                        "sources": advisory["sources"],
                    },
                    complaint_id=complaint_id,
                    trigger_event_id=(trigger_event.get("event_id") if trigger_event else None),
                    action_payload={
                        "advisory_id": created_row.get("advisory_id"),
                        "policy_version": VICTIM_ADVISORY_POLICY_VERSION,
                    },
                    requires_approval=False,
                    approval_status="not_required",
                )
            except Exception as e:
                logger.debug(f"[VICTIM ADVISORY AUDIT LOG SAFE NOTICE]: {e}")

            advisory["advisory_id"] = created_row.get("advisory_id")
            return {
                "status": "created",
                "advisory_id": created_row.get("advisory_id"),
                "urgency": advisory["urgency"],
                "policy_version": VICTIM_ADVISORY_POLICY_VERSION,
                "advisory": advisory,
            }

        except Exception as e:
            logger.error(f"[VICTIM ADVISORY ENGINE UNHANDLED]: {type(e).__name__}: {str(e)}", exc_info=True)
            return {"status": "error", "error": str(e), "complaint_id": complaint_id}


# Singleton Engine Instance
victim_advisory_engine = VictimAdvisoryEngine()
