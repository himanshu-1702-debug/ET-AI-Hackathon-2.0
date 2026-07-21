import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel

from app.core.config import settings
from app.core.llm import LLMNotConfiguredError
from app.core.auth import authenticate, verify_token, require_role, require_permission
from app.models.schemas import (
    QueryRequest, ThreadIngestRequest, ComplianceCheckRequest, EvidencePackageRequest,
    RCARequest, PatternMiningRequest, RoutingAckRequest, OnboardingRequest,
    TacitNextQuestionRequest, TacitFinalizeRequest,
)
from app.services import ingestion, copilot, compliance, rca, lessons_learned, routing, onboarding, tacit_capture, whatsapp
from app.services import knowledge_graph as kg
from app.services import vector_store as vs
from app.services import job_queue
from app.services import conversations
from app.services.audit import get_recent_events, get_escalated_events
from app.models.schemas import ConversationMessage
from fastapi import Request
from fastapi.responses import PlainTextResponse

router = APIRouter()

job_queue.register_replayable("document_ingestion", ingestion.ingest_document)
job_queue.register_replayable("pid_digitisation", ingestion.ingest_pid_drawing)
job_queue.register_replayable("thread_mining", ingestion.ingest_thread)
job_queue.register_replayable("pattern_scan", lessons_learned.mine_patterns)


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/auth/login")
def login(req: LoginRequest):
    return authenticate(req.username, req.password)


@router.get("/auth/me")
def me(user: dict = Depends(verify_token)):
    return user


def _handle_llm_errors(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except LLMNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/status")
def status():
    return {
        "llm_configured": settings.has_valid_key,
        "graph_summary": kg.get_full_graph_summary(),
        "vector_store_chunk_count": vs.count(),
    }


@router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...), doc_type: str = Form("other")):
    dest = settings.DOCUMENTS_DIR / f"{uuid.uuid4().hex[:8]}_{file.filename}"
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    if not settings.has_valid_key:
        raise HTTPException(status_code=503, detail=(
            "ANTHROPIC_API_KEY is not set. Add your key to backend/.env "
            "(copy .env.example to .env first)."
        ))

    suffix = Path(file.filename).suffix.lower()
    if suffix in [".png", ".jpg", ".jpeg"] and doc_type == "pid_drawing":
        job_id = job_queue.enqueue("pid_digitisation", ingestion.ingest_pid_drawing, str(dest), file.filename)
    else:
        job_id = job_queue.enqueue("document_ingestion", ingestion.ingest_document, str(dest), doc_type, file.filename)

    return {"job_id": job_id, "status": "queued", "message": "Document queued for processing. Poll /jobs/{job_id} for status."}


@router.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    job = job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/jobs")
def list_jobs(status: str | None = None, limit: int = 50):
    return {"jobs": job_queue.list_jobs(status, limit)}


@router.get("/jobs/dlq/all")
def dead_letter_queue():
    return {"failed_jobs": job_queue.get_dead_letter_queue(), "sla_summary": job_queue.get_sla_summary()}


@router.post("/jobs/{job_id}/replay")
def replay_job(job_id: str, user: dict = Depends(require_permission("jobs:replay"))):
    result = job_queue.replay(job_id)
    if not result["replayed"]:
        raise HTTPException(status_code=400, detail=result["reason"])
    return result


@router.post("/documents/ingest-thread")
def ingest_thread(req: ThreadIngestRequest):
    return _handle_llm_errors(ingestion.ingest_thread, req.text, req.source_label)


@router.post("/copilot/query")
def copilot_query(req: QueryRequest):
    return _handle_llm_errors(copilot.ask_copilot, req.question, req.max_hops, req.language)


@router.post("/onboarding/generate-path")
def generate_path(req: OnboardingRequest):
    return _handle_llm_errors(onboarding.generate_onboarding_path, req.role, req.area)


@router.get("/escalations")
def get_escalations(limit: int = 50):
    return {"escalations": get_escalated_events(limit)}


@router.post("/compliance/check")
def check_compliance(req: ComplianceCheckRequest):
    result = _handle_llm_errors(compliance.check_compliance, req.scope_query)
    for gap in result.get("gaps_found", []):
        if gap.get("severity") == "high":
            _handle_llm_errors(routing.route_finding, gap["description"], "compliance")
    return result


@router.post("/compliance/evidence-package")
def evidence_package(req: EvidencePackageRequest):
    return _handle_llm_errors(compliance.generate_evidence_package, req.scope)


