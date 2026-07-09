import uuid
from app.core.llm import ask_llm_json
from app.services import vector_store as vs
from app.services.audit import log_event

CONTRADICTION_PROMPT = """You are a regulatory compliance auditor for an industrial plant.
Below are excerpts from different documents (procedures, inspection reports, regulations).
Identify any CONTRADICTIONS or COMPLIANCE GAPS: places where a procedure conflicts with a
newer inspection finding, where equipment doesn't meet a regulatory requirement, or where
a document is outdated relative to another.

DOCUMENT EXCERPTS:
{context}

Return JSON:
{{
  "gaps_found": [
    {{
      "description": "plain-language description of the contradiction/gap",
      "document_a": "filename or source of first conflicting statement",
      "statement_a": "the relevant statement",
      "document_b": "filename or source of second conflicting statement",
      "statement_b": "the relevant statement",
      "severity": "low|medium|high",
      "regulatory_reference": "which standard/act this relates to, if applicable"
    }}
  ],
  "overall_compliance_status": "compliant|minor_gaps|major_gaps"
}}
If no genuine contradictions exist in the given excerpts, return an empty gaps_found list.
Do not invent gaps that aren't actually supported by the text.
"""


def check_compliance(scope_query: str) -> dict:
    hits = vs.search(scope_query, top_k=8)
    context = "\n\n".join(
        f"[{h['metadata'].get('filename', 'unknown')} - {h['metadata'].get('doc_type', 'unknown')}]\n{h['text']}"
        for h in hits
    )
    if not context:
        return {"gaps_found": [], "overall_compliance_status": "unknown",
                "note": "No relevant documents found for this scope."}

    result = ask_llm_json(
        prompt=CONTRADICTION_PROMPT.format(context=context),
        system="You are a precise, conservative compliance auditor. Only flag genuine contradictions.",
        use_reasoning_model=True,
        feature="compliance",
    )

    gaps = result.get("gaps_found", [])
    high_severity = [g for g in gaps if g.get("severity") == "high"]

    audit_id = log_event(
        feature="compliance", action="compliance_check",
        detail={"scope": scope_query, "gaps_found": len(gaps)},
        escalated=len(high_severity) > 0,
    )

    return {
        "scope": scope_query,
        "gaps_found": gaps,
        "gap_count": len(gaps),
        "high_severity_count": len(high_severity),
        "overall_compliance_status": result.get("overall_compliance_status", "unknown"),
        "escalated_for_review": len(high_severity) > 0,
        "audit_id": audit_id,
    }


EVIDENCE_PACKAGE_PROMPT = """Generate a structured audit-ready compliance evidence summary for
the following scope, based on the document excerpts provided. This will be used by a plant
compliance officer preparing for an audit.

SCOPE: {scope}

DOCUMENT EXCERPTS:
{context}

Return JSON:
{{
  "scope": "{scope}",
  "summary": "2-3 sentence executive summary of compliance status for this scope",
  "applicable_regulations": ["list of regulation/standard names referenced"],
  "supporting_evidence": [
    {{"document": "filename", "relevant_excerpt": "the specific text that serves as evidence", "doc_type": "..."}}
  ],
  "open_items": ["any gaps or missing evidence that should be addressed before audit"],
  "compliance_status": "ready_for_audit|needs_attention|not_ready"
}}
"""


def generate_evidence_package(scope: str) -> dict:
    hits = vs.search(scope, top_k=10)
    context = "\n\n".join(
        f"[{h['metadata'].get('filename', 'unknown')}]\n{h['text']}" for h in hits
    )
    if not context:
        return {"scope": scope, "error": "No relevant documents found for this scope."}

    result = ask_llm_json(
        prompt=EVIDENCE_PACKAGE_PROMPT.format(scope=scope, context=context),
        system="You produce precise, audit-grade compliance summaries. Only cite evidence that is actually present.",
        feature="compliance_evidence",
    )

    package_id = f"evidence_{uuid.uuid4().hex[:8]}"
    log_event(feature="compliance_evidence", action="package_generated",
              detail={"package_id": package_id, "scope": scope})

    return {"package_id": package_id, **result}
