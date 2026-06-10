'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Chunk, SearchResult } from '@/lib/api'

interface SessionContextType {
  sessionId: string
  currentChunks: Chunk[]
  setCurrentChunks: (chunks: Chunk[]) => void
  embeddingCount: number
  setEmbeddingCount: (count: number) => void
  searchResults: SearchResult[]
  setSearchResults: (results: SearchResult[]) => void
  avgRetrievalScore: number
  setAvgRetrievalScore: (score: number) => void
  ollamaConnected: boolean
  setOllamaConnected: (v: boolean) => void
}

const SessionContext = createContext<SessionContextType | null>(null)

function generateSessionId() {
  return 'sess_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36)
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // Start with empty string on both server and client to avoid hydration mismatch.
  // useEffect sets the real ID after mount (client-only).
  const [sessionId, setSessionId] = useState('')
  const [currentChunks, setCurrentChunks] = useState<Chunk[]>([])
  const [embeddingCount, setEmbeddingCount] = useState(0)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [avgRetrievalScore, setAvgRetrievalScore] = useState(0)
  const [ollamaConnected, setOllamaConnected] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('raglab_session_id')
    if (stored) {
      setSessionId(stored)
    } else {
      const newId = generateSessionId()
      localStorage.setItem('raglab_session_id', newId)
      setSessionId(newId)
    }
  }, [])

  useEffect(() => {
    const check = () => {
      fetch('http://localhost:8000/api/health')
        .then(r => r.json())
        .then(data => setOllamaConnected(data.ollama_available === true))
        .catch(() => setOllamaConnected(false))
    }
    check()
    const interval = setInterval(check, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <SessionContext.Provider value={{
      sessionId,
      currentChunks, setCurrentChunks,
      embeddingCount, setEmbeddingCount,
      searchResults, setSearchResults,
      avgRetrievalScore, setAvgRetrievalScore,
      ollamaConnected, setOllamaConnected,
    }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
