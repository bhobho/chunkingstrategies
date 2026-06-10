"""
Router for chunking endpoints.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.chunking.strategies import get_strategy, compute_stats, STRATEGY_MAP

router = APIRouter(prefix="/chunks", tags=["chunks"])


class ChunkRequest(BaseModel):
    text: str
    strategy: str = "fixed_size"
    params: dict = Field(default_factory=dict)


class CompareRequest(BaseModel):
    text: str
    strategies: list[str] = Field(default_factory=lambda: list(STRATEGY_MAP.keys()))


@router.post("/process")
async def process_chunks(req: ChunkRequest):
    """Chunk text using the specified strategy and params."""
    try:
        strategy_fn = get_strategy(req.strategy)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        chunks = strategy_fn(req.text, **req.params)
    except TypeError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid params for strategy '{req.strategy}': {e}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chunking failed: {e}")

    stats = compute_stats(chunks)
    return {"chunks": chunks, "stats": stats}


@router.post("/compare")
async def compare_chunks(req: CompareRequest):
    """Run multiple chunking strategies on the same text and compare results."""
    if not req.strategies:
        raise HTTPException(status_code=400, detail="At least one strategy required.")

    results = {}
    errors = {}
    for strategy_name in req.strategies:
        try:
            strategy_fn = get_strategy(strategy_name)
            chunks = strategy_fn(req.text)
            results[strategy_name] = {
                "chunks": chunks,
                "stats": compute_stats(chunks),
            }
        except ValueError as e:
            errors[strategy_name] = str(e)
        except Exception as e:
            errors[strategy_name] = f"Failed: {e}"

    return {"results": results, "errors": errors}


@router.get("/strategies")
async def list_strategies():
    """List all available chunking strategies."""
    return {"strategies": list(STRATEGY_MAP.keys())}
