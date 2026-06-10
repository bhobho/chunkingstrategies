"""
All chunking strategies for RAG Lab.
Each strategy returns a list of chunk dicts.
"""

import re
import uuid
from typing import Any


def _token_count(text: str) -> int:
    """Approximate token count using word count * 1.3."""
    return int(len(text.split()) * 1.3)


def _make_chunk(
    text: str,
    start_char: int,
    end_char: int,
    strategy: str,
    metadata: dict[str, Any] | None = None,
) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "text": text,
        "start_char": start_char,
        "end_char": end_char,
        "token_count": _token_count(text),
        "char_count": len(text),
        "strategy": strategy,
        "metadata": metadata or {},
    }


def fixed_size(text: str, chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """Split text by character count with overlap."""
    chunks = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + chunk_size, length)
        chunk_text = text[start:end]
        chunks.append(
            _make_chunk(
                chunk_text,
                start,
                end,
                "fixed_size",
                {"chunk_size": chunk_size, "overlap": overlap, "index": len(chunks)},
            )
        )
        if end == length:
            break
        start = end - overlap
    return chunks


def recursive(text: str, chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """
    Split by paragraphs first, then sentences, then words — until chunks
    are within the size limit.
    """
    separators = ["\n\n", "\n", ". ", "! ", "? ", " "]

    def split_text(t: str, sep_idx: int) -> list[str]:
        if len(t) <= chunk_size or sep_idx >= len(separators):
            return [t]
        sep = separators[sep_idx]
        parts = t.split(sep)
        result: list[str] = []
        current = ""
        for part in parts:
            candidate = (current + sep + part).lstrip(sep) if current else part
            if len(candidate) <= chunk_size:
                current = candidate
            else:
                if current:
                    result.extend(split_text(current, sep_idx + 1))
                current = part
        if current:
            result.extend(split_text(current, sep_idx + 1))
        return result

    raw_chunks = split_text(text, 0)

    # Now produce overlapping chunks with char offsets
    chunks = []
    offset = 0
    for i, chunk_text in enumerate(raw_chunks):
        start = text.find(chunk_text, offset)
        if start == -1:
            start = offset
        end = start + len(chunk_text)
        chunks.append(
            _make_chunk(
                chunk_text,
                start,
                end,
                "recursive",
                {"chunk_size": chunk_size, "overlap": overlap, "index": i},
            )
        )
        offset = max(0, end - overlap)
    return chunks


def paragraph(text: str) -> list[dict]:
    """Split on double newlines."""
    parts = re.split(r"\n\s*\n", text)
    chunks = []
    offset = 0
    for part in parts:
        part = part.strip()
        if not part:
            continue
        start = text.find(part, offset)
        if start == -1:
            start = offset
        end = start + len(part)
        chunks.append(
            _make_chunk(
                part,
                start,
                end,
                "paragraph",
                {"paragraph_index": len(chunks)},
            )
        )
        offset = end
    return chunks


def sentence(text: str) -> list[dict]:
    """Split on sentence boundaries (. ! ?)."""
    try:
        import nltk
        sentences = nltk.sent_tokenize(text)
    except Exception:
        sentences = re.split(r"(?<=[.!?])\s+", text)

    chunks = []
    offset = 0
    for sent in sentences:
        sent = sent.strip()
        if not sent:
            continue
        start = text.find(sent, offset)
        if start == -1:
            start = offset
        end = start + len(sent)
        chunks.append(
            _make_chunk(
                sent,
                start,
                end,
                "sentence",
                {"sentence_index": len(chunks)},
            )
        )
        offset = end
    return chunks


def markdown(text: str) -> list[dict]:
    """Split on markdown headers (#, ##, ###)."""
    header_pattern = re.compile(r"^(#{1,3})\s+(.+)$", re.MULTILINE)
    matches = list(header_pattern.finditer(text))

    if not matches:
        # No headers — return single chunk
        return [_make_chunk(text.strip(), 0, len(text), "markdown", {"level": 0, "header": ""})]

    chunks = []
    for i, match in enumerate(matches):
        header_start = match.start()
        content_start = match.end()
        next_start = matches[i + 1].start() if i + 1 < len(matches) else len(text)

        section_text = text[header_start:next_start].strip()
        level = len(match.group(1))
        header_title = match.group(2).strip()

        chunks.append(
            _make_chunk(
                section_text,
                header_start,
                next_start,
                "markdown",
                {"level": level, "header": header_title, "section_index": i},
            )
        )

    # If there's content before the first header
    if matches[0].start() > 0:
        pre = text[: matches[0].start()].strip()
        if pre:
            chunks.insert(
                0,
                _make_chunk(pre, 0, matches[0].start(), "markdown", {"level": 0, "header": "preamble"}),
            )

    return chunks


def _keyword_overlap(a: str, b: str) -> float:
    """Simple keyword overlap similarity."""
    stop_words = {"the", "a", "an", "is", "in", "on", "at", "to", "for", "of", "and", "or", "but", "it", "this", "that"}
    words_a = set(re.findall(r"\b\w+\b", a.lower())) - stop_words
    words_b = set(re.findall(r"\b\w+\b", b.lower())) - stop_words
    if not words_a or not words_b:
        return 0.0
    intersection = words_a & words_b
    union = words_a | words_b
    return len(intersection) / len(union)


def semantic(text: str, threshold: float = 0.5) -> list[dict]:
    """
    Group sentences by topic similarity using keyword overlap.
    Falls back gracefully when Ollama is unavailable.
    """
    try:
        import nltk
        sentences = nltk.sent_tokenize(text)
    except Exception:
        sentences = re.split(r"(?<=[.!?])\s+", text)

    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return []

    groups: list[list[str]] = [[sentences[0]]]
    for sent in sentences[1:]:
        # Compare to the last sentence in the current group
        sim = _keyword_overlap(" ".join(groups[-1]), sent)
        if sim >= threshold:
            groups[-1].append(sent)
        else:
            groups.append([sent])

    chunks = []
    offset = 0
    for group in groups:
        chunk_text = " ".join(group)
        start = text.find(group[0], offset)
        if start == -1:
            start = offset
        end = start + len(chunk_text)
        chunks.append(
            _make_chunk(
                chunk_text,
                start,
                end,
                "semantic",
                {
                    "sentence_count": len(group),
                    "threshold": threshold,
                    "group_index": len(chunks),
                },
            )
        )
        offset = end
    return chunks


def agentic(text: str) -> list[dict]:
    """
    Mock agentic chunking: treat each paragraph/section as a semantic unit
    with simulated 'agent decision' metadata.
    """
    # Start with paragraph-level splits
    base_chunks = paragraph(text)
    if not base_chunks:
        base_chunks = [_make_chunk(text.strip(), 0, len(text), "agentic", {})]

    decisions = [
        "identified as key concept",
        "supporting evidence",
        "introductory context",
        "concluding summary",
        "technical detail",
        "example or illustration",
        "definition",
        "transition section",
    ]

    result = []
    for i, chunk in enumerate(base_chunks):
        decision = decisions[i % len(decisions)]
        importance = round(0.5 + (i % 5) * 0.1, 2)
        new_chunk = dict(chunk)
        new_chunk["id"] = str(uuid.uuid4())
        new_chunk["strategy"] = "agentic"
        new_chunk["metadata"] = {
            **chunk["metadata"],
            "agent_decision": decision,
            "importance_score": importance,
            "should_include": importance >= 0.6,
            "reasoning": f"Agent classified this chunk as '{decision}' with importance {importance}",
        }
        result.append(new_chunk)
    return result


def contextual(text: str, window: int = 2) -> list[dict]:
    """
    Sentence chunking where each chunk includes surrounding context
    from neighboring sentences in metadata.
    """
    try:
        import nltk
        sentences = nltk.sent_tokenize(text)
    except Exception:
        sentences = re.split(r"(?<=[.!?])\s+", text)

    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return []

    chunks = []
    offset = 0
    for i, sent in enumerate(sentences):
        start = text.find(sent, offset)
        if start == -1:
            start = offset
        end = start + len(sent)

        prev_sentences = sentences[max(0, i - window) : i]
        next_sentences = sentences[i + 1 : i + 1 + window]
        context_before = " ".join(prev_sentences)
        context_after = " ".join(next_sentences)

        chunks.append(
            _make_chunk(
                sent,
                start,
                end,
                "contextual",
                {
                    "sentence_index": i,
                    "window": window,
                    "context_before": context_before,
                    "context_after": context_after,
                    "full_context": " ".join(filter(None, [context_before, sent, context_after])),
                },
            )
        )
        offset = end
    return chunks


STRATEGY_MAP = {
    "fixed_size": fixed_size,
    "recursive": recursive,
    "paragraph": paragraph,
    "sentence": sentence,
    "markdown": markdown,
    "semantic": semantic,
    "agentic": agentic,
    "contextual": contextual,
}


def get_strategy(name: str):
    """Return strategy function by name."""
    if name not in STRATEGY_MAP:
        raise ValueError(f"Unknown strategy '{name}'. Available: {list(STRATEGY_MAP.keys())}")
    return STRATEGY_MAP[name]


def compute_stats(chunks: list[dict]) -> dict:
    """Compute aggregate stats for a list of chunks."""
    if not chunks:
        return {"count": 0, "avg_tokens": 0.0, "total_tokens": 0, "avg_chars": 0.0, "total_chars": 0}
    token_counts = [c["token_count"] for c in chunks]
    char_counts = [c["char_count"] for c in chunks]
    return {
        "count": len(chunks),
        "avg_tokens": round(sum(token_counts) / len(token_counts), 1),
        "total_tokens": sum(token_counts),
        "avg_chars": round(sum(char_counts) / len(char_counts), 1),
        "total_chars": sum(char_counts),
    }
