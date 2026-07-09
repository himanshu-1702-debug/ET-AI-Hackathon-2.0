import json
import hashlib
import time
import random
from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.services.audit import log_event

_client = None
_cache: dict[str, str] = {}

MAX_RETRIES = 3
BASE_DELAY_SECONDS = 1.5


class LLMNotConfiguredError(Exception):
    pass


class LLMRetryExhaustedError(Exception):
    pass


def _is_retryable(exc: Exception) -> bool:
    import anthropic
    if isinstance(exc, (anthropic.RateLimitError, anthropic.APITimeoutError, anthropic.InternalServerError)):
        return True
    if isinstance(exc, anthropic.APIConnectionError):
        return True
    return False


def _call_with_retry(client, **kwargs):
    last_exc = None
    for attempt in range(MAX_RETRIES):
        try:
            return client.messages.create(**kwargs)
        except Exception as exc:
            last_exc = exc
            if not _is_retryable(exc) or attempt == MAX_RETRIES - 1:
                raise
            delay = BASE_DELAY_SECONDS * (2 ** attempt) + random.uniform(0, 0.5)
            log_event(feature="llm_core", action="retry_attempt",
                      detail={"attempt": attempt + 1, "delay_sec": round(delay, 1), "error": str(exc)[:200]})
            time.sleep(delay)
    raise LLMRetryExhaustedError(f"Call failed after {MAX_RETRIES} attempts: {last_exc}")


def _get_client():
    global _client
    if _client is None:
        if not settings.has_valid_key:
            raise LLMNotConfiguredError(
                "ANTHROPIC_API_KEY is not set. Add your key to backend/.env "
                "(copy .env.example to .env first)."
            )
        import anthropic
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


def _cache_key(prompt: str, system: str, model: str) -> str:
    raw = f"{model}||{system}||{prompt}"
    return hashlib.sha256(raw.encode()).hexdigest()


def ask_llm(
    prompt: str,
    system: str = "",
    model: Optional[str] = None,
    use_reasoning_model: bool = False,
    max_tokens: int = 1500,
    feature: str = "unknown",
    use_cache: bool = True,
) -> str:
    chosen_model = model or (
        settings.ANTHROPIC_REASONING_MODEL if use_reasoning_model else settings.ANTHROPIC_MODEL
    )

    key = _cache_key(prompt, system, chosen_model)
    if use_cache and key in _cache:
        log_event(feature=feature, action="llm_call_cached", detail={"model": chosen_model})
        return _cache[key]

    client = _get_client()
    start = time.time()
    response = _call_with_retry(
        client,
        model=chosen_model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    elapsed = round(time.time() - start, 2)
    text = "".join(block.text for block in response.content if block.type == "text")

    if use_cache:
        _cache[key] = text

    log_event(
        feature=feature,
        action="llm_call",
        detail={"model": chosen_model, "elapsed_sec": elapsed, "prompt_chars": len(prompt)},
    )
    return text


def ask_llm_json(
    prompt: str,
    system: str = "",
    model: Optional[str] = None,
    use_reasoning_model: bool = False,
    max_tokens: int = 2000,
    feature: str = "unknown",
) -> dict:
    json_system = (
        system
        + "\n\nRespond with ONLY valid JSON. No preamble, no markdown fences, no explanation "
        "before or after. Just the raw JSON object."
    )
    raw = ask_llm(
        prompt=prompt,
        system=json_system,
        model=model,
        use_reasoning_model=use_reasoning_model,
        max_tokens=max_tokens,
        feature=feature,
    )
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    try:
        return json.loads(cleaned.strip())
    except json.JSONDecodeError:
        log_event(feature=feature, action="json_parse_failed", detail={"raw": raw[:300]})
        return {"error": "Failed to parse model output as JSON", "raw": raw}
