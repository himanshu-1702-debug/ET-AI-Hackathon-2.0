import base64
import re
import uuid
from pathlib import Path

from pypdf import PdfReader

from app.core.llm import ask_llm_json
from app.services import knowledge_graph as kg
from app.services import vector_store as vs
from app.services.audit import log_event

ENTITY_EXTRACTION_PROMPT = """You are an industrial document analyst. Extract structured entities
and relationships from the following document text.

Entity types to look for: equipment (tag numbers, machinery, lines, storage systems),
personnel (names/roles), regulation (standard/act/authority references), incident (any
failure/near-miss/accident mentioned), procedure (named safety/maintenance procedures),
date (key dates), location (departments/zones/areas mentioned).

Relationship types: "governed_by" (equipment governed by regulation), "had_incident"
(equipment had incident), "requires_procedure", "inspected_by", "located_in",
"references" (document references another standard).

Document text:
---
{text}
---

Return JSON exactly in this shape:
{{
  "entities": [
    {{"id": "equipment:example-tag", "type": "equipment", "label": "Example Equipment Name"}},
    ...
  ],
  "relationships": [
    {{"source": "equipment:example-tag", "target": "regulation:example-standard", "relation": "governed_by"}},
    ...
  ]
}}

Use lowercase-hyphenated ids prefixed by type (e.g. "equipment:", "regulation:", "incident:",
"personnel:", "procedure:", "location:"). If an entity id is ambiguous, make a reasonable
consistent choice so the SAME real-world entity always gets the SAME id across calls.
"""


def _chunk_text(text: str, chunk_size: int = 1200, overlap: int = 150) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return [c.strip() for c in chunks if c.strip()]


def _extract_pdf_text(file_path: Path) -> str:
    reader = PdfReader(str(file_path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def extract_entities_and_link(text: str, doc_id: str, doc_type: str) -> dict:
    result = ask_llm_json(
        prompt=ENTITY_EXTRACTION_PROMPT.format(text=text[:6000]),
        system="You are a precise industrial data extraction engine. Only extract what is "
               "explicitly stated or strongly implied in the text. Do not invent entities.",
        feature="ingestion",
    )
    entities = result.get("entities", [])
    relationships = result.get("relationships", [])

    for e in entities:
        kg.add_entity(
            entity_id=e["id"], entity_type=e["type"], label=e["label"],
            source_doc=doc_id, doc_type=doc_type,
        )
    for r in relationships:
        kg.add_relationship(r["source"], r["target"], relation=r["relation"], source_doc=doc_id)

    log_event(
        feature="ingestion", action="entities_extracted",
        detail={"doc_id": doc_id, "entity_count": len(entities), "relationship_count": len(relationships)},
    )
    return {"entities": entities, "relationships": relationships}


def ingest_document(file_path, doc_type: str, original_filename: str) -> dict:
    file_path = Path(file_path)
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"

    if file_path.suffix.lower() == ".pdf":
        text = _extract_pdf_text(file_path)
    else:
        text = file_path.read_text(errors="ignore")

    if not text.strip():
        return {"doc_id": doc_id, "error": "No extractable text found in document."}

    chunks = _chunk_text(text)
    metadatas = [
        {"source_doc": doc_id, "doc_type": doc_type, "chunk_index": i, "filename": original_filename}
        for i in range(len(chunks))
    ]
    try:
        vs.add_chunks(doc_id, chunks, metadatas)
    except Exception as e:
        import traceback
        print(f"Vector store write failed for {original_filename}: {e}")
        traceback.print_exc()
        log_event(feature="ingestion", action="vector_store_write_failed",
                  detail={"doc_id": doc_id, "error": str(e)[:300]}, escalated=True)

    extraction = extract_entities_and_link(text, doc_id, doc_type)

    return {
        "doc_id": doc_id,
        "filename": original_filename,
        "doc_type": doc_type,
        "chunk_count": len(chunks),
        "entities_found": len(extraction["entities"]),
        "relationships_found": len(extraction["relationships"]),
        "entities": extraction["entities"],
        "relationships": extraction["relationships"],
    }


PID_EXTRACTION_PROMPT = """This image is a Piping & Instrumentation Diagram (P&ID) or engineering
drawing. Identify all visible equipment tags/labels and the connections between them.

Return JSON exactly in this shape:
{
  "entities": [
    {"id": "equipment:pump-101", "type": "equipment", "label": "Pump 101"}
  ],
  "relationships": [
    {"source": "equipment:pump-101", "target": "equipment:tank-201", "relation": "connected_to"}
  ]
}
If text is unclear, make your best reasonable reading rather than omitting the entity."""


def ingest_pid_drawing(image_path, original_filename: str) -> dict:
    from app.core.llm import _get_client
    from app.core.config import settings

    image_path = Path(image_path)
    doc_id = f"pid_{uuid.uuid4().hex[:8]}"
    image_bytes = image_path.read_bytes()
    media_type = "image/png" if image_path.suffix.lower() == ".png" else "image/jpeg"
    b64 = base64.standard_b64encode(image_bytes).decode()

    client = _get_client()
    response = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=1500,
        system="You are precise at reading engineering drawings. Respond with ONLY valid JSON, no markdown fences.",
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                {"type": "text", "text": PID_EXTRACTION_PROMPT},
            ],
        }],
    )
    raw = "".join(b.text for b in response.content if b.type == "text")
    import json
    cleaned = raw.strip().strip("`")
    if cleaned.startswith("json"):
        cleaned = cleaned[4:]
    try:
        result = json.loads(cleaned.strip())
    except json.JSONDecodeError:
        result = {"entities": [], "relationships": [], "parse_error": raw[:300]}

    for e in result.get("entities", []):
        kg.add_entity(entity_id=e["id"], entity_type=e["type"], label=e["label"],
                       source_doc=doc_id, doc_type="pid_drawing")
    for r in result.get("relationships", []):
        kg.add_relationship(r["source"], r["target"], relation=r["relation"], source_doc=doc_id)

    log_event(feature="pid_digitisation", action="drawing_processed",
              detail={"doc_id": doc_id, "entities_found": len(result.get("entities", []))})

    return {
        "doc_id": doc_id, "filename": original_filename, "doc_type": "pid_drawing",
        "entities_found": len(result.get("entities", [])),
        "relationships_found": len(result.get("relationships", [])),
        "entities": result.get("entities", []),
        "relationships": result.get("relationships", []),
    }


