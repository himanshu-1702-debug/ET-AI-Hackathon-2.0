from app.core.llm import ask_llm_json
from app.services import vector_store as vs
from app.services.audit import log_event

PATH_GENERATION_PROMPT = """Generate a structured onboarding knowledge path for a new employee.

ROLE: {role}
ASSIGNED AREA/EQUIPMENT: {area}

RELEVANT DOCUMENT EXCERPTS AVAILABLE:
{context}

Return JSON:
{{
  "role": "{role}",
  "area": "{area}",
  "learning_path": [
    {{
      "step": 1,
      "topic": "short topic title",
      "why_it_matters": "one sentence on why a new hire needs this first",
      "source_documents": ["filenames this step draws from"],
      "key_points": ["2-4 bullet-point takeaways"]
    }}
  ],
  "estimated_ramp_up_days": <int, a reasonable estimate>
}}
Order steps from foundational/safety-critical to more specialized. Base content only on
the provided excerpts - if excerpts are sparse, keep the path shorter rather than inventing content.
"""


def generate_onboarding_path(role: str, area: str) -> dict:
    query = f"{role} {area} procedure safety equipment"
    hits = vs.search(query, top_k=8)
    context = "\n\n".join(
        f"[{h['metadata'].get('filename', 'unknown')}]\n{h['text']}" for h in hits
    ) or "(no matching documents found)"

    result = ask_llm_json(
        prompt=PATH_GENERATION_PROMPT.format(role=role, area=area, context=context),
        system="You design clear, safety-first onboarding paths for industrial new hires.",
        feature="onboarding",
    )

    log_event(feature="onboarding", action="path_generated",
              detail={"role": role, "area": area, "steps": len(result.get("learning_path", []))})

    return result
