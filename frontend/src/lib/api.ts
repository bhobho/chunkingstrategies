const BASE = 'http://localhost:8000/api'

export interface Chunk {
  id: string
  text: string
  start_char: number
  end_char: number
  token_count: number
  char_count: number
  strategy: string
  metadata: Record<string, any>
}

export interface ChunkStats {
  count: number
  avg_tokens: number
  total_tokens: number
}

export interface SearchResult {
  chunk: Chunk
  score: number
  rank: number
}

export interface Token {
  text: string
  start: number
  end: number
  token_id: number
}

export const api = {
  health: () => fetch(`${BASE}/health`).then(r => r.json()),

  processChunks: (text: string, strategy: string, params: Record<string, any> = {}) =>
    fetch(`${BASE}/chunks/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, strategy, params })
    }).then(r => r.json()),

  compareChunks: (text: string, strategies: string[]) =>
    fetch(`${BASE}/chunks/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, strategies })
    }).then(r => r.json()),

  generateEmbeddings: (sessionId: string, chunks: Chunk[], model: string = 'qwen2.5:7b') =>
    fetch(`${BASE}/embeddings/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, chunks, model })
    }).then(r => r.json()),

  search: (sessionId: string, query: string, topK: number = 5, model: string = 'qwen2.5:7b') =>
    fetch(`${BASE}/search/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, query, top_k: topK, model })
    }).then(r => r.json()),

  analyzeTokens: (text: string, model: string = 'deepseek-r1:1.5b') =>
    fetch(`${BASE}/tokenizer/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model })
    }).then(r => r.json()),

  ragAsk: (sessionId: string, question: string, topK: number = 3, llmModel: string = 'deepseek-r1:1.5b') =>
    fetch(`${BASE}/rag/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, question, top_k: topK, llm_model: llmModel })
    }).then(r => r.json()),
}
