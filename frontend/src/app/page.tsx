'use client'

import Link from 'next/link'
import { Scissors, Code2, Search, BarChart3, Zap, Layers, ArrowRight, CheckCircle2 } from 'lucide-react'
import { KpiCard } from '@/components/ui/KpiCard'
import { useSession } from '@/context/SessionContext'
import { STRATEGY_DESCRIPTIONS } from '@/lib/utils'

const pipelineStages = [
  { label: 'Document', desc: 'Raw text input', color: '#3b82f6' },
  { label: 'Chunking', desc: 'Split into pieces', color: '#8b5cf6' },
  { label: 'Embedding', desc: 'Vector encoding', color: '#06b6d4' },
  { label: 'Vector Store', desc: 'Index & store', color: '#10b981' },
  { label: 'Retrieval', desc: 'Find relevant chunks', color: '#f59e0b' },
  { label: 'Reranking', desc: 'Sort by relevance', color: '#ef4444' },
  { label: 'LLM Context', desc: 'Build prompt', color: '#ec4899' },
  { label: 'Answer', desc: 'Generated response', color: '#6366f1' },
]

const quickLinks = [
  { label: 'Chunking Lab', href: '/chunking', icon: Scissors, desc: 'Visualize how text is split into chunks using 8 different strategies.' },
  { label: 'Tokenizer', href: '/tokenizer', icon: Code2, desc: 'Explore how models tokenize text and estimate costs.' },
  { label: 'Vector Search', href: '/search', icon: Search, desc: 'Run semantic search over your chunked documents.' },
  { label: 'Compare', href: '/compare', icon: BarChart3, desc: 'Side-by-side comparison of chunking strategies.' },
  { label: 'RAG Simulator', href: '/rag', icon: Zap, desc: 'Ask questions and watch the full RAG pipeline in action.' },
]

export default function DashboardPage() {
  const { currentChunks, embeddingCount, avgRetrievalScore } = useSession()

  return (
    <div className="space-y-6 max-w-7xl">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Chunking Strategies"
          value={8}
          subtitle="Available algorithms"
          icon={Layers}
          color="blue"
        />
        <KpiCard
          title="Session Chunks"
          value={currentChunks.length}
          subtitle="Last processed"
          icon={Scissors}
          color="purple"
        />
        <KpiCard
          title="Embeddings Generated"
          value={embeddingCount}
          subtitle="Vectors in store"
          icon={Search}
          color="cyan"
        />
        <KpiCard
          title="Avg Retrieval Score"
          value={avgRetrievalScore > 0 ? avgRetrievalScore.toFixed(3) : '—'}
          subtitle="Cosine similarity"
          icon={BarChart3}
          color="green"
        />
      </div>

      {/* Pipeline + Quick Start */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RAG Pipeline Diagram */}
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">RAG Pipeline</h2>
          <div className="space-y-2">
            {pipelineStages.map((stage, i) => (
              <div key={stage.label} className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color, boxShadow: `0 0 6px ${stage.color}80` }}
                />
                <div
                  className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: `${stage.color}12`,
                    borderColor: `${stage.color}30`,
                  }}
                >
                  <span className="text-sm font-medium text-white">{stage.label}</span>
                  <span className="text-xs text-slate-400">{stage.desc}</span>
                </div>
                {i < pipelineStages.length - 1 && (
                  <div className="flex flex-col items-center absolute ml-[5px] mt-7">
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 pl-5">
            <ArrowRight className="w-3 h-3" />
            <span>Data flows top to bottom through each stage</span>
          </div>
        </div>

        {/* Quick Start */}
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Quick Start</h2>
          <div className="space-y-3">
            {quickLinks.map(({ label, href, icon: Icon, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/3 hover:bg-white/6 border border-[#1e2d4a] hover:border-blue-500/30 transition-all group"
              >
                <div className="p-1.5 rounded-md bg-blue-500/10 mt-0.5">
                  <Icon className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Strategy Overview */}
      <div className="glass rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Strategy Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {Object.entries(STRATEGY_DESCRIPTIONS).map(([key, info]) => (
            <div
              key={key}
              className="p-3 rounded-lg bg-[#0f1629] border border-[#1e2d4a] hover:border-blue-500/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-white">{info.title}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{info.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
