import json
import time
import uuid
from pathlib import Path
from typing import Any, Optional

from app.core.config import settings


def log_event(
    feature: str,
    action: str,
    detail: Optional[dict[str, Any]] = None,
    sources: Optional[list[dict]] = None,
    confidence: Optional[float] = None,
    escalated: bool = False,
) -> str:
    entry_id = str(uuid.uuid4())[:8]
    entry = {
        "id": entry_id,
        "timestamp": time.time(),
        "feature": feature,
        "action": action,
        "detail": detail or {},
        "sources": sources or [],
        "confidence": confidence,
        "escalated": escalated,
    }
    with open(settings.AUDIT_LOG_PATH, "a") as f:
        f.write(json.dumps(entry) + "\n")
    return entry_id


def get_recent_events(limit: int = 100, feature: Optional[str] = None) -> list[dict]:
    if not settings.AUDIT_LOG_PATH.exists():
        return []
    lines = settings.AUDIT_LOG_PATH.read_text().strip().split("\n")
    events = [json.loads(l) for l in lines if l.strip()]
    if feature:
        events = [e for e in events if e["feature"] == feature]
    events.sort(key=lambda e: e["timestamp"], reverse=True)
    return events[:limit]


def get_escalated_events(limit: int = 50) -> list[dict]:
    all_events = get_recent_events(limit=1000)
    return [e for e in all_events if e["escalated"]][:limit]
