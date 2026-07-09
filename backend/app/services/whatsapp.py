from app.core.config import settings
from app.services import copilot
from app.services.audit import log_event


def is_configured() -> bool:
    return settings.has_twilio_configured


def handle_incoming_message(from_number: str, body: str) -> str:
    if not body or not body.strip():
        return "Send me a question about equipment, permits, or procedures and I'll look it up."

    try:
        result = copilot.ask_copilot(body.strip(), max_hops=2, language="en")
        answer = result["answer"]
        if result.get("escalated_for_review"):
            answer += "\n\n(This has also been flagged for human review given the confidence level.)"
        log_event(feature="whatsapp", action="message_answered",
                  detail={"from": from_number, "question": body[:200]},
                  confidence=result.get("confidence"), escalated=result.get("escalated_for_review", False))
        return answer
    except Exception as e:
        log_event(feature="whatsapp", action="message_failed", detail={"from": from_number, "error": str(e)[:200]})
        return "Sorry, I couldn't process that right now. Please try again in a moment."


def send_proactive_message(to_number: str, message: str) -> dict:
    if not is_configured():
        return {"sent": False, "reason": "Twilio not configured."}

    from twilio.rest import Client
    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    msg = client.messages.create(
        from_=settings.TWILIO_WHATSAPP_NUMBER,
        to=f"whatsapp:{to_number}" if not to_number.startswith("whatsapp:") else to_number,
        body=message,
    )
    log_event(feature="whatsapp", action="proactive_message_sent", detail={"to": to_number, "sid": msg.sid})
    return {"sent": True, "sid": msg.sid}
