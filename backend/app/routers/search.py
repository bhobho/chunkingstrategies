"""
Router for vector search endpoints.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.embeddings.ollama_client import get_embedding, DEFAULT_EMBED_MODEL
from app.search.vector_store import search, session_info, list_sessions

router = APIRouter(prefix="/search", tags=["search"])


class QueryRequest(BaseModel):
    session_id: str
    query: str
    top_k: int = Field(default=5, ge=1, le=50)
    model: str = DEFAULT_EMBED_MODEL


@router.post("/query")
async def query_search(req: QueryRequest):
    """Search for relevant chunks using semantic similarity."""
    info = session_info(req.session_id)
    if not info["exists"]:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{req.session_id}' not found. Generate embeddings first.",
        )

    try:
        query_embedding = await get_embedding(req.query, req.model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding query failed: {e}")

    results = search(req.session_id, query_embedding, req.top_k)
    return {
        "session_id": req.session_id,
        "query": req.query,
        "top_k": req.top_k,
        "results": results,
        "total_chunks_searched": info["chunk_count"],
    }


@router.get("/sessions")
async def get_sessions():
    """List all active search sessions."""
    sessions = list_sessions()
    return {
        "sessions": [session_info(s) for s in sessions],
        "count": len(sessions),
    }
