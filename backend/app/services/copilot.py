import re
from app.core.llm import ask_llm, ask_llm_json
from app.services import vector_store as vs
from app.services import knowledge_graph as kg
from app.services.audit import log_event

ANSWER_PROMPT = """You are an industrial knowledge copilot. Answer the user's question using
ONLY the context provided below (vector-retrieved document excerpts AND knowledge graph
relationships). If the context is insufficient, say so honestly rather than guessing.

USER QUESTION: {question}

DOCUMENT EXCERPTS (from vector search):
{doc_context}

KNOWLEDGE GRAPH RELATIONSHIPS (from graph traversal):
{graph_context}

Return JSON:
{{
  "answer": "clear, direct answer in plain language",
  "confidence": <float 0.0-1.0, your genuine confidence this answer is correct and complete>,
  "reasoning_hops": <int, how many distinct facts/relationships you had to connect to answer>,
  "used_graph": <bool, whether the graph relationships were necessary to answer>,
  "needs_escalation": <bool, true if confidence < 0.6 or the question involves a safety/compliance
                        judgment call that should go to a human expert rather than be auto-answered>
}}
"""


def _mentioned_entities(question: str) -> list[dict]:
    words = re.findall(r"[A-Za-z0-9\-]+", question)
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
    return candidates[:5]


def ask_copilot(question: str, max_hops: int = 2, language: str = "en") -> dict:
    doc_hits = vs.search(question, top_k=5)
    doc_context = "\n\n".join(
        f"[Source: {h['metadata'].get('filename', 'unknown')}, chunk {h['metadata'].get('chunk_index')}]\n{h['text']}"
        for h in doc_hits
    ) or "(no matching document excerpts found)"

    seed_entities = _mentioned_entities(question)
    graph_facts = []
    for entity in seed_entities:
        hops = kg.get_neighbors(entity["id"], max_hops=max_hops)
        for h in hops:
            graph_facts.append(
                f"{h['from']} --[{h['relation']}]--> {h['to']} (hop {h['hop']})"
            )
    graph_context = "\n".join(graph_facts) or "(no relevant graph relationships found)"

    lang_instruction = ""
    if language != "en":
        lang_map = {"hi": "Hindi", "mr": "Marathi", "ta": "Tamil"}
        lang_instruction = f"\n\nIMPORTANT: Write the 'answer' field in {lang_map.get(language, language)}."

    result = ask_llm_json(
        prompt=ANSWER_PROMPT.format(question=question, doc_context=doc_context, graph_context=graph_context) + lang_instruction,
        system="You are a rigorous, honest industrial knowledge assistant. Never fabricate facts not in the context.",
        use_reasoning_model=True,
        feature="copilot",
    )

    confidence = result.get("confidence", 0.5)
    escalated = result.get("needs_escalation", False) or confidence < 0.6

    citations = [
        {"filename": h["metadata"].get("filename"), "doc_type": h["metadata"].get("doc_type"),
         "chunk_index": h["metadata"].get("chunk_index"), "excerpt": h["text"][:200]}
        for h in doc_hits
    ]

    audit_id = log_event(
        feature="copilot", action="query_answered",
        detail={"question": question, "answer": result.get("answer", "")},
        sources=citations, confidence=confidence, escalated=escalated,
    )

    return {
        "answer": result.get("answer", "Unable to generate an answer."),
        "confidence": confidence,
        "reasoning_hops": result.get("reasoning_hops", 0),
        "used_graph": result.get("used_graph", False),
        "escalated_for_review": escalated,
        "citations": citations,
        "graph_facts_used": graph_facts,
        "audit_id": audit_id,
    }
