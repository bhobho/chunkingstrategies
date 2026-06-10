"""
Ollama client for embeddings and LLM inference.
Falls back to mock data when Ollama is not available.
"""

import logging
import os
import random
import math

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_EMBED_MODEL = os.getenv("DEFAULT_EMBED_MODEL", "qwen2.5:7b")
DEFAULT_LLM_MODEL = os.getenv("DEFAULT_LLM_MODEL", "deepseek-r1:1.5b")

MOCK_EMBED_DIM = 384
_REQUEST_TIMEOUT = 30.0


def _mock_embedding(text: str) -> list[float]:
    """Generate a deterministic mock unit vector based on text hash."""
    rng = random.Random(hash(text) & 0xFFFFFFFF)
    vec = [rng.gauss(0, 1) for _ in range(MOCK_EMBED_DIM)]
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


async def _is_ollama_available() -> bool:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False


async def get_embedding(text: str, model: str = DEFAULT_EMBED_MODEL) -> list[float]:
    """Get embedding for a single text. Falls back to mock if Ollama unavailable."""
    try:
        async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/embeddings",
                json={"model": model, "prompt": text},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["embedding"]
    except Exception as e:
        logger.warning(f"Ollama embedding failed, using mock: {e}")
        return _mock_embedding(text)


async def get_embeddings_batch(texts: list[str], model: str = DEFAULT_EMBED_MODEL) -> list[list[float]]:
    """Get embeddings for multiple texts."""
    results = []
    for text in texts:
        emb = await get_embedding(text, model)
        results.append(emb)
    return results


async def chat(prompt: str, model: str = DEFAULT_LLM_MODEL) -> str:
    """Send a prompt to Ollama LLM. Falls back to mock answer if unavailable."""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": model, "prompt": prompt, "stream": False},
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "")
    except Exception as e:
        logger.warning(f"Ollama chat failed, returning mock answer: {e}")
        return (
            "[Mock Answer — Ollama not available] "
            "Based on the provided context, I would answer your question here. "
            "Please start Ollama and pull a model (e.g. `ollama pull llama3.2`) to get real answers."
        )


async def list_models() -> list[str]:
    """List available Ollama models. Returns empty list if unavailable."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            return [m["name"] for m in data.get("models", [])]
    except Exception as e:
        logger.warning(f"Could not list Ollama models: {e}")
        return []


async def ollama_available() -> bool:
    return await _is_ollama_available()
