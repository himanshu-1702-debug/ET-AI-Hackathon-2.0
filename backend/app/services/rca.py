import re
from app.core.llm import ask_llm_json
from app.services import vector_store as vs
from app.services import knowledge_graph as kg
from app.services.audit import log_event

RCA_PROMPT = """You are a maintenance root-cause-analysis expert. An equipment failure has been
reported. Using the document excerpts and knowledge graph relationships below, build a root
cause analysis.

EQUIPMENT / FAILURE: {equipment_query}

RELATED DOCUMENT EXCERPTS:
{doc_context}

KNOWLEDGE GRAPH RELATIONSHIPS (related incidents, maintenance records, procedures):
{graph_context}

Return JSON:
{{
  "equipment": "{equipment_query}",
  "probable_root_causes": ["ranked list of likely root causes based on the evidence"],
  "contributing_factors": ["secondary factors that contributed"],
  "related_past_incidents": ["brief description of any similar past incidents found in the evidence"],
  "systemic_pattern_detected": <bool, true if this failure mode has occurred more than once across
                                 similar equipment based on the evidence>,
  "systemic_pattern_description": "if true above, describe the pattern; else null",
  "recommended_actions": ["specific, actionable recommendations"],
  "confidence": <float 0.0-1.0>
}}
Base every claim strictly on the provided evidence. If evidence is thin, say so and lower confidence.
"""


def _find_seed_entities(query: str, limit: int = 5) -> list[dict]:
    words = re.findall(r"[A-Za-z0-9\-]+", query)
    candidates = []
    seen_ids = set()
    for w in words:
        if len(w) < 3:
            continue
        matches = kg.search_nodes_by_label(w, limit=3)
        for m in matches:
            if m["id"] not in seen_ids:
                candidates.append(m)
                seen_ids.add(m["id"])
    return candidates[:limit]


def analyze_rca(equipment_query: str) -> dict:
    doc_hits = vs.search(equipment_query, top_k=8)
    doc_context = "\n\n".join(
        f"[{h['metadata'].get('filename', 'unknown')}]\n{h['text']}" for h in doc_hits
    ) or "(no matching documents found)"

    seed_entities = _find_seed_entities(equipment_query, limit=3)
    graph_facts = []
    for entity in seed_entities:
        hops = kg.get_neighbors(entity["id"], max_hops=2)
        for h in hops:
            graph_facts.append(f"{h['from']} --[{h['relation']}]--> {h['to']}")
    graph_context = "\n".join(graph_facts) or "(no graph relationships found)"

    result = ask_llm_json(
        prompt=RCA_PROMPT.format(equipment_query=equipment_query, doc_context=doc_context, graph_context=graph_context),
        system="You are a rigorous maintenance engineer. Do not speculate beyond the evidence provided.",
        use_reasoning_model=True,
        max_tokens=2000,
        feature="rca",
    )

    confidence = result.get("confidence", 0.5)
    escalated = confidence < 0.6 or result.get("systemic_pattern_detected", False)

    audit_id = log_event(
        feature="rca", action="rca_generated",
        detail={"equipment": equipment_query, "root_causes": result.get("probable_root_causes", [])},
        confidence=confidence, escalated=escalated,
    )

    return {**result, "escalated_for_review": escalated, "audit_id": audit_id,
            "graph_facts_used": graph_facts}
