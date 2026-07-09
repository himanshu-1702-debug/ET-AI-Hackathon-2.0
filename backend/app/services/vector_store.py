import chromadb
from pathlib import Path
from typing import Optional

from app.core.config import settings

_client = None
_collection = None


def _get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=str(settings.VECTOR_STORE_DIR))
        _collection = _client.get_or_create_collection(name="plant_documents")
    return _collection


def add_chunks(doc_id: str, chunks: list[str], metadatas: list[dict]):
    collection = _get_collection()
    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    collection.add(documents=chunks, metadatas=metadatas, ids=ids)


def search(query: str, top_k: int = 5, doc_type_filter: Optional[str] = None) -> list[dict]:
    collection = _get_collection()
    if collection.count() == 0:
        return []
    where = {"doc_type": doc_type_filter} if doc_type_filter else None
    results = collection.query(query_texts=[query], n_results=min(top_k, collection.count()), where=where)
    output = []
    for i in range(len(results["documents"][0])):
        output.append({
            "text": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i] if results.get("distances") else None,
            "id": results["ids"][0][i],
        })
    return output


def count() -> int:
    return _get_collection().count()


def reset():
    global _client, _collection
    _client = chromadb.PersistentClient(path=str(settings.VECTOR_STORE_DIR))
    try:
        _client.delete_collection("plant_documents")
    except Exception:
        pass
    _collection = _client.get_or_create_collection(name="plant_documents")
