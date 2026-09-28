"""
NEXUS Autonomy Subsystem (Phase 2A)
===================================
Provides backend-native autonomous reaction capabilities:
- Event Router (Deterministic routing, Truth Graph resolution, urgency evaluation)
- Case Watcher (Continuous background watch loop, atomic event claiming, error isolation)
- Reconciler (Periodic catch-up for any dropped or missed lifecycle events)
"""

from core.autonomy.event_router import EventRouter, event_router
from core.autonomy.case_watcher import CaseWatcher, case_watcher, get_autonomy_status
from core.autonomy.reconciler import AutonomyReconciler, reconciler
from core.autonomy.attention_engine import CaseAttentionEngine, attention_engine
from core.autonomy.attention_policy import compute_attention, ATTENTION_POLICY_VERSION

__all__ = [
    "EventRouter",
    "event_router",
    "CaseWatcher",
    "case_watcher",
    "get_autonomy_status",
    "AutonomyReconciler",
    "reconciler",
    "CaseAttentionEngine",
    "attention_engine",
    "compute_attention",
    "ATTENTION_POLICY_VERSION",
]
