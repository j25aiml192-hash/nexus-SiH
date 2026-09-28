import os
import sys
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from core import autosim, interceptor_score, cluster_detector, sentinel

logger = logging.getLogger("nexus.scheduler")

AUTONOMY_WATCH_INTERVAL_SECONDS = int(os.getenv("AUTONOMY_WATCH_INTERVAL_SECONDS", "5"))


def _safe_legacy_job(job_fn, name: str):
    """Wraps legacy jobs to guarantee isolation from the autonomy loop."""
    def wrapper():
        try:
            job_fn()
        except Exception as e:
            logger.debug(f"[LEGACY SCHEDULER JOB] {name} non-fatal notice: {e}")
    return wrapper


def safe_autonomy_watcher_job():
    """Isolated runner for the Phase 2A Autonomous Case Watcher."""
    try:
        from core.autonomy.case_watcher import case_watcher
        case_watcher.run_cycle(batch_size=1)
    except Exception as e:
        logger.error(f"[AUTONOMY WATCHER ERROR]: {e}", exc_info=True)


def safe_autonomy_reconciler_job():
    """Isolated runner for the Phase 2A Autonomous Event Reconciler."""
    try:
        from core.autonomy.reconciler import reconciler
        reconciler.run_reconciliation_cycle()
    except Exception as e:
        logger.error(f"[AUTONOMY RECONCILER ERROR]: {e}", exc_info=True)


def start_scheduler():
    if os.getenv("TESTING") == "true" or os.getenv("DISABLE_SCHEDULER") == "1" or "unittest" in sys.modules:
        logger.info("APScheduler background scheduler disabled in test environment.")
        return None
    scheduler = BackgroundScheduler()

    # 1. AUTONOMY EVENT ROUTER & CASE WATCHER (Phase 2A Core)
    scheduler.add_job(
        safe_autonomy_watcher_job,
        "interval",
        seconds=AUTONOMY_WATCH_INTERVAL_SECONDS,
        id="autonomy_watcher",
        max_instances=1,
    )

    # 2. AUTONOMY EVENT RECONCILER (Periodic catch-up for dropped events)
    scheduler.add_job(
        safe_autonomy_reconciler_job,
        "interval",
        seconds=60,
        id="autonomy_reconciler",
        max_instances=1,
    )

    # 3. Legacy Support Jobs (Isolated)
    if os.getenv("ENABLE_AUTOSIM", "false").lower() == "true":
        scheduler.add_job(
            _safe_legacy_job(autosim.run_autosim, "autosim"),
            "interval",
            seconds=90,
            id="autosim",
            max_instances=1,
        )

    scheduler.add_job(
        _safe_legacy_job(interceptor_score.update_recovery_scores, "interceptor"),
        "interval",
        minutes=5,
        id="interceptor",
        max_instances=1,
    )

    scheduler.add_job(
        _safe_legacy_job(cluster_detector.detect_clusters, "clusters"),
        "interval",
        minutes=30,
        id="clusters",
        max_instances=1,
    )

    scheduler.add_job(
        _safe_legacy_job(sentinel.compute_sentinel_scores, "sentinel"),
        "interval",
        minutes=3,
        id="sentinel",
        max_instances=1,
    )

    scheduler.start()
    print("NEXUS Autonomous Engine started.")
    print(f"  Autonomy Watcher:    every {AUTONOMY_WATCH_INTERVAL_SECONDS} seconds")
    print("  Autonomy Reconciler: every 60 seconds")
    print("  AutoSim:             every 90 seconds (if enabled)")
    print("  Interceptor:         every 5 minutes")
    print("  Clusters:            every 30 minutes")
    print("  Sentinel:            every 3 minutes")
    return scheduler