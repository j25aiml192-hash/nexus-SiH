"""
NEXUS Autonomous Case Watcher (Phase 2A)
========================================
Continuously monitors and claims pending autonomy events in the background,
independent of frontend activity.

Guarantees:
- Safe atomic claiming (PENDING -> PROCESSING -> PROCESSED/FAILED).
- Concurrency protected (no duplicate simultaneous processing across workers).
- Complete error isolation (one malformed event never halts the watcher loop).
- Configuration-driven interval (AUTONOMY_WATCH_INTERVAL_SECONDS).
- Full observability with sensitive-data masking and heartbeat metrics.
"""

import os
import time
import logging
import datetime
from typing import Dict, Any, List, Optional
from db import repo
from core.autonomy.event_router import event_router, mask_sensitive_value

logger = logging.getLogger("nexus.autonomy.watcher")

DEFAULT_WATCH_INTERVAL = int(os.getenv("AUTONOMY_WATCH_INTERVAL_SECONDS", "5"))


class CaseWatcher:
    """Autonomous background case watcher and event processing coordinator."""

    def __init__(self, interval_seconds: int = DEFAULT_WATCH_INTERVAL):
        self.interval_seconds = interval_seconds
        self.is_running = False
        self.last_cycle_at: Optional[str] = None
        self.events_processed_count = 0
        self.events_failed_count = 0
        self.last_event_processed: Optional[Dict[str, Any]] = None

    def run_cycle(self, batch_size: int = 10) -> int:
        """
        Executes a single atomic watcher cycle.
        Returns the number of events processed.
        """
        self.is_running = True
        self.last_cycle_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        claimed_events = []

        try:
            # Atomic Concurrency Guard: Claim pending events
            claimed_events = repo.claim_pending_autonomy_events(limit=batch_size)
        except Exception as e:
            logger.error(f"[Autonomy Watcher] Error during event claim: {e}", exc_info=True)
            return 0

        if not claimed_events:
            return 0

        processed_in_cycle = 0
        cycle_start = time.time()

        for idx, event in enumerate(claimed_events):
            # Enforce cycle duration budget (3.5s) to guarantee the watcher finishes
            # cleanly before the next 5s scheduler tick, preventing instance overlaps.
            if idx > 0 and (time.time() - cycle_start) > 3.5:
                for unhandled in claimed_events[idx:]:
                    repo.update_autonomy_event_status(unhandled["event_id"], "pending")
                logger.info(
                    f"[Autonomy Watcher] Cycle duration budget reached ({round(time.time() - cycle_start, 2)}s). "
                    f"Released {len(claimed_events) - idx} events back to pending for next tick."
                )
                break

            event_id = event.get("event_id")
            event_type = event.get("event_type")
            cid = event.get("complaint_id") or "unspecified"
            start_time = time.time()
            start_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

            logger.info(
                f"[Autonomy Watcher] event claimed: {event_id} | "
                f"type: {event_type} | "
                f"complaint: {cid} | "
                f"start_time: {start_iso}"
            )

            try:
                # Execute safe internal reaction
                result = event_router.route_event(event)

                # Mark as successfully processed
                repo.update_autonomy_event_status(event_id, "processed")

                end_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
                duration_ms = round((time.time() - start_time) * 1000, 2)
                self.events_processed_count += 1
                processed_in_cycle += 1
                self.last_event_processed = {
                    "event_id": event_id,
                    "event_type": event_type,
                    "complaint_id": cid,
                    "action_type": result.get("action_type"),
                    "duration_ms": duration_ms,
                    "start_time": start_iso,
                    "end_time": end_iso,
                    "processed_at": end_iso,
                }

                logger.info(
                    f"[Autonomy Watcher] event completed: {event_id} | "
                    f"type: {event_type} | "
                    f"complaint: {cid} | "
                    f"handler: {result.get('action_type')} | "
                    f"start_time: {start_iso} | "
                    f"end_time: {end_iso} | "
                    f"duration: {duration_ms}ms"
                )

            except Exception as e:
                # Complete Error Isolation: Mark failed and proceed to next event
                end_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
                duration_ms = round((time.time() - start_time) * 1000, 2)
                self.events_failed_count += 1
                repo.update_autonomy_event_status(event_id, "failed", error_message=str(e))

                logger.error(
                    f"[Autonomy Watcher] event failed: {event_id} | "
                    f"type: {event_type} | "
                    f"complaint: {cid} | "
                    f"start_time: {start_iso} | "
                    f"end_time: {end_iso} | "
                    f"duration: {duration_ms}ms | "
                    f"failing_error: {e}",
                    exc_info=True,
                )

        return processed_in_cycle

    def get_status(self) -> Dict[str, Any]:
        """Returns lightweight heartbeat and operational telemetry."""
        db_counts = repo.get_autonomy_event_counts()
        return {
            "watcher_running": self.is_running,
            "last_cycle_at": self.last_cycle_at,
            "watch_interval_seconds": self.interval_seconds,
            "events_processed_count": self.events_processed_count,
            "events_failed_count": self.events_failed_count,
            "last_event_processed": self.last_event_processed,
            "db_event_counts": db_counts,
        }


# Global Singleton Instance
case_watcher = CaseWatcher()


def get_autonomy_status() -> Dict[str, Any]:
    """Lightweight entrypoint for system health diagnostics."""
    return case_watcher.get_status()