@router.post("/rca/analyze")
def analyze_rca(req: RCARequest):
    result = _handle_llm_errors(rca.analyze_rca, req.equipment_query)
    if result.get("systemic_pattern_detected"):
        _handle_llm_errors(
            routing.route_finding,
            result.get("systemic_pattern_description", "Systemic pattern detected"),
            "rca",
        )
    return result


@router.get("/routing/inbox/{role}")
def get_inbox(role: str):
    return {"role": role, "findings": routing.get_inbox_for_role(role)}


@router.get("/routing/all")
def get_all_routed():
    return {"findings": routing.get_all_routed()}


@router.post("/routing/acknowledge")
def acknowledge(req: RoutingAckRequest, user: dict = Depends(require_permission("findings:acknowledge"))):
    success = routing.acknowledge_finding(req.finding_id)
    if not success:
        raise HTTPException(status_code=404, detail="Finding not found")
    return {"acknowledged": True, "acknowledged_by": user["name"]}


@router.post("/lessons-learned/scan")
def scan_patterns(req: PatternMiningRequest):
    result = _handle_llm_errors(lessons_learned.mine_patterns, req.focus_area)
    for pattern in result.get("patterns_found", []):
        if pattern.get("risk_level") == "high":
            _handle_llm_errors(routing.route_finding, pattern["pattern_description"], "lessons_learned")
    return result


@router.post("/tacit-capture/next-question")
def tacit_next_question(req: TacitNextQuestionRequest):
    history = [m.model_dump() for m in req.conversation_history]
    return _handle_llm_errors(tacit_capture.get_next_interview_question, req.expertise_area, history)


@router.post("/tacit-capture/finalize")
def tacit_finalize(req: TacitFinalizeRequest):
    history = [m.model_dump() for m in req.conversation_history]
    return _handle_llm_errors(tacit_capture.finalize_capture, req.expertise_area, history)


@router.get("/audit/recent")
def audit_recent(limit: int = 100, feature: str | None = None, user: dict = Depends(verify_token)):
    return {"events": get_recent_events(limit, feature)}


@router.get("/whatsapp/status")
def whatsapp_status():
    return {"configured": whatsapp.is_configured()}


@router.post("/whatsapp/webhook", response_class=PlainTextResponse)
async def whatsapp_webhook(request: Request):
    form = await request.form()
    from_number = form.get("From", "")
    body = form.get("Body", "")

    reply_text = whatsapp.handle_incoming_message(from_number, body)

    safe_reply = (reply_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
    twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{safe_reply}</Message></Response>'
    return PlainTextResponse(content=twiml, media_type="application/xml")


@router.post("/system/reset")
def reset_system(user: dict = Depends(require_permission("system:reset"))):
    from app.services import vector_store as vs_module

    vs_module.reset()
    kg.reset()

    if settings.DOCUMENTS_DIR.exists():
        for f in settings.DOCUMENTS_DIR.iterdir():
            if f.name != ".gitkeep":
                f.unlink()
    routing_file = settings.DATA_DIR / "routed_findings.json"
    if routing_file.exists():
        routing_file.unlink()
    if settings.AUDIT_LOG_PATH.exists():
        settings.AUDIT_LOG_PATH.unlink()

    return {"reset": True, "reset_by": user["name"]}


@router.get("/system/observability")
def observability(user: dict = Depends(require_permission("system:observability"))):
    return {
        "sla_summary": job_queue.get_sla_summary(),
        "recent_failed_jobs": job_queue.get_dead_letter_queue()[:10],
        "recent_running_jobs": job_queue.list_jobs(status="running", limit=10),
    }


@router.get("/graph/summary")
def graph_summary():
    return kg.get_full_graph_summary()


@router.get("/graph/entity/{entity_id}")
def graph_entity(entity_id: str, max_hops: int = 2):
    entity = kg.get_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    neighbors = kg.get_neighbors(entity_id, max_hops)
    return {"entity": entity, "neighbors": neighbors}


@router.get("/graph/search")
def graph_search(q: str):
    return {"results": kg.search_nodes_by_label(q)}


@router.get("/conversations/{screen}")
def get_conversation(screen: str, user: dict = Depends(verify_token)):
    return {"screen": screen, "messages": conversations.get_history(user["sub"], screen)}


@router.post("/conversations/{screen}")
def append_conversation_message(screen: str, message: ConversationMessage, user: dict = Depends(verify_token)):
    history = conversations.append_message(user["sub"], screen, message.model_dump())
    return {"screen": screen, "messages": history}


@router.delete("/conversations/{screen}")
def clear_conversation(screen: str, user: dict = Depends(verify_token)):
    conversations.clear_history(user["sub"], screen)
    return {"cleared": True}
