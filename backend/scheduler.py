from apscheduler.schedulers.background import BackgroundScheduler
from core import autosim, interceptor_score, cluster_detector, sentinel

def start_scheduler():
    scheduler = BackgroundScheduler()
    import os
    if os.getenv("ENABLE_AUTOSIM", "false").lower() == "true":
        scheduler.add_job(
            autosim.run_autosim,
            "interval",
            seconds=90,
            id="autosim",
            max_instances=1
        )
    scheduler.add_job(
        interceptor_score.update_recovery_scores,
        "interval",
        minutes=5,
        id="interceptor",
        max_instances=1
    )
    scheduler.add_job(
        cluster_detector.detect_clusters,
        "interval",
        minutes=30,
        id="clusters",
        max_instances=1
    )
    scheduler.add_job(
        sentinel.compute_sentinel_scores,
        "interval",
        minutes=3,
        id="sentinel",
        max_instances=1
    )
    scheduler.start()
    print("NEXUS Autonomous Engine started.")
    print("  AutoSim:     every 90 seconds")
    print("  Interceptor: every 5 minutes")
    print("  Clusters:    every 30 minutes")
    print("  Sentinel:    every 3 minutes")
    return scheduler