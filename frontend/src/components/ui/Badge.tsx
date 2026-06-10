'use client'

import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan' | 'default'
  className?: string
}

const variantStyles = {
  blue: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  green: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  amber: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  red: 'bg-red-500/20 text-red-300 border border-red-500/30',
  purple: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
  default: 'bg-white/10 text-slate-300 border border-white/10',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
      variantStyles[variant],
      className
    )}>
      {children}
    </span>
  )
}
