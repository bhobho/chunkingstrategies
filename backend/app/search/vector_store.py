"""
In-memory vector store using numpy cosine similarity.
Session-scoped: keyed by session_id so multiple tabs work independently.
"""

import numpy as np
from typing import Any

# Global session store: { session_id: { "chunks": [...], "embeddings": np.ndarray } }
_store: dict[str, dict[str, Any]] = {}


def _cosine_similarity(query: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    """
    Compute cosine similarity between a query vector and each row in matrix.
    query: shape (dim,)
    matrix: shape (n, dim)
    Returns: shape (n,)
    """
    query_norm = np.linalg.norm(query)
    if query_norm == 0:
        return np.zeros(matrix.shape[0])
    matrix_norms = np.linalg.norm(matrix, axis=1)
    matrix_norms[matrix_norms == 0] = 1e-10
    dots = matrix @ query
    return dots / (matrix_norms * query_norm)


def add_chunks(session_id: str, chunks: list[dict], embeddings: list[list[float]]) -> None:
    """
    Add chunks and their embeddings to a session.
    If session already has data, appends to it.
    """
    if not chunks or not embeddings:
        return

    new_matrix = np.array(embeddings, dtype=np.float32)

    if session_id not in _store:
        _store[session_id] = {"chunks": list(chunks), "embeddings": new_matrix}
    else:
        existing = _store[session_id]
        existing["chunks"].extend(chunks)
        existing["embeddings"] = np.vstack([existing["embeddings"], new_matrix])


def search(
    session_id: str,
    query_embedding: list[float],
    top_k: int = 5,
) -> list[dict]:
    """
    Search for the top_k most similar chunks in a session.
    Returns list of { chunk, score, rank }.
    """
    if session_id not in _store:
        return []

    session = _store[session_id]
    chunks = session["chunks"]
    matrix = session["embeddings"]

    if len(chunks) == 0:
        return []

    query = np.array(query_embedding, dtype=np.float32)
    scores = _cosine_similarity(query, matrix)

    # Get top_k indices sorted by score descending
    k = min(top_k, len(chunks))
    top_indices = np.argsort(scores)[::-1][:k]

    results = []
    for rank, idx in enumerate(top_indices, start=1):
        results.append(
            {
                "chunk": chunks[int(idx)],
                "score": float(scores[int(idx)]),
                "rank": rank,
            }
        )
    return results


def clear(session_id: str) -> None:
    """Remove all data for a session."""
    _store.pop(session_id, None)


def session_info(session_id: str) -> dict:
    """Return basic info about a session."""
    if session_id not in _store:
        return {"session_id": session_id, "chunk_count": 0, "exists": False}
    session = _store[session_id]
    return {
        "session_id": session_id,
        "chunk_count": len(session["chunks"]),
        "embedding_dim": int(session["embeddings"].shape[1]) if len(session["chunks"]) > 0 else 0,
        "exists": True,
    }


def list_sessions() -> list[str]:
    """List all active session IDs."""
    return list(_store.keys())
