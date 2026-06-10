'use client'

import { useState } from 'react'
import { BarChart3, Loader2, Info, ArrowUpDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { api } from '@/lib/api'
import { SAMPLE_TEXTS, STRATEGY_DESCRIPTIONS, CHUNK_COLORS, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

const STRATEGIES = Object.keys(STRATEGY_DESCRIPTIONS)

interface StrategyResult {
  strategy: string
  count: number
  avg_tokens: number
  total_tokens: number
  min_tokens: number
  max_tokens: number
}

function mockCompare(text: string, strategies: string[]): StrategyResult[] {
  return strategies.map((s, i) => {
    const sizes = [200, 150, 300, 80, 250, 180, 220, 90]
    const size = sizes[i % sizes.length]
    const count = Math.max(2, Math.ceil(text.length / 4 / size))
    return {
      strategy: s,
      count,
      avg_tokens: size,
      total_tokens: count * size,
      min_tokens: Math.floor(size * 0.5),
      max_tokens: Math.ceil(size * 1.8),
    }
  })
}

type SortKey = 'strategy' | 'count' | 'avg_tokens' | 'total_tokens'

export default function ComparePage() {
  const [text, setText] = useState(SAMPLE_TEXTS.technical)
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>(STRATEGIES)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<StrategyResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('count')
  const [sortAsc, setSortAsc] = useState(false)

  const toggleStrategy = (s: string) => {
    setSelectedStrategies(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  const handleCompare = async () => {
    if (!text.trim() || !selectedStrategies.length) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.compareChunks(text, selectedStrategies)
      if (result.results && typeof result.results === 'object') {
        const parsed: StrategyResult[] = Object.entries(result.results).map(([strategy, val]: [string, any]) => {
          const chunks: any[] = val.chunks ?? []
          const stats = val.stats ?? {}
          const tokenCounts = chunks.map((c: any) => c.token_count ?? 0)
          return {
            strategy,
            count: stats.count ?? chunks.length,
            avg_tokens: stats.avg_tokens ?? (tokenCounts.length ? tokenCounts.reduce((a: number, b: number) => a + b, 0) / tokenCounts.length : 0),
            total_tokens: stats.total_tokens ?? tokenCounts.reduce((a: number, b: number) => a + b, 0),
            min_tokens: tokenCounts.length ? Math.min(...tokenCounts) : 0,
            max_tokens: tokenCounts.length ? Math.max(...tokenCounts) : 0,
          }
        })
        setResults(parsed)
      } else {
        throw new Error('no results')
      }
    } catch {
      setError('Backend unavailable — showing demo data')
      setResults(mockCompare(text, selectedStrategies))
    } finally {
      setLoading(false)
    }
  }

  const sorted = [...results].sort((a, b) => {
    const va = a[sortKey]
    const vb = b[sortKey]
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
    return sortAsc ? cmp : -cmp
  })

  const setSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const maxCount = Math.max(...results.map(r => r.count), 1)
  const maxAvg = Math.max(...results.map(r => r.avg_tokens), 1)

  const chartCountData = sorted.map((r, i) => ({
    name: r.strategy.replace('_', ' '),
    chunks: r.count,
    fill: CHUNK_COLORS[i % CHUNK_COLORS.length].border,
  }))

  const chartAvgData = sorted.map((r, i) => ({
    name: r.strategy.replace('_', ' '),
    avg_tokens: r.avg_tokens,
    fill: CHUNK_COLORS[i % CHUNK_COLORS.length].border,
  }))

  const insights = results.length > 0 ? (() => {
    const mostChunks = results.reduce((a, b) => a.count > b.count ? a : b)
    const fewestChunks = results.reduce((a, b) => a.count < b.count ? a : b)
    const highestAvg = results.reduce((a, b) => a.avg_tokens > b.avg_tokens ? a : b)
    const lowestAvg = results.reduce((a, b) => a.avg_tokens < b.avg_tokens ? a : b)
    return [
      `${mostChunks.strategy.replace('_', ' ')} produced the most chunks (${mostChunks.count}) with the lowest average token count (${lowestAvg.avg_tokens}).`,
      `${fewestChunks.strategy.replace('_', ' ')} produced the fewest chunks (${fewestChunks.count}).`,
      `${highestAvg.strategy.replace('_', ' ')} produced the largest average chunk size (${highestAvg.avg_tokens} tokens).`,
    ]
  })() : []

  return (
    <div className="space-y-6 max-w-full">

      {/* Controls */}
      <div className="glass rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Configuration</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400">Input Document</label>
              <select
                className="text-xs bg-[#161d35] border border-[#1e2d4a] rounded-md px-2 py-1 text-slate-300"
                onChange={e => {
                  if (e.target.value === 'technical') setText(SAMPLE_TEXTS.technical)
                  if (e.target.value === 'finance') setText(SAMPLE_TEXTS.finance)
                }}
                defaultValue=""
              >
                <option value="" disabled>Load sample...</option>
                <option value="technical">ML Article</option>
                <option value="finance">Finance Report</option>
              </select>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={6}
              className="w-full bg-[#0a0e1a] border border-[#1e2d4a] rounded-lg p-3 text-xs text-slate-300 font-mono resize-y focus:outline-none focus:border-blue-500/50 scrollbar-thin"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Strategies to Compare</label>
            <div className="grid grid-cols-2 gap-2">
              {STRATEGIES.map((s, i) => (
                <label
                  key={s}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-xs',
                    selectedStrategies.includes(s)
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                      : 'border-[#1e2d4a] bg-[#0a0e1a] text-slate-400 hover:border-slate-500'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedStrategies.includes(s)}
                    onChange={() => toggleStrategy(s)}
                    className="accent-blue-500"
                  />
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CHUNK_COLORS[i % CHUNK_COLORS.length].border }}
                  />
                  {STRATEGY_DESCRIPTIONS[s].title.replace(' Chunking', '')}
                </label>
              ))}
            </div>
            <button
              onClick={handleCompare}
              disabled={loading || !text.trim() || !selectedStrategies.length}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              Compare All
            </button>
            {error && (
              <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />{error}
              </p>
            )}
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <>
          {/* Table */}
          <div className="glass rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Results</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-[#1e2d4a]">
                    {(['strategy', 'count', 'avg_tokens', 'total_tokens'] as SortKey[]).map(col => (
                      <th
                        key={col}
                        className="text-left pb-2 pr-4 cursor-pointer hover:text-slate-300 transition-colors select-none"
                        onClick={() => setSort(col)}
                      >
                        <span className="flex items-center gap-1">
                          {col.replace('_', ' ')}
                          <ArrowUpDown className="w-3 h-3" />
                        </span>
                      </th>
                    ))}
                    <th className="text-left pb-2 pr-4 text-xs text-slate-500 uppercase tracking-wider">Min / Max Tok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d4a]">
                  {sorted.map((r, i) => {
                    const color = CHUNK_COLORS[i % CHUNK_COLORS.length]
                    const isHighestCount = r.count === Math.max(...results.map(x => x.count))
                    const isLowestCount = r.count === Math.min(...results.map(x => x.count))
                    return (
                      <tr key={r.strategy} className="hover:bg-white/2 transition-colors">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color.border }} />
                            <span className="text-slate-300 font-medium">{r.strategy.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={cn('font-bold', isHighestCount ? 'text-blue-400' : isLowestCount ? 'text-amber-400' : 'text-white')}>
                            {r.count}
                          </span>
                          {isHighestCount && <Badge variant="blue" className="ml-2">most</Badge>}
                          {isLowestCount && <Badge variant="amber" className="ml-2">fewest</Badge>}
                        </td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[#1e2d4a] rounded-full overflow-hidden w-20">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${(r.avg_tokens / maxAvg) * 100}%`, backgroundColor: color.border }}
                              />
                            </div>
                            <span className="text-slate-300">{r.avg_tokens}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-400">{r.total_tokens}</td>
                        <td className="py-2.5 text-slate-500 text-xs">{r.min_tokens} / {r.max_tokens}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Chunk Count by Strategy</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartCountData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: '8px', fontSize: '12px' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Bar dataKey="chunks" radius={[4, 4, 0, 0]} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Avg Tokens per Chunk</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartAvgData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: '8px', fontSize: '12px' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Bar dataKey="avg_tokens" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insights */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              Key Insights
            </h3>
            <div className="space-y-2">
              {insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                  <span className="text-blue-400 font-bold text-sm flex-shrink-0">{i + 1}.</span>
                  <p className="text-sm text-slate-400">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {results.length === 0 && (
        <div className="glass rounded-xl p-12 flex flex-col items-center justify-center gap-4 text-center">
          <BarChart3 className="w-10 h-10 text-slate-600" />
          <div>
            <p className="text-slate-400 font-medium">No comparison yet</p>
            <p className="text-slate-600 text-sm mt-1">Select strategies and click Compare All</p>
          </div>
        </div>
      )}
    </div>
  )
}
