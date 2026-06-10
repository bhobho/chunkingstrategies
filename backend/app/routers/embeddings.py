"""
Router for embedding generation endpoints.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.embeddings.ollama_client import (
    get_embeddings_batch,
    DEFAULT_EMBED_MODEL,
    list_models,
)
from app.search.vector_store import add_chunks, clear, session_info

router = APIRouter(prefix="/embeddings", tags=["embeddings"])


class EmbedRequest(BaseModel):
    session_id: str
    chunks: list[dict]
    model: str = DEFAULT_EMBED_MODEL
    replace: bool = False  # if True, clear session before adding


class SingleEmbedRequest(BaseModel):
    text: str
    model: str = DEFAULT_EMBED_MODEL


@router.post("/generate")
async def generate_embeddings(req: EmbedRequest):
    """Generate embeddings for chunks and store them in the session vector store."""
    if not req.chunks:
        raise HTTPException(status_code=400, detail="No chunks provided.")

    if req.replace:
        clear(req.session_id)

    texts = [c.get("text", "") for c in req.chunks]
    try:
        embeddings = await get_embeddings_batch(texts, req.model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")

    add_chunks(req.session_id, req.chunks, embeddings)

    info = session_info(req.session_id)
    return {
        "session_id": req.session_id,
        "count": len(req.chunks),
        "total_in_session": info["chunk_count"],
        "model": req.model,
    }


@router.post("/single")
async def embed_single(req: SingleEmbedRequest):
    """Get embedding for a single text (for inspection/debugging)."""
    from app.embeddings.ollama_client import get_embedding
    emb = await get_embedding(req.text, req.model)
    return {"text": req.text[:100], "embedding": emb, "dim": len(emb), "model": req.model}


@router.get("/models")
async def get_models():
    """List available Ollama models."""
    models = await list_models()
    return {"models": models}


@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear all embeddings and chunks for a session."""
    clear(session_id)
    return {"session_id": session_id, "cleared": True}


@router.get("/session/{session_id}")
async def get_session_info(session_id: str):
    """Get info about a session's stored embeddings."""
    return session_info(session_id)
