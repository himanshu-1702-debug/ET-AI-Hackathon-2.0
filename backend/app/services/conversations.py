import json
from pathlib import Path

from app.core.config import settings

CONVERSATIONS_DIR = settings.DATA_DIR / "conversations"
CONVERSATIONS_DIR.mkdir(parents=True, exist_ok=True)

SCREENS = ["copilot", "tacit_capture", "field_access"]


def _file_for(username: str, screen: str) -> Path:
    safe_username = "".join(c for c in username if c.isalnum() or c in ".-_")
    return CONVERSATIONS_DIR / f"{safe_username}__{screen}.json"


def get_history(username: str, screen: str) -> list[dict]:
    path = _file_for(username, screen)
    if not path.exists():
        return []
    return json.loads(path.read_text())


def append_message(username: str, screen: str, message: dict) -> list[dict]:
    history = get_history(username, screen)
    history.append(message)
    path = _file_for(username, screen)
    path.write_text(json.dumps(history, indent=2))
    return history


def clear_history(username: str, screen: str):
    path = _file_for(username, screen)
    if path.exists():
        path.unlink()


def clear_all_for_user(username: str):
    for screen in SCREENS:
        clear_history(username, screen)
