import json
import networkx as nx
from pathlib import Path
from typing import Optional

from app.core.config import settings

GRAPH_FILE = settings.GRAPH_STORE_DIR / "graph.json"

_graph: Optional[nx.MultiDiGraph] = None


def _load() -> nx.MultiDiGraph:
    global _graph
    if _graph is not None:
        return _graph
    if GRAPH_FILE.exists():
        data = json.loads(GRAPH_FILE.read_text())
        g = nx.MultiDiGraph()
        for n in data["nodes"]:
            g.add_node(n["id"], **n["attrs"])
        for e in data["edges"]:
            g.add_edge(e["source"], e["target"], relation=e["relation"], **e.get("attrs", {}))
        _graph = g
    else:
        _graph = nx.MultiDiGraph()
    return _graph


def _persist():
    g = _load()
    data = {
        "nodes": [{"id": n, "attrs": attrs} for n, attrs in g.nodes(data=True)],
        "edges": [
            {"source": u, "target": v, "relation": d.get("relation", "related_to"),
             "attrs": {k: v2 for k, v2 in d.items() if k != "relation"}}
            for u, v, d in g.edges(data=True)
        ],
    }
    GRAPH_FILE.write_text(json.dumps(data, indent=2))


def add_entity(entity_id: str, entity_type: str, label: str, **attrs):
    g = _load()
    g.add_node(entity_id, type=entity_type, label=label, **attrs)
    _persist()


def add_relationship(source_id: str, target_id: str, relation: str, **attrs):
    g = _load()
    if source_id not in g:
        g.add_node(source_id, type="unknown", label=source_id)
    if target_id not in g:
        g.add_node(target_id, type="unknown", label=target_id)
    g.add_edge(source_id, target_id, relation=relation, **attrs)
    _persist()


def get_entity(entity_id: str) -> Optional[dict]:
    g = _load()
    if entity_id not in g:
        return None
    return {"id": entity_id, **g.nodes[entity_id]}


def get_neighbors(entity_id: str, max_hops: int = 1) -> list[dict]:
    g = _load()
    if entity_id not in g:
        return []
    visited = {entity_id}
    frontier = {entity_id}
    results = []
    for hop in range(max_hops):
        next_frontier = set()
        for node in frontier:
            for _, target, data in g.out_edges(node, data=True):
                if target not in visited:
                    results.append({
                        "from": node, "to": target,
                        "relation": data.get("relation", "related_to"),
                        "hop": hop + 1,
                        "target_info": {"id": target, **g.nodes[target]},
                    })
                    visited.add(target)
                    next_frontier.add(target)
            for source, _, data in g.in_edges(node, data=True):
                if source not in visited:
                    results.append({
                        "from": source, "to": node,
                        "relation": data.get("relation", "related_to"),
                        "hop": hop + 1,
                        "target_info": {"id": source, **g.nodes[source]},
                    })
                    visited.add(source)
                    next_frontier.add(source)
        frontier = next_frontier
    return results


def find_entities_by_type(entity_type: str) -> list[dict]:
    g = _load()
    return [{"id": n, **d} for n, d in g.nodes(data=True) if d.get("type") == entity_type]


def reset():
    global _graph
    _graph = nx.MultiDiGraph()
    if GRAPH_FILE.exists():
        GRAPH_FILE.unlink()


def get_full_graph_summary() -> dict:
    g = _load()
    nodes = [{"id": n, **d} for n, d in g.nodes(data=True)]
    edges = [
        {"source": u, "target": v, "relation": d.get("relation", "related_to")}
        for u, v, d in g.edges(data=True)
    ]
    type_counts: dict[str, int] = {}
    for n in nodes:
        t = n.get("type", "unknown")
        type_counts[t] = type_counts.get(t, 0) + 1
    return {
        "node_count": len(nodes),
        "edge_count": len(edges),
        "nodes": nodes,
        "edges": edges,
        "type_counts": type_counts,
        "linkage_completeness_pct": round(
            100 * sum(1 for n in g.nodes() if g.degree(n) > 0) / max(len(nodes), 1), 1
        ),
    }


def search_nodes_by_label(query: str, limit: int = 10) -> list[dict]:
    g = _load()
    query_lower = query.lower()
    matches = [
        {"id": n, **d} for n, d in g.nodes(data=True)
        if query_lower in str(d.get("label", "")).lower() or query_lower in n.lower()
    ]
    return matches[:limit]
