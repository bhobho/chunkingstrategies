"""
Router for tokenizer / token visualization endpoints.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.tokenizer.explorer import analyze, MODEL_RATIOS

router = APIRouter(prefix="/tokenizer", tags=["tokenizer"])


class TokenizeRequest(BaseModel):
    text: str
    model: str = "default"


@router.post("/analyze")
async def analyze_tokens(req: TokenizeRequest):
    """Analyze text and return token visualization with cost estimate."""
    result = analyze(req.text, req.model)
    return result


@router.get("/models")
async def list_tokenizer_models():
    """List supported model families for token estimation."""
    return {
        "models": list(MODEL_RATIOS.keys()),
        "description": "Token-per-word ratios for different model families",
        "ratios": MODEL_RATIOS,
    }
