"""
Router for end-to-end RAG (Retrieval-Augmented Generation) endpoint.
"""

import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.embeddings.ollama_client import (
    get_embedding,
    chat,
    DEFAULT_EMBED_MODEL,
    DEFAULT_LLM_MODEL,
)
from app.search.vector_store import search, session_info

router = APIRouter(prefix="/rag", tags=["rag"])


class RAGRequest(BaseModel):
    session_id: str
    question: str
    top_k: int = Field(default=5, ge=1, le=20)
    embed_model: str = DEFAULT_EMBED_MODEL
    llm_model: str = DEFAULT_LLM_MODEL
    max_context_tokens: int = 2000


def _build_prompt(question: str, context_chunks: list[dict]) -> str:
    context_parts = []
    for i, item in enumerate(context_chunks, start=1):
        chunk = item["chunk"]
        score = item["score"]
        context_parts.append(f"[Source {i} | relevance: {score:.3f}]\n{chunk['text']}")

    context_str = "\n\n---\n\n".join(context_parts)
    return (
        f"You are a helpful assistant. Answer the question using ONLY the provided context. "
        f"If the answer is not in the context, say so.\n\n"
        f"Context:\n{context_str}\n\n"
        f"Question: {question}\n\n"
        f"Answer:"
    )


def _extract_citations(retrieved_chunks: list[dict]) -> list[dict]:
    citations = []
    for item in retrieved_chunks:
        chunk = item["chunk"]
        citations.append(
            {
                "rank": item["rank"],
                "score": item["score"],
                "chunk_id": chunk.get("id", ""),
                "text_preview": chunk["text"][:150] + ("..." if len(chunk["text"]) > 150 else ""),
                "start_char": chunk.get("start_char", 0),
                "end_char": chunk.get("end_char", 0),
                "strategy": chunk.get("strategy", "unknown"),
            }
        )
    return citations


@router.post("/ask")
async def rag_ask(req: RAGRequest):
    """
    Full RAG pipeline: embed question → retrieve chunks → build prompt → LLM answer.
    """
    info = session_info(req.session_id)
    if not info["exists"]:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{req.session_id}' not found. Please generate embeddings first.",
        )

    start_time = time.monotonic()

    # Step 1: Embed the question
    try:
        query_embedding = await get_embedding(req.question, req.embed_model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to embed question: {e}")

    # Step 2: Retrieve top-k chunks
    retrieved = search(req.session_id, query_embedding, req.top_k)
    if not retrieved:
        raise HTTPException(
            status_code=404,
            detail="No chunks found in session. Please add documents and generate embeddings.",
        )

    # Step 3: Build context (truncate if needed)
    context_text = "\n\n".join(item["chunk"]["text"] for item in retrieved)

    # Step 4: Build prompt and call LLM
    prompt = _build_prompt(req.question, retrieved)
    try:
        answer = await chat(prompt, req.llm_model)
    except Exception as e:
        answer = f"[LLM Error: {e}]"

    latency_ms = int((time.monotonic() - start_time) * 1000)

    return {
        "question": req.question,
        "retrieved_chunks": retrieved,
        "context": context_text,
        "answer": answer,
        "citations": _extract_citations(retrieved),
        "latency_ms": latency_ms,
        "session_id": req.session_id,
        "models": {
            "embed": req.embed_model,
            "llm": req.llm_model,
        },
    }
