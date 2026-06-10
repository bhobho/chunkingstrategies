'use client'

import { useState, useRef, useEffect } from 'react'
import { Zap, Loader2, Send, ChevronDown, ChevronRight, ExternalLink, Info } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useSession } from '@/context/SessionContext'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

const PIPELINE_STAGES = [
  { id: 'question', label: 'User Question', icon: '?' },
  { id: 'embed_query', label: 'Embed Question', icon: '∑' },
  { id: 'vector_search', label: 'Vector Search', icon: '⊕' },
  { id: 'retrieve', label: 'Retrieve Chunks', icon: '↓' },
  { id: 'rerank', label: 'Rerank', icon: '↕' },
  { id: 'context', label: 'Build Context', icon: '≡' },
  { id: 'generate', label: 'LLM Generation', icon: '✦' },
  { id: 'answer', label: 'Answer', icon: '✓' },
]

const LLM_MODELS = ['deepseek-r1:1.5b', 'qwen2.5:7b', 'llama3.1:latest', 'qwen:0.5b', 'phi3:mini', 'gemma:2b', 'tinyllama:1.1b']

interface Message {
  role: 'user' | 'assistant'
  content: string
  chunks?: Array<{ text: string; score: number; rank: number }>
  context?: string
  latency?: number
  error?: boolean
}

interface StageState {
  status: 'idle' | 'active' | 'done'
  detail?: string
}

const MOCK_ANSWER = `Based on the retrieved context, machine learning is a subset of artificial intelligence that enables computers to learn from experience without being explicitly programmed. It focuses on developing algorithms that can access data and use it to learn for themselves.

There are three main types: supervised learning (labeled data), unsupervised learning (finding hidden patterns), and reinforcement learning (reward-based training).`

