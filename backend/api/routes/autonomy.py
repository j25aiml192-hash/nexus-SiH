from fastapi import APIRouter
from core.autonomy.case_watcher import get_autonomy_status

router = APIRouter()


@router.get("/status")
def get_status():
    """Returns real-time telemetry and heartbeat of the autonomous case watcher."""
    return get_autonomy_status()
