'use client'

import { useState } from 'react'
import { Search, Loader2, Info, ExternalLink, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api, SearchResult } from '@/lib/api'
import { useSession } from '@/context/SessionContext'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

function ScoreBar({ score }: { score: number }) {
  const color = score >= 0.7 ? '#10b981' : score >= 0.4 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#1e2d4a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{score.toFixed(3)}</span>
    </div>
  )
}

const MOCK_RESULTS: SearchResult[] = [
  {
    chunk: {
      id: 'mock-1', text: 'Machine learning is a subset of artificial intelligence that enables computers to learn from experience without being explicitly programmed.',
      start_char: 0, end_char: 140, token_count: 28, char_count: 140, strategy: 'recursive', metadata: {}
    },
    score: 0.912, rank: 1
  },
  {
    chunk: {
      id: 'mock-2', text: 'Neural networks are inspired by the human brain\'s structure. They consist of layers of interconnected nodes that process information.',
      start_char: 800, end_char: 940, token_count: 24, char_count: 140, strategy: 'recursive', metadata: {}
    },
    score: 0.754, rank: 2
  },
  {
    chunk: {
      id: 'mock-3', text: 'The transformer architecture, introduced in 2017, revolutionized natural language processing.',
      start_char: 950, end_char: 1040, token_count: 16, char_count: 90, strategy: 'recursive', metadata: {}
    },
    score: 0.631, rank: 3
  },
]

export default function SearchPage() {
  const { sessionId, currentChunks, embeddingCount, setSearchResults, setAvgRetrievalScore } = useSession()
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(5)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    if (!sessionId) { setError('Session not ready — please wait a moment and try again'); return }
    setLoading(true)
    setError(null)
    try {
      const result = await api.search(sessionId, query, topK)
      if (result.results && Array.isArray(result.results)) {
        setResults(result.results)
        setSearchResults(result.results)
        const avg = result.results.length
          ? result.results.reduce((s: number, r: SearchResult) => s + r.score, 0) / result.results.length
          : 0
        setAvgRetrievalScore(avg)
      } else if (result.detail) {
        throw new Error(result.detail)
      } else {
        throw new Error('Unexpected response from server')
      }
    } catch (err: any) {
      setError(err?.message ?? 'Search failed — check that the backend is running')
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  const chartData = results.map((r, i) => ({
    name: `#${r.rank || i + 1}`,
    score: parseFloat(r.score.toFixed(3)),
  }))

  const hasChunks = currentChunks.length > 0 || embeddingCount > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Session status */}
      <div className={cn(
        'glass rounded-xl p-4 border',
        hasChunks ? 'border-emerald-500/20' : 'border-amber-500/20'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn('w-2 h-2 rounded-full', hasChunks ? 'bg-emerald-400' : 'bg-amber-400')} />
          <div className="flex-1">
            {hasChunks ? (
              <p className="text-sm text-slate-300">
                Session ready: <span className="text-emerald-400 font-medium">{currentChunks.length} chunks</span> processed,{' '}
                <span className="text-blue-400 font-medium">{embeddingCount} embeddings</span> in vector store
              </p>
            ) : (
              <p className="text-sm text-slate-400">
                No chunks embedded yet.{' '}
                <Link href="/chunking" className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1">
                  Go to Chunking Lab <ExternalLink className="w-3 h-3" />
                </Link>{' '}
                first to process your document, then embed it.
              </p>
            )}
          </div>
          <Badge variant={hasChunks ? 'green' : 'amber'}>{hasChunks ? 'Ready' : 'Setup Needed'}</Badge>
        </div>
      </div>

      {/* Search form */}
      <div className="glass rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Semantic Search</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="What is machine learning? How do neural networks work?"
            className="flex-1 bg-[#0a0e1a] border border-[#1e2d4a] rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 placeholder-slate-600"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
        <div>
          <label className="text-xs text-slate-400 flex justify-between mb-1">
            <span>Top-K Results</span>
            <span className="text-blue-400">{topK}</span>
          </label>
          <input type="range" min={1} max={10} value={topK} onChange={e => setTopK(+e.target.value)}
            className="w-full accent-blue-500" />
        </div>
        {error && (
          <p className="text-xs text-amber-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />{error}
          </p>
        )}
      </div>

      {/* Results */}
      {searched && results.length > 0 && (
        <div className="space-y-4">
          {/* Chart */}
          <div className="glass rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              Similarity Scores
            </h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 1]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#94a3b8' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Result cards */}
          <div className="space-y-3">
            {results.map((result, i) => (
              <div key={result.chunk.id || i} className="glass rounded-xl p-4 border border-[#1e2d4a]">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center">
                    #{result.rank || i + 1}
                  </span>
                  <div className="flex-1">
                    <ScoreBar score={result.score} />
                  </div>
                  <Badge variant="blue">{result.chunk.token_count} tok</Badge>
                  <Badge variant="purple">{result.chunk.strategy}</Badge>
                </div>
                <div className="bg-[#0a0e1a] rounded-lg p-3 font-mono text-xs text-slate-300 leading-relaxed border border-[#1e2d4a]">
                  {result.chunk.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Educational panel */}
      <div className="glass rounded-xl p-5 border-l-2 border-l-blue-500">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white">How Vector Search Works</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Each chunk is embedded into a high-dimensional vector using a model like <span className="text-blue-300">qwen2.5:7b</span> (via Ollama). When you search, your query is embedded the same way, and we find chunks whose vectors are closest using <span className="text-purple-300">cosine similarity</span>.
            </p>
            <p className="text-sm text-slate-400">
              Scores range 0-1: <span className="text-emerald-400">above 0.7 = high relevance</span>, <span className="text-amber-400">0.4-0.7 = moderate</span>, <span className="text-red-400">below 0.4 = low relevance</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
