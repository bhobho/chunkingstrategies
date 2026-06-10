'use client'

import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: number
  color?: 'blue' | 'purple' | 'cyan' | 'green' | 'amber' | 'red'
}

const colorMap = {
  blue: { border: 'border-l-blue-500', icon: 'text-blue-400', bg: 'bg-blue-500/10' },
  purple: { border: 'border-l-purple-500', icon: 'text-purple-400', bg: 'bg-purple-500/10' },
  cyan: { border: 'border-l-cyan-500', icon: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  green: { border: 'border-l-emerald-500', icon: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  amber: { border: 'border-l-amber-500', icon: 'text-amber-400', bg: 'bg-amber-500/10' },
  red: { border: 'border-l-red-500', icon: 'text-red-400', bg: 'bg-red-500/10' },
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend, color = 'blue' }: KpiCardProps) {
  const c = colorMap[color]
  return (
    <div className={cn(
      'rounded-xl p-4 border-l-2 glass',
      c.border
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={cn('p-2 rounded-lg', c.bg)}>
          <Icon className={cn('w-5 h-5', c.icon)} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={cn('flex items-center gap-1 mt-2 text-xs', trend >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{Math.abs(trend)}% from last session</span>
        </div>
      )}
    </div>
  )
}
