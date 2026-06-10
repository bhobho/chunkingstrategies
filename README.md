# RAG Lab — Interactive RAG & Chunking Learning Platform

A hands-on visual platform for understanding how Retrieval-Augmented Generation works — from raw document to final answer. Every stage of the RAG pipeline is interactive, observable, and comparable.

---

## Table of Contents

1. [What This Portal Teaches](#what-this-portal-teaches)
2. [Quick Start](#quick-start)
3. [The Learning Path](#the-learning-path)
4. [Module Guide](#module-guide)
   - [Dashboard](#1-dashboard)
   - [Chunking Lab](#2-chunking-lab--the-centerpiece)
   - [Tokenization Explorer](#3-tokenization-explorer)
   - [Strategy Comparison](#4-strategy-comparison)
   - [Vector Search](#5-vector-search)
   - [RAG Simulator](#6-rag-simulator)
5. [Chunking Strategies Explained](#chunking-strategies-explained)
6. [Key Concepts Glossary](#key-concepts-glossary)
7. [Local Setup](#local-setup)
8. [Troubleshooting](#troubleshooting)

---

## What This Portal Teaches

RAG (Retrieval-Augmented Generation) is how most production AI applications answer questions about private documents. The quality of your RAG system depends almost entirely on one decision made early: **how you chunk your documents**.

This portal makes the invisible visible:

- Why the same question returns different answers depending on chunk size
- How semantic chunking outperforms fixed-size chunking for complex queries
- What tokenization actually looks like and why it affects cost
- How vector similarity scores reflect retrieval quality
- What the LLM actually receives as context — and why that matters

**The core insight this portal is designed to deliver:**

```
Better Chunks → Better Retrieval → Better Context → Better Answers
```

Every module lets you change one variable and observe the downstream effect.

---

## Quick Start

### Prerequisites

| Tool | Purpose | Install |
|---|---|---|
| Node.js 18+ | Frontend | [nodejs.org](https://nodejs.org) |
| Python 3.10+ | Backend | [python.org](https://python.org) |
| Ollama | Local LLM + Embeddings | [ollama.com](https://ollama.com) |

### 1 — Install Ollama and pull models

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama service (keep this running)
ollama serve

# Pull embedding + LLM models (one-time, ~6GB total)
ollama pull qwen2.5:7b        # used for embeddings (~4.7GB)
ollama pull deepseek-r1:1.5b  # used for RAG answers (~1.1GB)

# Optional smaller alternatives
ollama pull qwen:0.5b         # tiny, fast (~395MB)
ollama pull tinyllama:1.1b    # smallest LLM (~638MB)
```

> **No Ollama?** The portal still works — it uses mock embeddings (random vectors) and placeholder LLM answers. All visual features work. You just won't get real semantic search.

### 2 — Start the backend

```bash
cd chunkingdemo/backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 main.py
# → Running at http://localhost:8000
# → API docs at http://localhost:8000/docs
```

### 3 — Start the frontend

```bash
cd chunkingdemo/frontend
npm install
npm run dev
# → Running at http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

## The Learning Path

Follow this sequence for the best learning experience. Each module builds on the previous one.

```
Dashboard          → Orient yourself. Understand the full pipeline.
      ↓
Chunking Lab       → Upload/paste a document. Chunk it 8 different ways.
      ↓
Tokenizer          → Understand what tokens are and why they affect cost.
      ↓
Compare            → Run all strategies side-by-side. See the trade-offs.
      ↓
Vector Search      → Ask a question. See which chunks get retrieved and why.
      ↓
RAG Simulator      → Run the full pipeline end-to-end. Get a real answer.
```

Spend the most time in **Chunking Lab** and **Vector Search** — that's where the most learning happens.

---

## Module Guide

### 1. Dashboard

**URL:** `/`

Your starting point. Provides two things:

**RAG Pipeline Diagram**
A visual flowchart of all 8 stages: Document → Chunking → Embedding → Vector Store → Retrieval → Reranking → LLM Context → Answer. Read through each stage to understand the role it plays before diving into the individual modules.

**Session Status Cards**
Shows how many chunks you've processed and embeddings generated in the current session. These numbers update as you use other modules.

**Best used for:** Getting oriented before your first session. Return here after completing all modules to see the full picture.

---

### 2. Chunking Lab ← The Centerpiece

**URL:** `/chunking`

This is the most important module. Everything in RAG starts with chunking.

#### How to use it

**Step 1 — Load a document**

Either paste your own text or click one of the sample loaders:
- **ML Article** — a technical document with headers, paragraphs, and lists. Good for testing structure-aware strategies.
- **Finance Report** — a structured business document. Good for testing how strategies handle tables and sections.

For best results, use a document that's at least 500 words.

**Step 2 — Pick a strategy and process**

Click any of the 8 strategy cards (described in detail below) then hit **Process Chunks**.

**Step 3 — Read the document viewer**

Your document reappears with each chunk highlighted in a different color. This is the core visualization — you can *see* exactly where chunk boundaries fall.

- **Hover over any highlighted region** to see a tooltip showing: chunk index, character count, token count, and any strategy-specific metadata (e.g. sentence index, overlap amount, importance score).
- **Click a chunk** in the right panel to highlight it in the document.

**Step 4 — Adjust parameters and reprocess**

For Fixed Size and Recursive strategies:
- **Chunk Size slider** (100–2000 chars): smaller = more chunks, more granular retrieval, higher cost. Larger = fewer chunks, cheaper, but may mix topics.
- **Overlap slider** (0–200 chars): overlap repeats the end of one chunk at the start of the next. Prevents losing context at boundaries. Too much overlap wastes tokens.

For Semantic strategy:
- **Threshold slider** (0.1–0.9): lower = more chunks (splits more aggressively on topic change). Higher = fewer, larger chunks.

**Step 5 — Compare strategies**

After processing with one strategy, switch to another and process again. Watch how the color boundaries shift. Some questions to ask yourself:
- Does Fixed Size cut sentences in half?
- Does Sentence chunking create too many tiny chunks?
- Does Semantic chunking group related paragraphs together?

**What happens after processing:** Chunks are automatically embedded in the background using `qwen2.5:7b` via Ollama. This means Vector Search will be ready to use immediately after.

#### Signs of good chunking
- Chunks contain one coherent idea or topic
- No chunk cuts off mid-sentence (unless using Fixed Size)
- Chunk sizes are appropriate for your embedding model's context window
- Overlapping chunks share enough context to be understood independently

#### Signs of bad chunking
- Chunks are too small (1-2 sentences) — retrieval becomes noisy
- Chunks are too large (2000+ tokens) — dilutes semantic focus
- Chunks split at arbitrary points mid-thought

---

### 3. Tokenization Explorer

**URL:** `/tokenizer`

Tokenization is the step before embedding — it's how text becomes numbers. Understanding it explains why RAG has a cost and why different models behave differently.

#### How to use it

1. Paste any text into the input box (the default is a short paragraph)
2. Select a model from the dropdown
3. Click **Analyze Tokens**

The text reappears as a series of colored pill badges — each badge is one token. Hover over any token to see its ID and position.

#### What to notice

**Token boundaries are not word boundaries.** Common words like "the", "is", "learning" are single tokens. Rare or technical words get split: "tokenization" might become ["token", "ization"]. Punctuation is often its own token.

**Switch models and re-analyze.** You'll see:
- GPT-4 has the fewest tokens (large vocabulary, efficient BPE)
- TinyLlama has the most tokens (small vocabulary, splits more aggressively)
- DeepSeek and Llama fall in between

This matters because: **more tokens = higher cost + slower inference + consumes more of the context window**.

**Cost display:** Local Ollama models show **$0.00** — this is the point. Running Qwen or DeepSeek locally is genuinely free. GPT-4 shows a real cost estimate for the same text.

#### Key insight
A 500-character chunk is not 500 tokens. It's roughly 100–150 tokens depending on the model. Multiply that by 10,000 chunks and you understand why tokenization choices compound quickly in production.

---

### 4. Strategy Comparison

**URL:** `/compare`

After exploring strategies individually in Chunking Lab, use this module to see all 8 side-by-side on the same document.

#### How to use it

1. Load or paste your document (same text you used in Chunking Lab for consistency)
2. All 8 strategies are pre-selected — deselect any you want to exclude
3. Click **Compare All**

#### Reading the results

**The table** shows for each strategy:
- **Chunks** — total number of chunks produced
- **Avg Tokens** — average tokens per chunk
- **Total Tokens** — total tokens across all chunks (= embedding cost)
- **Min / Max** — range of chunk sizes (high variance = inconsistent retrieval)

**The charts** visualize chunk count and average token size across strategies. Look for the trade-off curve: strategies that produce fewer, larger chunks vs many small ones.

**Key Insights panel** (bottom of page) auto-generates observations like:
- Which strategy produced the most granular chunks
- Which strategy has the most consistent chunk sizes
- Which strategy will cost least to embed

#### What to decide from this page

There is no universally best strategy. Your choice depends on:

| If your use case is... | Consider... |
|---|---|
| General Q&A over long documents | Recursive or Semantic |
| Precise fact retrieval | Sentence |
| Markdown docs, wikis, READMEs | Markdown |
| Cost-sensitive production system | Fixed Size (predictable cost) |
| Highest answer quality, cost secondary | Semantic or Contextual |
| Extracting key facts from dense text | Agentic |

---

### 5. Vector Search

**URL:** `/search`

This module shows retrieval in action — how a query is matched against embedded chunks using cosine similarity.

#### Prerequisites

You must have processed chunks in Chunking Lab first. Embeddings are generated automatically after processing, so just go to Chunking Lab → process your document → come back here.

#### How to use it

1. Type a natural language question into the search box
2. Adjust **Top K** (how many results to retrieve, 1–10)
3. Click **Search**

#### Reading the results

Each result card shows:
- **Rank badge** (#1 most relevant → #K least relevant)
- **Similarity score bar** — cosine similarity between your query and the chunk
  - Green (≥ 0.7) — strong match, the chunk is likely relevant
  - Amber (0.4–0.7) — moderate match
  - Red (< 0.4) — weak match, likely noise
- **Chunk text** — the actual text that was retrieved
- **Metadata** — strategy used, token count, position in document

#### Experiments to try

**Test 1 — Specific vs vague query**
- Try: *"What is supervised learning?"* — should return high-scoring, focused chunks
- Try: *"Tell me about AI"* — vague query returns lower scores, less precise chunks
- Lesson: specificity in the query = better retrieval

**Test 2 — Query vocabulary matters**
- Try: *"neural net architecture"* — uses technical abbreviation
- Try: *"how neural networks are structured"* — uses full natural language
- Compare the scores — semantic search handles paraphrasing, but vocabulary still matters

**Test 3 — Re-chunk and re-search**
- Go back to Chunking Lab, switch from Recursive to Sentence chunking, reprocess
- Return to Vector Search, run the same query
- Notice how different chunks surface even though the document is identical

#### The bar chart
Shows all K similarity scores visually. A healthy retrieval looks like a descending bar chart with a clear drop-off. If all bars are the same height, your chunks may be too similar to each other (over-lapping or too short).

---

### 6. RAG Simulator

**URL:** `/rag`

The full pipeline. This is where everything comes together: your chunked + embedded document + a language model = answers with citations.

#### Prerequisites

Process chunks in Chunking Lab first (same as Vector Search). Make sure Ollama is running with at least one LLM pulled (`deepseek-r1:1.5b` recommended — fast and free).

#### How to use it

**Left panel — Pipeline visualization**
Shows all 8 pipeline stages. When you submit a question, each stage animates in sequence showing what's happening and how long it takes.

**Right panel — Chat interface**
1. Select your LLM model from the dropdown (`deepseek-r1:1.5b` is fastest locally)
2. Adjust **Top K** — how many chunks to pass as context to the LLM
3. Type a question and click **Ask**

#### Reading a response

Each assistant message has three expandable sections:

**Retrieved Chunks** — expand to see which chunks were retrieved, in ranked order with their similarity scores. Ask yourself: are these chunks actually relevant to the question? If not, the answer will be wrong regardless of how good the LLM is.

**Context Sent to LLM** — expand to see the exact text that was injected into the LLM's prompt. This is the full context window. Note how the retrieved chunks are assembled into a prompt. Longer chunks = more tokens here = slower and more expensive generation.

**Answer + Citations** — the LLM's generated response, followed by chunk references showing which parts of the document the answer drew from.

#### Experiments to try

**Test 1 — Ask something the document covers**
Ask a question that's directly answered in your document. The retrieval scores should be high and the answer should be accurate with clear citations.

**Test 2 — Ask something the document doesn't cover**
Ask a question outside the scope of the document. Watch what happens: either the LLM correctly says "I don't know based on the provided context" or it hallucinates. This illustrates why grounding LLMs in retrieved context matters.

**Test 3 — Change Top K**
- Set Top K = 1: minimal context, faster, answer may miss nuance
- Set Top K = 5: more context, slower, answer can synthesize across chunks
- Set Top K = 10: very large context, notice the "Context Sent to LLM" grows significantly

**Test 4 — Change chunking strategy and re-ask**
Go back to Chunking Lab, switch strategy, reprocess, return here. Ask the same question. Does the answer change? Are the retrieved chunks different? This is the most powerful experiment in the portal.

---

## Chunking Strategies Explained

### Fixed Size
Splits text every N characters with an optional overlap window. The simplest strategy — fast, predictable, and widely used as a baseline.

**When to use:** When you need consistent, predictable chunk sizes. When processing cost needs to be controlled. As a baseline to compare against smarter strategies.

**Pitfall:** Splits at arbitrary character positions — mid-word, mid-sentence, mid-thought. No awareness of content structure.

**Key parameters:** Chunk size (100–2000 chars), Overlap (0–200 chars)

---

### Recursive
Attempts to split at natural boundaries in a hierarchy: tries double newlines first, then single newlines, then sentences, then words, then characters. Falls back to smaller units only when needed to hit the target size.

**When to use:** The best general-purpose default. Used internally by LangChain's `RecursiveCharacterTextSplitter`. Works well on most document types.

**Advantage over Fixed Size:** Respects paragraph and sentence boundaries whenever possible.

---

### Paragraph
Splits strictly on double newlines (`\n\n`). One chunk = one paragraph.

**When to use:** Well-structured documents where paragraphs are meaningful units. News articles, reports, essays.

**Pitfall:** Paragraph lengths vary wildly. Some paragraphs are 2 sentences, others are 20. Leads to highly inconsistent chunk sizes.

---

### Sentence
Splits on sentence boundaries (`.`, `!`, `?`). One chunk = one sentence (or a small group of sentences).

**When to use:** When you need fine-grained retrieval. Short factual Q&A. When precision matters more than cost.

**Pitfall:** Creates many small chunks, increasing embedding cost and the chance of returning low-context snippets. A single sentence often lacks enough context to be meaningful in isolation.

---

### Markdown
Splits on Markdown headers (`#`, `##`, `###`). One chunk = one section under a header.

**When to use:** Documentation, wikis, READMEs, technical specifications — any content written in Markdown. Preserves document hierarchy in chunk metadata.

**Pitfall:** Only works on properly formatted Markdown. Falls back to paragraph splitting for plain text. Section sizes vary wildly.

---

### Semantic
Groups sentences by topic similarity rather than position. Sentences that discuss the same topic stay in the same chunk; a topic shift creates a new chunk boundary.

**When to use:** When retrieval quality is the top priority. Complex documents that mix topics within paragraphs. Research papers, long-form journalism, technical documentation.

**Advantage:** Produces topically coherent chunks — the single biggest factor in retrieval quality.

**Pitfall:** Slower to compute. Chunk sizes vary unpredictably. Threshold tuning required.

---

### Agentic
Simulates an AI agent evaluating each section for importance and deciding chunk boundaries based on content significance rather than structure or size.

**When to use:** When you want to prioritize high-value content. Key-fact extraction from dense documents. Useful when only the most important parts of a document should be retrievable.

**Note:** In production, this would require LLM calls per chunk (expensive). The portal simulates the behavior.

---

### Contextual
Sentence-level chunking that enriches each chunk's metadata with surrounding context (N sentences before and after). The chunk itself is one sentence, but the embedding includes neighboring sentences for richer semantic representation.

**When to use:** Complex Q&A where a single sentence doesn't contain enough meaning on its own. Narrative text, academic writing, interview transcripts.

**Advantage:** Combines the precision of sentence chunking with the context richness of larger chunks.

**Trade-off:** Higher metadata overhead. Context included in the LLM prompt grows larger.

---

## Key Concepts Glossary

**Chunk** — A piece of a document. The atomic unit of retrieval in a RAG system.

**Chunking** — The process of splitting a document into chunks. The most important architectural decision in RAG.

**Embedding** — A list of floating-point numbers (a vector) that represents the semantic meaning of a piece of text. Texts with similar meanings have vectors that are "close" in high-dimensional space.

**Vector Store** — A database that stores embeddings and enables fast nearest-neighbor search. This portal uses an in-memory store backed by NumPy.

**Cosine Similarity** — A measure of how similar two vectors are, ranging from 0 (unrelated) to 1 (identical meaning). Used to rank retrieved chunks by relevance.

**Top K** — The number of most similar chunks to retrieve for a given query. Higher K = more context for the LLM but more tokens consumed.

**Context Window** — The maximum number of tokens an LLM can process at once. Retrieved chunks must fit within this limit.

**Retrieval** — The step that selects relevant chunks from the vector store based on a query. Bad retrieval is the most common cause of bad RAG answers.

**Reranking** — A second-pass scoring step that re-orders retrieved chunks using a more precise (but slower) model. Improves precision at the cost of latency.

**Hallucination** — When an LLM generates text that sounds plausible but is not grounded in the provided context. RAG reduces hallucination by anchoring the LLM to retrieved evidence.

**Overlap** — Repeating the end of one chunk at the start of the next. Prevents losing context that falls on a chunk boundary.

**BPE (Byte Pair Encoding)** — The tokenization algorithm used by GPT and many other models. Merges frequent character pairs iteratively to build a vocabulary of subword units.

**SentencePiece** — An alternative tokenization algorithm used by Llama, Gemma, and others. Works at the byte level, handles any language without a fixed vocabulary.

---

## Local Setup

### Directory Structure

```
chunkingdemo/
├── backend/
│   ├── main.py                    ← FastAPI entry point
│   ├── requirements.txt
│   └── app/
│       ├── chunking/
│       │   └── strategies.py      ← All 8 chunking algorithms
│       ├── embeddings/
│       │   └── ollama_client.py   ← Ollama embed + chat client
│       ├── search/
│       │   └── vector_store.py    ← In-memory cosine similarity store
│       ├── tokenizer/
│       │   └── explorer.py        ← Token visualization logic
│       └── routers/               ← FastAPI route handlers
├── frontend/
│   └── src/
│       ├── app/                   ← Next.js pages (one per module)
│       ├── components/            ← Shared UI components
│       ├── context/               ← Session state (React Context)
│       └── lib/
│           ├── api.ts             ← Backend API client
│           └── utils.ts           ← Chunk colors, strategy metadata
└── README.md
```

### API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check backend + Ollama status |
| POST | `/api/chunks/process` | Chunk text with one strategy |
| POST | `/api/chunks/compare` | Chunk text with multiple strategies |
| POST | `/api/embeddings/generate` | Embed chunks into session store |
| POST | `/api/search/query` | Semantic search over embedded chunks |
| POST | `/api/tokenizer/analyze` | Tokenize text, return count + cost |
| POST | `/api/rag/ask` | Full RAG pipeline: retrieve + generate |

Full interactive docs at **http://localhost:8000/docs** when the backend is running.

### Changing the default models

Edit `backend/app/embeddings/ollama_client.py`:
```python
DEFAULT_EMBED_MODEL = "qwen2.5:7b"    # model used for embeddings
DEFAULT_LLM_MODEL = "deepseek-r1:1.5b"  # model used for RAG answers
```

Any model available in your local Ollama installation can be used. Run `ollama list` to see what's available.

---

## Troubleshooting

### Ollama shows "Offline" in the sidebar

1. Check Ollama is running: `curl http://localhost:11434/api/tags`
2. If no response: run `ollama serve` in a terminal
3. Hard-refresh the browser: `Cmd+Shift+R`

### "Failed to search" in Vector Search

You need to process chunks first. Go to **Chunking Lab → Process Chunks**, then return to Vector Search. Embeddings are generated automatically after processing.

### RAG Simulator gives "Mock Answer"

Ollama is not running or the LLM model isn't pulled. Run:
```bash
ollama serve
ollama pull deepseek-r1:1.5b
```

### Backend won't start — port 8000 in use

```bash
lsof -ti :8000 | xargs kill -9
python3 main.py
```

### NLTK error on backend startup

The backend auto-downloads NLTK tokenizer data on first run. Ensure you have internet access for the first launch. After that it's cached locally.

### Frontend shows hydration error

Hard-refresh: `Cmd+Shift+R`. If it persists, clear localStorage in DevTools (Application → Storage → Clear Site Data) and reload.
