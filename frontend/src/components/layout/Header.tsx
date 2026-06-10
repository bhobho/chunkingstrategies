'use client'

import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { useSession } from '@/context/SessionContext'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/chunking': 'Chunking Lab',
  '/tokenizer': 'Tokenizer',
  '/search': 'Vector Search',
  '/compare': 'Strategy Compare',
  '/rag': 'RAG Simulator',
}

export function Header() {
  const pathname = usePathname()
  const { sessionId, ollamaConnected } = useSession()
  const title = pageTitles[pathname] ?? 'RAG Lab'

  return (
    <header className="h-14 glass border-b border-[#1e2d4a] flex items-center px-6 gap-4 sticky top-0 z-10">
      <h1 className="text-base font-semibold text-white flex-1">{title}</h1>
      <div className="flex items-center gap-3">
        <Badge variant={ollamaConnected ? 'green' : 'red'}>
          {ollamaConnected ? 'Ollama Online' : 'Ollama Offline'}
        </Badge>
        <span className="text-xs text-slate-500 font-mono hidden sm:block">
          {sessionId.slice(0, 16)}…
        </span>
      </div>
    </header>
  )
}
