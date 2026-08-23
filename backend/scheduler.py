from apscheduler.schedulers.background import BackgroundScheduler
from core.briefs import generate_daily_brief


scheduler = BackgroundScheduler()

def start_scheduler():
    generate_daily_brief()
    scheduler.add_job(
        generate_daily_brief,
        "cron",
        hour=23,
        minute=59,
        id="daily_brief",
        replace_existing=True,
    )

    scheduler.start()