export default function RagPage() {
  const { sessionId, currentChunks, embeddingCount } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [llmModel, setLlmModel] = useState('deepseek-r1:1.5b')
  const [topK, setTopK] = useState(3)
  const [loading, setLoading] = useState(false)
  const [stages, setStages] = useState<Record<string, StageState>>(
    Object.fromEntries(PIPELINE_STAGES.map(s => [s.id, { status: 'idle' }]))
  )
  const [activeStage, setActiveStage] = useState<string | null>(null)
  const [expandedMsg, setExpandedMsg] = useState<Record<number, { chunks: boolean; context: boolean }>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const animateStages = async () => {
    const stageIds = PIPELINE_STAGES.map(s => s.id)
    const details: Record<string, string> = {
      question: 'Received query',
      embed_query: `Using ${llmModel} embeddings`,
      vector_search: `Searching ${embeddingCount || currentChunks.length} vectors`,
      retrieve: `Top ${topK} chunks`,
      rerank: 'Scoring by relevance',
      context: 'Building prompt context',
      generate: `${llmModel} generating...`,
      answer: 'Complete',
    }
    for (const id of stageIds) {
      setActiveStage(id)
      setStages(prev => ({ ...prev, [id]: { status: 'active', detail: details[id] } }))
      await new Promise(r => setTimeout(r, 300))
      setStages(prev => ({ ...prev, [id]: { status: 'done', detail: details[id] } }))
    }
    setActiveStage(null)
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setLoading(true)

    setMessages(prev => [...prev, { role: 'user', content: question }])

    // Reset stages
    setStages(Object.fromEntries(PIPELINE_STAGES.map(s => [s.id, { status: 'idle' }])))

    const stageAnimation = animateStages()
    const t0 = Date.now()

    try {
      const result = await api.ragAsk(sessionId, question, topK, llmModel)
      await stageAnimation
      const latency = Date.now() - t0

      if (result.answer) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.answer,
          chunks: result.retrieved_chunks || [],
          context: result.context_used || '',
          latency,
        }])
      } else {
        throw new Error('no answer')
      }
    } catch {
      await stageAnimation
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: MOCK_ANSWER,
        chunks: [
          { text: 'Machine learning is a subset of artificial intelligence...', score: 0.91, rank: 1 },
          { text: 'Neural networks are inspired by the human brain...', score: 0.76, rank: 2 },
        ],
        context: `Question: ${question}\n\nContext:\n[1] Machine learning is a subset...\n[2] Neural networks are...`,
        latency: Date.now() - t0,
        error: true,
      }])
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (idx: number, key: 'chunks' | 'context') => {
    setExpandedMsg(prev => ({
      ...prev,
      [idx]: { ...prev[idx], [key]: !prev[idx]?.[key] }
    }))
  }

  const hasChunks = currentChunks.length > 0 || embeddingCount > 0

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)] max-w-full">

      {/* Pipeline visualization */}
      <div className="w-56 flex-shrink-0 glass rounded-xl p-4 flex flex-col">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">RAG Pipeline</h3>
        <div className="space-y-2 flex-1">
          {PIPELINE_STAGES.map((stage, i) => {
            const s = stages[stage.id]
            return (
              <div key={stage.id} className="flex items-center gap-2">
                {/* connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-300',
                      s.status === 'active' ? 'stage-active bg-blue-500/30 text-blue-300 border border-blue-500/50' :
                      s.status === 'done' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      'bg-[#0a0e1a] text-slate-600 border border-[#1e2d4a]'
                    )}
                  >
                    {s.status === 'done' ? '✓' : stage.icon}
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div className={cn(
                      'w-px h-3 mt-0.5',
                      s.status === 'done' ? 'bg-emerald-500/30' : 'bg-[#1e2d4a]'
                    )} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-xs font-medium truncate',
                    s.status === 'active' ? 'text-blue-300' :
                    s.status === 'done' ? 'text-emerald-300' :
                    'text-slate-500'
                  )}>{stage.label}</p>
                  {s.detail && s.status !== 'idle' && (
                    <p className="text-xs text-slate-600 truncate">{s.detail}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {!hasChunks && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-300 mb-2">No embeddings yet</p>
            <Link href="/chunking" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              Go to Chunking Lab <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="flex-1 min-w-0 flex flex-col glass rounded-xl overflow-hidden">

        {/* Chat header */}
        <div className="px-4 py-3 border-b border-[#1e2d4a] flex items-center gap-3">
          <Zap className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">RAG Chat</span>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs text-slate-500">Model:</label>
            <select
              value={llmModel}
              onChange={e => setLlmModel(e.target.value)}
              className="bg-[#161d35] border border-[#1e2d4a] rounded-md px-2 py-1 text-xs text-slate-300"
            >
              {LLM_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <label className="text-xs text-slate-500 ml-2">Top-K:</label>
            <select
              value={topK}
              onChange={e => setTopK(+e.target.value)}
              className="bg-[#161d35] border border-[#1e2d4a] rounded-md px-2 py-1 text-xs text-slate-300"
            >
              {[1,2,3,4,5].map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <Zap className="w-10 h-10 text-slate-600" />
              <div>
                <p className="text-slate-400 font-medium">Ask a question about your document</p>
                <p className="text-slate-600 text-sm mt-1">The RAG pipeline will retrieve relevant chunks and generate an answer</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 max-w-sm">
                {['What is machine learning?', 'How do neural networks work?', 'What is supervised learning?', 'What are the applications of ML?'].map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-xs text-slate-400 bg-[#0a0e1a] border border-[#1e2d4a] rounded-lg p-2 hover:border-blue-500/30 hover:text-slate-300 transition-all text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'user' ? (
                <div className="max-w-[70%] bg-blue-600/30 border border-blue-500/20 rounded-2xl rounded-tr-sm px-4 py-2.5">
                  <p className="text-sm text-slate-200">{msg.content}</p>
                </div>
              ) : (
                <div className="max-w-[85%] space-y-2">
                  {msg.error && (
                    <p className="text-xs text-amber-400 flex items-center gap-1 mb-1">
                      <Info className="w-3 h-3" /> Demo response (backend unavailable)
                    </p>
                  )}

                  {/* Answer */}
                  <div className="glass border border-[#1e2d4a] rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {msg.latency && (
                      <p className="text-xs text-slate-600 mt-2">{msg.latency}ms · {llmModel}</p>
                    )}
                  </div>

                  {/* Retrieved chunks toggle */}
                  {msg.chunks && msg.chunks.length > 0 && (
                    <div className="glass border border-[#1e2d4a] rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleExpand(idx, 'chunks')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-300 hover:bg-white/3 transition-colors"
                      >
                        {expandedMsg[idx]?.chunks ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        Retrieved Chunks ({msg.chunks.length})
                        <div className="flex gap-1 ml-auto">
                          {msg.chunks.slice(0, 3).map((c, ci) => (
                            <Badge key={ci} variant="blue">{c.score.toFixed(2)}</Badge>
                          ))}
                        </div>
                      </button>
                      {expandedMsg[idx]?.chunks && (
                        <div className="px-3 pb-3 space-y-2">
                          {msg.chunks.map((chunk, ci) => (
                            <div key={ci} className="bg-[#0a0e1a] rounded-lg p-2.5 border border-[#1e2d4a]">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="blue">#{chunk.rank}</Badge>
                                <Badge variant={chunk.score >= 0.7 ? 'green' : chunk.score >= 0.4 ? 'amber' : 'red'}>
                                  {chunk.score.toFixed(3)}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-400 font-mono leading-relaxed">{chunk.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Context toggle */}
                  {msg.context && (
                    <div className="glass border border-[#1e2d4a] rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleExpand(idx, 'context')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-300 hover:bg-white/3 transition-colors"
                      >
                        {expandedMsg[idx]?.context ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        Context Sent to LLM
                      </button>
                      {expandedMsg[idx]?.context && (
                        <div className="px-3 pb-3">
                          <pre className="text-xs text-slate-400 font-mono bg-[#0a0e1a] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap scrollbar-thin">
                            {msg.context}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="glass border border-[#1e2d4a] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-sm text-slate-400">Generating response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#1e2d4a]">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask a question about your document..."
              disabled={loading}
              className="flex-1 bg-[#0a0e1a] border border-[#1e2d4a] rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 placeholder-slate-600 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
