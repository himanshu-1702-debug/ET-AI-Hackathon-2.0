import threading
import chromadb
from pathlib import Path
from typing import Optional

from app.core.config import settings

_client = None
_collection = None
_lock = threading.Lock()


def _get_collection():
    global _client, _collection
    with _lock:
        if _collection is None:
            _client = chromadb.PersistentClient(path=str(settings.VECTOR_STORE_DIR))
            _collection = _client.get_or_create_collection(name="plant_documents")
        return _collection


def add_chunks(doc_id: str, chunks: list[str], metadatas: list[dict]):
    collection = _get_collection()
    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    with _lock:
        collection.add(documents=chunks, metadatas=metadatas, ids=ids)


def search(query: str, top_k: int = 5, doc_type_filter: Optional[str] = None) -> list[dict]:
    collection = _get_collection()
    with _lock:
        current_count = collection.count()
        if current_count == 0:
            return []
        where = {"doc_type": doc_type_filter} if doc_type_filter else None
        results = collection.query(query_texts=[query], n_results=min(top_k, current_count), where=where)
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
    collection = _get_collection()
    with _lock:
        return collection.count()


def reset():
    global _client, _collection
    with _lock:
        _client = chromadb.PersistentClient(path=str(settings.VECTOR_STORE_DIR))
        try:
            _client.delete_collection("plant_documents")
        except Exception:
            pass
        _collection = _client.get_or_create_collection(name="plant_documents")
