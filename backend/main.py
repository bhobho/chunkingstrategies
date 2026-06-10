"""
RAG Lab — FastAPI backend entry point.
"""

import logging

import nltk
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import chunks, embeddings, search, tokenizer, rag
from app.embeddings.ollama_client import ollama_available, list_models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def download_nltk_data():
    """Download required NLTK data if not already present."""
    for resource in ["punkt", "punkt_tab"]:
        try:
            nltk.data.find(f"tokenizers/{resource}")
        except LookupError:
            try:
                nltk.download(resource, quiet=True)
                logger.info(f"Downloaded NLTK resource: {resource}")
            except Exception as e:
                logger.warning(f"Could not download NLTK resource '{resource}': {e}")


# Download NLTK data at import time (before app startup)
download_nltk_data()

app = FastAPI(
    title="RAG Lab API",
    description="Educational RAG / chunking learning platform — powered by Ollama (local LLMs)",
    version="1.0.0",
)

# CORS — allow all localhost origins for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(chunks.router, prefix="/api")
app.include_router(embeddings.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(tokenizer.router, prefix="/api")
app.include_router(rag.router, prefix="/api")


@app.get("/api/health", tags=["health"])
async def health():
    """Health check — also reports Ollama availability."""
    available = await ollama_available()
    models = await list_models() if available else []
    return {
        "status": "ok",
        "ollama_available": available,
        "models": models,
    }


@app.get("/", tags=["root"])
async def root():
    return {
        "message": "RAG Lab API",
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
