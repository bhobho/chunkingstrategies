'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Scissors, Code2, Search, BarChart3, Zap, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession } from '@/context/SessionContext'

const navItems = [
  { label: 'Dashboard', icon: Home, href: '/' },
  { label: 'Chunking Lab', icon: Scissors, href: '/chunking' },
  { label: 'Tokenizer', icon: Code2, href: '/tokenizer' },
  { label: 'Vector Search', icon: Search, href: '/search' },
  { label: 'Compare', icon: BarChart3, href: '/compare' },
  { label: 'RAG Simulator', icon: Zap, href: '/rag' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { ollamaConnected } = useSession()

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-screen glass border-r border-[#1e2d4a] sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#1e2d4a]">
        <div className="p-2 rounded-lg bg-blue-500/20">
          <Brain className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <span className="text-white font-bold text-base tracking-tight">RAG Lab</span>
          <p className="text-slate-500 text-xs">Educational Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ label, icon: Icon, href }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                active
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              <Icon className={cn('w-4 h-4', active ? 'text-blue-400' : 'text-slate-500')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Ollama status */}
      <div className="px-4 py-4 border-t border-[#1e2d4a]">
        <div className="flex items-center gap-2">
          <span className={cn(
            'w-2 h-2 rounded-full flex-shrink-0',
            ollamaConnected ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-red-400'
          )} />
          <span className="text-xs text-slate-500">
            Ollama {ollamaConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </aside>
  )
}
