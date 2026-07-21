from pathlib import Path

from app.core.config import settings
from app.services import knowledge_graph as kg
from app.services import ingestion
from app.services.audit import log_event

SAMPLE_DATA_DIR = settings.DATA_DIR.parent.parent.parent / "sample_data"

DOCUMENT_SEED_MAP = {
    "regulatory_reference_summary.txt": "regulation",
    "hot_work_permit_grinding_section_feb2026.txt": "permit",
    "hot_work_permit_storage_racking_sep2025.txt": "permit",
    "confined_space_permit_storage_silo_sep2025.txt": "permit",
    "electrical_isolation_permit_packaging_nov2025.txt": "permit",
    "maintenance_log_rack_storage_system.txt": "maintenance_log",
    "maintenance_log_salt_grinding_line.txt": "maintenance_log",
    "maintenance_log_grinding_goods_lift.txt": "maintenance_log",
    "maintenance_log_sprinkler_packing_line.txt": "maintenance_log",
    "maintenance_log_roaster_unit.txt": "maintenance_log",
    "near_miss_rack_beam_deformation_apr2025.txt": "incident_report",
    "near_miss_rack_beam_deformation_dec2025.txt": "incident_report",
    "near_miss_bird_exposure_grinding_may2025.txt": "incident_report",
    "near_miss_bird_exposure_grinding_jan2026.txt": "incident_report",
    "near_miss_combustible_dust_grinding_jun2025.txt": "incident_report",
    "near_miss_combustible_dust_grinding_mar2026.txt": "incident_report",
    "incident_uncovered_unloading_bay_rain_damage_jul2025.txt": "incident_report",
}

THREAD_SEED_FILES = [
    "sample_whatsapp_thread_grinding_dust.txt",
    "sample_whatsapp_thread_storage_racks.txt",
    "sample_whatsapp_thread_packaging_birds.txt",
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
