from pathlib import Path

from app.core.config import settings
from app.services import knowledge_graph as kg
from app.services import ingestion
from app.services.audit import log_event

SAMPLE_DATA_DIR = settings.DATA_DIR.parent.parent.parent / "sample_data"

DOCUMENT_SEED_MAP = {
    "regulatory_reference_summary.txt": "regulation",
    "hot_work_permit_bay3.txt": "permit",
    "confined_space_permit_zonec.txt": "permit",
    "hot_work_permit_zoneA_may2025.txt": "permit",
    "confined_space_permit_zoneA_may2025.txt": "permit",
    "hot_work_permit_zoneB_oct2025.txt": "permit",
    "confined_space_permit_zoneB_oct2025.txt": "permit",
    "electrical_isolation_permit_zoneB_apr2026.txt": "permit",
    "hot_work_permit_zoneD_sep2025.txt": "permit",
    "maintenance_log_compressor_b12.txt": "maintenance_log",
    "maintenance_log_pump_p204.txt": "maintenance_log",
    "maintenance_log_valve_v88.txt": "maintenance_log",
    "maintenance_log_turbine_t15.txt": "maintenance_log",
    "maintenance_log_heat_exchanger_he33.txt": "maintenance_log",
    "incident_report_valve_v88_leak_mar2025.txt": "incident_report",
    "incident_report_valve_v88_leak_nov2025.txt": "incident_report",
    "near_miss_report_zoneA_lifting_jun2025.txt": "incident_report",
    "near_miss_report_zoneD_turbine_vibration_sep2025.txt": "incident_report",
    "incident_report_heat_exchanger_overheat_feb2026.txt": "incident_report",
    "near_miss_report_zoneB_electrical_apr2026.txt": "incident_report",
}

THREAD_SEED_FILES = [
    "sample_whatsapp_thread.txt",
    "sample_whatsapp_thread_zoneA_pump.txt",
    "sample_whatsapp_thread_zoneB_valve.txt",
]


def needs_seeding() -> bool:
    return kg.get_full_graph_summary()["node_count"] == 0


def run_seed_if_needed():
    if not settings.has_valid_key:
        return
    if not needs_seeding():
        return
    if not SAMPLE_DATA_DIR.exists():
        return

    for filename, doc_type in DOCUMENT_SEED_MAP.items():
        file_path = SAMPLE_DATA_DIR / filename
        if file_path.exists():
            try:
                ingestion.ingest_document(str(file_path), doc_type, filename)
            except Exception as e:
                log_event(feature="seed", action="seed_document_failed",
                          detail={"filename": filename, "error": str(e)[:300]}, escalated=True)

    for filename in THREAD_SEED_FILES:
        file_path = SAMPLE_DATA_DIR / filename
        if file_path.exists():
            try:
                text = file_path.read_text(errors="ignore")
                ingestion.ingest_thread(text, filename)
            except Exception as e:
                log_event(feature="seed", action="seed_thread_failed",
                          detail={"filename": filename, "error": str(e)[:300]}, escalated=True)
