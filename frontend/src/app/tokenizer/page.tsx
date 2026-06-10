'use client'

import { useState } from 'react'
import { Code2, Loader2, Info } from 'lucide-react'
import { api, Token } from '@/lib/api'
import { CHUNK_COLORS, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

const MODELS = ['deepseek-r1:1.5b', 'qwen2.5:7b', 'qwen:0.5b', 'llama3.1:latest', 'phi3:mini', 'gemma:2b', 'tinyllama:1.1b', 'gpt-4', 'claude-3']

const COST_PER_1K: Record<string, { embed: number; input: number }> = {
  'deepseek-r1:1.5b': { embed: 0.0, input: 0.0 },
  'qwen2.5:7b':       { embed: 0.0, input: 0.0 },
  'qwen:0.5b':        { embed: 0.0, input: 0.0 },
  'llama3.1:latest':  { embed: 0.0, input: 0.0 },
  'phi3:mini':        { embed: 0.0, input: 0.0 },
  'gemma:2b':         { embed: 0.0, input: 0.0 },
  'tinyllama:1.1b':   { embed: 0.0, input: 0.0 },
  'gpt-4':            { embed: 0.0001, input: 0.03 },
  'claude-3':         { embed: 0.0001, input: 0.015 },
}

function mockTokenize(text: string): Token[] {
  // Simple word-level mock tokenizer
  const tokens: Token[] = []
  const regex = /\S+|\s+/g
  let match
  let id = 1000
  while ((match = regex.exec(text)) !== null) {
    if (match[0].trim()) {
      tokens.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        token_id: id++,
      })
    }
  }
  return tokens
}

export default function TokenizerPage() {
  const [inputText, setInputText] = useState('The quick brown fox jumped over the lazy dog. Machine learning models process text by first converting words into tokens, which are subword units that balance vocabulary size and text coverage.')
  const [model, setModel] = useState('deepseek-r1:1.5b')
  const [loading, setLoading] = useState(false)
  const [tokens, setTokens] = useState<Token[]>([])
  const [tokenCount, setTokenCount] = useState(0)
  const [hoveredToken, setHoveredToken] = useState<Token | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.analyzeTokens(inputText, model)
      if (result.tokens) {
        setTokens(result.tokens)
        // Use model-specific estimated count, not raw token list length
        setTokenCount(result.count ?? result.tokens.length)
      } else {
        throw new Error('no tokens in response')
      }
    } catch {
      setError('Backend unavailable — using mock tokenizer')
      const mock = mockTokenize(inputText)
      setTokens(mock)
      setTokenCount(mock.length)
    } finally {
      setLoading(false)
    }
  }

  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length
  const charCount = inputText.length
  const costs = COST_PER_1K[model] || COST_PER_1K['gpt-4']
  const embedCost = ((tokenCount / 1000) * costs.embed).toFixed(6)
  const inputCost = ((tokenCount / 1000) * costs.input).toFixed(6)

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Input */}
      <div className="glass rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Input Text</h2>
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          rows={4}
          className="w-full bg-[#0a0e1a] border border-[#1e2d4a] rounded-lg p-3 text-sm text-slate-300 font-mono resize-y focus:outline-none focus:border-blue-500/50 scrollbar-thin"
          placeholder="Enter text to tokenize..."
        />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Model:</label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="bg-[#161d35] border border-[#1e2d4a] rounded-md px-3 py-1.5 text-sm text-slate-300"
            >
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button
            onClick={analyze}
            disabled={loading || !inputText.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code2 className="w-4 h-4" />}
            Analyze Tokens
          </button>
          {error && <span className="text-xs text-amber-400 flex items-center gap-1"><Info className="w-3.5 h-3.5" />{error}</span>}
        </div>
      </div>

      {/* Token visualization */}
      {tokens.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Token Visualization <span className="text-blue-400 normal-case font-normal">({tokenCount} tokens)</span>
          </h2>
          <div className="bg-[#0a0e1a] rounded-lg p-4 leading-loose relative">
            {tokens.map((token, i) => {
              const color = CHUNK_COLORS[i % CHUNK_COLORS.length]
              return (
                <span
                  key={i}
                  onMouseEnter={() => setHoveredToken(token)}
                  onMouseLeave={() => setHoveredToken(null)}
                  className="inline-block mr-0.5 px-1.5 py-0.5 rounded text-sm font-mono cursor-default transition-all hover:scale-105 hover:shadow-lg"
                  style={{
                    backgroundColor: color.bg,
                    border: `1px solid ${color.border}40`,
                    color: color.text,
                  }}
                  title={`ID: ${token.token_id} | pos: ${token.start}-${token.end}`}
                >
                  {token.text.replace(/ /g, '·')}
                </span>
              )
            })}
          </div>
          {hoveredToken && (
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-400 px-1">
              <span>Token: <code className="text-blue-300">"{hoveredToken.text}"</code></span>
              <span>ID: <span className="text-purple-300">{hoveredToken.token_id}</span></span>
              <span>Position: <span className="text-cyan-300">[{hoveredToken.start}:{hoveredToken.end}]</span></span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Total Tokens', value: tokenCount, color: 'text-blue-400' },
          { label: 'Words', value: wordCount, color: 'text-purple-400' },
          { label: 'Characters', value: charCount, color: 'text-cyan-400' },
          { label: 'Tokens / Word', value: wordCount > 0 ? (tokenCount / wordCount).toFixed(2) : '—', color: 'text-green-400' },
          { label: `Embed Cost (${model})`, value: `$${embedCost}`, color: 'text-amber-400' },
          { label: `LLM Input Cost (${model})`, value: `$${inputCost}`, color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-xl p-4 text-center">
            <p className={cn('text-2xl font-bold', color)}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Educational callout */}
      <div className="glass rounded-xl p-5 border-l-2 border-l-blue-500">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white">What is Tokenization?</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Tokenization converts raw text into numerical tokens that language models can process. Instead of splitting on words, modern models use <span className="text-blue-300">subword tokenization</span> (BPE, WordPiece) — common words become single tokens while rare words split into multiple subword pieces.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              This matters for <span className="text-amber-300">cost</span>: API pricing is per-token. It also affects <span className="text-cyan-300">context limits</span> — GPT-4 supports ~128K tokens. Different models use different tokenizers, so the same text may produce different token counts across models.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {MODELS.map(m => {
                const est = Math.ceil(charCount / 4)
                const c = COST_PER_1K[m]
                return (
                  <div key={m} className="bg-[#0a0e1a] rounded-lg p-2.5 text-xs">
                    <p className="text-slate-300 font-medium mb-1">{m}</p>
                    <p className="text-slate-500">~{est} tokens</p>
                    <p className="text-slate-500">Input: ${((est / 1000) * c.input).toFixed(5)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
