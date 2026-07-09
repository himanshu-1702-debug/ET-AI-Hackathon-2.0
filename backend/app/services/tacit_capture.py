import uuid
from app.core.llm import ask_llm, ask_llm_json
from app.services import knowledge_graph as kg
from app.services import vector_store as vs
from app.services.audit import log_event

NEXT_QUESTION_PROMPT = """You are conducting a structured knowledge-capture interview with an
experienced industrial worker who is about to retire or change roles. Your goal is to surface
undocumented "tribal knowledge" - things they know that are NOT written in any manual.

EQUIPMENT/AREA OF EXPERTISE: {expertise_area}

CONVERSATION SO FAR:
{conversation_history}

Ask ONE good follow-up question to surface a specific, concrete piece of undocumented knowledge
(a common mistake new hires make, an early warning sign they watch for, a workaround they use,
an exception to standard procedure). If the conversation already has 4+ exchanges, instead of a
new question, return a wrap-up message thanking them.

Return JSON:
{{
  "message": "the question or wrap-up message to show the worker",
  "is_final": <bool>
}}
"""

STRUCTURE_PROMPT = """Convert this knowledge-capture interview transcript into structured
knowledge graph entries.

EXPERTISE AREA: {expertise_area}
TRANSCRIPT:
{conversation_history}

Return JSON:
{{
  "captured_knowledge": [
    {{"summary": "plain-language summary of one piece of tacit knowledge",
      "category": "common_mistake|early_warning_sign|workaround|procedure_exception"}}
  ],
  "entities": [{{"id": "...", "type": "...", "label": "..."}}],
  "relationships": [{{"source": "...", "target": "...", "relation": "tacit_knowledge_about"}}]
}}
"""


def get_next_interview_question(expertise_area: str, conversation_history: list[dict]) -> dict:
    history_text = "\n".join(f"{m['role']}: {m['content']}" for m in conversation_history) or "(interview just starting)"
    result = ask_llm_json(
        prompt=NEXT_QUESTION_PROMPT.format(expertise_area=expertise_area, conversation_history=history_text),
        system="You are a warm, respectful interviewer skilled at drawing out specific tacit knowledge.",
        feature="tacit_capture",
    )
    return result


def finalize_capture(expertise_area: str, conversation_history: list[dict]) -> dict:
    history_text = "\n".join(f"{m['role']}: {m['content']}" for m in conversation_history)
    session_id = f"tacit_{uuid.uuid4().hex[:8]}"

    result = ask_llm_json(
        prompt=STRUCTURE_PROMPT.format(expertise_area=expertise_area, conversation_history=history_text),
        system="You precisely convert interview transcripts into structured knowledge.",
        feature="tacit_capture",
    )

    captured = result.get("captured_knowledge", [])
    if captured:
        chunk_texts = [c["summary"] for c in captured]
        metadatas = [
            {"source_doc": session_id, "doc_type": "tacit_knowledge", "chunk_index": i,
             "filename": f"tacit_capture_{expertise_area}", "category": c.get("category", "unknown")}
            for i, c in enumerate(captured)
        ]
        vs.add_chunks(session_id, chunk_texts, metadatas)

    for e in result.get("entities", []):
        kg.add_entity(entity_id=e["id"], entity_type=e["type"], label=e["label"],
                       source_doc=session_id, doc_type="tacit_knowledge")
    for r in result.get("relationships", []):
        kg.add_relationship(r["source"], r["target"], relation=r["relation"], source_doc=session_id)

    log_event(feature="tacit_capture", action="session_finalized",
              detail={"session_id": session_id, "expertise_area": expertise_area, "items_captured": len(captured)})

    return {"session_id": session_id, "captured_knowledge": captured, "entities_created": len(result.get("entities", []))}