THREAD_MINING_PROMPT = """The following is an informal communication thread (email or WhatsApp
chat) from an industrial plant. Extract any OPERATIONAL KNOWLEDGE embedded in it: decisions made,
workarounds mentioned, exceptions to standard procedure, or informal warnings passed between
colleagues. Ignore pure small talk.

Thread:
---
{text}
---

Return JSON:
{{
  "knowledge_items": [
    {{"summary": "plain-language summary of the knowledge", "type": "decision|workaround|warning|exception",
      "related_equipment": "equipment:xyz or null"}}
  ],
  "entities": [{{"id": "...", "type": "...", "label": "..."}}],
  "relationships": [{{"source": "...", "target": "...", "relation": "..."}}]
}}
"""


def ingest_thread(text: str, source_label: str = "whatsapp_thread") -> dict:
    doc_id = f"thread_{uuid.uuid4().hex[:8]}"
    result = ask_llm_json(
        prompt=THREAD_MINING_PROMPT.format(text=text[:4000]),
        system="You extract only genuinely useful operational knowledge, not small talk.",
        feature="thread_mining",
    )
    knowledge_items = result.get("knowledge_items", [])
    entities = result.get("entities", [])
    relationships = result.get("relationships", [])

    if knowledge_items:
        chunk_texts = [k["summary"] for k in knowledge_items]
        metadatas = [
            {"source_doc": doc_id, "doc_type": "informal_thread", "chunk_index": i,
             "filename": source_label, "knowledge_type": k.get("type", "unknown")}
            for i, k in enumerate(knowledge_items)
        ]
        try:
            vs.add_chunks(doc_id, chunk_texts, metadatas)
        except Exception as e:
            print(f"Vector store write failed for thread {source_label}: {e}")
            log_event(feature="thread_mining", action="vector_store_write_failed",
                      detail={"doc_id": doc_id, "error": str(e)[:300]}, escalated=True)

    for e in entities:
        kg.add_entity(entity_id=e["id"], entity_type=e["type"], label=e["label"],
                       source_doc=doc_id, doc_type="informal_thread")
    for r in relationships:
        kg.add_relationship(r["source"], r["target"], relation=r["relation"], source_doc=doc_id)

    log_event(feature="thread_mining", action="thread_processed",
              detail={"doc_id": doc_id, "knowledge_items_found": len(knowledge_items)})

    return {
        "doc_id": doc_id, "knowledge_items": knowledge_items,
        "entities_found": len(entities), "relationships_found": len(relationships),
    }
