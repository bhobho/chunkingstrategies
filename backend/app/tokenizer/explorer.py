"""
Token visualization using a simple regex-based tokenizer.
No external tokenizer libraries required.
"""

import re


# Tokens-per-word ratios — spread deliberately for educational visibility.
# Real differences are small for English; we exaggerate slightly so learners
# can see that tokenizers DO differ across model families.
MODEL_RATIOS: dict[str, float] = {
    # local Ollama models (free) — each family uses a different tokenizer
    "deepseek-r1": 1.20,   # DeepSeek uses byte-level BPE, slightly more tokens
    "qwen2.5":     0.90,   # Qwen2 uses tiktoken-style BPE, efficient on English
    "qwen":        0.95,
    "llama3.1":    1.10,
    "llama3.2":    1.10,
    "llama":       1.10,   # Llama sentencepiece, ~10% more than GPT
    "phi3":        1.00,   # Phi3 uses tiktoken, close to GPT-4
    "phi":         1.00,
    "gemma":       1.15,   # Gemma uses SentencePiece with smaller vocab
    "tinyllama":   1.25,   # Small vocab = more tokens per word
    "mistral":     1.05,
    # cloud models
    "gpt-4":       0.75,   # Large BPE vocab, fewest tokens
    "gpt-3.5":     0.78,
    "gpt-4o":      0.75,
    "claude":      0.85,
    "claude-3":    0.85,
    "gemini":      0.95,
    "default":     1.00,
}

# Cost per 1K tokens — local Ollama models are FREE
EMBED_COST_PER_1K = 0.0001
LLM_INPUT_COST_PER_1K: dict[str, float] = {
    # local = $0
    "deepseek-r1": 0.0,
    "qwen2.5":     0.0,
    "qwen":        0.0,
    "llama3.1":    0.0,
    "llama3.2":    0.0,
    "llama":       0.0,
    "phi3":        0.0,
    "phi":         0.0,
    "gemma":       0.0,
    "tinyllama":   0.0,
    "mistral":     0.0,
    # cloud models
    "gpt-4":       0.03,
    "gpt-3.5":     0.002,
    "gpt-4o":      0.005,
    "claude":      0.008,
    "claude-3":    0.008,
    "gemini":      0.0005,
    "default":     0.002,
}

# Regex pattern: splits on whitespace, punctuation, contractions, numbers
_TOKEN_PATTERN = re.compile(
    r"[A-Za-z]+(?:'[A-Za-z]+)*"   # words with optional contractions
    r"|\d+(?:[.,]\d+)*"            # numbers with decimals
    r"|[^\w\s]"                    # punctuation
    r"|\s+"                        # whitespace
)


def _get_model_family(model: str) -> str:
    model_lower = model.lower()
    for key in MODEL_RATIOS:
        if key in model_lower:
            return key
    return "default"


def tokenize(text: str) -> list[dict]:
    """
    Tokenize text using regex patterns.
    Returns list of token dicts with text, start, end, token_id.
    Whitespace-only tokens are filtered out.
    """
    tokens = []
    token_id = 0
    for match in _TOKEN_PATTERN.finditer(text):
        token_text = match.group()
        if token_text.strip():  # skip pure whitespace
            tokens.append(
                {
                    "text": token_text,
                    "start": match.start(),
                    "end": match.end(),
                    "token_id": token_id,
                }
            )
            token_id += 1
    return tokens


def analyze(text: str, model: str = "default") -> dict:
    """
    Analyze text and return token visualization + cost estimate.
    """
    raw_tokens = tokenize(text)
    family = _get_model_family(model)
    ratio = MODEL_RATIOS.get(family, MODEL_RATIOS["default"])

    # The "true" token count scales the raw token list
    word_count = len(text.split())
    estimated_token_count = max(1, int(word_count * ratio))

    # Scale the visible token list to match the model's estimated count.
    # Models with ratio < 1.0 merge adjacent tokens (subword merging simulation).
    # Models with ratio > 1.0 split tokens further.
    raw_count = len(raw_tokens)
    if raw_count == 0:
        display_tokens = raw_tokens
    elif estimated_token_count <= raw_count:
        # Merge some adjacent tokens to reduce count (e.g. GPT-4 BPE merges common words)
        merge_factor = raw_count / max(estimated_token_count, 1)
        display_tokens = []
        i = 0
        tid = 0
        while i < raw_count:
            step = max(1, round(merge_factor * (1 + (i % 3) * 0.1)))  # slight variation
            group = raw_tokens[i:i + step]
            merged_text = "".join(t["text"] for t in group)
            display_tokens.append({
                "text": merged_text,
                "start": group[0]["start"],
                "end": group[-1]["end"],
                "token_id": tid,
            })
            i += step
            tid += 1
    else:
        # Split tokens to increase count (e.g. character-level models)
        display_tokens = []
        tid = 0
        for tok in raw_tokens:
            parts = list(tok["text"])  # split into characters
            pos = tok["start"]
            for p in parts:
                display_tokens.append({"text": p, "start": pos, "end": pos + 1, "token_id": tid})
                pos += 1
                tid += 1
            if tid >= estimated_token_count:
                break

    llm_cost_key = family if family in LLM_INPUT_COST_PER_1K else "default"
    embed_cost = (estimated_token_count / 1000) * EMBED_COST_PER_1K
    llm_cost = (estimated_token_count / 1000) * LLM_INPUT_COST_PER_1K[llm_cost_key]

    return {
        "tokens": display_tokens,
        "raw_token_count": len(raw_tokens),
        "count": estimated_token_count,
        "word_count": word_count,
        "char_count": len(text),
        "model": model,
        "model_family": family,
        "tokens_per_word_ratio": ratio,
        "cost_estimate": {
            "embed": round(embed_cost, 6),
            "llm_input": round(llm_cost, 6),
            "currency": "USD",
            "note": "Approximate costs for educational purposes only",
        },
    }
