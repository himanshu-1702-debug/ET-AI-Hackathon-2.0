from app.core.llm import ask_llm_json
from app.services import vector_store as vs
from app.services.audit import log_event

PATTERN_MINING_PROMPT = """You are a safety intelligence analyst reviewing ALL incident reports,
near-miss records, audit findings, and quality non-conformances across an organisation's full
document history. Your job is to find PATTERNS that no single reviewer would notice because the
individual reports were filed separately, by different people, at different times.

ALL RELEVANT EXCERPTS FROM THE FULL CORPUS:
{context}

Look specifically for:
- The same type of near-miss/issue occurring multiple times in different reports
- A recurring theme across reports filed by different shifts/teams/dates
- An issue that individually looks minor but is systemic when viewed across all reports

Return JSON:
{{
  "patterns_found": [
    {{
      "pattern_description": "clear description of the systemic pattern",
      "supporting_evidence": ["brief reference to each report/document that supports this pattern"],
      "occurrence_count": <int>,
      "risk_level": "low|medium|high",
      "recommended_action": "specific proactive action to prevent recurrence",
      "affected_area_or_equipment": "zone/equipment class this pattern relates to"
    }}
  ]
}}
Only report patterns with at least 2 supporting pieces of evidence. Do not invent patterns.
If fewer than 2 genuinely related pieces of evidence exist, return an empty patterns_found list.
"""


def mine_patterns(focus_area: str = "", external_sources: list[dict] | None = None) -> dict:
    query = focus_area if focus_area else "incident near-miss safety issue permit inspection"
    hits = vs.search(query, top_k=15)
    context = "\n\n".join(
        f"[{h['metadata'].get('filename', 'unknown')} | {h['metadata'].get('doc_type', 'unknown')}]\n{h['text']}"
        for h in hits
    )
    if not context:
        return {"patterns_found": [], "note": "No documents available to mine yet."}

    result = ask_llm_json(
        prompt=PATTERN_MINING_PROMPT.format(context=context),
        system="You are a conservative safety analyst. Only report patterns genuinely supported by 2+ pieces of evidence.",
        use_reasoning_model=True,
        max_tokens=2000,
        feature="lessons_learned",
    )

    patterns = result.get("patterns_found", [])
    high_risk = [p for p in patterns if p.get("risk_level") == "high"]

    audit_id = log_event(
        feature="lessons_learned", action="pattern_scan",
        detail={"focus_area": focus_area or "broad_scan", "patterns_found": len(patterns)},
        escalated=len(high_risk) > 0,
    )

    return {
        "focus_area": focus_area or "broad_scan",
        "patterns_found": patterns,
        "pattern_count": len(patterns),
        "high_risk_count": len(high_risk),
        "escalated_for_review": len(high_risk) > 0,
        "audit_id": audit_id,
    }
