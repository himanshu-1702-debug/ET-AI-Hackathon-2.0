import os
from pathlib import Path
from dotenv import load_dotenv

# I load my .env file from the backend directory no matter where I run this from.
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BACKEND_DIR / ".env")


class Settings:
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
    ANTHROPIC_REASONING_MODEL: str = os.getenv(
        "ANTHROPIC_REASONING_MODEL", os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
    )
    PORT: int = int(os.getenv("PORT", "8000"))

    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_WHATSAPP_NUMBER: str = os.getenv("TWILIO_WHATSAPP_NUMBER", "")

    @property
    def has_twilio_configured(self) -> bool:
        return bool(self.TWILIO_ACCOUNT_SID and self.TWILIO_AUTH_TOKEN and self.TWILIO_WHATSAPP_NUMBER)

    DATA_DIR: Path = BACKEND_DIR / "app" / "data"
    DOCUMENTS_DIR: Path = DATA_DIR / "documents"
    GRAPH_STORE_DIR: Path = DATA_DIR / "graph_store"
    VECTOR_STORE_DIR: Path = DATA_DIR / "vector_store"
    AUDIT_LOG_PATH: Path = DATA_DIR / "audit_log.jsonl"

    @property
    def has_valid_key(self) -> bool:
        return bool(self.ANTHROPIC_API_KEY) and self.ANTHROPIC_API_KEY != "your_key_here"


settings = Settings()

for d in [settings.DOCUMENTS_DIR, settings.GRAPH_STORE_DIR, settings.VECTOR_STORE_DIR]:
    d.mkdir(parents=True, exist_ok=True)
