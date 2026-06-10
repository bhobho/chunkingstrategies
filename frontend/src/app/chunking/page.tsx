'use client'

import { useState, useCallback } from 'react'
import { Scissors, Loader2, ChevronDown, AlignLeft, Info, X } from 'lucide-react'
import { api, Chunk } from '@/lib/api'
import { CHUNK_COLORS, SAMPLE_TEXTS, STRATEGY_DESCRIPTIONS, cn } from '@/lib/utils'
import { useSession } from '@/context/SessionContext'
import { Badge } from '@/components/ui/Badge'

const STRATEGIES = Object.keys(STRATEGY_DESCRIPTIONS)

const strategyIcons: Record<string, string> = {
  fixed_size: '⊞',
  recursive: '↻',
  paragraph: '¶',
  sentence: '.',
  markdown: '#',
  semantic: '≈',
  agentic: '✦',
  contextual: '⊕',
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  chunk: Chunk | null
  index: number
}

function renderHighlightedText(
  text: string,
  chunks: Chunk[],
  selectedChunk: number | null,
  onHover: (e: React.MouseEvent, chunk: Chunk, idx: number) => void,
  onLeave: () => void,
  onSelect: (idx: number) => void
): React.ReactNode[] {
  if (!chunks.length) return [<span key="plain">{text}</span>]

  // Sort chunks by start_char
  const sorted = [...chunks].map((c, i) => ({ ...c, _idx: i })).sort((a, b) => a.start_char - b.start_char)

  const elements: React.ReactNode[] = []
  let cursor = 0

  for (const chunk of sorted) {
    const start = chunk.start_char
    const end = chunk.end_char
    const idx = chunk._idx

    if (start > cursor) {
      elements.push(<span key={`gap-${cursor}`} className="text-slate-300">{text.slice(cursor, start)}</span>)
    }

    const color = CHUNK_COLORS[idx % CHUNK_COLORS.length]
    const isSelected = selectedChunk === idx

    elements.push(
      <span
        key={`chunk-${idx}`}
        onMouseEnter={(e) => onHover(e, chunk, idx)}
        onMouseLeave={onLeave}
        onClick={() => onSelect(idx)}
        style={{
          backgroundColor: isSelected ? color.border + '40' : color.bg,
          borderBottom: `2px solid ${color.border}`,
          outline: isSelected ? `2px solid ${color.border}` : undefined,
          outlineOffset: isSelected ? '1px' : undefined,
          borderRadius: '3px',
          padding: '1px 0',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {text.slice(start, end)}
      </span>
    )

    cursor = end
  }

  if (cursor < text.length) {
    elements.push(<span key="tail" className="text-slate-300">{text.slice(cursor)}</span>)
  }

  return elements
}

export default function ChunkingPage() {
  const { sessionId, setCurrentChunks, setEmbeddingCount } = useSession()
  const [text, setText] = useState(SAMPLE_TEXTS.technical)
  const [strategy, setStrategy] = useState('recursive')
  const [loading, setLoading] = useState(false)
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [selectedChunk, setSelectedChunk] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Params
  const [chunkSize, setChunkSize] = useState(500)
  const [overlap, setOverlap] = useState(50)
  const [threshold, setThreshold] = useState(0.5)
  const [ctxWindow, setCtxWindow] = useState(2)

  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, chunk: null, index: 0 })

  const handleHover = useCallback((e: React.MouseEvent, chunk: Chunk, idx: number) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setTooltip({ visible: true, x: rect.left, y: rect.bottom + 8, chunk, index: idx })
  }, [])

  const handleLeave = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }))
  }, [])

  const getParams = () => {
    switch (strategy) {
      case 'fixed_size':
      case 'recursive':
        return { chunk_size: chunkSize, overlap }
      case 'semantic':
        return { threshold }
      case 'contextual':
        return { window: ctxWindow }
      default:
        return {}
    }
  }

  const processChunks = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.processChunks(text, strategy, getParams())
      if (result.chunks) {
        setChunks(result.chunks)
        setCurrentChunks(result.chunks)
        // Auto-embed into the session so Vector Search works immediately
        if (sessionId) {
          api.generateEmbeddings(sessionId, result.chunks, 'qwen2.5:7b')
            .then(r => setEmbeddingCount(r.total_in_session ?? r.count ?? 0))
            .catch(() => {}) // silent — search will show a clear error if needed
        }
      } else if (result.error) {
        setError(result.error)
        // Demo fallback
        fallbackDemo()
      }
    } catch {
      setError('Backend unavailable — showing demo chunks')
      fallbackDemo()
    } finally {
      setLoading(false)
    }
  }

  const fallbackDemo = () => {
    const words = text.split(/\s+/)
    const size = Math.max(50, Math.floor(words.length / 6))
    const demo: Chunk[] = []
    let pos = 0
    for (let i = 0; i < words.length; i += size) {
      const slice = words.slice(i, i + size).join(' ')
      const startIdx = text.indexOf(slice, pos)
      const endIdx = startIdx + slice.length
      demo.push({
        id: `demo-${i}`,
        text: slice,
        start_char: Math.max(0, startIdx),
        end_char: endIdx,
        token_count: Math.ceil(slice.length / 4),
        char_count: slice.length,
        strategy,
        metadata: {},
      })
      pos = endIdx
    }
    setChunks(demo)
    setCurrentChunks(demo)
  }

  const stats = chunks.length > 0 ? {
    count: chunks.length,
    avgTokens: Math.round(chunks.reduce((s, c) => s + c.token_count, 0) / chunks.length),
    totalTokens: chunks.reduce((s, c) => s + c.token_count, 0),
  } : null

  return (
    <div className="flex gap-6 h-full max-w-full">
      {/* Left: Controls + Viewer */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        {/* Controls card */}
        <div className="glass rounded-xl p-4 space-y-4">
          {/* Text input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Input Document</label>
              <select
                className="text-xs bg-[#161d35] border border-[#1e2d4a] rounded-md px-2 py-1 text-slate-300 cursor-pointer"
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
              rows={5}
              className="w-full bg-[#0a0e1a] border border-[#1e2d4a] rounded-lg p-3 text-sm text-slate-300 font-mono resize-y focus:outline-none focus:border-blue-500/50 scrollbar-thin"
              placeholder="Paste your document here..."
            />
            <p className="text-xs text-slate-600 mt-1">{text.length} chars · ~{Math.ceil(text.length / 4)} tokens</p>
          </div>

          {/* Strategy selector */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">Chunking Strategy</label>
            <div className="grid grid-cols-4 gap-2">
              {STRATEGIES.map(s => (
                <button
                  key={s}
                  onClick={() => setStrategy(s)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-all',
                    strategy === s
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                      : 'bg-[#0a0e1a] border-[#1e2d4a] text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  )}
                >
                  <span className="text-lg leading-none">{strategyIcons[s]}</span>
                  <span className="font-medium leading-tight text-center" style={{ fontSize: '10px' }}>
                    {STRATEGY_DESCRIPTIONS[s].title.replace(' Chunking', '')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Strategy-specific params */}
          {(strategy === 'fixed_size' || strategy === 'recursive') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 flex justify-between">
                  <span>Chunk Size</span> <span className="text-blue-400">{chunkSize}</span>
                </label>
                <input type="range" min={100} max={2000} step={50} value={chunkSize}
                  onChange={e => setChunkSize(+e.target.value)}
                  className="w-full accent-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 flex justify-between">
                  <span>Overlap</span> <span className="text-purple-400">{overlap}</span>
                </label>
                <input type="range" min={0} max={200} step={10} value={overlap}
                  onChange={e => setOverlap(+e.target.value)}
                  className="w-full accent-purple-500" />
              </div>
            </div>
          )}
          {strategy === 'semantic' && (
            <div>
              <label className="text-xs text-slate-400 mb-1 flex justify-between">
                <span>Similarity Threshold</span> <span className="text-cyan-400">{threshold}</span>
              </label>
              <input type="range" min={0.1} max={0.9} step={0.05} value={threshold}
                onChange={e => setThreshold(+e.target.value)}
                className="w-full accent-cyan-500" />
            </div>
          )}
          {strategy === 'contextual' && (
            <div>
              <label className="text-xs text-slate-400 mb-1 flex justify-between">
                <span>Context Window</span> <span className="text-green-400">{ctxWindow} sentences</span>
              </label>
              <input type="range" min={1} max={5} step={1} value={ctxWindow}
                onChange={e => setCtxWindow(+e.target.value)}
                className="w-full accent-green-500" />
            </div>
          )}

          {/* Process button */}
          <button
            onClick={processChunks}
            disabled={loading || !text.trim()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
            {loading ? 'Processing...' : 'Process Chunks'}
          </button>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Document Viewer */}
        {chunks.length > 0 && (
          <div className="glass rounded-xl p-4 flex-1 min-h-0">
            {/* Legend */}
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="text-xs text-slate-400 font-medium">Chunks:</span>
              {chunks.slice(0, 8).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedChunk(selectedChunk === i ? null : i)}
                  className="flex items-center gap-1.5 text-xs transition-opacity"
                  style={{ opacity: selectedChunk !== null && selectedChunk !== i ? 0.4 : 1 }}
                >
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: CHUNK_COLORS[i % CHUNK_COLORS.length].border }}
                  />
                  <span style={{ color: CHUNK_COLORS[i % CHUNK_COLORS.length].text }}>{i + 1}</span>
                </button>
              ))}
              {chunks.length > 8 && <span className="text-xs text-slate-500">+{chunks.length - 8} more</span>}
              {selectedChunk !== null && (
                <button onClick={() => setSelectedChunk(null)} className="ml-auto text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {/* Text with highlights */}
            <div
              className="bg-[#0a0e1a] rounded-lg p-4 text-sm leading-relaxed font-mono overflow-y-auto scrollbar-thin whitespace-pre-wrap"
              style={{ maxHeight: '50vh' }}
            >
              {renderHighlightedText(text, chunks, selectedChunk, handleHover, handleLeave, setSelectedChunk)}
            </div>
          </div>
        )}
      </div>

      {/* Right: Chunk List */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4">
        {/* Stats */}
        {stats && (
          <div className="glass rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Statistics</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#0a0e1a] rounded-lg p-2">
                <p className="text-xl font-bold text-blue-400">{stats.count}</p>
                <p className="text-xs text-slate-500">Chunks</p>
              </div>
              <div className="bg-[#0a0e1a] rounded-lg p-2">
                <p className="text-xl font-bold text-purple-400">{stats.avgTokens}</p>
                <p className="text-xs text-slate-500">Avg Tok</p>
              </div>
              <div className="bg-[#0a0e1a] rounded-lg p-2">
                <p className="text-xl font-bold text-cyan-400">{stats.totalTokens}</p>
                <p className="text-xs text-slate-500">Total Tok</p>
              </div>
            </div>
            <div className="p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg">
              <p className="text-xs text-slate-400">
                <span className="text-blue-300 font-medium">{STRATEGY_DESCRIPTIONS[strategy].title}</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{STRATEGY_DESCRIPTIONS[strategy].desc}</p>
            </div>
          </div>
        )}

        {/* Chunk list */}
        {chunks.length > 0 ? (
          <div className="glass rounded-xl p-3 flex-1 flex flex-col min-h-0">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2 flex items-center gap-2">
              <AlignLeft className="w-3.5 h-3.5" />
              Chunks ({chunks.length})
            </h3>
            <div className="overflow-y-auto scrollbar-thin space-y-1.5 flex-1">
              {chunks.map((chunk, i) => {
                const color = CHUNK_COLORS[i % CHUNK_COLORS.length]
                const isSelected = selectedChunk === i
                return (
                  <button
                    key={chunk.id || i}
                    onClick={() => setSelectedChunk(isSelected ? null : i)}
                    className="w-full text-left p-2.5 rounded-lg border transition-all"
                    style={{
                      backgroundColor: isSelected ? color.bg : 'rgba(255,255,255,0.02)',
                      borderColor: isSelected ? color.border : '#1e2d4a',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-bold w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: color.bg, color: color.text }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex gap-1 ml-auto">
                        <Badge variant="blue">{chunk.token_count} tok</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {chunk.text.slice(0, 80)}{chunk.text.length > 80 ? '…' : ''}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">{chunk.char_count} chars · [{chunk.start_char}:{chunk.end_char}]</p>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="glass rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 flex-1">
            <Scissors className="w-8 h-8 text-slate-600" />
            <div>
              <p className="text-sm font-medium text-slate-400">No chunks yet</p>
              <p className="text-xs text-slate-600 mt-1">Select a strategy and click Process Chunks</p>
            </div>
          </div>
        )}

        {/* Pros/Cons */}
        {strategy && (
          <div className="glass rounded-xl p-3 space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Strategy Notes</h4>
            <div>
              <p className="text-xs text-emerald-400 mb-1">Pros</p>
              {STRATEGY_DESCRIPTIONS[strategy].pros.map(p => (
                <p key={p} className="text-xs text-slate-400 flex gap-1.5 mb-0.5">
                  <span className="text-emerald-500 flex-shrink-0">+</span>{p}
                </p>
              ))}
            </div>
            <div>
              <p className="text-xs text-red-400 mb-1">Cons</p>
              {STRATEGY_DESCRIPTIONS[strategy].cons.map(c => (
                <p key={c} className="text-xs text-slate-400 flex gap-1.5 mb-0.5">
                  <span className="text-red-500 flex-shrink-0">−</span>{c}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Tooltip */}
      {tooltip.visible && tooltip.chunk && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: Math.min(tooltip.x, (typeof globalThis !== 'undefined' ? globalThis.innerWidth ?? 800 : 800) - 220), top: tooltip.y }}
        >
          <div className="glass rounded-lg p-3 w-52 shadow-xl border border-[#1e2d4a]">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: CHUNK_COLORS[tooltip.index % CHUNK_COLORS.length].border }}
              />
              <span className="text-xs font-semibold text-white">Chunk {tooltip.index + 1}</span>
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              <p>Tokens: <span className="text-blue-300">{tooltip.chunk.token_count}</span></p>
              <p>Chars: <span className="text-purple-300">{tooltip.chunk.char_count}</span></p>
              <p>Position: <span className="text-cyan-300">[{tooltip.chunk.start_char}:{tooltip.chunk.end_char}]</span></p>
              <p>Strategy: <span className="text-amber-300">{tooltip.chunk.strategy}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
