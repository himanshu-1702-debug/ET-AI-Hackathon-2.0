import json
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Callable, Optional
from threading import Lock

from app.core.config import settings
from app.services.audit import log_event

JOBS_FILE = settings.DATA_DIR / "jobs.json"
_lock = Lock()
_executor = ThreadPoolExecutor(max_workers=4)

DEFAULT_SLA_SECONDS = {
    "document_ingestion": 60,
    "pid_digitisation": 45,
    "thread_mining": 30,
    "pattern_scan": 90,
}


def _load_jobs() -> dict:
    if not JOBS_FILE.exists():
        return {}
    return json.loads(JOBS_FILE.read_text())


def _save_jobs(jobs: dict):
    JOBS_FILE.write_text(json.dumps(jobs, indent=2))


def _update_job(job_id: str, **fields):
    with _lock:
        jobs = _load_jobs()
        if job_id in jobs:
            jobs[job_id].update(fields)
            _save_jobs(jobs)


def enqueue(job_type: str, fn: Callable, *args, sla_seconds: Optional[int] = None, **kwargs) -> str:
    job_id = f"job_{uuid.uuid4().hex[:10]}"
    sla = sla_seconds or DEFAULT_SLA_SECONDS.get(job_type, 60)

    with _lock:
        jobs = _load_jobs()
        jobs[job_id] = {
            "id": job_id,
            "type": job_type,
            "status": "queued",
            "created_at": time.time(),
            "started_at": None,
            "completed_at": None,
            "sla_seconds": sla,
            "sla_breached": False,
            "result": None,
            "error": None,
            "retry_count": 0,
            "original_args": list(args),
            "original_kwargs": kwargs,
        }
        _save_jobs(jobs)

    def _run():
        _update_job(job_id, status="running", started_at=time.time())
        start = time.time()
        try:
            result = fn(*args, **kwargs)
            elapsed = time.time() - start
            _update_job(
                job_id, status="success", completed_at=time.time(),
                result=result, sla_breached=elapsed > sla,
            )
            log_event(feature="job_queue", action="job_completed",
                      detail={"job_id": job_id, "type": job_type, "elapsed_sec": round(elapsed, 1),
                              "sla_breached": elapsed > sla})
        except Exception as e:
            elapsed = time.time() - start
            _update_job(
                job_id, status="failed", completed_at=time.time(),
                error=str(e), sla_breached=elapsed > sla,
            )
            log_event(feature="job_queue", action="job_failed",
                      detail={"job_id": job_id, "type": job_type, "error": str(e)[:300]},
                      escalated=True)

    _executor.submit(_run)
    return job_id


def get_job(job_id: str) -> Optional[dict]:
    jobs = _load_jobs()
    job = jobs.get(job_id)
    if job and job["status"] == "running" and job["started_at"]:
        job = {**job, "at_risk": (time.time() - job["started_at"]) > job["sla_seconds"]}
    return job


def list_jobs(status: Optional[str] = None, limit: int = 50) -> list[dict]:
    jobs = list(_load_jobs().values())
    if status:
        jobs = [j for j in jobs if j["status"] == status]
    jobs.sort(key=lambda j: j["created_at"], reverse=True)
    return jobs[:limit]


def get_dead_letter_queue() -> list[dict]:
    return list_jobs(status="failed", limit=200)


_REPLAYABLE_FUNCTIONS: dict[str, Callable] = {}


def register_replayable(job_type: str, fn: Callable):
    _REPLAYABLE_FUNCTIONS[job_type] = fn


def replay(job_id: str) -> dict:
    jobs = _load_jobs()
    job = jobs.get(job_id)
    if not job:
        return {"replayed": False, "reason": "Job not found."}
    if job["status"] != "failed":
        return {"replayed": False, "reason": f"Job status is '{job['status']}', not 'failed' - nothing to replay."}

    fn = _REPLAYABLE_FUNCTIONS.get(job["type"])
    if not fn:
        return {"replayed": False, "reason": f"No replay handler registered for job type '{job['type']}'."}

    args = job.get("original_args", [])
    kwargs = job.get("original_kwargs", {})
    new_job_id = enqueue(job["type"], fn, *args, sla_seconds=job["sla_seconds"], **kwargs)
    _update_job(job_id, status="replayed", replayed_as=new_job_id)
    log_event(feature="job_queue", action="job_replayed", detail={"original_job_id": job_id, "new_job_id": new_job_id})
    return {"replayed": True, "new_job_id": new_job_id}


def get_sla_summary() -> dict:
    jobs = list(_load_jobs().values())
    completed = [j for j in jobs if j["status"] in ("success", "failed")]
    breached = [j for j in completed if j.get("sla_breached")]
    return {
        "total_jobs": len(jobs),
        "completed": len(completed),
        "sla_breached": len(breached),
        "sla_breach_rate_pct": round(100 * len(breached) / len(completed), 1) if completed else 0.0,
        "currently_running": len([j for j in jobs if j["status"] == "running"]),
        "dead_letter_queue_size": len([j for j in jobs if j["status"] == "failed"]),
    }
